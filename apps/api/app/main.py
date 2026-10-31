"""FastAPI backend. Run: uvicorn app.main:app --reload --port 8000 (from apps/api)."""

import logging
import secrets

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import Response

from . import config, sessions
from .images import NotAnImageError, process_upload
from .model_client import make_client
from .pipeline import process_photo
from .schemas import Health, InventoryItem, ItemPatch, PhotoMeta, PhotoResult

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("api")

MAX_UPLOAD_BYTES = 50_000_000

app = FastAPI(title=f"{config.BRAND['projectName']} API")
client = make_client()


def _session(sid: str) -> sessions.Session:
    session = sessions.get(sid)
    if not session:
        raise HTTPException(404, "Session not found or expired")
    return session


@app.get("/api/health", response_model=Health)
def health() -> Health:
    return Health(ok=True, mock=config.MOCK, spark_model=config.SPARK_MODEL, sam_model=config.SAM_MODEL,
                  project_name=config.BRAND["projectName"], agent_name=config.BRAND["agentName"])


@app.post("/api/sessions")
def create_session() -> dict:
    return {"session_id": sessions.create().id, "ttl_minutes": config.SESSION_TTL_MINUTES}


@app.delete("/api/sessions/{sid}")
def delete_session(sid: str) -> dict:
    return {"deleted": sessions.end(sid)}


@app.post("/api/sessions/{sid}/end")
def end_session_beacon(sid: str) -> dict:
    # Same as DELETE; navigator.sendBeacon can only POST (used when the tab closes).
    return {"deleted": sessions.end(sid)}


@app.post("/api/sessions/{sid}/photos", response_model=list[PhotoMeta])
async def upload_photos(sid: str, files: list[UploadFile]) -> list[PhotoMeta]:
    session = _session(sid)
    metas = []
    for f in files:
        data = await f.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, f"{f.filename}: larger than 50 MB")
        try:
            photo = process_upload(data)
        except NotAnImageError:
            raise HTTPException(415, f"{f.filename}: not a supported photo")
        pid = "p_" + secrets.token_hex(4)
        session.photos[pid] = sessions.StoredPhoto(filename=f.filename or pid, photo=photo)
        metas.append(PhotoMeta(photo_id=pid, filename=f.filename or pid, width=photo.width,
                               height=photo.height, taken_at=photo.taken_at, has_gps=photo.gps is not None))
    return metas


@app.get("/api/sessions/{sid}/photos/{pid}.jpg")
def get_photo(sid: str, pid: str) -> Response:
    stored = _session(sid).photos.get(pid)
    if not stored:
        raise HTTPException(404, "Photo not found")
    return Response(stored.photo.jpeg, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


@app.post("/api/sessions/{sid}/photos/{pid}/extract", response_model=PhotoResult)
async def extract(sid: str, pid: str) -> PhotoResult:
    session = _session(sid)
    if pid not in session.photos:
        raise HTTPException(404, "Photo not found")
    try:
        result = await process_photo(client, session, pid)
    except Exception as err:
        log.warning("extract failed: %s", type(err).__name__)
        raise HTTPException(502, f"Model call failed: {type(err).__name__}: {str(err)[:300]}")
    session.results[pid] = result
    # Re-running a photo replaces its items rather than duplicating them.
    for iid in [i for i, it in session.items.items() if it.photos[0].photo_id == pid]:
        del session.items[iid]
    session.items.update({it.id: it for it in result.items})
    return result


@app.get("/api/sessions/{sid}/items", response_model=list[InventoryItem])
def list_items(sid: str) -> list[InventoryItem]:
    return list(_session(sid).items.values())


@app.patch("/api/sessions/{sid}/items/{iid}", response_model=InventoryItem)
def edit_item(sid: str, iid: str, patch: ItemPatch) -> InventoryItem:
    session = _session(sid)
    item = session.items.get(iid)
    if not item:
        raise HTTPException(404, "Item not found")
    changes = patch.model_dump(exclude_unset=True)
    if "category" in changes:
        changes["category"] = changes["category"].strip().lower()
    for key in ("brand", "model"):
        if key in changes and changes[key] is not None:
            changes[key] = changes[key].strip() or None
    session.items[iid] = item.model_copy(update=changes)
    return session.items[iid]


@app.delete("/api/sessions/{sid}/items/{iid}")
def delete_item(sid: str, iid: str) -> dict:
    return {"deleted": _session(sid).items.pop(iid, None) is not None}
