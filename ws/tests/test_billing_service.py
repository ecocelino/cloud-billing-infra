import sys
import os
import pytest

# Add the project root to the path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.billing_service import process_billing_data

def test_rename_general_charges_before_cutoff():
    """ Test renaming for dates before the 2025 transfer. """
    sample_data = [{
        "project_name": "[Charges not specific to a project]",
        "billing_year": 2024,
        "billing_month": "dec",
    }]
    processed = process_billing_data(sample_data)
    assert processed[0]["project_name"] == "Netenrich Resolution Intelligence Cloud"

def test_rename_general_charges_after_cutoff():
    """ Test renaming for dates after the 2025 transfer. """
    sample_data = [{
        "project_name": "[Charges not specific to a project]",
        "billing_year": 2025,
        "billing_month": "jun",
    }]
    processed = process_billing_data(sample_data)
    assert processed[0]["project_name"] == "ai-research-and-development"

def test_move_specific_services():
    """ Test moving Cloud IDS and Network Security services. """
    sample_data = [{
        "project_name": "multisys-hostnet-prod-1",
        "service_description": "Cloud IDS"
    }]
    processed = process_billing_data(sample_data)
    assert processed[0]["project_name"] == "ms-multipay-prod-1"

def test_no_change_for_unrelated_projects():
    """ Test that other data is not changed. """
    sample_data = [{
        "project_name": "some-other-project",
        "service_description": "Compute Engine"
    }]
    original_data_copy = list(sample_data)
    processed = process_billing_data(sample_data)
    assert processed == original_data_copy