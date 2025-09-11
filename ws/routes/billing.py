from flask import Blueprint, request, jsonify
from models import db, Billing, Project
from services.auth_service import token_required, role_required
from services.billing_service import process_billing_data
import csv
import io
import datetime

billing_bp = Blueprint("billing", __name__)


@billing_bp.route("/api/billing/services", methods=["GET"])
@token_required
def get_billing_services(current_user):
    platform = request.args.get("platform")
    year = request.args.get("year")

    # --- FIX: The query is now simpler and fetches all data first ---
    query = db.session.query(Billing, Project.project_name.label("project_name")).join(
        Project, Billing.project_id == Project.id
    )

    if platform:
        query = query.filter(Billing.platform == platform)
    if year:
        query = query.filter(Billing.billing_year == int(year))

    services = query.all()

    # Convert all raw data to a dictionary format
    result = [
        {
            "id": s.Billing.id,
            "project_id": s.Billing.project_id,
            "project_name": s.project_name,
            "billing_year": s.Billing.billing_year,
            "billing_month": s.Billing.billing_month,
            "platform": s.Billing.platform,
            "service_description": s.Billing.service_description,
            "sku_description": s.Billing.sku_description,
            "type": s.Billing.type,
            "cost": float(s.Billing.cost),
        }
        for s in services
    ]

    # --- FIX: Step 1 - Apply business rules to the ENTIRE dataset ---
    processed_result = process_billing_data(result)

    # --- FIX: Step 2 - Apply permissions filter AFTER the rules have run ---
    if current_user.role == 'user':
        assigned_project_names = {p.project_name for p in current_user.assigned_projects}
        if not assigned_project_names:
            return jsonify([]), 200 # Return empty list if user has no projects
        
        # Filter the in-memory list of processed data
        final_result = [item for item in processed_result if item['project_name'] in assigned_project_names]
    else:
        # Admins and SuperAdmins see everything
        final_result = processed_result

    return jsonify(final_result), 200


@billing_bp.route("/api/billing/upload_csv", methods=["POST"])
@token_required
@role_required(roles=["admin", "superadmin"])
def upload_csv(current_user):
    file = request.files.get("file")
    platform = request.form.get("platform")
    selected_month = request.form.get("month")
    selected_year = request.form.get("year")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400
    if not platform:
        return jsonify({"error": "Platform is required"}), 400
    if not selected_month or not selected_year:
        return jsonify({"error": "Month and Year for the upload are required"}), 400

    try:
        Billing.query.filter_by(
            billing_year=int(selected_year),
            billing_month=selected_month,
            platform=platform
        ).delete()
        db.session.commit()

        stream = io.StringIO(file.stream.read().decode("utf-8"))
        reader = csv.DictReader(stream)
        
        all_data = list(reader)
        if not all_data:
            return jsonify({"message": "CSV file is empty."}), 200

        new_project_names = set()
        existing_projects = {p.project_name for p in Project.query.all()}

        for row in all_data:
            project_name_from_csv = row.get("Project name")
            if project_name_from_csv and project_name_from_csv not in existing_projects:
                new_project_names.add(project_name_from_csv)
        
        if new_project_names:
            for name in new_project_names:
                new_project = Project(project_name=name)
                db.session.add(new_project)
            db.session.commit()
            existing_projects.update(new_project_names)

        project_map = {p.project_name: p.id for p in Project.query.all()}
        
        billing_rows_to_add = []
        for row in all_data:
            project_name_from_csv = row.get("Project name")
            project_id = project_map.get(project_name_from_csv)

            if not project_id:
                continue 
            
            billing = Billing(
                project_id=project_id,
                billing_year=int(selected_year),
                billing_month=selected_month,
                platform=platform,
                service_description=row.get("Service description"),
                sku_description=row.get("SKU description"),
                type=row.get("Credit type"),
                cost=float(row.get("Cost ($)", 0.0)),
            )
            billing_rows_to_add.append(billing)

        db.session.bulk_save_objects(billing_rows_to_add)
        db.session.commit()

        return (
            jsonify({
                "message": f"Uploaded {len(billing_rows_to_add)} rows successfully for {selected_month.capitalize()}, {selected_year}.",
                "new_projects": list(new_project_names),
            }),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

