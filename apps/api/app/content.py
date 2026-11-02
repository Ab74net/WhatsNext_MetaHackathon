"""Loads the curated scenario content from /content (sources and dates on every row).

Each demo scenario has its own folder (content/<scenario id>/): scenario.json, resources.json,
programs.json and, for wildfires, perimeters.geojson. Safety flows live in content/safety.
"""

import json
from functools import lru_cache
from typing import get_args

from .config import REPO_ROOT
from .schemas import Alert, FireArea, Phase, Resource, SafetyFlowCard, ScenarioId

CONTENT = REPO_ROOT / "content"
SCENARIOS: tuple[str, ...] = get_args(ScenarioId)
DEFAULT_SCENARIO = SCENARIOS[0]
_NO_AREAS = {"type": "FeatureCollection", "features": [], "source": None}


def _load(scenario_id: str, name: str) -> dict:
    if scenario_id not in SCENARIOS:
        raise KeyError(scenario_id)
    return json.loads((CONTENT / scenario_id / name).read_text(encoding="utf-8"))


@lru_cache
def scenario(scenario_id: str = DEFAULT_SCENARIO) -> dict:
    return _load(scenario_id, "scenario.json")


@lru_cache
def programs(scenario_id: str = DEFAULT_SCENARIO) -> dict:
    return _load(scenario_id, "programs.json")


@lru_cache
def _resources(scenario_id: str) -> dict:
    return _load(scenario_id, "resources.json")


@lru_cache
def perimeters(scenario_id: str = DEFAULT_SCENARIO) -> dict:
    """Hazard areas drawn on the map (fire perimeters). Empty for scenarios without them."""
    if not (CONTENT / scenario_id / "perimeters.geojson").exists():
        return _NO_AREAS
    return _load(scenario_id, "perimeters.geojson")


def preset(preset_id: str, scenario_id: str = DEFAULT_SCENARIO) -> dict:
    return next(p for p in scenario(scenario_id)["presets"] if p["id"] == preset_id)


def resources(phase: Phase, kinds: list[str] | None = None, scenario_id: str = DEFAULT_SCENARIO) -> list[Resource]:
    data = _resources(scenario_id)
    return [Resource(**{k: v for k, v in r.items() if k != "phases"}, checked_at=data["checked_at"])
            for r in data["resources"]
            if phase in r["phases"] and (not kinds or r["kind"] in kinds)]


def recorded_alerts(scenario_id: str = DEFAULT_SCENARIO) -> list[Alert]:
    return [Alert(**{k: v for k, v in a.items() if k != "fire"}, recorded=True)
            for a in scenario(scenario_id)["recorded_alerts"]]


def fire_areas(scenario_id: str = DEFAULT_SCENARIO) -> list[FireArea]:
    return [FireArea(name=f["properties"]["name"], acres=f["properties"]["acres"],
                     discovered=f["properties"]["discovered"], geometry=f["geometry"])
            for f in perimeters(scenario_id)["features"]]


@lru_cache
def _safety(flow_id: str) -> dict:
    return json.loads((CONTENT / "safety" / f"{flow_id}.json").read_text(encoding="utf-8"))


def safety_flow(flow_id: str, initial: str | None) -> SafetyFlowCard:
    data = _safety(flow_id)
    branch_ids = {b["id"] for b in data["branches"]}
    return SafetyFlowCard(**{k: data[k] for k in ("title", "question", "disclaimer", "sources", "checked_at", "branches")},
                          hazard=data["id"], initial=initial if initial in branch_ids else None)
