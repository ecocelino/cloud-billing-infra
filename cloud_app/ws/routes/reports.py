from flask import Blueprint, request, jsonify
from models import db, Billing, Project
from services.auth_service import token_required
from sqlalchemy import func

reports_bp = Blueprint("reports", __name__)

QUARTERS = {
    'Q1': ['jan', 'feb', 'mar'],
    'Q2': ['apr', 'may', 'jun'],
    'Q3': ['jul', 'aug', 'sep'],
    'Q4': ['oct', 'nov', 'dec']
}

@reports_bp.route("/api/reports/grouped_cost", methods=['GET'])
@token_required
def get_grouped_cost_report(current_user):
    group_by = request.args.get('groupBy', 'team')
    year = request.args.get('year', type=int)
    quarter = request.args.get('quarter')

    if not year:
        return jsonify({"error": "Year parameter is required"}), 400
    if group_by not in ['team', 'owner']:
        return jsonify({"error": "Invalid groupBy parameter"}), 400

    group_by_column = Project.team if group_by == 'team' else Project.owner

    query = db.session.query(
        group_by_column.label('group_name'),
        func.sum(Billing.cost).label('total_cost')
    ).join(Project, Billing.project_id == Project.id)\
     .filter(Billing.billing_year == year)\
     .group_by('group_name')\
     .order_by(db.desc('total_cost'))

    if quarter and quarter in QUARTERS:
        query = query.filter(Billing.billing_month.in_(QUARTERS[quarter]))

    if current_user.role == 'user':
        assigned_project_ids = [p.id for p in current_user.assigned_projects]
        if not assigned_project_ids:
            return jsonify([])
        query = query.filter(Billing.project_id.in_(assigned_project_ids))

    results = query.all()

    # 🔹 ADDED: Logic to aggregate "Unassigned" costs into a single entry
    aggregated_results = {}
    for row in results:
        group_name = row.group_name or 'Unassigned'
        cost = float(row.total_cost or 0)
        
        if group_name in aggregated_results:
            aggregated_results[group_name] += cost
        else:
            aggregated_results[group_name] = cost

    output = [
        {'groupName': name, 'totalCost': cost}
        for name, cost in aggregated_results.items()
    ]
    # Sort again after aggregation
    output.sort(key=lambda x: x['totalCost'], reverse=True)
    
    return jsonify(output)