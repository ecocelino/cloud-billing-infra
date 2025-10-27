from flask import Blueprint, request, jsonify
from models import db, Project, User, Billing
from services.auth_service import token_required, role_required

projects_bp = Blueprint("projects", __name__)

@projects_bp.route("/api/projects/meta/all", methods=["GET"])
@token_required
def get_all_project_meta(current_user):
    projects = Project.query.all()
    meta_data = {
        p.project_name: {
            "id": p.id,
            "projectCode": p.project_code,
            "environment": p.environment,
            "owner": p.owner,
            "team": p.team,
        } for p in projects
    }
    return jsonify(meta_data)

@projects_bp.route("/api/projects/meta", methods=["PUT"])
@token_required
@role_required(roles=["admin", "superadmin"])
def update_project_meta(current_user):
    data = request.get_json()
    project = Project.query.filter_by(project_name=data["project_name"]).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    project.project_code = data.get("project_code", project.project_code)
    project.environment = data.get("environment", project.environment)
    project.owner = data.get("owner", project.owner)
    project.team = data.get("team", project.team)
    db.session.commit()
    
    return jsonify({"message": "Project metadata updated successfully"})

# 🔹 ADDED: New endpoint to get all details for a single project
@projects_bp.route("/api/project/<int:project_id>", methods=['GET'])
@token_required
def get_project_details(current_user, project_id):
    project = Project.query.get_or_404(project_id)
    year = request.args.get('year', type=int)

    if not year:
        return jsonify({"error": "Year parameter is required"}), 400

    # Get assigned users
    assigned_users = [{'id': u.id, 'username': u.username} for u in project.assigned_users]

    # Get monthly cost history for the year
    months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    cost_history = {month: 0 for month in months}
    
    billing_entries = Billing.query.filter_by(project_id=project.id, billing_year=year).all()
    for entry in billing_entries:
        if entry.billing_month in cost_history:
            cost_history[entry.billing_month] += float(entry.cost)

    # Assemble the response
    project_details = {
        'id': project.id,
        'projectName': project.project_name,
        'projectCode': project.project_code,
        'environment': project.environment,
        'owner': project.owner,
        'team': project.team,
        'assignedUsers': assigned_users,
        'costHistory': cost_history
    }
    
    return jsonify(project_details)