"""
X/Twitter collector -- optional, disabled by default.

The spec is explicit here: X's API is paid/restricted enough that this
project treats it as an optional connector rather than building an
unreliable scraper against ToS. Always reports status "optional" (not
"not_configured") so the UI can distinguish "we chose not to build this
without an official, paid API key" from "this is free and just needs a
key" (which is true of Reddit/YouTube above).
"""

from __future__ import annotations

from datetime import datetime

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedPost


class XCollector(BaseCollector):
    platform = "x"
    status = CollectorStatus.OPTIONAL

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        return []
