def get_brand_from_cache(brands_models_cache, product_id=None, brand_id=None):
    """
    Get brand name from the brands_models_cache by either product_id or brand_id
    
    Returns the brand name with proper capitalization, or "Unknown" if not found
    """
    # If we have a brand_id, find the brand directly
    if brand_id:
        for brand_name, brand_data in brands_models_cache.items():
            if brand_data["brand_id"] == brand_id:
                # Return with proper capitalization (e.g., "samsung" -> "Samsung")
                return brand_name.capitalize()
    
    # If we have a product_id, find which brand contains this model
    if product_id:
        for brand_name, brand_data in brands_models_cache.items():
            # Check if this model_id exists in any brand's models
            if any(model.get("id") == product_id or str(model.get("_id")) == product_id 
                  for model in brand_data["models"]):
                return brand_name.capitalize()
    
    return "Unknown"