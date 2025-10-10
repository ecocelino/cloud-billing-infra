1. 📘 Introduction
Cloud Cost System is a full-stack web application designed to ingest, analyze, and manage cloud billing data. It provides dashboards for cost visualization, tools for budget management, and a dynamic rules engine to transform and attribute costs according to business needs. The primary goal of the system is to provide clarity on cloud spending and empower teams with the data to make informed financial decisions.

2. 🏗️ System Architecture
The application is built on a modern, containerized architecture composed of three main tiers.

Frontend: A Single Page Application (SPA) built with React. It is responsible for all user interface elements and client-side interactions.

Key Libraries: Tailwind CSS (styling), Chart.js (data visualization), React Router (navigation), Lucide React (icons).

Backend: A RESTful API built with the Flask micro-framework in Python. It handles business logic, data processing, authentication, and communication with the database.

Key Libraries: SQLAlchemy (ORM), Flask-Migrate (database migrations), PyJWT (authentication), Pandas (CSV processing), Scikit-learn (forecasting).

Database: A relational database (MySQL) used to persist all application data.

Containerization: The entire application stack (frontend, backend, database) is designed to be run and managed using Docker and Docker Compose, ensuring a consistent and reproducible environment for development and deployment.

3. ✨ Core Features
The application is divided into several key modules, each providing a distinct set of functionalities.

Authentication & Profile
JWT-based Login: Secure authentication with JSON Web Tokens.

Role-Based Access Control: Three user roles (user, admin, superadmin) with different permissions.

User Profile: A page for users to update their own email and password.

Session Persistence: A "Remember Me" feature to keep users logged in.

Password Reset: A UI for a "Forgot Password" flow.

📊 Dashboard
KPI Cards: At-a-glance view of key metrics like Total Spend, Month-over-Month Trend, Average Monthly Spend, and Top Project.

Interactive Charts: A main bar chart for monthly cost trends and a secondary pie/bar chart for project or service breakdown. Clicking on the project chart filters the entire dashboard.

Cost Forecasting: A dashed line on the main chart predicts future costs for "All Projects" or a single selected project. A dedicated KPI card shows the next month's forecast.

Anomaly Alerts: A prominent widget that appears on the dashboard to notify admins of significant, unexpected monthly cost spikes.

🗂️ Data Management & Views
Billing: A page for admins to upload monthly billing CSVs and a yearly heatmap view of all project costs.

Projects: A detailed table view of all projects with their associated metadata (code, owner, team). Rows can be expanded to show a granular service-by-service cost breakdown for any given month.

Budgets: A comprehensive interface for setting and tracking monthly budgets against actual spending for each project, featuring visual progress bars.

Pricing: An admin-only section for managing and editing internal pricing tiers.

⚙️ Dynamic Business Rules
Admin UI: A dedicated settings page for admins to create, edit, activate/deactivate, and delete business rules without needing to change any code.

Rule Types: Supports several types of data transformations:

Rename Project: For general-purpose renaming of projects in historical data.

Transfer Costing: For moving costs from a generic bucket to a specific project.

Move Service: For moving a specific service's cost from one project to another.

Distribute Cost: For splitting the costs of a shared project evenly among several target projects.

Rule Duration: Rules can be set to run indefinitely or only within a specific Start Date and End Date.

4. 💾 Database Schema
The database consists of several tables that model the application's data, managed by SQLAlchemy and Flask-Migrate.

User: Stores user credentials, email, role, and assignments.

Project: Stores project names and their associated metadata.

Billing: Stores individual billing line items from the uploaded CSVs.

Budget: Stores monthly budget amounts per project and year.

BusinessRule: Stores the definition, type, status, duration, and JSON configuration for each rule.

Anomaly: Stores records of detected cost anomalies.

ExchangeRate: Stores currency exchange rates.

5. 🔌 API Endpoints
The Flask backend provides the following key API endpoints:

Endpoint	Method	Description	Required Role
/api/login	POST	Authenticates a user and returns a JWT.	Public
/api/profile	PUT	Allows a logged-in user to update their profile.	User, Admin
/api/users	GET, POST	Fetches all users or creates a new user.	Admin
/api/users/<id>	PUT, DELETE	Updates or deletes a specific user.	Admin
/api/billing/upload_csv	POST	Uploads and processes a monthly billing CSV.	Admin
/api/billing/services	GET	Fetches detailed billing data for the app.	User, Admin
/api/budgets/<year>	GET	Fetches all budgets for a given year.	User, Admin
/api/business-rules	GET, POST	Fetches all rules or creates a new rule.	Admin
/api/business-rules/<id>	PUT	Updates a specific rule.	Admin
/api/anomalies/unread	GET	Fetches unacknowledged cost anomalies.	User, Admin
/api/forecasting/...	GET	Fetches cost forecast data.	User, Admin

Export to Sheets
6. 🛠️ Local Development Setup
To run the application locally, you will need Docker and Docker Compose installed.

Configuration:

In the backend directory, create a .env file and define your database connection string and a secret key:

SECRET_KEY='a_very_secret_key'
SQLALCHEMY_DATABASE_URI='mysql+pymysql://user:password@db/inventory'
In the frontend directory, create a .env file to point to the backend API:

REACT_APP_API_URL=http://localhost:5000/api
Run the Application:

From the project's root directory (where docker-compose.yml is), run:

Bash

docker-compose up --build
The frontend will be available at http://localhost:3000.

First-Time Database Setup:

Once the containers are running, open a new terminal and get a shell inside the backend container:

Bash

docker-compose exec backend sh
Inside the container, run the following commands to initialize and set up the database:

Bash

# Set the Flask app context
export FLASK_APP=ws.py

# Initialize the migrations folder (only run this once ever)
flask db init

# Create the initial migration script
flask db migrate -m "Initial migration"

# Apply the migration to create the tables
flask db upgrade
Exit the container shell.

Create the First Admin User:

With the backend running, send a request to the setup endpoint:

Bash

curl -X POST http://localhost:5000/api/setup_admin
You can now log in at http://localhost:3000 with username admin and password admin123.