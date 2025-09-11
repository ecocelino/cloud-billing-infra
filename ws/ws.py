from flask import Flask
from flask_cors import CORS
from models import db
from config import Config

# Blueprints
from routes.users import users_bp
from routes.billing import billing_bp
from routes.projects import projects_bp
from routes.pricing import pricing_bp
# --- ADDED: Import the new budgets blueprint ---
from routes.budgets import budgets_bp

app = Flask(__name__)

# Load configuration from config.py
app.config.from_object(Config)

# Enable CORS globally for all /api/* routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize database
db.init_app(app)

# Register blueprints
app.register_blueprint(users_bp)
app.register_blueprint(billing_bp)
app.register_blueprint(projects_bp)
app.register_blueprint(pricing_bp)
# --- ADDED: Register the new budgets blueprint ---
app.register_blueprint(budgets_bp)

if __name__ == "__main__":
    with app.app_context():
        # This will create tables based on your models in models.py
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
