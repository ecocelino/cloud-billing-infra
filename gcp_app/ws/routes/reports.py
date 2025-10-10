from flask import Blueprint, request, jsonify
from models import db, Billing, Project
from services.auth_service import token_required
from sqlalchemy import func

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("/api/reports/grouped_cost", methods=['GET'])
@token_required
def get_grouped_cost_report(current_user):
    group_by = request.args.get('groupBy', 'team') # Default to grouping by 'team'
    year = request.args.get('year', type=int)

    if not year:
        return jsonify({"error": "Year parameter is required"}), 400

    if group_by not in ['team', 'owner']:
        return jsonify({"error": "Invalid groupBy parameter. Must be 'team' or 'owner'."}), 400

    # Determine which column to group by
    group_by_column = Project.team if group_by == 'team' else Project.owner

    # Base query to join Billing and Project tables
    query = db.session.query(
        group_by_column.label('group_name'),
        func.sum(Billing.cost).label('total_cost')
    ).join(Project, Billing.project_id == Project.id)\
     .filter(Billing.billing_year == year)\
     .group_by('group_name')\
     .order_by(db.desc('total_cost'))

    # If the user has a 'user' role, filter by their assigned projects
    if current_user.role == 'user':
        assigned_project_ids = [p.id for p in current_user.assigned_projects]
        if not assigned_project_ids:
            return jsonify([]) # Return empty if user has no projects
        query = query.filter(Billing.project_id.in_(assigned_project_ids))

    results = query.all()

    # Format the output
    output = [
        {
            'groupName': row.group_name or 'Unassigned',
            'totalCost': float(row.total_cost or 0)
        } 
        for row in results
    ]
    
    return jsonify(output)