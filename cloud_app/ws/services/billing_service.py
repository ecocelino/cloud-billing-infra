from models import db, BusinessRule
from datetime import date

# This file acts as a generic "rule engine". It fetches rules from the
# database and applies their logic to the billing data. All specific
# details (project names, dates, etc.) are stored in the database,
# not hardcoded here.

months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

def apply_business_rules(data, project_map):
    """
    Applies dynamic business rules from the database to the raw billing data.
    """
    if not data:
        return []

    # Query for rules that are active AND whose date range includes the billing item's date
    rules = BusinessRule.query.filter_by(is_active=True).order_by(BusinessRule.id).all()
    
    if not rules:
        return data

    # Separate rules by type for a logical processing order
    rename_rules = [r for r in rules if r.rule_type == 'RENAME_PROJECT']
    move_rules = [r for r in rules if r.rule_type == 'MOVE_SERVICE']
    distribute_rules = [r for r in rules if r.rule_type == 'DISTRIBUTE_COST']
    
    initial_transformed_data = []
    for item in data:
        processed_item = item.copy()
        
        try:
            item_month_index = months.index(item.get('billing_month'))
            item_date = date(item.get('billing_year'), item_month_index + 1, 1)
        except (ValueError, TypeError):
            initial_transformed_data.append(processed_item)
            continue

        # Apply rename rules
        for rule in rename_rules:
            if (rule.start_date and item_date < rule.start_date) or \
               (rule.end_date and item_date > rule.end_date):
                continue 

            config = rule.config
            if processed_item.get('project_name') == config.get('source_project_name'):
                processed_item['project_name'] = config.get('new_project_name')
                
        # Apply service movement rules
        for rule in move_rules:
            if (rule.start_date and item_date < rule.start_date) or \
               (rule.end_date and item_date > rule.end_date):
                continue

            config = rule.config
            if (processed_item.get('project_name') == config.get('from_project') and 
                processed_item.get('service_description') in config.get('services', [])):
                processed_item['project_name'] = config.get('to_project')

        initial_transformed_data.append(processed_item)

    # Apply Cost Distribution rules
    final_data = []
    for rule in distribute_rules:
        config = rule.config
        source_project = config.get('source_project')
        target_project_names = config.get('target_project_names', [])
        
        items_from_this_source = []
        remaining_items = []

        for item in initial_transformed_data:
            try:
                item_month_index = months.index(item.get('billing_month'))
                item_date = date(item.get('billing_year'), item_month_index + 1, 1)
            except (ValueError, TypeError):
                remaining_items.append(item)
                continue

            if (rule.start_date and item_date < rule.start_date) or \
               (rule.end_date and item_date > rule.end_date):
                remaining_items.append(item)
                continue

            if item.get('project_name') == source_project:
                items_from_this_source.append(item)
            else:
                remaining_items.append(item)
        
        num_targets = len(target_project_names)
        if num_targets > 0:
            for source_item in items_from_this_source:
                cost_per_target = source_item.get('cost', 0) / num_targets
                for target_name in target_project_names:
                    new_item = source_item.copy()
                    new_item['project_name'] = target_name
                    new_item['cost'] = cost_per_target
                    new_item['id'] = f"dist-{source_item.get('id', '')}-{target_name}"
                    new_item['project_id'] = project_map.get(target_name)
                    
                    final_data.append(new_item)
        
        initial_transformed_data = remaining_items
    
    final_data.extend(initial_transformed_data)

    return final_data