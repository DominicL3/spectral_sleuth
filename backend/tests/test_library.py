"""Smoke tests for quiz/library.py."""

from __future__ import annotations

import pytest

from quiz import library


def test_load_count():
    spectra = library.get_all()
    assert len(spectra) == 35, f"Expected 35 spectra, got {len(spectra)}"


def test_all_features_have_label():
    spectra = library.get_all()
    for spectrum in spectra:
        for feature in spectrum.get("diagnostic_features", []):
            assert feature.get("label"), (
                f"Spectrum {spectrum['id']!r} has a feature with empty label: {feature!r}"
            )


def test_get_by_id_known():
    spectra = library.get_all()
    first_id = spectra[0]["id"]
    result = library.get_by_id(first_id)
    assert result["id"] == first_id


def test_get_by_id_unknown():
    with pytest.raises(KeyError):
        library.get_by_id("__nonexistent__")


def test_categories():
    cats = library.get_categories()
    assert isinstance(cats, list)
    assert len(cats) == 5
    assert set(cats) == {"mineral", "vegetation", "soil", "water", "manmade"}
