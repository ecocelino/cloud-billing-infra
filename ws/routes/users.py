from flask import Blueprint, request, jsonify
from models import db, User, Project
from services.auth_service import token_required, role_required
import jwt
import datetime

users_bp = Blueprint("users", __name__)


@users_bp.route("/api/setup_admin", methods=["POST"])
def setup_admin():
    if User.query.filter_by(username='admin').first():
        return jsonify({"message": "Admin user already exists."}), 200
    admin_user = User(username='admin', role='superadmin', email='admin@example.com')
    admin_user.set_password('admin123')
    db.session.add(admin_user)
    db.session.commit()
    return jsonify({"message": "Admin user 'admin' with password 'admin123' created."}), 201

@users_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get("username")).first()
    if not user or not user.check_password(data.get("password")):
        return jsonify({"error": "Invalid username or password"}), 401
    
    token = jwt.encode({
        'public_id': user.id,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, 'b3baf4d212b79b3af923ce0151480584', algorithm="HS256")
    return jsonify({"token": token, "role": user.role})

# --- 👤 USER PROFILE ENDPOINT ---
# 🔹 ADDED: New endpoint for users to update their own profile
@users_bp.route('/api/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json()
    
    # Logic to update the user's email
    if 'email' in data and data['email'] != current_user.email:
        # Check if the new email is already used by another user
        if User.query.filter(User.id != current_user.id, User.email == data['email']).first():
            return jsonify({'error': 'Email address already in use'}), 409
        current_user.email = data['email']

    # Logic to update the user's password
    if 'new_password' in data and data['new_password']:
        # Require current password to set a new one
        if 'current_password' not in data or not current_user.check_password(data['current_password']):
            return jsonify({'error': 'Your current password is incorrect'}), 401
        current_user.set_password(data['new_password'])

    try:
        db.session.commit()
        return jsonify({'message': 'Profile updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
# --- END USER PROFILE ENDPOINT ---


@users_bp.route("/api/users", methods=["GET"])
@token_required
@role_required(roles=['admin', 'superadmin'])
def get_all_users(current_user):
    users = User.query.all()
    output = []
    for user in users:
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'assigned_projects': [{'id': p.id, 'project_name': p.project_name} for p in user.assigned_projects]
        }
        output.append(user_data)
    return jsonify(output)


@users_bp.route("/api/users", methods=["POST"])
@token_required
@role_required(roles=['admin', 'superadmin'])
def create_user(current_user):
    data = request.get_json()
    if not data.get('username') or not data.get('password') or not data.get('email'):
        return jsonify({'error': 'Username, email, and password are required'}), 400
    if User.query.filter_by(username=data.get('username')).first():
        return jsonify({'error': 'Username already exists'}), 409
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email address already in use'}), 409
    
    if current_user.role == 'admin' and data.get('role') == 'superadmin':
        return jsonify({'error': 'Admins cannot create SuperAdmins'}), 403

    new_user = User(
        username=data.get('username'), 
        email=data.get('email'),
        role=data.get('role', 'user')
    )
    new_user.set_password(data.get('password'))
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'New user created successfully'}), 201


@users_bp.route('/api/users/<int:user_id>', methods=['PUT'])
@token_required
@role_required(roles=['admin', 'superadmin'])
def update_user(current_user, user_id):
    user_to_update = User.query.get_or_404(user_id)
    data = request.get_json()

    if current_user.role == 'admin' and user_to_update.role == 'superadmin':
        return jsonify({'error': 'Permission denied to edit this user'}), 403

    if 'email' in data and data['email'] != user_to_update.email:
        if User.query.filter(User.id != user_id, User.email == data['email']).first():
            return jsonify({'error': 'Email address already in use'}), 409
        user_to_update.email = data['email']

    if 'role' in data:
        new_role = data['role']
        if current_user.role == 'admin' and new_role == 'superadmin':
            return jsonify({'error': 'Admins cannot assign SuperAdmin role'}), 403
        user_to_update.role = new_role

    if 'password' in data and data['password']:
        user_to_update.set_password(data['password'])
    
    if 'assigned_project_ids' in data and user_to_update.role == 'user':
        project_ids = data['assigned_project_ids']
        if project_ids:
            projects_to_assign = Project.query.filter(Project.id.in_(project_ids)).all()
            user_to_update.assigned_projects = projects_to_assign
        else:
            user_to_update.assigned_projects = []
    elif 'role' in data and data['role'] != 'user':
        user_to_update.assigned_projects = []

    try:
        db.session.commit()
        return jsonify({'message': 'User has been updated'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@users_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
@role_required(roles=['admin', 'superadmin'])
def delete_user(current_user, user_id):
    user_to_delete = User.query.get_or_404(user_id)

    if current_user.role == 'admin' and user_to_delete.role == 'superadmin':
        return jsonify({'error': 'Permission denied to delete this user'}), 403
    
    if current_user.id == user_to_delete.id:
        return jsonify({'error': 'You cannot delete yourself'}), 403

    db.session.delete(user_to_delete)
    db.session.commit()
    return jsonify({'message': 'User has been deleted'})