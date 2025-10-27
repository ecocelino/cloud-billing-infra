from flask import Flask
from flask_cors import CORS
from models import db
from config import Config
from flask_migrate import Migrate # 👈 1. ADD THIS IMPORT

# Blueprints
from routes.users import users_bp
from routes.billing import billing_bp
from routes.projects import projects_bp
from routes.pricing import pricing_bp
from routes.budgets import budgets_bp
from routes.forecasting import forecasting_bp
from routes.anomalies import anomalies_bp
from routes.business_rules import business_rules_bp
from routes.reports import reports_bp

app = Flask(__name__)

# Load configuration from config.py
app.config.from_object(Config)

# Enable CORS globally for all /api/* routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize database
db.init_app(app)

# 👈 2. ADD THIS LINE TO INITIALIZE FLASK-MIGRATE
migrate = Migrate(app, db)

# Register blueprints
app.register_blueprint(users_bp)
app.register_blueprint(billing_bp)
app.register_blueprint(projects_bp)
app.register_blueprint(pricing_bp)
app.register_blueprint(budgets_bp)
app.register_blueprint(forecasting_bp)
app.register_blueprint(anomalies_bp)
app.register_blueprint(business_rules_bp)
app.register_blueprint(reports_bp)

if __name__ == "__main__":
    # The db.create_all() command is removed.
    # Use 'flask db upgrade' to create/update tables.
    app.run(host="0.0.0.0", port=5000, debug=True)