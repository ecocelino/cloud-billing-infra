from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

db = SQLAlchemy()

# Association Table for User-Project many-to-many relationship
user_project_assignments = db.Table('user_project_assignments',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('project_id', db.Integer, db.ForeignKey('projects.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    # 🔹 ADDED: Email column for the User model
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    accessible_platforms = db.Column(db.JSON, nullable=True)
    
    # Relationship to assigned projects
    assigned_projects = db.relationship('Project', secondary=user_project_assignments, lazy='subquery',
        backref=db.backref('assigned_users', lazy=True))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    project_name = db.Column(db.String(100), unique=True, nullable=False)
    project_code = db.Column(db.String(50), nullable=True)
    environment = db.Column(db.String(50), nullable=True)
    owner = db.Column(db.String(100), nullable=True)
    team = db.Column(db.String(100), nullable=True)
    platform = db.Column(db.String(50), nullable=False)
    
    # Relationship to billing data
    billing_entries = db.relationship('Billing', backref='project', lazy=True)
    # Relationship to budgets
    budgets = db.relationship('Budget', backref='project', lazy=True, cascade="all, delete-orphan")


class Billing(db.Model):
    __tablename__ = 'billing_data'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    billing_year = db.Column(db.Integer, nullable=False)
    billing_month = db.Column(db.String(10), nullable=False)
    platform = db.Column(db.String(50), nullable=False)
    service_description = db.Column(db.String(255))
    sku_description = db.Column(db.String(255))
    type = db.Column(db.String(50))
    cost = db.Column(db.Numeric(10, 2))

class Budget(db.Model):
    __tablename__ = 'budgets'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.String(10), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    platform = db.Column(db.String(50), nullable=False)

class ExchangeRate(db.Model):
    __tablename__ = 'exchange_rates'
    id = db.Column(db.Integer, primary_key=True)
    source_currency = db.Column(db.String(3), nullable=False, default='USD')
    target_currency = db.Column(db.String(3), nullable=False, default='PHP')
    rate = db.Column(db.Numeric(10, 4), nullable=False)
    last_updated = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)

class Anomaly(db.Model):
    __tablename__ = 'anomalies'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    billing_year = db.Column(db.Integer, nullable=False)
    billing_month = db.Column(db.String(10), nullable=False)
    anomalous_cost = db.Column(db.Numeric(12, 2), nullable=False)
    average_cost = db.Column(db.Numeric(12, 2), nullable=False)
    is_acknowledged = db.Column(db.Boolean, default=False, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    platform = db.Column(db.String(50), nullable=False)

    project = db.relationship('Project')

class BusinessRule(db.Model):
    __tablename__ = 'business_rules'
    id = db.Column(db.Integer, primary_key=True) # This line fixes the error
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    rule_type = db.Column(db.String(50), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    config = db.Column(db.JSON, nullable=False)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    platform = db.Column(db.String(50), nullable=False)