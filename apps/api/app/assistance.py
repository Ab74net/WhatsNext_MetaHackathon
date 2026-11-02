"""Assistance engine: rules decide which programs apply and where they go in the plan.

The model never adds programs, amounts or deadlines; it only explains this plan.
"""

from . import content
from .schemas import CaseFile, HowStep, PlanCard, PlanItem

BUCKETS = ("today", "this_week", "deadlines")


def applies(program: dict, case: CaseFile) -> bool:
    """A program applies unless the case file rules it out. "unknown" never rules out:
    when we don't know, we show the option rather than hide help."""
    for field, allowed in program.get("applies_if", {}).items():
        value = getattr(case, field)
        if value != "unknown" and value not in allowed:
            return False
    return True


def build_plan(case: CaseFile) -> PlanCard:
    phase = content.preset(case.preset)["phase"]
    data = content.programs()
    buckets: dict[str, list[PlanItem]] = {b: [] for b in BUCKETS}
    for p in data["programs"]:
        slot = p.get("plan", {}).get(phase)
        if phase not in p["phases"] or not slot or not applies(p, case):
            continue
        deadline = p.get("deadline") or {}
        buckets[slot["bucket"]].append(PlanItem(
            program_id=p["id"],
            text=slot["text"],
            detail=p["summary"],
            status=p["status"],
            status_note=p.get("status_note"),
            amount=p.get("amount"),
            deadline_note=deadline.get("note"),
            how=[HowStep(**h) for h in p.get("how", [])],
            action=slot.get("action"),
            source_name=p["source_name"],
            source_url=p["source_url"],
            checked_at=data["verified_at"],
        ))
    return PlanCard(phase=phase, today=buckets["today"], this_week=buckets["this_week"],
                    deadlines=buckets["deadlines"], based_on=case)
