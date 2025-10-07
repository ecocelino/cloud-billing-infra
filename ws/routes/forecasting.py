from flask import Blueprint, jsonify
from models import db, Billing, Project
from services.auth_service import token_required
import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np
from collections import defaultdict

forecasting_bp = Blueprint("forecasting", __name__)

def generate_forecast_for_project(project_id):
    """Helper function to generate a 3-month forecast for a single project."""
    history_limit = 12
    billing_entries = db.session.query(
        Billing.billing_year,
        Billing.billing_month,
        db.func.sum(Billing.cost).label('total_cost')
    ).filter(Billing.project_id == project_id)\
     .group_by(Billing.billing_year, Billing.billing_month)\
     .order_by(db.desc(Billing.billing_year), db.desc(Billing.billing_month))\
     .limit(history_limit)\
     .all()

    if len(billing_entries) < 3:
        return None # Not enough data

    df = pd.DataFrame(billing_entries, columns=['year', 'month_str', 'cost'])
    month_map = { 'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12 }
    df['month'] = df['month_str'].map(month_map)
    df = df.sort_values(by=['year', 'month']).reset_index()
    df['time_index'] = df.index

    X = df['time_index'].values.reshape(-1, 1)
    y = df['cost'].values.astype(float)

    model = LinearRegression()
    model.fit(X, y)

    last_index = df['time_index'].max()
    future_indices = np.array([last_index + 1, last_index + 2, last_index + 3]).reshape(-1, 1)
    predicted_costs = model.predict(future_indices)
    
    last_month_num = df.iloc[-1]['month']
    last_year = df.iloc[-1]['year']
    month_keys = list(month_map.keys())
    
    forecast_data = []
    for i in range(3):
        next_month_index = (last_month_num + i) % 12
        next_year = last_year if (last_month_num + i) < 12 else last_year + 1
        forecast_data.append({
            'year': int(next_year),
            'month_str': month_keys[next_month_index],
            'cost': max(0, predicted_costs[i])
        })
    return forecast_data

@forecasting_bp.route("/api/forecasting/project/<int:project_id>/<int:year>", methods=['GET'])
@token_required
def get_project_forecast(current_user, project_id, year):
    # This endpoint is still used for fetching historical data for the chart
    history_limit = 12
    billing_entries = db.session.query(
        Billing.billing_year,
        Billing.billing_month,
        db.func.sum(Billing.cost).label('total_cost')
    ).filter(Billing.project_id == project_id)\
     .group_by(Billing.billing_year, Billing.billing_month)\
     .order_by(db.desc(Billing.billing_year), db.desc(Billing.billing_month))\
     .limit(history_limit)\
     .all()

    df = pd.DataFrame(billing_entries, columns=['year', 'month_str', 'cost'])
    historical_data = df.to_dict(orient='records')
    forecast_data = generate_forecast_for_project(project_id)

    if not forecast_data:
        return jsonify({'historical': historical_data, 'forecast': []})

    return jsonify({
        'historical': historical_data,
        'forecast': forecast_data
    })

# 🔹 ADDED: New endpoint for the "All Projects" forecast
@forecasting_bp.route("/api/forecasting/all/<int:year>", methods=['GET'])
@token_required
def get_all_projects_forecast(current_user, year):
    # Get all project IDs
    projects = Project.query.all()
    project_ids = [p.id for p in projects]

    # Dictionary to sum up the forecasts for each future month
    aggregated_forecast = defaultdict(lambda: {'cost': 0})

    for pid in project_ids:
        project_forecast = generate_forecast_for_project(pid)
        if project_forecast:
            for forecast_month in project_forecast:
                month_key = f"{forecast_month['year']}-{forecast_month['month_str']}"
                aggregated_forecast[month_key]['cost'] += forecast_month['cost']
                aggregated_forecast[month_key]['year'] = forecast_month['year']
                aggregated_forecast[month_key]['month_str'] = forecast_month['month_str']
    
    # Convert the aggregated dictionary to a list
    final_forecast = list(aggregated_forecast.values())

    return jsonify({'forecast': final_forecast})