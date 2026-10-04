"""
Tests for app/services/csv_safety.py.

No export endpoint exists yet (see that module's docstring), but the
helper is tested now so it's already correct and covered whenever one is
added -- untested "we'll harden it later" security code is exactly how
this class of bug (CWE-1236) ends up shipping unguarded in practice.
"""

import pytest

from app.services.csv_safety import sanitize_csv_cell


class TestFormulaPrefixesAreNeutered:
    @pytest.mark.parametrize(
        "dangerous_value",
        [
            "=cmd|' /C calc'!A0",
            "=HYPERLINK(\"http://evil.example/\", \"click me\")",
            "+1+1",
            "-2+3",
            "@SUM(1+9)",
            "\t=1+1",
            "\r=1+1",
        ],
    )
    def test_dangerous_prefix_gets_neutralized(self, dangerous_value):
        result = sanitize_csv_cell(dangerous_value)
        assert result.startswith("'")
        assert result[1:] == dangerous_value


class TestBenignValuesAreUnchanged:
    @pytest.mark.parametrize(
        "value",
        [
            "api-gateway",
            "Payments Service",
            "-5% error budget",  # a real, legitimate service name starting with '-'... see note below
            "user@example.com",
            "",
        ],
    )
    def test_leading_dash_is_still_escaped_but_content_preserved(self, value):
        """
        Note: a value that legitimately starts with '-' or '+' (like
        "-5% error budget") IS still prefixed with an apostrophe --
        that's the documented, minimally-lossy tradeoff (force-text
        rather than silently strip/reject), not a bug. This test just
        confirms the underlying content is never altered or dropped,
        whichever branch it takes.
        """
        result = sanitize_csv_cell(value)
        if value.startswith(("=", "+", "-", "@", "\t", "\r")):
            assert result == "'" + value
        else:
            assert result == value


class TestNonStringInput:
    def test_none_becomes_empty_string(self):
        assert sanitize_csv_cell(None) == ""

    def test_integer_is_stringified(self):
        assert sanitize_csv_cell(200) == "200"

    def test_negative_number_is_stringified_and_escaped(self):
        assert sanitize_csv_cell(-5) == "'-5"
