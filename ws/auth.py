import jwt
from functools import wraps
from flask import request, jsonify, current_app
from models import User # Assuming your User model is in models.py

def token_required(f):
    """
    Decorator to protect routes with JWT authentication.
    Verifies the token from the 'x-access-token' header.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']
        
        if not token:
            return jsonify({'message' : 'Token is missing!'}), 401
  
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            
            # --- THIS IS THE FIX ---
            # We read the 'public_id' key from the token as your users.py creates it,
            # but we use its value to query the primary 'id' column in the User table.
            current_user = User.query.filter_by(id=data['public_id']).first()

            if current_user is None:
                return jsonify({
                    'message' : 'Token is invalid or user does not exist!'
                }), 401

        except jwt.ExpiredSignatureError:
            return jsonify({
                'message' : 'Token has expired! Please log in again.'
            }), 401
        except KeyError:
            # This will catch the error if 'public_id' is missing from the token.
            return jsonify({
                'message': "Token is invalid! The required user identifier ('public_id') is missing from the token."
            }), 401
        except Exception as e:
            return jsonify({
                'message' : 'An error occurred while validating the token.',
                'error': str(e)
            }), 500
            
        # Pass the authenticated user object to the decorated route function
        return f(current_user, *args, **kwargs)
  
    return decorated

