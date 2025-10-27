from functools import wraps
from flask import request, jsonify, current_app
import jwt
from models import User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token')

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['public_id']).first()
            if not current_user:
                 return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            return jsonify({'message': f'Token is invalid! {e}'}), 401
        
        # Pass the authenticated user object to the route function
        return f(current_user, *args, **kwargs)

    return decorated

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            if current_user.role not in roles:
                return jsonify({'message': 'Permission denied!'}), 403
            # If role check passes, call the actual route function
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator

