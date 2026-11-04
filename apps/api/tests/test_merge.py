from app.merge import (apply_merge, candidate_groups, category_key, combine, enforce_partition,
                       split, split_same_photo)
from app.schemas import InventoryItem, Mask, MaskBounds, PhotoEvidence, ValueEstimate
from app.sessions import Session

MASK = Mask(bounds=MaskBounds(left=0, top=0, right=10, bottom=10), svg_path=None)


def item(iid, category, photo, taken="2026-01-01", mask=MASK, **kw):
    base = dict(id=iid, category=category, brand=None, model=None, condition="good", confidence=0.8,
                evidence="seen_in_photo", photos=[PhotoEvidence(photo_id=photo, taken_at=taken, mask=mask)])
    return InventoryItem(**{**base, **kw})


def test_category_key_handles_synonyms_and_plurals():
    assert category_key("TV", set()) == "television"
    assert category_key("Potted  Plant", set()) == "plant"
    assert category_key("chairs", {"chair"}) == "chair"
    assert category_key("glass", {"glas"}) == "glass"  # "ss" endings are left alone
    assert category_key("lamps", set()) == "lamps"  # no singular in session: unchanged


def test_candidates_need_two_photos_and_a_mask():
    items = [item("a", "sofa", "p1"), item("b", "couch", "p2"), item("c", "lamp", "p1"),
             item("d", "lamp", "p1"), item("e", "rug", "p1"), item("f", "rug", "p2", mask=None)]
    groups = candidate_groups(items)
    assert set(groups) == {"sofa"}  # lamps share one photo; the second rug has no crop
    assert [m.id for m in groups["sofa"]] == ["a", "b"]


def test_enforce_partition_repairs_model_output():
    assert enforce_partition([[0, 2], [2, 5], [1]], 4) == [[0, 2], [1], [3]]


def test_same_photo_detections_are_never_merged():
    a, b, c = item("a", "pillow", "p1"), item("b", "pillow", "p1"), item("c", "pillow", "p2")
    buckets = split_same_photo([a, b, c])
    assert [[m.id for m in g] for g in buckets] == [["a", "c"], ["b"]]


def test_combine_keeps_evidence_and_never_confirms_for_the_user():
    a = item("a", "tv", "p1", taken="2025-06-01", confidence=0.9, user_confirmed=True)
    b = item("b", "tv", "p2", taken="2024-12-25", confidence=0.6, brand="Samsung",
             estimated_replacement_usd=ValueEstimate(low=300, high=400, source_url="https://x"))
    merged = combine([a, b])
    assert merged.id == "a" and merged.brand == "Samsung"
    assert [p.photo_id for p in merged.photos] == ["p2", "p1"]  # oldest photo first
    assert merged.user_confirmed is False
    assert merged.estimated_replacement_usd.low == 300


def test_merge_then_split_restores_originals():
    s = Session(id="s")
    a, b = item("a", "sofa", "p1"), item("b", "sofa", "p2")
    s.items = {"a": a, "b": b}
    group = apply_merge(s, [a, b], "sofa", "same pattern")
    assert list(s.items) == [group.kept_id] and len(s.items[group.kept_id].photos) == 2
    restored = split(s, group.kept_id)
    assert {i.id for i in restored} == {"a", "b"} and set(s.items) == {"a", "b"}


def test_merged_belonging_is_compared_with_additional_photo_and_undo_keeps_all_originals(jpeg_with_exif):
    import asyncio
    from app.images import process_upload
    from app.merge import auto_merge
    from app.schemas import SameItemDecision, SameItemGroup
    from app.sessions import StoredPhoto

    class Client:
        async def group_same_items(self, category, crops):
            assert category == "sofa" and len(crops) == 2
            return SameItemDecision(groups=[SameItemGroup(images=[0, 1], reason="same sofa")])

    s = Session(id="incremental")
    a, b, c = item("a", "sofa", "p1"), item("b", "sofa", "p2"), item("c", "sofa", "p3")
    s.items = {i.id: i for i in [a, b, c]}
    s.photos = {pid: StoredPhoto(pid, process_upload(jpeg_with_exif)) for pid in ["p1", "p2", "p3"]}
    apply_merge(s, [a, b], "sofa", "first scan")
    result = asyncio.run(auto_merge(Client(), s))
    assert len(result) == 1 and len(s.items) == 1
    merged = s.items[result[0].kept_id]
    assert {p.photo_id for p in merged.photos} == {"p1", "p2", "p3"}
    assert {i.id for i in split(s, merged.id)} == {"a", "b", "c"}


def test_incremental_merge_cannot_join_items_sharing_any_evidence_photo():
    merged = combine([item("a", "sofa", "p1"), item("b", "sofa", "p2")])
    other = item("c", "sofa", "p2")
    assert candidate_groups([merged, other]) == {}
    assert len(split_same_photo([merged, other])) == 2


def test_candidate_can_use_a_mask_from_later_evidence():
    existing = item("a", "sofa", "p1", mask=None)
    existing.photos.append(PhotoEvidence(photo_id="p2", taken_at=None, mask=MASK))
    assert candidate_groups([existing, item("b", "sofa", "p3")])["sofa"] == [existing, item("b", "sofa", "p3")]
