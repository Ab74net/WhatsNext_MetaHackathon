"""Document replacement order: curated per-state data, plus grounded follow-up answers.

The data file is the source of truth. Spark only rephrases what the selected entries say,
and must answer "call this agency" when they don't cover the question. The question has
numbers and email addresses stripped in the browser, is never logged, and is checked
again here.
"""

import json
import re
from functools import lru_cache

from pydantic import ValidationError

from . import config
from .config import REPO_ROOT
from .schemas import DocumentAnswer, DocumentEntry, DocumentGuide, DocumentQuestion, DocumentState

DOCS_DIR = REPO_ROOT / "content" / "documents"
STATES: dict[str, tuple[str, str | None]] = {  # code -> (name, data file or None for "coming soon")
    "VA": ("Virginia", "virginia.json"),
    "WA": ("Washington", None),
}


class UnknownState(KeyError):
    pass


def states() -> list[DocumentState]:
    return [DocumentState(state=code, state_name=name, available=file is not None) for code, (name, file) in STATES.items()]


@lru_cache
def guide(state: str) -> DocumentGuide:
    name, file = STATES.get(state.upper(), (None, None))
    if not file:
        raise UnknownState(state)
    return DocumentGuide.model_validate(json.loads((DOCS_DIR / file).read_text(encoding="utf-8")))


def find_cycle(entries: list[DocumentEntry]) -> list[str] | None:
    """A prerequisite cycle (as a path of ids) if there is one. The UI also checks."""
    edges = {e.id: e.prerequisites for e in entries}
    state: dict[str, int] = {}  # 1 visiting, 2 done
    path: list[str] = []

    def visit(node: str) -> list[str] | None:
        state[node] = 1
        path.append(node)
        for nxt in edges.get(node, []):
            if state.get(nxt) == 1:
                return path[path.index(nxt):] + [nxt]
            if nxt not in state and (found := visit(nxt)):
                return found
        path.pop()
        state[node] = 2
        return None

    for e in entries:
        if e.id not in state and (found := visit(e.id)):
            return found
    return None


# Personal details have no place in the question; the browser strips them, this is a backstop.
_PERSONAL = re.compile(r"\S+@\S+|\d[\d\s-]{3,}\d")


def scrub(text: str) -> str:
    return _PERSONAL.sub("[removed]", text)


PROMPT = """You help someone in Virginia replace documents lost in a disaster.
Answer their question using ONLY the official information below. It is the only thing you know.
If the information below does not answer the question, say so plainly and tell them to call or visit the agency named, and set covered to false. Never guess requirements, fees, waiting times, deadlines or waivers. No medical or legal advice.
Use calm, plain language and short sentences, at most 4 sentences. In doc_ids, list the ids of the entries you used.

Official information:
{entries}

Question: {question}"""

SCHEMA = {
    "type": "object", "additionalProperties": False, "required": ["answer", "doc_ids", "covered"],
    "properties": {"answer": {"type": "string"}, "doc_ids": {"type": "array", "items": {"type": "string"}},
                   "covered": {"type": "boolean"}},
}


def _context(entries: list[DocumentEntry]) -> str:
    keep = ("id", "name", "issuing_agency", "official_url", "needed_items", "where", "steps", "phone", "fees_note",
            "disaster_waiver_note", "timing_note", "id_card_note", "prerequisites_note", "unverified_fields")
    return json.dumps([{k: v for k, v in e.model_dump().items() if k in keep and v} for e in entries], ensure_ascii=False)


def fallback(entries: list[DocumentEntry]) -> DocumentAnswer:
    who = "; ".join(f"{e.issuing_agency}" + (f" ({e.phone})" if e.phone else "") for e in entries)
    return DocumentAnswer(answer=f"I can’t answer that from the official information I have. Please contact {who}.",
                          doc_ids=[e.id for e in entries], covered=False)


async def ask(client, q: DocumentQuestion) -> DocumentAnswer:
    by_id = {e.id: e for e in guide(q.state).documents}
    entries = [by_id[i] for i in q.doc_ids if i in by_id]
    if not entries:
        raise UnknownState(q.state)
    if config.MOCK:
        return fallback(entries)
    for _attempt in range(2):
        try:
            res = await client.client.responses.create(
                model=config.SPARK_MODEL,
                input=PROMPT.format(entries=_context(entries), question=scrub(q.question)),
                text={"format": {"type": "json_schema", "name": "document_answer", "schema": SCHEMA, "strict": True}},
                reasoning={"effort": "low"},
            )
            ans = DocumentAnswer.model_validate(json.loads(res.output_text))
            ans.doc_ids = [i for i in ans.doc_ids if i in by_id] or [e.id for e in entries]
            return ans
        except (json.JSONDecodeError, ValidationError):
            continue
        except Exception:
            break
    return fallback(entries)
