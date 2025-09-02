
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import mysql.connector
import time
import sys
from mysql.connector import pooling
import pandas as pd
import io
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/api/projects/meta/all', methods=['GET'])
def get_all_project_meta():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT project_name, project_code, environment FROM projects")
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    # Return as { project_name: { projectCode, environment } }
    meta = { r['project_name']: { 'projectCode': r['project_code'] or '', 'environment': r['environment'] or '' } for r in results }
    return jsonify(meta)

@app.route('/api/projects/meta', methods=['GET'])
def get_project_meta():
    project_name = request.args.get('project_name')
    if not project_name:
        return jsonify({'error': 'Missing project_name'}), 400
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT project_code, environment FROM projects WHERE project_name = %s", (project_name,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        return jsonify({'projectCode': '', 'environment': ''})
    return jsonify({'projectCode': result['project_code'] or '', 'environment': result['environment'] or ''})

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
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_name VARCHAR(255) NOT NULL UNIQUE,
            project_code VARCHAR(255),
            environment VARCHAR(255)
        )
    """)
    cursor.execute("CREATE TABLE IF NOT EXISTS aws_inventory (id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, awsAccount VARCHAR(255) NOT NULL, awsAccountAlias VARCHAR(255) NULL, type VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, region VARCHAR(255) NULL, cost DECIMAL(10, 2) NOT NULL, status VARCHAR(50) DEFAULT 'Active', FOREIGN KEY (project_id) REFERENCES projects(id))")
    cursor.execute("CREATE TABLE IF NOT EXISTS gcp_inventory (id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, type VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, cost DECIMAL(10, 2) NOT NULL, status VARCHAR(50) DEFAULT 'Active', FOREIGN KEY (project_id) REFERENCES projects(id))")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS monthly_costs (
            id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, billing_year INT NOT NULL, platform VARCHAR(10) NOT NULL,
            jan_cost DECIMAL(10, 2) DEFAULT 0.00, feb_cost DECIMAL(10, 2) DEFAULT 0.00, mar_cost DECIMAL(10, 2) DEFAULT 0.00,
            apr_cost DECIMAL(10, 2) DEFAULT 0.00, may_cost DECIMAL(10, 2) DEFAULT 0.00, jun_cost DECIMAL(10, 2) DEFAULT 0.00,
            jul_cost DECIMAL(10, 2) DEFAULT 0.00, aug_cost DECIMAL(10, 2) DEFAULT 0.00, sep_cost DECIMAL(10, 2) DEFAULT 0.00,
            oct_cost DECIMAL(10, 2) DEFAULT 0.00, nov_cost DECIMAL(10, 2) DEFAULT 0.00, dec_cost DECIMAL(10, 2) DEFAULT 0.00,
            FOREIGN KEY (project_id) REFERENCES projects(id), UNIQUE KEY (project_id, billing_year, platform)
        )
    """)
    cursor.execute("CREATE TABLE IF NOT EXISTS monthly_service_costs (id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, billing_year INT NOT NULL, billing_month VARCHAR(10) NOT NULL, platform VARCHAR(10) NOT NULL, service_description VARCHAR(255), sku_description VARCHAR(255), type VARCHAR(255), cost DECIMAL(10,2) DEFAULT 0.00, FOREIGN KEY (project_id) REFERENCES projects(id))")
    conn.commit()
    cursor.close()
    conn.close()

