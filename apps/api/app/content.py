"""Loads the curated scenario content from /content (sources and dates on every row)."""

import json
from functools import lru_cache

from .config import REPO_ROOT
from .schemas import Alert, FireArea, Phase, Resource, SafetyFlowCard

CONTENT = REPO_ROOT / "content" / "spokane"


def _load(name: str) -> dict:
    return json.loads((CONTENT / name).read_text(encoding="utf-8"))


@lru_cache
def scenario() -> dict:
    return _load("scenario.json")


@lru_cache
def programs() -> dict:
    return _load("programs.json")


@lru_cache
def _resources() -> dict:
    return _load("resources.json")


@lru_cache
def perimeters() -> dict:
    return _load("perimeters.geojson")


def preset(preset_id: str) -> dict:
    return next(p for p in scenario()["presets"] if p["id"] == preset_id)


def resources(phase: Phase, kinds: list[str] | None = None) -> list[Resource]:
    data = _resources()
    return [Resource(**{k: v for k, v in r.items() if k != "phases"}, checked_at=data["checked_at"])
            for r in data["resources"]
            if phase in r["phases"] and (not kinds or r["kind"] in kinds)]


def recorded_alerts() -> list[Alert]:
    return [Alert(**{k: v for k, v in a.items() if k != "fire"}, recorded=True) for a in scenario()["recorded_alerts"]]


def fire_areas() -> list[FireArea]:
    return [FireArea(name=f["properties"]["name"], acres=f["properties"]["acres"],
                     discovered=f["properties"]["discovered"], geometry=f["geometry"])
            for f in perimeters()["features"]]


@lru_cache
def _safety(flow_id: str) -> dict:
    return json.loads((REPO_ROOT / "content" / "safety" / f"{flow_id}.json").read_text(encoding="utf-8"))


def safety_flow(flow_id: str, initial: str | None) -> SafetyFlowCard:
    data = _safety(flow_id)
    branch_ids = {b["id"] for b in data["branches"]}
    return SafetyFlowCard(**{k: data[k] for k in ("title", "question", "disclaimer", "sources", "checked_at", "branches")},
                          initial=initial if initial in branch_ids else None)
