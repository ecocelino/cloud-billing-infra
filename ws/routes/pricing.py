from flask import Blueprint, request, jsonify
# --- FIX: Changed the import to the correct service location ---
from services.auth_service import token_required, role_required
import json
import os

pricing_bp = Blueprint("pricing", __name__)

# Helper function to get the absolute path to the pricing JSON file
def get_json_path():
    # Assumes gcp_pricing.json is in the parent directory of this file's directory (i.e., in /ws)
    return os.path.join(os.path.dirname(__file__), '..', 'gcp_pricing.json')

@pricing_bp.route("/api/pricing/gcp", methods=["GET"])
@token_required
def get_gcp_pricing(current_user):
    """
    Reads and returns the GCP pricing data from the JSON file.
    """
    try:
        json_path = get_json_path()
        with open(json_path, 'r') as f:
            data = json.load(f)
        return jsonify(data), 200
    except FileNotFoundError:
        return jsonify({"error": "Pricing data file not found."}), 404
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@pricing_bp.route("/api/pricing/gcp", methods=["POST"])
@token_required
@role_required(roles=["admin", "superadmin"])
def update_gcp_pricing(current_user):
    """
    Receives new pricing data from the frontend and overwrites the JSON file.
    """
    new_data = request.get_json()
    if not new_data:
        return jsonify({"error": "No data provided in the request."}), 400
    
    try:
        json_path = get_json_path()
        with open(json_path, 'w') as f:
            json.dump(new_data, f, indent=4)
        return jsonify({"message": "Pricing data updated successfully."}), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred while saving the file: {str(e)}"}), 500
