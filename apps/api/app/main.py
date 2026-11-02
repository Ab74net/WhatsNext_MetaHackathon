"""FastAPI backend. Run: uvicorn app.main:app --reload --port 8000 (from apps/api)."""

import hashlib
import logging
import secrets
from datetime import date

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import Response

from . import config, export, merge, sessions
from .images import NotAnImageError, process_upload
from .model_client import make_client
from .pipeline import process_photo
from .schemas import (Health, InventoryItem, ItemPatch, ManualMerge, MergeResult, PhotoMeta,
                      PhotoResult)
from .valuation import ValuationUnavailable, value_item

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
        # The same file picked twice would count its items twice; return the original instead.
        digest = hashlib.sha256(data).hexdigest()
        if digest in session.hashes:
            original = session.hashes[digest]
            p = session.photos[original].photo
            metas.append(PhotoMeta(photo_id=original, filename=f.filename or original, width=p.width,
                                   height=p.height, taken_at=p.taken_at, has_gps=p.gps is not None,
                                   duplicate_of=original))
            continue
        try:
            photo = process_upload(data)
        except NotAnImageError:
            raise HTTPException(415, f"{f.filename}: not a supported photo")
        pid = "p_" + secrets.token_hex(4)
        session.photos[pid] = sessions.StoredPhoto(filename=f.filename or pid, photo=photo)
        session.hashes[digest] = pid
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
    session = _session(sid)
    session.merged_from.pop(iid, None)
    return {"deleted": session.items.pop(iid, None) is not None}


# --- Merge across photos -----------------------------------------------------------


@app.post("/api/sessions/{sid}/merge", response_model=MergeResult)
async def auto_merge(sid: str) -> MergeResult:
    """Ask Spark which same-category items in different photos are the same object."""
    session = _session(sid)
    try:
        merges = await merge.auto_merge(client, session)
    except Exception as err:
        log.warning("merge failed: %s", type(err).__name__)
        raise HTTPException(502, f"Merge failed: {type(err).__name__}: {str(err)[:300]}")
    return MergeResult(items=list(session.items.values()), merges=merges)


@app.post("/api/sessions/{sid}/items/merge", response_model=InventoryItem)
def manual_merge(sid: str, body: ManualMerge) -> InventoryItem:
    """The user says these items are one object (fallback when auto-merge misses)."""
    session = _session(sid)
    members = [session.items.get(i) for i in dict.fromkeys(body.ids)]
    if any(m is None for m in members) or len(members) < 2:
        raise HTTPException(404, "Item not found")
    group = merge.apply_merge(session, members, members[0].category, "merged by you")
    return session.items[group.kept_id]


@app.post("/api/sessions/{sid}/items/{iid}/split", response_model=list[InventoryItem])
def split_item(sid: str, iid: str) -> list[InventoryItem]:
    """Undo a merge: the item goes back to one item per sighting."""
    session = _session(sid)
    if iid not in session.items:
        raise HTTPException(404, "Item not found")
    return merge.split(session, iid)


# --- Valuation and export ---------------------------------------------------------------


@app.post("/api/sessions/{sid}/items/{iid}/value", response_model=InventoryItem)
async def value(sid: str, iid: str) -> InventoryItem:
    session = _session(sid)
    item = session.items.get(iid)
    if not item:
        raise HTTPException(404, "Item not found")
    try:
        estimate = await value_item(client, item, export.evidence_crop(session, item, 512))
    except ValuationUnavailable as err:
        raise HTTPException(422, str(err))
    except Exception as err:
        log.warning("valuation failed: %s", type(err).__name__)
        raise HTTPException(502, f"Price lookup failed: {type(err).__name__}")
    # The item may have been edited or merged while the lookup ran.
    current = session.items.get(iid)
    if not current:
        raise HTTPException(409, "Item changed while it was being valued")
    session.items[iid] = current.model_copy(update={"estimated_replacement_usd": estimate})
    return session.items[iid]


EXPORTS = {
    "xlsx": (export.build_xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    "csv": (export.build_csv, "text/csv; charset=utf-8"),
    "pdf": (export.build_pdf, "application/pdf"),
}


@app.get("/api/sessions/{sid}/export.{fmt}")
def download_export(sid: str, fmt: str) -> Response:
    session = _session(sid)
    if fmt not in EXPORTS:
        raise HTTPException(404, "Unknown export format")
    if not export.confirmed_items(session):
        raise HTTPException(409, "Confirm at least one item before exporting")
    build, media_type = EXPORTS[fmt]
    filename = f"claim-inventory-{date.today().isoformat()}.{fmt}"
    return Response(build(session), media_type=media_type,
                    headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"})
