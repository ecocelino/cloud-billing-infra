from ws import db
from models import Project
import csv

def seed_projects_from_csv(csv_file):
    with open(csv_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        project_names = set()

        for row in reader:
            # Adjust the column if needed
            project_name = row.get("Project Name") or row.get("project_name")
            if project_name:
                project_names.add(project_name.strip())

        for name in project_names:
            existing = Project.query.filter_by(name=name).first()
            if not existing:
                db.session.add(Project(name=name))
        
        db.session.commit()
        print(f"Seeded {len(project_names)} projects.")

if __name__ == "__main__":
    seed_projects_from_csv("Multisys Technologies Corporation - Kollab_Cost table, 2025-08-01 — 2025-08-31 (1).csv")
