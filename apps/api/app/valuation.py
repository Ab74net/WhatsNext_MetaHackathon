"""Replacement-cost estimates from web search, with a verified source for each one.

Honesty rules: an estimate is only kept if its source URL appeared in the model's own
search results (no invented links), and implausible ranges are rejected. These are
estimates for the user to check, never appraisals.
"""

from datetime import datetime, timezone
from urllib.parse import urlparse

from .schemas import InventoryItem, ValueEstimate

MAX_PLAUSIBLE_USD = 50_000
MAX_RANGE_RATIO = 10  # "high" more than 10x "low" is a guess, not an estimate


class ValuationUnavailable(Exception):
    pass


def is_listing_url(url: str) -> bool:
    """A search or category page doesn't back up a specific price; a product page does."""
    parsed = urlparse(url)
    path, query = parsed.path.lower(), parsed.query.lower()
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return False
    if "search" in path or "/c/" in path or "/browse/" in path or path.rstrip("/").endswith("/null"):
        return False
    return not any(k in query for k in ("q=", "st=", "k=", "query=", "searchterm="))


def describe(item: InventoryItem) -> str:
    parts = [item.brand, item.model, item.category]
    return " ".join(p for p in parts if p)


async def value_item(client, item: InventoryItem, crop: bytes | None = None) -> ValueEstimate:
    estimate, verified = await client.estimate_price(describe(item), crop)
    if not estimate.source_url or not verified:
        raise ValuationUnavailable("No price source could be verified for this item")
    if not is_listing_url(estimate.source_url):
        raise ValuationUnavailable("Only a search page was found, not a specific product listing")
    low, high = sorted((estimate.low, estimate.high))
    if high > MAX_PLAUSIBLE_USD or high / low > MAX_RANGE_RATIO:
        raise ValuationUnavailable("The price range found was not reliable enough to use")
    return ValueEstimate(
        low=round(low, 2), high=round(high, 2), source_url=estimate.source_url,
        source_title=estimate.source_title, basis=estimate.basis,
        checked_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )
