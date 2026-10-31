import pytest
from pydantic import ValidationError

from app.pipeline import build_items
from app.schemas import IdentifiedItem, InventoryItem, Mask, MaskBounds


def _item(category, **kw):
    base = dict(category=category, brand=None, model=None, condition="good", confidence=0.8,
                evidence="seen_in_photo")
    return IdentifiedItem(**{**base, **kw})


def _mask(conf):
    return Mask(bounds=MaskBounds(left=0, top=0, right=10, bottom=10), svg_path="M0 0Z", confidence=conf)


def test_item_schema_matches_readme_shape():
    item = InventoryItem(id="x", category="sofa", brand=None, model=None, condition="good",
                         confidence=0.5, evidence="seen_in_photo", photos=[])
    assert set(item.model_dump()) == {"id", "category", "brand", "model", "condition", "confidence",
                                      "evidence", "photos", "estimated_replacement_usd", "user_confirmed"}
    assert item.user_confirmed is False  # nothing is confirmed until the user says so


def test_item_schema_rejects_bad_values():
    with pytest.raises(ValidationError):
        _item("sofa", confidence=1.5)
    with pytest.raises(ValidationError):
        _item("sofa", evidence="probably")


def test_pairs_spark_items_with_masks_and_keeps_unmasked():
    items = build_items("p1", None, [_item("Sofa", brand="IKEA"), _item("rug", evidence="inferred")],
                        {"sofa": [_mask(0.9)]})
    sofa, rug = items
    assert sofa.category == "sofa" and sofa.brand == "IKEA" and sofa.photos[0].mask is not None
    assert rug.photos[0].mask is None and rug.evidence == "inferred"


def test_extra_instances_only_when_confident_and_without_brand():
    items = build_items("p1", "2024-01-01T00:00:00", [_item("chair", brand="Herman Miller")],
                        {"chair": [_mask(0.95), _mask(0.7), _mask(0.2)]})
    assert len(items) == 2  # the 0.2 detection is dropped
    assert items[0].brand == "Herman Miller"  # most confident mask gets Spark's details
    assert items[1].brand is None and items[1].condition == "unknown"
    assert items[1].confidence <= 0.7
    assert all(i.photos[0].taken_at == "2024-01-01T00:00:00" for i in items)
