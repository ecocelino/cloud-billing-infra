# Define the business rule constants
months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
RENAME_MONTH_INDEX = 4  # Corresponds to May
TRANSFER_MONTH_INDEX = 5 # Corresponds to June
TRANSFER_YEAR = 2025

# --- NEW: Define target projects for cost distribution ---
DISTRIBUTION_TARGET_PROJECT_CODES = ['BPS', 'CASHBOX', 'MRDELIVERY', 'MULTIPAY', 'OVR', 'TXTBOX']

def process_billing_data(data):
    """
    Applies specific business rules to the raw billing data.
    """
    if not data:
        return []

    # --- Step 1: Initial Transformations (Rules 1 and 2) ---
    initial_transformed_data = []
    for item in data:
        processed_item = item.copy()
        project_name = (processed_item.get('project_name') or '').strip()
        service_description = (processed_item.get('service_description') or '').strip()
        year = processed_item.get('billing_year')
        month = processed_item.get('billing_month')

        # Rule 1: Rename "[Charges not specific to a project]"
        if project_name == '[Charges not specific to a project]' and year and month:
            try:
                month_index = months.index(month)
                if year < TRANSFER_YEAR or (year == TRANSFER_YEAR and month_index <= RENAME_MONTH_INDEX):
                    processed_item['project_name'] = 'Netenrich Resolution Intelligence Cloud'
                elif year > TRANSFER_YEAR or (year == TRANSFER_YEAR and month_index >= TRANSFER_MONTH_INDEX):
                    processed_item['project_name'] = 'ai-research-and-development'
            except (ValueError, TypeError):
                pass

        # Rule 2: Move specific services between projects
        services_to_move = ['Cloud IDS', 'Network Security']
        if project_name == 'multisys-hostnet-prod-1' and service_description in services_to_move:
            processed_item['project_name'] = 'ms-multipay-prod-1'

        initial_transformed_data.append(processed_item)

    # --- Step 2: New Cost Distribution Logic (Rule 3) ---
    
    # Find the project IDs for the target codes
    # Note: This is a simplified approach. A more robust solution would fetch this from the database.
    # We assume the project name format is consistent (e.g., 'bps-prod-1')
    target_project_names = [f"{code.lower()}-prod-1" for code in DISTRIBUTION_TARGET_PROJECT_CODES] # Example, adjust if needed

    # Calculate total costs for the source project per month
    source_project_costs_by_month = {}
    for item in initial_transformed_data:
        if item['project_name'] == 'multisys-hostnet-prod-1':
            month = item['billing_month']
            if month not in source_project_costs_by_month:
                source_project_costs_by_month[month] = 0.0
            source_project_costs_by_month[month] += item['cost']

    # Create the new distributed cost records
    distributed_cost_items = []
    num_targets = len(DISTRIBUTION_TARGET_PROJECT_CODES)
    if num_targets > 0:
        for month, total_cost in source_project_costs_by_month.items():
            cost_per_target = total_cost / num_targets
            for project_name in target_project_names:
                # Find a sample item to get year, platform etc.
                sample_item = next((item for item in initial_transformed_data if item['billing_month'] == month), None)
                if sample_item:
                    distributed_cost_items.append({
                        'project_name': project_name,
                        'billing_year': sample_item.get('billing_year'),
                        'billing_month': month,
                        'platform': sample_item.get('platform'),
                        'service_description': 'Shared Infrastructure Costs',
                        'sku_description': 'Distributed from multisys-hostnet-prod-1',
                        'type': 'cost',
                        'cost': cost_per_target,
                        # Set other fields to null or default
                        'id': f"dist-{project_name}-{month}",
                        'project_id': None 
                    })

    # --- Step 3: Combine and Finalize ---
    
    # Filter out the original source project
    final_data = [item for item in initial_transformed_data if item['project_name'] != 'multisys-hostnet-prod-1']
    
    # Add the new distributed cost items
    final_data.extend(distributed_cost_items)

    return final_data

