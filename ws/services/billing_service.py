# Define the business rule constants
months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
RENAME_MONTH_INDEX = 4  # Corresponds to May
TRANSFER_MONTH_INDEX = 5 # Corresponds to June
TRANSFER_YEAR = 2025

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

    # --- Step 2: New, More Accurate Cost Distribution Logic (Rule 3) ---
    
    # This logic assumes a consistent naming convention for target projects.
    # e.g., a project code 'BPS' maps to a project name like 'ms-bps-prod-1'.
    # Adjust this line if your naming convention is different.
    target_project_names = [f"ms-{code.lower()}-prod-1" for code in DISTRIBUTION_TARGET_PROJECT_CODES]
    
    # Separate the source project's items from the rest of the data
    source_items = []
    other_items = []
    for item in initial_transformed_data:
        if item['project_name'] == 'multisys-hostnet-prod-1':
            source_items.append(item)
        else:
            other_items.append(item)

    # Create the new, distributed line items
    distributed_items = []
    num_targets = len(target_project_names)
    if num_targets > 0:
        # Iterate through each individual line item from the source project
        for source_item in source_items:
            cost_per_target = source_item['cost'] / num_targets
            
            # Create a new, distributed line item for each target project
            for target_name in target_project_names:
                new_item = source_item.copy() # Copy all details (SKU, service, etc.)
                new_item['project_name'] = target_name
                new_item['cost'] = cost_per_target
                new_item['id'] = f"dist-{source_item['id']}-{target_name}" # Create a new unique ID
                new_item['project_id'] = None # Project ID will be resolved by frontend aggregation
                distributed_items.append(new_item)

    # The final dataset is the other items plus the new, distributed items
    final_data = other_items + distributed_items

    return final_data

