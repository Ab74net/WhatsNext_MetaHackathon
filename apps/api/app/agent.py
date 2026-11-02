"""The assistant: Spark with function tools that return typed UI instructions.

Facts (alerts, places, programs, amounts, phone numbers) only ever reach the user
through tool results rendered as cards. The model's own text is a short framing line.
Injury or immediate danger is caught before any model call and answered with 911.
"""

import json
import logging
import re

from pydantic import ValidationError

from . import config, content
from .alerts import alerts_card
from .assistance import build_plan
from .schemas import (AgentRequest, AgentResponse, CaseFile, ClaimStart, EmergencyCard, ResourceList, ToolkitLink,
                      UIInstruction)

log = logging.getLogger(__name__)
MAX_ROUNDS = 4
BRAND = config.BRAND

EMERGENCY = re.compile(
    r"\b(injur\w*|bleeding|unconscious|not breathing|can'?t breathe|cannot breathe|trouble breathing|"
    r"trapped|chest pain|heart attack|overdos\w*|seizure|stroke|(someone|he|she|they|i)('?s| is| am| are)? hurt|"
    r"burn(ed|t) (my|his|her|their) (skin|hand|arm|leg|face)|in danger|fire is (here|coming|near|close)|"
    r"flames (are )?(near|close|here|outside)|smoke (is )?(inside|in the house))\b",
    re.IGNORECASE,
)

TOOLS = [
    {"type": "function", "name": "get_alerts", "strict": True,
     "description": "Official alerts and fire areas for the user's location. Call this first in any new situation.",
     "parameters": {"type": "object", "additionalProperties": False, "properties": {}, "required": []}},
    {"type": "function", "name": "find_resources", "strict": True,
     "description": "Places on the map: shelters, animal shelters, hospitals (clinic), and recovery or assistance centers.",
     "parameters": {"type": "object", "additionalProperties": False, "required": ["kinds"], "properties": {
         "kinds": {"type": "array", "items": {"type": "string",
                   "enum": ["shelter", "animal_shelter", "clinic", "recovery_center"]}}}}},
    {"type": "function", "name": "build_plan", "strict": True,
     "description": "A Today / This week / Deadlines plan from the curated aid programs. Pass what the user has said; use 'unknown' when they have not said.",
     "parameters": {"type": "object", "additionalProperties": False,
                    "required": ["home_damage", "insured", "lost_documents"], "properties": {
         "home_damage": {"type": "string", "enum": ["destroyed", "major", "minor", "none", "unknown"]},
         "insured": {"type": "string", "enum": ["yes", "no", "unknown"]},
         "lost_documents": {"type": "string", "enum": ["yes", "no", "unknown"]}}}},
    {"type": "function", "name": "show_safety_flow", "strict": True,
     "description": "Pre-authored safety steps for this scenario's hazard, from official sources. Use when the user asks what to do to stay safe. Wildfire situations: level3 (told to go now), level12 (told to get ready), smoke. Flood situations: rising (water rising), driving. Both: trapped, returning (going back home). Pick the one that matches, or 'unknown' to let them choose.",
     "parameters": {"type": "object", "additionalProperties": False, "required": ["situation"], "properties": {
         "situation": {"type": "string", "enum": ["level3", "level12", "smoke", "rising", "driving", "trapped", "returning", "unknown"]}}}},
    {"type": "function", "name": "start_claim", "strict": True,
     "description": "Offer the claims helper, which rebuilds a home inventory from the user's photos for an insurance claim.",
     "parameters": {"type": "object", "additionalProperties": False, "required": ["reason"], "properties": {
         "reason": {"type": "string", "description": "One short sentence spoken to the user, using 'you' (e.g. 'Your photos can show what you owned.')."}}}},
    {"type": "function", "name": "open_toolkit", "strict": True,
     "description": "Offer the recovery toolkit: 'documents' for replacing lost IDs, cards, records or mail in the right order; 'insurer_call' for preparing a call with their insurance company.",
     "parameters": {"type": "object", "additionalProperties": False, "required": ["tab", "reason"], "properties": {
         "tab": {"type": "string", "enum": ["documents", "insurer_call"]},
         "reason": {"type": "string", "description": "One short sentence spoken to the user, using 'you'."}}}},
]


