from flask import Blueprint, request, jsonify
from models import db, Budget, Project
from services.auth_service import token_required, role_required
import datetime

budgets_bp = Blueprint("budgets", __name__)

@budgets_bp.route("/api/budgets/<int:year>", methods=["GET"])
@token_required
def get_budgets_for_year(current_user, year):
    """ Fetches all budgets for a given year. """
    try:
        # If the user is a standard user, only show budgets for their assigned projects
        if current_user.role == 'user':
            assigned_project_ids = [p.id for p in current_user.projects]
            budgets_query = db.session.query(Budget, Project.project_name)\
                .join(Project, Budget.project_id == Project.id)\
                .filter(Budget.year == year)\
                .filter(Project.id.in_(assigned_project_ids))\
                .all()
        else: # Admins see all budgets
            budgets_query = db.session.query(Budget, Project.project_name)\
                .join(Project, Budget.project_id == Project.id)\
                .filter(Budget.year == year).all()

        budgets = [
            {
                "project_id": b.Budget.project_id,
                "project_name": b.project_name,
                "year": b.Budget.year,
                "month": b.Budget.month,
                "amount": float(b.Budget.amount),
            }
            for b in budgets_query
        ]
        return jsonify(budgets), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@budgets_bp.route("/api/budgets", methods=["POST"])
@token_required
@role_required(roles=["admin", "superadmin"])
def set_budget(current_user):
    """ Creates a new budget or updates an existing one. """
    data = request.get_json()
    project_id = data.get("project_id")
    year = data.get("year")
    month = data.get("month")
    amount = data.get("amount")

    if not all([project_id, year, month, amount is not None]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Find existing budget or create a new one
        budget = Budget.query.filter_by(
            project_id=project_id, year=year, month=month
        ).first()

        if budget:
            budget.amount = amount
        else:
            budget = Budget(
                project_id=project_id, year=year, month=month, amount=amount
            )
            db.session.add(budget)
        
        db.session.commit()
        return jsonify({"message": "Budget saved successfully."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
