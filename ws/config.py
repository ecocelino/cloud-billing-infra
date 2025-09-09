import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'a_default_secret_key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Database configuration
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_DATABASE = os.getenv("DB_DATABASE")

    # Construct the database URI
    # Default to a local sqlite DB if no credentials are provided
    if DB_USER and DB_PASSWORD and DB_HOST and DB_DATABASE:
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_DATABASE}"
        )
    else:
        # Fallback to a simple SQLite database if .env is not configured
        SQLALCHEMY_DATABASE_URI = "sqlite:///app.db"

