import re
from typing import Dict, List, Optional, Tuple, Any, Set
from difflib import SequenceMatcher
import string

class PhoneSearchEngine:
    """Advanced phone search engine with precise matching algorithms."""
    
    def __init__(self):
        # Comprehensive brand mappings including aliases
        self.brand_aliases = {
            'samsung': ['samsung', 'galaxy'],
            'apple': ['apple', 'iphone'],
            'xiaomi': ['xiaomi', 'mi', 'redmi', 'poco'],
            'huawei': ['huawei', 'honor'],
            'oppo': ['oppo', 'oneplus'],
            'google': ['google', 'pixel'],
            'nokia': ['nokia', 'hmd'],
            'motorola': ['motorola', 'moto'],
            'sony': ['sony', 'xperia'],
            'lg': ['lg'],
            'asus': ['asus', 'rog'],
            'vivo': ['vivo', 'iqoo'],
            'realme': ['realme'],
            'nothing': ['nothing'],
            'fairphone': ['fairphone'],
            'blackberry': ['blackberry']
        }
        
        # Series patterns for better model recognition
        self.series_patterns = {
            'samsung': {
                'galaxy_s': r'(?:galaxy\s+)?s\s*(\d{1,2})(?:\s+(ultra|plus|fe))?',
                'galaxy_note': r'(?:galaxy\s+)?note\s*(\d{1,2})(?:\s+(ultra))?',
                'galaxy_a': r'(?:galaxy\s+)?a\s*(\d{1,2})',
                'galaxy_m': r'(?:galaxy\s+)?m\s*(\d{1,2})',
                'galaxy_z': r'(?:galaxy\s+)?z\s*(fold|flip)\s*(\d)?',
            },
            'apple': {
                'iphone': r'(?:iphone\s+)?(\d{1,2})(?:\s+(pro|max|plus|mini))*',
                'iphone_se': r'(?:iphone\s+)?se(?:\s+(\d+))?',
            },
            'google': {
                'pixel': r'pixel\s+(\d{1,2})?(?:\s+(pro|xl|a))?',
            },
            'xiaomi': {
                'mi': r'mi\s+(\d{1,2})(?:\s+(pro|ultra|lite))?',
                'redmi': r'redmi\s+(?:note\s+)?(\d{1,2})(?:\s+(pro|ultra|s))?',
                'poco': r'poco\s+([a-z]\d+)(?:\s+(pro))?',
            }
        }
        
        # Common model modifiers
        self.modifiers = {
            'premium': ['ultra', 'pro', 'max', 'plus'],
            'budget': ['lite', 'mini', 'se', 'fe'],
            'special': ['edge', 'note', 'fold', 'flip']
        }

    def normalize_text(self, text: str) -> str:
        """Advanced text normalization."""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Handle special characters and punctuation
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Normalize spaces
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Handle common phone naming variations
        text = re.sub(r'\bsamsung\s+galaxy\b', 'samsung galaxy', text)
        text = re.sub(r'\biphone\s+(\d+)', r'iphone \1', text)
        text = re.sub(r'\b(\d+)\s*gb\b', '', text)  # Remove storage mentions
        
        return text

    def extract_phone_components(self, text: str) -> Dict[str, Any]:
        """Extract all components from phone search query."""
        normalized = self.normalize_text(text)
        components = {
            'brands': [],
            'series': [],
            'models': [],
            'numbers': [],
            'modifiers': [],
            'raw_query': normalized
        }
        
        # Extract brands (including aliases)
        for main_brand, aliases in self.brand_aliases.items():
            for alias in aliases:
                if alias in normalized:
                    components['brands'].append(main_brand)
                    break
        
        # Extract series and model information
        for brand, patterns in self.series_patterns.items():
            if brand in components['brands']:
                for series_name, pattern in patterns.items():
                    matches = re.finditer(pattern, normalized, re.IGNORECASE)
                    for match in matches:
                        components['series'].append(series_name)
                        if match.groups():
                            # Extract model number and modifiers
                            groups = [g for g in match.groups() if g]
                            components['models'].extend(groups)
        
        # Extract standalone numbers
        numbers = re.findall(r'\b\d{1,3}\b', normalized)
        components['numbers'] = [num for num in numbers if len(num) <= 3]
        
        # Extract modifiers
        all_modifiers = []
        for mod_category in self.modifiers.values():
            all_modifiers.extend(mod_category)
        
        for modifier in all_modifiers:
            if modifier in normalized:
                components['modifiers'].append(modifier)
        
        return components

    def calculate_brand_score(self, query_components: Dict, target_brand: str) -> float:
        """Calculate brand matching score."""
        if not query_components['brands']:
            return 0.0
        
        target_brand = target_brand.lower()
        
        # Exact brand match
        if target_brand in query_components['brands']:
            return 1.0
        
        # Check brand aliases
        for brand in query_components['brands']:
            if brand in self.brand_aliases:
                if target_brand in self.brand_aliases[brand]:
                    return 1.0
        
        # Fuzzy brand matching
        best_score = 0.0
        for brand in query_components['brands']:
            score = SequenceMatcher(None, brand, target_brand).ratio()
            best_score = max(best_score, score)
        
        return best_score

    def calculate_model_score(self, query_components: Dict, target_brand: str, target_model: str) -> float:
        """Calculate model matching score with advanced logic."""
        target_brand = target_brand.lower()
        target_model = target_model.lower()
        target_components = self.extract_phone_components(f"{target_brand} {target_model}")
        
        score = 0.0
        max_score = 0.0
        
        # 1. Exact model name matching (40% weight)
        model_weight = 0.4
        max_score += model_weight
        
        if query_components['models']:
            best_model_match = 0.0
            for q_model in query_components['models']:
                # Direct model name match
                if q_model in target_model:
                    best_model_match = 1.0
                    break
                
                # Check against extracted target models
                for t_model in target_components['models']:
                    if q_model == t_model:
                        best_model_match = 1.0
                        break
                    elif q_model in t_model or t_model in q_model:
                        best_model_match = max(best_model_match, 0.8)
                
                if best_model_match == 1.0:
                    break
            
            score += model_weight * best_model_match
        
        # 2. Number matching (35% weight) - Critical for phone models
        number_weight = 0.35
        max_score += number_weight
        
        if query_components['numbers']:
            best_number_match = 0.0
            for q_num in query_components['numbers']:
                # Check if number appears in target model
                if q_num in target_model:
                    best_number_match = 1.0
                    break
                
                # Check extracted numbers from target
                for t_num in target_components['numbers']:
                    if q_num == t_num:
                        best_number_match = 1.0
                        break
                    # Partial number match (e.g., "22" matches "s22")
                    elif abs(int(q_num) - int(t_num)) <= 1:
                        best_number_match = max(best_number_match, 0.7)
            
            score += number_weight * best_number_match
        
        # 3. Series matching (15% weight)
        series_weight = 0.15
        max_score += series_weight
        
        if query_components['series'] and target_components['series']:
            series_match = any(qs in target_components['series'] for qs in query_components['series'])
            if series_match:
                score += series_weight
        
        # 4. Modifier matching (10% weight)
        modifier_weight = 0.1
        max_score += modifier_weight
        
        if query_components['modifiers']:
            modifier_matches = 0
            for q_mod in query_components['modifiers']:
                if q_mod in target_model:
                    modifier_matches += 1
            
            if modifier_matches > 0:
                modifier_score = min(1.0, modifier_matches / len(query_components['modifiers']))
                score += modifier_weight * modifier_score
        
        return score / max_score if max_score > 0 else 0.0

    def calculate_fuzzy_similarity(self, query: str, target: str) -> float:
        """Advanced fuzzy string similarity."""
        query = self.normalize_text(query)
        target = self.normalize_text(target)
        
        if not query or not target:
            return 0.0
        
        # Multiple similarity metrics
        ratios = []
        
        # 1. Basic sequence matching
        ratios.append(SequenceMatcher(None, query, target).ratio())
        
        # 2. Word-based matching
        query_words = set(query.split())
        target_words = set(target.split())
        
        if query_words and target_words:
            intersection = query_words.intersection(target_words)
            union = query_words.union(target_words)
            jaccard = len(intersection) / len(union) if union else 0
            ratios.append(jaccard)
        
        # 3. Substring matching bonus
        if query in target:
            ratios.append(0.9)
        elif any(word in target for word in query.split()):
            ratios.append(0.7)
        
        # 4. Prefix/suffix matching
        if target.startswith(query) or target.endswith(query):
            ratios.append(0.8)
        
        # Return weighted average with emphasis on higher scores
        if ratios:
            ratios.sort(reverse=True)
            # Give more weight to higher scores
            weights = [0.5, 0.3, 0.15, 0.05][:len(ratios)]
            weighted_avg = sum(r * w for r, w in zip(ratios, weights)) / sum(weights[:len(ratios)])
            return weighted_avg
        
        return 0.0

    def search(self, query: str, brands_data: Dict) -> Dict[str, Any]:
        """Main search function with precise matching."""
        if not query or not query.strip():
            return {"brands": [], "models": []}
        
        # Extract components from query
        query_components = self.extract_phone_components(query)
        
        model_results = []
        brand_results = []
        
        # Search through all data
        for brand, brand_data in brands_data.items():
            # Brand scoring
            brand_score = self.calculate_brand_score(query_components, brand)
            if brand_score >= 0.7:
                brand_results.append({"brand": brand, "score": brand_score})
            
            # Model scoring
            if "models" not in brand_data:
                continue
            
            for model in brand_data["models"]:
                model_name = model.get("model", "")
                if not model_name:
                    continue
                
                # Calculate structured score
                structured_score = 0.0
                if query_components['brands'] or query_components['numbers'] or query_components['models']:
                    brand_match = self.calculate_brand_score(query_components, brand)
                    model_match = self.calculate_model_score(query_components, brand, model_name)
                    
                    # Combine brand and model scores
                    if brand_match > 0:
                        structured_score = (brand_match * 0.3) + (model_match * 0.7)
                
                # Calculate fuzzy score
                full_target = f"{brand} {model_name}"
                fuzzy_score = self.calculate_fuzzy_similarity(query, full_target)
                
                # Use the best score
                final_score = max(structured_score, fuzzy_score)
                
                # Apply minimum threshold
                if final_score >= 0.4:
                    model_results.append({
                        "brand": brand,
                        "model": model_name,
                        "model_image": model.get("model_image", ""),
                        "score": final_score
                    })
        
        # Sort and filter results
        model_results.sort(key=lambda x: x["score"], reverse=True)
        brand_results.sort(key=lambda x: x["score"], reverse=True)
        
        # Smart filtering - if we have very good matches, filter out poor ones
        if model_results:
            top_score = model_results[0]["score"]
            if top_score > 0.85:
                # Keep only high-quality results
                threshold = max(0.7, top_score - 0.3)
                model_results = [r for r in model_results if r["score"] >= threshold]
            elif top_score > 0.7:
                # Moderate filtering
                threshold = max(0.5, top_score - 0.4)
                model_results = [r for r in model_results if r["score"] >= threshold]
        
        return {
            "brands": brand_results[:5],
            "models": model_results[:20]
        }

# Global search engine instance
search_engine = PhoneSearchEngine()

def search_brands_and_models(query: str, brands_data: Dict) -> Dict[str, Any]:
    """Main entry point for phone search."""
    return search_engine.search(query, brands_data)

def normalize_text(text: str) -> str:
    """Backwards compatibility function."""
    return search_engine.normalize_text(text)

def find_matches(query: str, items: Dict[str, Any], 
                key_field: str = None, threshold: float = 0.7) -> List[Tuple[str, float]]:
    """Backwards compatibility function."""
    query = normalize_text(query)
    if not query:
        return []
    
    results = []
    for item_key, item_value in items.items():
        if key_field and isinstance(item_value, dict):
            target = item_value.get(key_field, "")
        else:
            target = item_key
            
        score = search_engine.calculate_fuzzy_similarity(query, target)
        if score >= threshold:
            results.append((item_key, score))
    
    return sorted(results, key=lambda x: x[1], reverse=True)