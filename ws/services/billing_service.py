# services/billing_services.py

# Define the business rule constants
months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
RENAME_MONTH_INDEX = 4  # Corresponds to May
TRANSFER_MONTH_INDEX = 5 # Corresponds to June
TRANSFER_YEAR = 2025

def process_billing_data(data):
    """
    Applies specific business rules to the raw billing data.
    - Renames general project charges based on the date.
    - Moves specific service costs to a different project.
    """
    if not data:
        return []

    transformed_data = []
    for item in data:
        # We work with a copy of the item
        processed_item = item.copy()

        year = processed_item.get('billing_year')
        month = processed_item.get('billing_month')
        project_name = processed_item.get('project_name')
        service_description = processed_item.get('service_description')

        # Rule 1: Rename "[Charges not specific to a project]"
        if project_name == '[Charges not specific to a project]' and year and month:
            try:
                month_index = months.index(month)
                if year < TRANSFER_YEAR or (year == TRANSFER_YEAR and month_index <= RENAME_MONTH_INDEX):
                    processed_item['project_name'] = 'Netenrich Resolution Intelligence Cloud'
                elif year > TRANSFER_YEAR or (year == TRANSFER_YEAR and month_index >= TRANSFER_MONTH_INDEX):
                    processed_item['project_name'] = 'ai-research-and-development'
            except (ValueError, TypeError):
                # If month/year are invalid, just skip the transformation for this item
                pass

        # Rule 2: Move specific services between projects
        services_to_move = ['Cloud IDS', 'Network Security']
        if project_name == 'multisys-hostnet-prod-1' and service_description in services_to_move:
            processed_item['project_name'] = 'ms-multipay-prod-1'

        transformed_data.append(processed_item)

    return transformed_data