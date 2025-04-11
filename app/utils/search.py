import re
from typing import Dict, List, Optional, Tuple, Any
import Levenshtein

def normalize_text(text: str) -> str:
    """Normalize text for consistent matching."""
    if not text:
        return ""
    # Convert to lowercase, remove extra spaces and standardize punctuation
    normalized = re.sub(r'\s+', ' ', text.lower().strip())
    normalized = re.sub(r'[_\-+]', ' ', normalized)  # Convert separators to spaces
    return normalized

def calculate_similarity(query: str, target: str) -> float:
    """Calculate similarity score between query and target string."""
    if not query or not target:
        return 0.0
    
    query = normalize_text(query)
    target = normalize_text(target)
    
    # Perfect match gets highest score
    if query == target:
        return 1.0
    
    # Prefix match gets high score
    if target.startswith(query):
        return 0.95  # Slightly higher than before
    
    # Words match in any order (better for multi-word queries)
    query_words = set(query.split())
    target_words = set(target.split())
    if query_words and query_words.issubset(target_words):
        return 0.9
    
    # Substring match gets good score
    if query in target:
        return 0.85
    
    # Calculate Levenshtein distance-based similarity
    max_len = max(len(query), len(target))
    if max_len == 0:
        return 0.0
    
    distance = Levenshtein.distance(query, target)
    similarity = 1.0 - (distance / max_len)
    
    return max(0.0, similarity)

def find_matches(query: str, items: Dict[str, Any], 
                key_field: str = None, threshold: float = 0.5) -> List[Tuple[str, float]]:
    """Find items matching the query with similarity scores."""
    query = normalize_text(query)
    if not query:
        return []
    
    results = []
    
    for item_key, item_value in items.items():
        if key_field and isinstance(item_value, dict):
            target = item_value.get(key_field, "")
        else:
            target = item_key
            
        score = calculate_similarity(query, target)
        if score >= threshold:
            results.append((item_key, score))
    
    # Sort by score in descending order
    return sorted(results, key=lambda x: x[1], reverse=True)

def search_brands_and_models(query: str, brands_data: Dict) -> Dict[str, Any]:
    """Search through brands and models to find matches."""
    normalized_query = normalize_text(query)
    if not normalized_query:
        return {"brands": [], "models": []}
    
    # Search for brand matches
    brand_matches = find_matches(normalized_query, brands_data, threshold=0.5)
    
    # Use the find_matches function for models too by creating a flat dictionary
    model_dict = {}
    for brand, brand_data in brands_data.items():
        if "models" not in brand_data:
            continue
            
        for model in brand_data["models"]:
            model_name = model.get("model", "")
            if model_name:
                # Use "brand:model" as key to keep track of both
                model_dict[f"{brand}:{model_name}"] = {
                    "name": model_name,
                    "image": model.get("model_image", "")
                }
    
    # Find matching models
    model_matches = find_matches(normalized_query, model_dict, key_field="name", threshold=0.5)
    
    # Transform model_matches back to the expected format
    formatted_models = []
    for key, score in model_matches:
        brand, model_name = key.split(":", 1)
        formatted_models.append({
            "brand": brand,
            "model": model_name,
            "model_image": model_dict[key].get("image", ""),
            "score": score
        })
    
    return {
        "brands": [{"brand": brand, "score": score} for brand, score in brand_matches],
        "models": formatted_models
    }