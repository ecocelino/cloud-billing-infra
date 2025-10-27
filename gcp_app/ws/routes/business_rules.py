from flask import Blueprint, jsonify, request
from models import db, BusinessRule
from services.auth_service import token_required, role_required
from datetime import datetime

business_rules_bp = Blueprint("business_rules", __name__)

def date_from_iso(date_string):
    """Helper to convert ISO date string to Python date object, handles None."""
    return datetime.fromisoformat(date_string.split('T')[0]).date() if date_string else None

@business_rules_bp.route("/api/business-rules", methods=["GET"])
@token_required
@role_required(roles=['admin', 'superadmin'])
def get_rules(current_user):
    rules = BusinessRule.query.order_by(BusinessRule.id).all()
    return jsonify([{
        'id': rule.id,
        'name': rule.name,
        'description': rule.description,
        'rule_type': rule.rule_type,
        'is_active': rule.is_active,
        'config': rule.config,
        'start_date': rule.start_date.isoformat() if rule.start_date else None,
        'end_date': rule.end_date.isoformat() if rule.end_date else None,
        'platform': rule.platform
    } for rule in rules])

@business_rules_bp.route("/api/business-rules", methods=["POST"])
@token_required
@role_required(roles=['superadmin'])
def create_rule(current_user):
    data = request.get_json()
    
    if not all(field in data for field in ['name', 'rule_type', 'config', 'platform']):
        return jsonify({'error': 'Missing required fields'}), 400

    if BusinessRule.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'A rule with this name already exists'}), 409

    new_rule = BusinessRule(
        name=data['name'],
        description=data.get('description', ''),
        rule_type=data['rule_type'],
        is_active=data.get('is_active', True),
        config=data['config'],
        start_date=date_from_iso(data.get('start_date')),
        end_date=date_from_iso(data.get('end_date')),
        platform=data.get('platform')
    )
    
    db.session.add(new_rule)
    db.session.commit()
    return jsonify({'message': 'Rule created successfully', 'id': new_rule.id}), 201


@business_rules_bp.route("/api/business-rules/<int:rule_id>", methods=["PUT"])
@token_required
@role_required(roles=['superadmin'])
def update_rule(current_user, rule_id):
    rule = BusinessRule.query.get_or_404(rule_id)
    data = request.get_json()

    if 'is_active' in data:
        rule.is_active = data['is_active']
    if 'config' in data:
        rule.config = data['config']
    if 'start_date' in data:
        rule.start_date = date_from_iso(data.get('start_date'))
    if 'end_date' in data:
        rule.end_date = date_from_iso(data.get('end_date'))
        
    db.session.commit()
    return jsonify({'message': 'Rule updated successfully'})