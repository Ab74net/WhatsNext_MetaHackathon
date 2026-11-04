"""Regressions for item edits, delayed estimates, and spreadsheet text handling."""

import asyncio
import csv
import io

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from openpyxl import load_workbook

from app import export, main, sessions
from app.schemas import InventoryItem, ItemPatch, ValueEstimate


@pytest.fixture
def claim():
    session = sessions.create()
    item = InventoryItem(id="item", category="television", brand="Example", model="TV1", condition="good",
                         confidence=.9, evidence="seen_in_photo", photos=[], user_confirmed=True,
                         estimated_replacement_usd=ValueEstimate(low=1000, high=1500,
                                                               source_url="https://example.com/television"))
    session.items[item.id] = item
    yield session, item
    sessions.end(session.id)


@pytest.mark.parametrize("patch", [{"category": "desk lamp"}, {"brand": "Other"}, {"model": "TV2"}])
def test_identity_edit_clears_old_estimate(claim, patch):
    session, item = claim
    result = TestClient(main.app).patch(f"/api/sessions/{session.id}/items/{item.id}", json=patch)
    assert result.status_code == 200
    assert result.json()["estimated_replacement_usd"] is None
    assert session.items[item.id].estimated_replacement_usd is None


def test_confirmation_and_equivalent_edits_keep_existing_estimate(claim):
    session, item = claim
    updated = main.edit_item(session.id, item.id, ItemPatch(category=" Television ", brand=" Example ", user_confirmed=False))
    assert updated.estimated_replacement_usd == item.estimated_replacement_usd
    assert updated.user_confirmed is False


@pytest.mark.parametrize("change", ["category", "confirmation"])
def test_delayed_price_checks_item_identity_but_preserves_unrelated_edits(claim, monkeypatch, change):
    session, item = claim

    async def run():
        started, finish = asyncio.Event(), asyncio.Event()

        async def delayed_price(client, snapshot, crop):
            assert snapshot.category == "television"
            started.set()
            await finish.wait()
            return item.estimated_replacement_usd

        monkeypatch.setattr(main, "value_item", delayed_price)
        request = asyncio.create_task(main.value(session.id, item.id))
        await started.wait()
        patch = ItemPatch(category="desk lamp") if change == "category" else ItemPatch(user_confirmed=False)
        main.edit_item(session.id, item.id, patch)
        finish.set()
        if change == "category":
            with pytest.raises(HTTPException) as error:
                await request
            assert error.value.status_code == 409
            assert session.items[item.id].estimated_replacement_usd is None
        else:
            updated = await request
            assert updated.user_confirmed is False
            assert updated.estimated_replacement_usd == item.estimated_replacement_usd

    asyncio.run(run())


@pytest.mark.parametrize("text", ["=1+1", "+1+1", "-1+1", "@SUM(A1)", " \t=1+1", "\tordinary text"])
def test_spreadsheet_descriptions_are_literal_text_and_totals_still_work(claim, text):
    session, item = claim
    session.items[item.id] = item.model_copy(update={"brand": text, "model": "=1+1"})
    rows = list(csv.reader(io.StringIO(export.build_csv(session).decode("utf-8-sig"))))
    assert rows[1][2] == "'" + text
    assert rows[1][3] == "'=1+1"
    assert rows[1][9:11] == ["1000.0", "1500.0"]
    sheet = load_workbook(io.BytesIO(export.build_xlsx(session)), data_only=False).active
    assert sheet["D8"].value == text and sheet["D8"].data_type == "s"
    assert sheet["E8"].value == "=1+1" and sheet["E8"].data_type == "s"
    assert sheet["K8"].value == 1000 and sheet["K8"].data_type == "n"
    assert sheet["K9"].value == "=SUM(K8:K8)" and sheet["K9"].data_type == "f"
