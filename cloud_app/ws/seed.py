from models import db, User
from werkzeug.security import generate_password_hash
from ws import app

with app.app_context():
    if not User.query.filter_by(username="admin").first():
        admin = User(
            username="admin",
            password_hash=generate_password_hash("password"),
            role="superadmin",
        )
        db.session.add(admin)
        db.session.commit()
        print("✅ Admin user created")
    else:
        print("ℹ️ Admin user already exists")
