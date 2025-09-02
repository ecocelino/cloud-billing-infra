from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import mysql.connector
import time
import sys
from mysql.connector import pooling
import pandas as pd
import io
from werkzeug.security import generate_password_hash, check_password_hash

# --- Main App Definition ---
app = Flask(__name__)
CORS(app)

# --- Database Configuration ---
db_config = {"user": os.getenv("DB_USER"), "password": os.getenv("DB_PASSWORD"), "host": os.getenv("DB_HOST"), "database": os.getenv("DB_DATABASE")}
db_pool = None

def get_db_connection():
    return db_pool.get_connection()

def wait_for_db():
    global db_pool
    for attempt in range(15):
        try:
            conn = mysql.connector.connect(**db_config)
            conn.close()
            print("MySQL database is ready!", file=sys.stderr)
            db_pool = pooling.MySQLConnectionPool(pool_name="db_pool", pool_size=10, **db_config)
            return
        except mysql.connector.Error as err:
            print(f"Attempt {attempt + 1}/15: MySQL not ready. Waiting...", file=sys.stderr)
            time.sleep(5)
    print("Could not connect to MySQL. Exiting.", file=sys.stderr)
    sys.exit(1)

def setup_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL)")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY, project_name VARCHAR(255) NOT NULL UNIQUE,
            project_code VARCHAR(255), environment VARCHAR(255), owner VARCHAR(255), team VARCHAR(255)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS monthly_service_costs (
            id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, billing_year INT NOT NULL, 
            billing_month VARCHAR(10) NOT NULL, platform VARCHAR(10) NOT NULL, 
            service_description VARCHAR(255), sku_description VARCHAR(255), type VARCHAR(255), 
            cost DECIMAL(10,2) DEFAULT 0.00, FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)
    
    cursor.execute("SELECT * FROM users WHERE username = 'admin'")
    if not cursor.fetchone():
        hashed_password = generate_password_hash('password', method='pbkdf2:sha256')
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", ('admin', hashed_password))
        print("Default admin user created.", file=sys.stderr)

    conn.commit()
    cursor.close()
    conn.close()

# --- API Routes ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        return jsonify({'message': 'Login successful'}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401
        
@app.route('/api/projects/meta/all', methods=['GET'])
def get_all_project_meta():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT project_name, project_code, environment, owner, team FROM projects")
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    meta = { 
        r['project_name']: { 'projectCode': r['project_code'] or '', 'environment': r['environment'] or '', 'owner': r['owner'] or '', 'team': r['team'] or '' } 
        for r in results 
    }
    return jsonify(meta)

@app.route('/api/projects/meta', methods=['PUT'])
def update_project_meta():
    data = request.json
    project_name = data.get('project_name')
    project_code = data.get('project_code')
    environment = data.get('environment')
    owner = data.get('owner')
    team = data.get('team')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE projects SET project_code = %s, environment = %s, owner = %s, team = %s WHERE project_name = %s", (project_code, environment, owner, team, project_name))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Project meta updated successfully.'}), 200

@app.route('/api/billing/upload_csv', methods=['POST'])
def upload_billing_csv():
    if 'file' not in request.files or 'month' not in request.form or 'platform' not in request.form or 'year' not in request.form:
        return jsonify({'error': 'File, month, year, or platform parameter is missing'}), 400
    file = request.files['file']
    month = request.form['month']
    platform = request.form['platform']
    year = int(request.form['year'])
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        content = file.read().decode('utf-8')
        df = pd.read_csv(io.StringIO(content))
        df.columns = [col.strip().lower() for col in df.columns]
        cost_col_name = 'cost ($)' if 'cost ($)' in df.columns else 'cost'
        if 'project name' not in df.columns or not cost_col_name:
            return jsonify({'error': "CSV must contain 'Project name' and 'Cost' or 'Cost ($)' columns."}), 400
        
        cursor.execute("DELETE FROM monthly_service_costs WHERE billing_year = %s AND billing_month = %s AND platform = %s", (year, month, platform))
        
        items_added = 0
        for index, row in df.iterrows():
            project_name = row.get('project name')
            cost = row.get(cost_col_name)
            if pd.isna(project_name) or pd.isna(cost) or cost <= 0: continue
            cursor.execute("SELECT id FROM projects WHERE project_name = %s", (project_name,))
            project = cursor.fetchone()
            if not project:
                cursor.execute("INSERT INTO projects (project_name) VALUES (%s)", (project_name,))
                project_id = cursor.lastrowid
            else:
                project_id = project[0]
            cursor.execute(
                "INSERT INTO monthly_service_costs (project_id, billing_year, billing_month, platform, service_description, sku_description, type, cost) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (project_id, year, month, platform, row.get('service description'), row.get('sku description'), row.get('type'), cost)
            )
            items_added += 1
        conn.commit()
        
        if items_added == 0:
            return jsonify({'message': 'File processed, but no new data with cost > 0 was found to add.'}), 200
        return jsonify({'message': f"Successfully added {items_added} billing items for {month.capitalize()} {year}."}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/billing/services', methods=['GET'])
def get_billing_services():
    platform = request.args.get('platform')
    year = request.args.get('year', None)
    month = request.args.get('month', None)
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = "SELECT p.project_name, msc.* FROM monthly_service_costs msc JOIN projects p ON msc.project_id = p.id"
    conditions = []
    params = []
    if platform and platform.lower() != 'all':
        conditions.append("msc.platform = %s")
        params.append(platform)
    if year:
        conditions.append("msc.billing_year = %s")
        params.append(int(year))
    if month:
        conditions.append("msc.billing_month = %s")
        params.append(month)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    cursor.execute(query, params)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(results)

# --- App Initialization ---
if __name__ == '__main__':
    with app.app_context():
        wait_for_db()
        setup_database()
    app.run(host='0.0.0.0', port=5000)