def system_prompt(case: CaseFile) -> str:
    s = content.scenario(case.scenario)
    p = content.preset(case.preset, case.scenario)
    when = s["when"][p["phase"]]
    demo = (" This is a hypothetical demo scenario: describe the situation as hypothetical if asked, but the places and programs"
            " from tools are real." if s.get("hypothetical") else "")
    return f"""You are {BRAND['agentName']}, a calm disaster-recovery assistant in the {BRAND['projectName']} app.
The user is in {s['place']}, affected by the {s['title']} ({s['hazard']}). {when}{demo}

How you answer:
- Use tools. The app shows tool results as cards and on a map. Call get_alerts first in a new situation, find_resources when they need a place or service, build_plan when they ask what to do, show_safety_flow when they ask how to stay safe (evacuating, smoke, rising water, driving, going back home), start_claim when they mention insurance, belongings or a claim, open_toolkit with tab documents when they mention lost IDs, cards, papers or mail, and with tab insurer_call when they are about to call their insurer.
- Your own text is one or two short, warm sentences that frame the cards, which appear below your message. Do not repeat what the cards show.
- Never state addresses, phone numbers, dollar amounts, deadlines, program rules or safety instructions in your own words. Those come only from tools. Never invent programs, places or deadlines.
- If something is unknown or not covered by a tool, say so plainly and suggest calling 2-1-1.
- This is general guidance, not insurance or legal advice and not local emergency instructions.
- If anyone is hurt or in immediate danger, tell them to call 911 now and stop.
Current case file: home_damage={case.home_damage}, insured={case.insured}, lost_documents={case.lost_documents}."""


def is_emergency(text: str) -> bool:
    return bool(EMERGENCY.search(text))


EMERGENCY_MESSAGE = ("If you or anyone is hurt or in immediate danger, call 911 now. "
                     "Follow instructions from emergency services first; I can help with everything else after.")


async def run_tool(name: str, args: dict, case: CaseFile) -> tuple[list[UIInstruction], dict, CaseFile]:
    """Execute a tool. Returns UI instructions for the user, a compact summary for the
    model, and the (possibly updated) case file."""
    s = content.scenario(case.scenario)
    phase = content.preset(case.preset, case.scenario)["phase"]
    if name == "get_alerts":
        card = await alerts_card(replay=content.preset(case.preset, case.scenario)["replay"], scenario_id=case.scenario)
        summary = {"live_alerts": [a.title for a in card.live], "live_error": card.live_error,
                   "recorded_alerts_from_replay": [a.title for a in card.recorded],
                   "fire_areas": [a.name for a in card.fire_areas]}
        return [card], summary, case
    if name == "find_resources":
        kinds = [k for k in args.get("kinds", []) if k in {"shelter", "animal_shelter", "clinic", "recovery_center"}]
        items = content.resources(phase, kinds or None, case.scenario)
        note = s["resource_notes"][phase] if items else s["resource_notes"]["empty"]
        return [ResourceList(kinds=kinds, items=items, note=note)], {"found": [r.name for r in items]}, case
    if name == "build_plan":
        case = case.model_copy(update={k: args[k] for k in ("home_damage", "insured", "lost_documents") if k in args})
        card = build_plan(case)
        summary = {b: [i.text for i in getattr(card, b)] for b in ("today", "this_week", "deadlines")}
        return [card], summary, case
    if name == "start_claim":
        return [ClaimStart(reason=str(args.get("reason", ""))[:200])], {"shown": True}, case
    if name == "open_toolkit":
        tab = args.get("tab") if args.get("tab") in ("documents", "insurer_call") else "documents"
        return [ToolkitLink(tab=tab, reason=str(args.get("reason", ""))[:200])], {"shown": True}, case
    if name == "show_safety_flow":
        card = content.safety_flow(s["safety_flow"], args.get("situation"))
        return [card], {"shown": True, "opened": card.initial}, case
    return [], {"error": f"unknown tool {name}"}, case


