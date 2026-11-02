"""In-memory session store. Photos never touch disk; ending a session, the TTL,
or a server restart erases them. No database tables hold user photos."""

import secrets
import time
from dataclasses import dataclass, field

from .config import SESSION_TTL_MINUTES
from .images import ProcessedPhoto
from .schemas import InventoryItem, PhotoResult


@dataclass
class StoredPhoto:
    filename: str
    photo: ProcessedPhoto


@dataclass
class Session:
    id: str
    last_seen: float = field(default_factory=time.time)
    photos: dict[str, StoredPhoto] = field(default_factory=dict)
    results: dict[str, PhotoResult] = field(default_factory=dict)
    items: dict[str, InventoryItem] = field(default_factory=dict)  # the inventory; export reads this
    merged_from: dict[str, list[InventoryItem]] = field(default_factory=dict)  # for undoing merges
    hashes: dict[str, str] = field(default_factory=dict)  # sha256 of upload -> photo_id (dedup)


_sessions: dict[str, Session] = {}


def sweep_expired() -> None:
    cutoff = time.time() - SESSION_TTL_MINUTES * 60
    for sid in [s.id for s in _sessions.values() if s.last_seen < cutoff]:
        _sessions.pop(sid, None)


def create() -> Session:
    sweep_expired()
    session = Session(id=secrets.token_urlsafe(16))
    _sessions[session.id] = session
    return session


def get(sid: str) -> Session | None:
    sweep_expired()
    session = _sessions.get(sid)
    if session:
        session.last_seen = time.time()
    return session


def end(sid: str) -> bool:
    return _sessions.pop(sid, None) is not None


def clear_all() -> None:
    _sessions.clear()
