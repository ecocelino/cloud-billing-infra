from flask import Blueprint, request, jsonify
from models import db, Budget, Project
from services.auth_service import token_required, role_required
from services.audit_service import log_action

budgets_bp = Blueprint("budgets", __name__)


@budgets_bp.route("/api/budgets/<int:year>", methods=['GET'])
@token_required
def get_budgets_for_year(current_user, year):
    """Fetches all budgets for a given year."""
    # Base query for all budgets in the specified year
    query = Budget.query.filter_by(year=year)

    # If the user has a 'user' role, filter by their assigned projects
    if current_user.role == 'user':
        assigned_project_ids = [p.id for p in current_user.assigned_projects]
        if not assigned_project_ids:
            return jsonify([]), 200  # Return empty if user has no projects
        query = query.filter(Budget.project_id.in_(assigned_project_ids))

    budgets = query.all()
    
    return jsonify([{
        'project_id': b.project_id,
        'year': b.year,
        'month': b.month,
        'amount': float(b.amount)
    } for b in budgets])


@budgets_bp.route("/api/budgets", methods=['POST'])
@token_required
@role_required(roles=['admin', 'superadmin'])
def save_budget(current_user):
    """Creates a new budget or updates an existing one."""
    data = request.get_json()
    project_id = data.get('project_id')
    year = data.get('year')
    month = data.get('month')
    amount = data.get('amount')

    if not all([project_id, year, month, amount is not None]):
        return jsonify({"error": "Missing required fields"}), 400

    # Find the project to link in the audit log
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Find existing budget to get the old value for the audit log
    budget = Budget.query.filter_by(
        project_id=project_id,
        year=year,
        month=month
    ).first()

    old_amount = 0
    if budget:
        old_amount = float(budget.amount)
        budget.amount = amount
    else:
        budget = Budget(
            project_id=project_id,
            year=year,
            month=month,
            amount=amount
        )
        db.session.add(budget)

    # Log the action to the audit trail
    log_action(
        user=current_user,
        action='UPDATE_BUDGET',
        details={
            'project_name': project.project_name,
            'month': month,
            'year': year,
            'old_amount': old_amount,
            'new_amount': float(amount)
        }
    )
    
    db.session.commit()
    
    return jsonify({"message": "Budget saved successfully."}), 201