"""
CSV/formula-injection safety.

PulseBoard has no CSV (or Excel) export endpoint today, but service
names, incident titles/descriptions, and subscriber emails are all
free-text fields an admin (or, for subscriber emails, an unauthenticated
caller via /status/subscribe) controls, and any of them is a plausible
future export column. If a value like `=cmd|' /C calc'!A0` or
`+1+1` or `@SUM(1+9)` ends up as a CSV cell that a victim later opens in
Excel/Sheets/LibreOffice, the spreadsheet application may interpret it
as a formula and execute it -- this is "CSV injection" / "formula
injection" (CWE-1236), a real and well-documented class of vulnerability
distinct from anything the API's own JSON responses are exposed to (JSON
fields are never interpreted as formulas by anything that consumes this
API today).

Use `sanitize_csv_cell` on every field written to a CSV (or .xls/.xlsx)
export, at write time -- not at input/storage time. Neutering the value
only where it becomes spreadsheet content preserves the real data
everywhere else (the API, the dashboard UI, notification emails), which
is the only place formula injection can trigger.
"""

# Characters that spreadsheet applications treat as formula/command
# prefixes when they appear as the FIRST character of a cell.
# '=' and '+' and '-' and '@' are the classic four (Excel, LibreOffice,
# Google Sheets); tab (\t) and carriage return (\r) are included because
# some parsers strip leading whitespace before checking the first
# character, so a value starting with one of those can still smuggle a
# formula prefix through.
_DANGEROUS_LEADING_CHARS = ("=", "+", "-", "@", "\t", "\r")


def sanitize_csv_cell(value: str) -> str:
    """
    Returns `value` unchanged unless it starts with a character a
    spreadsheet application would interpret as a formula prefix, in
    which case it's prefixed with a single leading apostrophe. Excel,
    LibreOffice Calc, and Google Sheets all render a leading apostrophe
    as "force this cell to plain text" and do not include the
    apostrophe itself in the displayed value or in what gets copy-
    pasted elsewhere -- this is the standard, minimally-lossy mitigation
    recommended by OWASP's CSV Injection guidance, as opposed to
    stripping/rejecting the character outright (which would silently
    corrupt a legitimate value like a service named "-5% error budget").

    Non-string input is coerced to `str` first so this is safe to call
    directly on numbers/dates/None pulled from a DB row without every
    call site needing its own `str(...) if value is not None else ""`.
    """
    text = "" if value is None else str(value)
    if text.startswith(_DANGEROUS_LEADING_CHARS):
        return "'" + text
    return text
