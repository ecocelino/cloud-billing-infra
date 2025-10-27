@audit_bp.route('/api/audit-logs', methods=['GET'])
@token_required
@role_required(roles=['admin', 'superadmin'])
def get_audit_logs(current_user):
    logs = AuditLog.query.order_by(db.desc(AuditLog.timestamp)).limit(100).all()
    return jsonify([{
        'id': log.id,
        'username': log.user.username,
        'action': log.action,
        'details': log.details,
        'timestamp': log.timestamp.isoformat()
    } for log in logs])