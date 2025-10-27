from models import db, AuditLog

def log_action(user, action, details=None):
    """Creates and saves a new audit log entry."""
    log_entry = AuditLog(
        user_id=user.id,
        action=action,
        details=details or {}
    )
    db.session.add(log_entry)