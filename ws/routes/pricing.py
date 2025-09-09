import os
import json
import requests
from flask import Blueprint, jsonify, request
from functools import wraps
from auth import token_required
from datetime import datetime

pricing_bp = Blueprint('pricing_bp', __name__, url_prefix='/api/pricing')

PRICING_FILE = 'gcp_pricing.json'
API_KEY = os.environ.get('EXCHANGE_RATE_API_KEY', 'YOUR_API_KEY_HERE') # IMPORTANT: Replace with your actual key

# --- Helper Function to get Live Exchange Rate ---
def get_live_exchange_rate():
    """
    Fetches the latest USD to PHP exchange rate from a third-party API.
    Returns the rate and the last update date.
    """
    if API_KEY == 'YOUR_API_KEY_HERE':
        # Provide a fallback if the API key isn't set
        return 58.75, datetime.now().strftime('%Y-%m-%d')

    url = f"https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD"
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raises an HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        
        if data.get('result') == 'success':
            rate = data['conversion_rates']['PHP']
            # The API provides the update time in Unix timestamp format
            last_updated_unix = data['time_last_update_unix']
            last_updated_date = datetime.utcfromtimestamp(last_updated_unix).strftime('%Y-%m-%d')
            return rate, last_updated_date
        else:
            # Fallback to a default rate if the API call fails
            return 58.75, datetime.now().strftime('%Y-%m-%d')
            
    except requests.exceptions.RequestException as e:
        print(f"Could not fetch exchange rate: {e}")
        # Fallback to a default rate on network errors
        return 58.75, datetime.now().strftime('%Y-%m-%d')


# --- Helper function to load pricing data ---
def load_pricing_data():
    if not os.path.exists(PRICING_FILE):
        return {}
    with open(PRICING_FILE, 'r') as f:
        return json.load(f)

# --- Helper function to save pricing data ---
def save_pricing_data(data):
    with open(PRICING_FILE, 'w') as f:
        json.dump(data, f, indent=4)

@pricing_bp.route('/gcp', methods=['GET'])
@token_required
def get_gcp_pricing(current_user):
    """Serves the GCP pricing data with live currency conversion."""
    pricing_data = load_pricing_data()
    
    # Get the latest exchange rate
    exchange_rate, last_updated = get_live_exchange_rate()
    
    # Add the exchange rate info to the response
    pricing_data['exchange_rate_info'] = {
        'rate': exchange_rate,
        'last_updated': last_updated
    }

    # Recalculate PHP totals for each tier based on the live rate
    for tier in ['basic', 'standard', 'premium']:
        if tier in pricing_data:
            usd_total = pricing_data[tier].get('total', 0)
            pricing_data[tier]['total_php'] = usd_total * exchange_rate
            
    return jsonify(pricing_data)


@pricing_bp.route('/gcp', methods=['POST'])
@token_required
def update_gcp_pricing(current_user):
    """Updates the GCP pricing data from the frontend."""
    if current_user.role not in ['admin', 'superadmin']:
        return jsonify({'message': 'Permission denied.'}), 403
        
    new_data = request.get_json()
    
    # Clean the data to only store essential USD values, not dynamic PHP values
    if 'exchange_rate_info' in new_data:
        del new_data['exchange_rate_info']
    
    for tier_key in ['basic', 'standard', 'premium']:
        if tier_key in new_data:
            # Remove the dynamically calculated 'total_php' before saving
            if 'total_php' in new_data[tier_key]:
                del new_data[tier_key]['total_php']
    
    save_pricing_data(new_data)
    return jsonify({'message': 'Pricing data updated successfully!'})