class MetaAgent:
    def __init__(self, client):
        self.client = client  # AsyncOpenAI

    async def respond(self, req: AgentRequest) -> AgentResponse:
        case = req.case
        if is_emergency(req.messages[-1].text):
            return AgentResponse(message=EMERGENCY_MESSAGE, ui=[EmergencyCard()], case=case, tools_used=[])

        items: list[dict] = [{"role": "system", "content": system_prompt(case)}]
        items += [{"role": m.role, "content": m.text} for m in req.messages]
        ui: list[UIInstruction] = []
        used: list[str] = []
        for _round in range(MAX_ROUNDS):
            res = await self.client.responses.create(model=config.SPARK_MODEL, input=items, tools=TOOLS,
                                                     reasoning={"effort": "low"})
            calls = [o for o in res.output if o.type == "function_call"]
            if not calls:
                return AgentResponse(message=res.output_text.strip(), ui=_dedupe(ui), case=case, tools_used=used)
            # Stateless replay: send back the model's own items plus one output per call.
            items += [o.model_dump(exclude_none=True) for o in res.output]
            for call in calls:
                try:
                    args = json.loads(call.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                try:
                    new_ui, summary, case = await run_tool(call.name, args, case)
                except ValidationError as err:
                    new_ui, summary = [], {"error": str(err)[:200]}
                ui += new_ui
                used.append(call.name)
                items.append({"type": "function_call_output", "call_id": call.call_id, "output": json.dumps(summary)})
        return AgentResponse(message="Here is what I found.", ui=_dedupe(ui), case=case, tools_used=used)


def _dedupe(ui: list[UIInstruction]) -> list[UIInstruction]:
    """Keep the last card of each type (a repeated tool call replaces the earlier card)."""
    last = {}
    for card in ui:
        last[card.type] = card
    order = ["emergency", "safety_flow", "alerts", "plan", "resources", "claim_start", "toolkit_link"]
    return [last[t] for t in order if t in last]


class MockAgent:
    """Keyword-routed stand-in for keyless testing. Uses the same tools and content."""

    async def respond(self, req: AgentRequest) -> AgentResponse:
        case = req.case
        text = req.messages[-1].text.lower()
        if is_emergency(text):
            return AgentResponse(message=EMERGENCY_MESSAGE, ui=[EmergencyCard()], case=case, tools_used=[])
        plan: list[tuple[str, dict]] = [("get_alerts", {})]
        if re.search(r"\b(shelter|stay|sleep|tonight|hospital|pets?|dogs?|cats?)\b", text):
            plan.append(("find_resources", {"kinds": ["shelter", "animal_shelter", "clinic"]}))
        if any(w in text for w in ("what should", "what do", "first", "help", "plan", "aid", "grant")):
            damage = "destroyed" if any(w in text for w in ("burned", "destroyed", "lost my home", "gone")) else "unknown"
            plan.append(("build_plan", {"home_damage": damage, "insured": "unknown", "lost_documents": "unknown"}))
        if any(w in text for w in ("safe", "evacuat", "smoke", "go back", "return", "rising", "drive", "driving")):
            situation = ("smoke" if "smoke" in text else "returning" if ("go back" in text or "return" in text)
                         else "rising" if "rising" in text else "driving" if "driv" in text
                         else "level3" if "evacuat" in text else "unknown")
            plan.append(("show_safety_flow", {"situation": situation}))
        if any(w in text for w in ("insurance", "claim", "belongings", "inventory")):
            plan.append(("start_claim", {"reason": "You mentioned insurance."}))
        if any(w in text for w in (" id", "license", "passport", "documents", "papers", "birth certificate", "social security", "mail")):
            plan.append(("open_toolkit", {"tab": "documents", "reason": "You mentioned lost documents."}))
        elif any(w in text for w in ("call my insur", "calling my insur", "adjuster")):
            plan.append(("open_toolkit", {"tab": "insurer_call", "reason": "You are getting ready to call your insurer."}))
        ui: list[UIInstruction] = []
        for name, args in plan:
            new_ui, _, case = await run_tool(name, args, case)
            ui += new_ui
        return AgentResponse(message="(Mock mode) Here is what I found for your situation.", ui=_dedupe(ui),
                             case=case, tools_used=[n for n, _ in plan])


def make_agent(model_client):
    return MockAgent() if config.MOCK else MetaAgent(model_client.client)
