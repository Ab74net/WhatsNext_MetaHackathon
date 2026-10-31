"""SAM output parsing, using the sample output from the official parser docs."""

import asyncio

import meta_sam_parser as sam

from app.model_client import masks_from_records

SAMPLE = (
    "<0f>0<|box;x1=211;y1=228;x2=270;y2=254;w=320;h=334|>"
    "<|mask;x=0;y=0;data=27,60,~!!!!M!0c[0o91w?q1!pIH4pPRVp2B3'7`e.ioeAf6-k/#Xd8%dX9x(|>"
    ",1<|box;x1=155;y1=228;x2=202;y2=254;w=320;h=334|>"
    "<|mask;x=0;y=0;data=27,48,~!!!!J!0c[q=Pj_zs=*4C4(/./x#:/`S_GnD`=o3?X{emCgO$y@|>\n"
)


async def _events(text: str):
    base = {"item_id": "m1", "output_index": 0, "content_index": 0}
    split = text.find(",1<|box")  # deltas can split anywhere
    if split > 0:
        yield {"type": "response.output_text.delta", **base, "delta": text[:split]}
        yield {"type": "response.output_text.delta", **base, "delta": text[split:]}
    yield {"type": "response.output_text.done", **base, "text": text}
    yield {"type": "response.completed"}


def _parse(text: str):
    async def run():
        parsed = sam.parse_responses_stream(_events(text), sam.image_segmentation_format())
        return await parsed.final_result()

    return asyncio.run(run())


def test_two_objects_become_two_masks():
    result = _parse(SAMPLE)
    assert result.outcome.status == "completed"
    masks = masks_from_records(result.records)
    assert len(masks) == 2
    assert masks[0].bounds.left == 211 and masks[0].bounds.top == 228
    assert masks[0].svg_path and masks[0].svg_path.startswith("M")


def test_no_match_means_no_masks():
    assert masks_from_records(_parse("").records) == []
