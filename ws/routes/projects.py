from flask import Blueprint, request, jsonify
from models import db, Project
from services.auth_service import token_required, role_required

projects_bp = Blueprint("projects", __name__)

@projects_bp.route("/api/projects/meta/all", methods=["GET"])
@token_required
def get_projects_meta(current_user):
    """Returns all project metadata."""
    projects = Project.query.all()
    # The frontend expects a dictionary keyed by project name
    meta_data = {
        p.project_name: {  # Corrected from p.name to p.project_name
            "id": p.id,
            "projectCode": p.project_code,
            "environment": p.environment,
            "owner": p.owner,
            "team": p.team
        } for p in projects
    }
    return jsonify(meta_data), 200

@projects_bp.route("/api/projects/meta", methods=["PUT"])
@token_required
@role_required(roles=['admin', 'superadmin'])
def update_project_meta(current_user):
    """Updates metadata for a single project."""
    data = request.get_json()
    project_name = data.get("project_name")

    if not project_name:
        return jsonify({"error": "Project name is required"}), 400

    project = Project.query.filter_by(project_name=project_name).first()
    if not project:
        # If the project doesn't exist, create it
        project = Project(project_name=project_name)
        db.session.add(project)

    project.project_code = data.get("project_code")
    project.environment = data.get("environment")
    project.owner = data.get("owner")
    project.team = data.get("team")

    db.session.commit()
    
    return jsonify({"message": f"Project '{project_name}' updated successfully."}), 200

