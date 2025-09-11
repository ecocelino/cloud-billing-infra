docker-compose -f docker-compose.yaml up --build
  
## To Create admin run the following

curl -X POST http://localhost:5000/api/setup_admin


Cloud Cost System
This is a full-stack web application for managing, visualizing, and reporting on cloud infrastructure costs. It features a Flask backend for API and data processing, and a React frontend for the user interface.

Local Installation (Without Docker)
This guide explains how to set up and run the application on your local machine.

Prerequisites
Before you begin, ensure you have the following installed:

Python (version 3.8 or higher)

Node.js (version 18 or higher) & npm

A running MySQL server instance

Step 1: Database Setup
Ensure your local MySQL server is running.

Create a new database for the application. You can name it inventory.

Create a dedicated user and password for this database and grant it all privileges.

Step 2: Backend Setup
Navigate to the Backend Directory:

cd ws

Create Environment File:
Create a new file named .env inside the ws directory. Copy the contents of the provided .env.example file into it and fill in your database credentials and API key.

Create and Activate Virtual Environment:

# Create the virtual environment
python -m venv venv

# Activate it (on macOS/Linux)
source venv/bin/activate

# Or on Windows
.\venv\Scripts\activate

Install Dependencies:

pip install -r requirements.txt

Run the Backend Server:
The backend will start on http://localhost:5000.

python ws.py

The first time you run this, it will automatically create all the necessary tables in your database.

(Important) Initialize Admin User:
In a new terminal window, run this command to create the default admin user.

curl -X POST http://localhost:5000/api/setup_admin

Step 3: Frontend Setup
Navigate to the Frontend Directory:
Open a new terminal window and navigate to the ui folder.

cd ui

Create Environment File:
Create a file named .env.local inside the ui directory and add the following line, ensuring it points to your running backend:

REACT_APP_API_URL=http://localhost:5000/api

Install Dependencies:

npm install

Run the Frontend Server:
The frontend will start on http://localhost:3000.

npm start

Your application should now be fully running locally. You can access it at http://localhost:3000 and log in with the default admin credentials (admin / admin123).