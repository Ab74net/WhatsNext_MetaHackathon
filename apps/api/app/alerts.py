"""Live official alerts from the National Weather Service (api.weather.gov), fetched on
demand when the assistant calls get_alerts. Cached briefly to stay polite to NWS."""

import time
from datetime import datetime, timezone

import httpx

from . import content
from .schemas import Alert, AlertsCard

NWS_URL = "https://api.weather.gov/alerts/active"
USER_AGENT = "disaster-recovery-assistant (hackathon prototype)"
CACHE_SECONDS = 300
MAX_ZONE_LOOKUPS = 3

_cache: dict[str, tuple[float, list[Alert], str]] = {}


def _alert_from_feature(f: dict) -> Alert:
    p = f["properties"]
    return Alert(
        id=p.get("id") or f.get("id", ""),
        title=p.get("event", "Alert"),
        severity=(p.get("severity") or "unknown").lower(),
        headline=p.get("headline") or p.get("event", ""),
        description=(p.get("description") or "").strip()[:1200],
        area=p.get("areaDesc", ""),
        effective=p.get("effective"),
        expires=p.get("expires") or p.get("ends"),
        source_name=f"National Weather Service ({p.get('senderName', 'NWS')})",
        source_url=f.get("id") or NWS_URL,
        source_type="official",
        recorded=False,
        geometry=f.get("geometry"),
    )


async def fetch_live(lat: float, lon: float) -> tuple[list[Alert], str, str | None]:
    """Returns (alerts, checked_at, error). Never raises: an outage is shown, not hidden."""
    key = f"{lat:.3f},{lon:.3f}"
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_SECONDS:
        return hit[1], hit[2], None
    checked_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": USER_AGENT, "Accept": "application/geo+json"}) as c:
            r = await c.get(NWS_URL, params={"point": key})
            r.raise_for_status()
            alerts = [_alert_from_feature(f) for f in r.json().get("features", [])]
            # Many alerts have no polygon, only forecast zones; fetch a few zone shapes.
            for a, f in zip(alerts, r.json().get("features", [])[:MAX_ZONE_LOOKUPS]):
                zones = f["properties"].get("affectedZones") or []
                if a.geometry is None and zones:
                    z = await c.get(zones[0])
                    if z.status_code == 200:
                        a.geometry = z.json().get("geometry")
    except (httpx.HTTPError, ValueError, KeyError) as err:
        return [], checked_at, f"Could not reach the National Weather Service ({type(err).__name__})."
    _cache[key] = (time.time(), alerts, checked_at)
    return alerts, checked_at, None


async def alerts_card(replay: bool, scenario_id: str = content.DEFAULT_SCENARIO) -> AlertsCard:
    s = content.scenario(scenario_id)
    lon, lat = s["center"]
    live, checked_at, error = await fetch_live(lat, lon)
    return AlertsCard(
        live=live,
        live_checked_at=checked_at,
        live_source_url=f"{NWS_URL}?point={lat:.3f},{lon:.3f}",
        live_error=error,
        recorded=content.recorded_alerts(scenario_id) if replay else [],
        fire_areas=content.fire_areas(scenario_id),
        fire_areas_source=content.perimeters(scenario_id)["source"],
    )
