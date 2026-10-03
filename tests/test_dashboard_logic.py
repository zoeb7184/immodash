"""Pure helpers behind the dashboard (no server needed)."""

import pandas as pd

from dashboard.figures import _label_positions
from dashboard.theme import MAX_SERIES, TOKENS


def test_palette_has_enough_slots_in_both_modes():
    for mode in ("light", "dark"):
        assert len(TOKENS[mode]["series"]) >= MAX_SERIES
        assert len(TOKENS[mode]["div"]) % 2 == 1  # symmetric arms around a neutral midpoint


def test_label_positions_separate_close_points():
    df = pd.DataFrame({"city": ["a", "b", "c"], "x": [1.0, 1.01, 5.0], "y": [10.0, 10.05, 2.0]})
    pos = _label_positions(df, "x", "y")
    assert pos["a"] != pos["b"]
    assert pos["c"] == "top center"


def test_slot_assignment_keeps_colours_stable(monkeypatch):
    monkeypatch.setenv("API_URL", "http://unused")
    from dashboard.app import assign_slots

    _, slots = assign_slots(["Berlin", "Köln", "Leipzig"], {"Berlin": 0, "München": 1, "Köln": 4})
    assert slots["Berlin"] == 0 and slots["Köln"] == 4  # survivors keep their colour
    assert slots["Leipzig"] == 1  # newcomer takes the lowest free slot
