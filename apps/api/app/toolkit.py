"""Recovery toolkit: questions to ask the insurer, tailored by Spark.

Privacy: Spark sees ONLY the hazard type, whether the user has an inventory, and the base
question list below. Policy numbers, names, addresses, dates and call notes stay in the
browser and are never sent here. Nothing from these requests is logged.

Spark only helps the user ask: it must never say what a policy covers. If its output is
invalid twice, or drops questions, the static base list is returned instead.
"""

import json

from pydantic import ValidationError

from . import config
from .schemas import InsurerQuestion, InsurerQuestions, InsurerQuestionsRequest

BASE_QUESTIONS: list[InsurerQuestion] = [
    InsurerQuestion(text="Does my policy cover temporary housing while my home is repaired or rebuilt?",
                    why="Ask what costs are included and for how long."),
    InsurerQuestion(text="Is my contents coverage replacement cost or actual cash value?",
                    why="This changes how much you are paid for each item."),
    InsurerQuestion(text="What is my deductible?",
                    why="Ask whether it applies once per claim or separately for the home and its contents."),
    InsurerQuestion(text="What is the deadline to submit my inventory?",
                    why="Ask for the date in writing."),
    InsurerQuestion(text="Can I get an advance payment?",
                    why="Ask how much and how soon it could arrive."),
    InsurerQuestion(text="Who is my adjuster and how do I reach them?",
                    why="Write down a direct phone number and email."),
]

MAX_QUESTIONS = 10

PROMPT = """You help someone prepare for a phone call with their home insurance company after a {hazard} loss.
They {inventory}.

Here is a base list of questions to ask:
{base}

Return a list of at most {max} questions for them to ask. Keep the meaning of every base question (you may reword them in plain language). Add at most 4 questions that are specific to a {hazard} loss or to their inventory situation.
Rules:
- Every item is a question the user asks the insurer. Never state or suggest what any policy covers, pays, or excludes.
- No legal advice. No dollar amounts, percentages, deadlines or time limits.
- Plain, calm language. Short sentences. No jargon.
- For each question, "why" is one short sentence (under 20 words) on what to listen for or write down."""

SCHEMA = {
    "type": "object", "additionalProperties": False, "required": ["questions"],
    "properties": {"questions": {"type": "array", "items": {
        "type": "object", "additionalProperties": False, "required": ["text", "why"],
        "properties": {"text": {"type": "string"}, "why": {"type": "string"}}}}},
}


def fallback() -> InsurerQuestions:
    return InsurerQuestions(questions=BASE_QUESTIONS, tailored=False)


def check(raw: dict) -> InsurerQuestions:
    """Validate Spark's list. Raises ValueError if it is not a usable list of questions."""
    result = InsurerQuestions(questions=raw.get("questions", []), tailored=True)
    qs = result.questions
    if len(qs) < len(BASE_QUESTIONS) or len(qs) > MAX_QUESTIONS:
        raise ValueError(f"expected {len(BASE_QUESTIONS)}-{MAX_QUESTIONS} questions, got {len(qs)}")
    if not all(q.text.strip().endswith("?") for q in qs):
        raise ValueError("every item must be a question")
    return result


def build_prompt(req: InsurerQuestionsRequest) -> str:
    """Everything Spark sees. Built only from the request's two fields and the base list."""
    return PROMPT.format(
        hazard=req.hazard if req.hazard != "other" else "disaster",
        inventory="already have a list of what they lost" if req.has_inventory else "do not have a list of what they lost yet",
        base="\n".join(f"- {q.text}" for q in BASE_QUESTIONS),
        max=MAX_QUESTIONS,
    )


async def insurer_questions(client, req: InsurerQuestionsRequest) -> InsurerQuestions:
    if config.MOCK:
        return fallback()
    for _attempt in range(2):  # retry once on invalid output
        try:
            res = await client.client.responses.create(
                model=config.SPARK_MODEL,
                input=build_prompt(req),
                text={"format": {"type": "json_schema", "name": "insurer_questions", "schema": SCHEMA, "strict": True}},
                reasoning={"effort": "low"},
            )
            return check(json.loads(res.output_text))
        except (json.JSONDecodeError, ValidationError, ValueError):
            continue
        except Exception:
            break  # network or API error: no point retrying, use the static list
    return fallback()
