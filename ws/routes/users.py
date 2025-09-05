from flask import Blueprint, request, jsonify, current_app
from models import db, User
from services.auth_service import token_required, role_required
import jwt
import datetime

users_bp = Blueprint("users", __name__)

@users_bp.route("/api/setup_admin", methods=["POST"])
def setup_admin():
    """
    One-time setup to create a default admin user.
    """
    if User.query.filter_by(username='admin').first():
        return jsonify({"message": "Admin user already exists."}), 200

    admin_user = User(username='admin', role='admin')
    admin_user.set_password('admin123')

    db.session.add(admin_user)
    db.session.commit()

    return jsonify({"message": "Admin user 'admin' with password 'admin123' created."}), 201

@users_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401

    token = jwt.encode({
        'public_id': user.id,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({"token": token, "role": user.role}), 200

@users_bp.route("/api/users", methods=["GET"])
@token_required
@role_required(roles=['admin', 'superadmin'])
def get_all_users(current_user):
    """Get all users."""
    users = User.query.all()
    output = [{'id': user.id, 'username': user.username, 'role': user.role} for user in users]
    return jsonify(output)

@users_bp.route("/api/users", methods=["POST"])
@token_required
@role_required(roles=['admin', 'superadmin'])
def create_user(current_user):
    """Create a new user."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    if current_user.role == 'admin' and role == 'superadmin':
        return jsonify({'error': 'Admins cannot create SuperAdmins'}), 403

    new_user = User(username=username, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'New user created successfully'}), 201

@users_bp.route('/api/users/<int:user_id>', methods=['PUT'])
@token_required
@role_required(roles=['admin', 'superadmin'])
def update_user(current_user, user_id):
    """Update a user's role or password."""
    user_to_update = User.query.get_or_404(user_id)
    data = request.get_json()

    if current_user.role == 'admin' and user_to_update.role == 'superadmin':
        return jsonify({'error': 'Permission denied to edit this user'}), 403

    if 'role' in data:
        new_role = data['role']
        if current_user.role == 'admin' and new_role == 'superadmin':
            return jsonify({'error': 'Admins cannot assign SuperAdmin role'}), 403
        user_to_update.role = new_role

    if 'password' in data and data['password']:
        user_to_update.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'User has been updated'})

@users_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
@role_required(roles=['admin', 'superadmin'])
def delete_user(current_user, user_id):
    """Delete a user."""
    user_to_delete = User.query.get_or_404(user_id)

    if current_user.role == 'admin' and user_to_delete.role == 'superadmin':
        return jsonify({'error': 'Permission denied to delete this user'}), 403
    
    if current_user.id == user_to_delete.id:
        return jsonify({'error': 'You cannot delete yourself'}), 403

    db.session.delete(user_to_delete)
    db.session.commit()
    return jsonify({'message': 'User has been deleted'})

