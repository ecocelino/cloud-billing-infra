import json
from flask import Blueprint, jsonify, request, current_app
from models import db, ExchangeRate
from services.auth_service import token_required, role_required
import datetime
import requests

pricing_bp = Blueprint("pricing", __name__)

# ... (get_gcp_pricing and save_gcp_pricing routes remain the same) ...
@pricing_bp.route("/api/pricing/gcp", methods=["GET"])
@token_required
def get_gcp_pricing(current_user):
    try:
        with open('gcp_pricing.json', 'r') as f:
            data = json.load(f)
        
        exchange_rate = ExchangeRate.query.filter_by(source_currency='USD', target_currency='PHP').order_by(ExchangeRate.last_updated.desc()).first()
        
        if exchange_rate:
            data['exchange_rate_info'] = {
                'rate': float(exchange_rate.rate),
                'last_updated': exchange_rate.last_updated.strftime('%Y-%m-%d %H:%M:%S UTC')
            }
        else:
            data['exchange_rate_info'] = None

        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "Pricing file not found on the server."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@pricing_bp.route("/api/pricing/gcp", methods=["POST"])
@token_required
@role_required(roles=["admin", "superadmin"])
def save_gcp_pricing(current_user):
    try:
        data_to_save = request.get_json()

        if not data_to_save:
            return jsonify({"error": "No data provided in request body."}), 400

        with open('gcp_pricing.json', 'w') as f:
            json.dump(data_to_save, f, indent=4)
        
        return jsonify({"message": "Pricing data saved successfully."}), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred while saving the file: {str(e)}"}), 500


@pricing_bp.route("/api/exchange-rate/update", methods=["POST"])
@token_required
@role_required(roles=["admin", "superadmin"])
def update_exchange_rate(current_user):
    API_KEY = current_app.config.get('EXCHANGE_RATE_API_KEY')
    
    if not API_KEY:
        return jsonify({"error": "Exchange rate API key is not configured on the server."}), 500

    url = f"https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        if data.get("result") == "success":
            rate = data["conversion_rates"]["PHP"]
            
            exchange_rate = ExchangeRate.query.filter_by(source_currency='USD', target_currency='PHP').first()
            if not exchange_rate:
                exchange_rate = ExchangeRate(source_currency='USD', target_currency='PHP')
            
            exchange_rate.rate = rate
            exchange_rate.last_updated = datetime.datetime.utcnow()
            
            db.session.add(exchange_rate)
            db.session.commit()
            
            return jsonify({"message": f"Exchange rate updated successfully. 1 USD = {rate:.4f} PHP."}), 200
        else:
            return jsonify({"error": "Failed to fetch rate from external API. Check your API key or the service status."}), 500

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Could not connect to the exchange rate service: {e}"}), 503
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# NEW ROUTE for saving a manually entered exchange rate
@pricing_bp.route("/api/exchange-rate/manual-update", methods=["POST"])
@token_required
@role_required(roles=["admin", "superadmin"])
def manual_update_exchange_rate(current_user):
    try:
        data = request.get_json()
        new_rate = data.get('rate')

        if not new_rate:
            return jsonify({"error": "Rate value is missing."}), 400
        
        try:
            rate_value = float(new_rate)
            if rate_value <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid rate format. Please provide a positive number."}), 400

        # Find the existing rate record or create a new one
        exchange_rate = ExchangeRate.query.filter_by(source_currency='USD', target_currency='PHP').first()
        if not exchange_rate:
            exchange_rate = ExchangeRate(source_currency='USD', target_currency='PHP')

        exchange_rate.rate = rate_value
        exchange_rate.last_updated = datetime.datetime.utcnow()

        db.session.add(exchange_rate)
        db.session.commit()

        return jsonify({"message": f"Rate manually updated to {rate_value:.4f}."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500