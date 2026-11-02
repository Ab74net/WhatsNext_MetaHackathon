import asyncio
from types import SimpleNamespace

import pytest

from app.model_client import grounded_urls, last_message_text
from app.schemas import InventoryItem, PriceEstimate
from app.valuation import ValuationUnavailable, describe, is_listing_url, value_item


class _Out:
    def __init__(self, d):
        self._d = d
        self.type = d["type"]
        self.content = [SimpleNamespace(text=p.get("text", "")) for p in d.get("content", [])]

    def model_dump(self):
        return self._d


def _response():
    return SimpleNamespace(output_text="Searching...{}", output=[
        _Out({"type": "message", "content": [{"text": "Searching...", "annotations": []}]}),
        _Out({"type": "web_search_call", "action": {"type": "search"},
              "results": [{"url": "https://www.homedepot.com/p/fridge/123"}]}),
        _Out({"type": "web_search_call", "action": {"type": "open_page", "url": "https://bestbuy.com/x"}, "results": []}),
        _Out({"type": "message", "content": [{"text": '{"low": 1}', "annotations": [
            {"type": "url_citation", "url": "https://walmart.com/ip/9"}]}]}),
    ])


def test_grounded_urls_collects_results_pages_and_citations():
    assert grounded_urls(_response()) == {"homedepot.com/p/fridge/123", "bestbuy.com/x", "walmart.com/ip/9"}


def test_last_message_text_skips_progress_notes():
    assert last_message_text(_response()) == '{"low": 1}'


class _FakeClient:
    def __init__(self, estimate, verified):
        self.result = (estimate, verified)

    async def estimate_price(self, description, crop=None):
        return self.result


ITEM = InventoryItem(id="i", category="mini fridge", brand="Vissani", model=None, condition="good",
                     confidence=0.9, evidence="seen_in_photo", photos=[])


def _est(low, high, url="https://homedepot.com/p/1"):
    return PriceEstimate(low=low, high=high, source_url=url, source_title="t", basis="b")


def test_only_product_pages_count_as_sources():
    assert is_listing_url("https://www.walmart.com/ip/Arctic-King-Mini-Fridge/515928269")
    assert is_listing_url("https://homedepot.com/p/Vissani-3-2-cu-ft/328264575")
    assert not is_listing_url("https://www.bestbuy.com/site/searchpage.jsp?st=mini+fridge")
    assert not is_listing_url("https://www.ashleyfurniture.com/c/furniture/living-room/sofas/null")
    assert not is_listing_url("https://www.amazon.com/s?k=sofa")
    assert not is_listing_url("javascript:alert(1)")


def test_describe_uses_brand_and_category():
    assert describe(ITEM) == "Vissani mini fridge"


def test_unverified_or_implausible_estimates_are_rejected():
    for client in (_FakeClient(_est(100, 200), verified=False),
                   _FakeClient(_est(100, 200, url=None), verified=True),
                   _FakeClient(_est(10, 500), verified=True),
                   _FakeClient(_est(60_000, 70_000), verified=True)):
        with pytest.raises(ValuationUnavailable):
            asyncio.run(value_item(client, ITEM))


def test_verified_estimate_is_kept_and_ordered():
    est = asyncio.run(value_item(_FakeClient(_est(200, 150), verified=True), ITEM))
    assert (est.low, est.high) == (150, 200) and est.checked_at
