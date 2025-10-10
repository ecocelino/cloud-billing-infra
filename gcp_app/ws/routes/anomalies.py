from flask import Blueprint, jsonify, request
from models import db, Billing, Anomaly, Project
from services.auth_service import token_required, role_required
import pandas as pd
from collections import defaultdict
from datetime import datetime

anomalies_bp = Blueprint("anomalies", __name__)

def check_for_anomalies(year, month, platform):
    """
    Analyzes the latest billing data for a given month and year to find anomalies.
    """
    latest_costs = db.session.query(
        Billing.project_id,
        db.func.sum(Billing.cost).label('total_cost')
    ).join(Project).filter(
        Billing.billing_year == year, 
        Billing.billing_month == month, 
        Project.platform == platform
    ).group_by(Billing.project_id).all()

    month_map_inv = { 1: 'jan', 2: 'feb', 3: 'mar', 4: 'apr', 5: 'may', 6: 'jun', 7: 'jul', 8: 'aug', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec' }
    month_num = list(month_map_inv.keys())[list(month_map_inv.values()).index(month)]
    
    for project_cost in latest_costs:
        project_id = project_cost.project_id
        new_cost = float(project_cost.total_cost)

        history = []
        for i in range(1, 7):
            hist_month_num = month_num - i
            hist_year = year
            if hist_month_num <= 0:
                hist_month_num += 12
                hist_year -= 1
            
            hist_cost = db.session.query(db.func.sum(Billing.cost))\
                .filter(Billing.project_id == project_id, Billing.billing_year == hist_year, Billing.billing_month == month_map_inv[hist_month_num])\
                .scalar()
            
            if hist_cost is not None:
                history.append(float(hist_cost))

        if len(history) < 3:
            continue

        df = pd.Series(history)
        average = df.mean()
        std_dev = df.std()

        if pd.isna(std_dev) or std_dev == 0:
            std_dev = average * 0.1 # Fallback for low variance

        threshold = average + (2 * std_dev)
        min_increase = 50 

        if new_cost > threshold and (new_cost - average) > min_increase:
            existing_anomaly = Anomaly.query.filter_by(
                project_id=project_id, 
                billing_year=year, 
                billing_month=month
            ).first()
            
            if not existing_anomaly:
                anomaly = Anomaly(
                    project_id=project_id,
                    billing_year=year,
                    billing_month=month,
                    anomalous_cost=new_cost,
                    average_cost=average
                )
                db.session.add(anomaly)
    
    db.session.commit()

@anomalies_bp.route("/api/anomalies/unread", methods=['GET'])
@token_required
def get_unread_anomalies(current_user):
    platform = request.args.get('platform')
    if not platform:
        return jsonify({"error": "Platform parameter is required"}), 400

    anomalies = Anomaly.query.join(Project).filter(
        Project.platform == platform,
        Anomaly.is_acknowledged == False
    ).order_by(db.desc(Anomaly.timestamp)).all()
    
    output = []
    for anom in anomalies:
        # 🔹 ADDED: Check to prevent crash if the linked project is missing
        if anom.project:
            output.append({
                'id': anom.id,
                'project_name': anom.project.project_name,
                'month': f"{anom.billing_month.capitalize()} {anom.billing_year}",
                'anomalous_cost': float(anom.anomalous_cost),
                'average_cost': float(anom.average_cost),
                'timestamp': anom.timestamp.isoformat()
            })
    return jsonify(output)

@anomalies_bp.route('/api/anomalies/<int:anomaly_id>/acknowledge', methods=['PUT'])
@token_required
@role_required(roles=['admin', 'superadmin'])
def acknowledge_anomaly(current_user, anomaly_id):
    anomaly = Anomaly.query.get_or_404(anomaly_id)
    anomaly.is_acknowledged = True
    db.session.commit()
    return jsonify({'message': 'Anomaly acknowledged'})