@app.route('/api/projects/meta', methods=['PUT'])
def update_project_meta():
    data = request.json
    project_name = data.get('project_name')
    project_code = data.get('project_code')
    environment = data.get('environment')
    if not project_name:
        return jsonify({'error': 'Missing project_name'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE projects SET project_code = %s, environment = %s WHERE project_name = %s", (project_code, environment, project_name))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Project meta updated successfully.'}), 200

with app.app_context():
    wait_for_db()
    setup_database()

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT 'AWS' as platform, i.*, p.project_name FROM aws_inventory i JOIN projects p ON i.project_id = p.id")
    aws_results = cursor.fetchall()
    cursor.execute("SELECT 'GCP' as platform, i.*, p.project_name FROM gcp_inventory i JOIN projects p ON i.project_id = p.id")
    gcp_results = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(aws_results + gcp_results)

@app.route('/api/inventory', methods=['POST'])
def add_inventory():
    new_item = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM projects WHERE project_name = %s", (new_item['project_name'],))
    project = cursor.fetchone()
    if not project:
        cursor.execute("INSERT INTO projects (project_name) VALUES (%s)", (new_item['project_name'],))
        conn.commit()
        project_id = cursor.lastrowid
    else:
        project_id = project[0]
    if new_item['platform'] == 'AWS':
        cursor.execute("INSERT INTO aws_inventory (project_id, awsAccount, awsAccountAlias, type, name, region, cost, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", (project_id, new_item.get('awsAccount'), new_item.get('awsAccountAlias'), new_item['type'], new_item['name'], new_item.get('region'), new_item['cost'], new_item.get('status', 'Active')))
    elif new_item['platform'] == 'GCP':
        cursor.execute("INSERT INTO gcp_inventory (project_id, type, name, cost, status) VALUES (%s, %s, %s, %s, %s)", (project_id, new_item['type'], new_item['name'], new_item['cost'], new_item.get('status', 'Active')))
    conn.commit()
    new_item['id'] = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify(new_item), 201

@app.route('/api/inventory/<int:item_id>', methods=['DELETE'])
def delete_inventory(item_id):
    platform = request.args.get('platform', 'AWS').upper()
    conn = get_db_connection()
    cursor = conn.cursor()
    table_name = "aws_inventory" if platform == "AWS" else "gcp_inventory"
    cursor.execute(f"DELETE FROM {table_name} WHERE id = %s", (item_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': f'Item with ID {item_id} deleted successfully.'}), 200

@app.route('/api/inventory/upload_gcp_csv', methods=['POST'])
def upload_gcp_csv():
    if 'file' not in request.files: return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({'error': 'No selected file'}), 400
    try:
        content = file.read().decode('utf-8')
        header_row_index = -1
        for i, line in enumerate(content.splitlines()):
            if "Project name" in line and "Service description" in line:
                header_row_index = i
                break
        df = pd.read_csv(io.StringIO(content), skiprows=header_row_index)
        # Accept both 'Cost ($)' and 'Cost' columns
        cost_col = None
        if 'Cost ($)' in df.columns:
            cost_col = 'Cost ($)'
        elif 'Cost' in df.columns:
            cost_col = 'Cost'
        else:
            return jsonify({'error': "CSV must contain a 'Cost ($)' or 'Cost' column."}), 400
        conn = get_db_connection()
        cursor = conn.cursor()
        items_added = 0
        for index, row in df.iterrows():
            project_name = row.get('Project name')
            cost = row.get(cost_col)
            if pd.isna(project_name) or cost <= 0: continue
            resource_type = row.get('Service description')
            resource_name = row.get('SKU description')
            cursor.execute("SELECT id FROM projects WHERE project_name = %s", (project_name,))
            project = cursor.fetchone()
            if not project:
                cursor.execute("INSERT INTO projects (project_name) VALUES (%s)", (project_name,))
                conn.commit()
                project_id = cursor.lastrowid
            else:
                project_id = project[0]
            cursor.execute("INSERT INTO gcp_inventory (project_id, type, name, cost, status) VALUES (%s, %s, %s, %s, %s)", (project_id, resource_type, resource_name, cost, 'Active'))
            items_added += 1
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': f'Successfully added {items_added} items.'}), 201
    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500

@app.route('/api/billing', methods=['GET'])
def get_billing_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    platform_filter = request.args.get('platform')
    query = "SELECT p.project_name, mc.* FROM monthly_costs mc JOIN projects p ON mc.project_id = p.id"
    params = []
    if platform_filter and platform_filter.lower() != 'all':
        query += " WHERE mc.platform = %s"
        params.append(platform_filter)
    cursor.execute(query, params)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(results)

@app.route('/api/billing/upload_csv', methods=['POST'])
def upload_billing_csv():
    if 'file' not in request.files or 'month' not in request.form or 'platform' not in request.form or 'year' not in request.form:
        return jsonify({'error': 'File, month, year, or platform parameter is missing'}), 400
    file = request.files['file']
    month = request.form['month']
    platform = request.form['platform']
    year = int(request.form['year'])
    valid_months = {'jan': 'jan_cost', 'feb': 'feb_cost', 'mar': 'mar_cost', 'apr': 'apr_cost','may': 'may_cost', 'jun': 'jun_cost', 'jul': 'jul_cost', 'aug': 'aug_cost','sep': 'sep_cost', 'oct': 'oct_cost', 'nov': 'nov_cost', 'dec': 'dec_cost'}
    if month not in valid_months: return jsonify({'error': 'Invalid month provided'}), 400
    month_column = valid_months[month]
    try:
        content = file.read().decode('utf-8')
        header_row_index = -1
        for i, line in enumerate(content.splitlines()):
            if "Project name" in line and ("Cost ($)" in line or "Cost" in line):
                header_row_index = i
                break
        df = pd.read_csv(io.StringIO(content), skiprows=header_row_index)
        cost_col = None
        if 'Cost ($)' in df.columns:
            cost_col = 'Cost ($)'
        elif 'Cost' in df.columns:
            cost_col = 'Cost'
        else:
            return jsonify({'error': "CSV must contain a 'Cost ($)' or 'Cost' column."}), 400
        conn = get_db_connection()
        cursor = conn.cursor()
        # Store service-level breakdowns in monthly_service_costs
        for index, row in df.iterrows():
            project_name = row.get('Project name')
            cost = row.get(cost_col)
            if pd.isna(project_name) or cost is None: continue
            cursor.execute("SELECT id FROM projects WHERE project_name = %s", (project_name,))
            project = cursor.fetchone()
            project_id = project[0] if project else None
            if not project_id:
                cursor.execute("INSERT INTO projects (project_name) VALUES (%s)", (project_name,))
                conn.commit()
                project_id = cursor.lastrowid
            # Insert service-level cost
            cursor.execute(
                """
                INSERT INTO monthly_service_costs (project_id, billing_year, billing_month, platform, service_description, sku_description, type, cost)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    project_id,
                    year,
                    month,
                    platform,
                    row.get('Service description'),
                    row.get('SKU description'),
                    row.get('Type'),
                    cost
                )
            )
        # Also update monthly_costs as before
        project_costs = df.groupby('Project name')[cost_col].sum().reset_index()
        for index, row in project_costs.iterrows():
            project_name, total_cost = row['Project name'], row[cost_col]
            if pd.isna(project_name): continue
            cursor.execute("SELECT id FROM projects WHERE project_name = %s", (project_name,))
            project = cursor.fetchone()
            project_id = project[0] if project else None
            if not project_id:
                cursor.execute("INSERT INTO projects (project_name) VALUES (%s)", (project_name,))
                conn.commit()
                project_id = cursor.lastrowid
            cursor.execute("INSERT INTO monthly_costs (project_id, billing_year, platform) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE project_id=project_id", (project_id, year, platform))
            update_query = f"UPDATE monthly_costs SET {month_column} = %s WHERE project_id = %s AND billing_year = %s AND platform = %s"
            print(f"Updating {month_column} for project_id={project_id}, year={year}, platform={platform} with value={total_cost}", file=sys.stderr)
            cursor.execute(update_query, (total_cost, project_id, year, platform))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': f"Successfully updated costs for the month of {month.capitalize()} {year}."}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500

@app.route('/api/billing/services', methods=['GET'])
def get_billing_services():
    platform = request.args.get('platform')
    year = request.args.get('year', None)
    month = request.args.get('month', None)
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT p.project_name, msc.billing_year, msc.billing_month, msc.platform, msc.service_description, msc.sku_description, msc.type, msc.cost
        FROM monthly_service_costs msc
        JOIN projects p ON msc.project_id = p.id
    """
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)