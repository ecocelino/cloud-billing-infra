from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(80), nullable=False, default='user')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Project(db.Model):
    __tablename__ = "projects"
    id = db.Column(db.Integer, primary_key=True)
    # Correctly map attributes to the database column names
    project_name = db.Column(db.String(255), unique=True, nullable=False)
    project_code = db.Column(db.String(50), unique=True)
    environment = db.Column(db.String(255))
    owner = db.Column(db.String(255))
    team = db.Column(db.String(255))

class Billing(db.Model):
    __tablename__ = "monthly_service_costs"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    billing_year = db.Column(db.Integer, nullable=False)
    billing_month = db.Column(db.String(10), nullable=False)
    platform = db.Column(db.String(10), nullable=False)
    service_description = db.Column(db.String(255))
    sku_description = db.Column(db.String(255))
    type = db.Column(db.String(255))
    cost = db.Column(db.Numeric(10, 2), default=0.00)

    project = db.relationship("Project", backref="billings")


