#!/usr/bin/env python3
"""
Extract tokens from Figma Make theme.css
Creates design-tokens.json for backend/API

Usage: python extract_tokens.py
"""

import re
import json
from pathlib import Path
from datetime import datetime

# Paths
THEME_FILE = Path(__file__).parent / 'src/styles/theme.css'
OUTPUT_DIR = Path(__file__).parent / 'figma_exports'
OUTPUT_FILE = OUTPUT_DIR / 'design-tokens.json'

# Create output directory
OUTPUT_DIR.mkdir(exist_ok=True)
print(f'📁 Output directory: {OUTPUT_DIR}')

# Read theme.css
print(f'📖 Reading: {THEME_FILE}')
theme_content = THEME_FILE.read_text()

# Extract light mode (:root) and dark mode (.dark) tokens
def extract_variables(css_block):
    """Extract CSS variables from a CSS block."""
    tokens = {}
    # Match --variable-name: value;
    pattern = r'--([a-z0-9-]+):\s*([^;]+);'
    for match in re.finditer(pattern, css_block, re.IGNORECASE):
        name, value = match.groups()
        tokens[name] = value.strip()
    return tokens

# Get light mode tokens
root_match = re.search(r':root\s*{([^}]+)}', theme_content, re.DOTALL)
light_tokens = extract_variables(root_match.group(1)) if root_match else {}
print(f'✅ Extracted {len(light_tokens)} light mode tokens')

# Get dark mode tokens
dark_match = re.search(r'\.dark\s*{([^}]+)}', theme_content, re.DOTALL)
dark_tokens = extract_variables(dark_match.group(1)) if dark_match else {}
print(f'✅ Extracted {len(dark_tokens)} dark mode tokens')

# Categorize tokens
def categorize_tokens(tokens):
    """Organize tokens by category."""
    categorized = {
        'colors': {},
        'spacing': {},
        'typography': {},
        'effects': {},
        'other': {}
    }
    
    color_keywords = [
        'color', 'primary', 'secondary', 'accent', 'destructive',
        'background', 'foreground', 'border', 'muted', 'popover',
        'card', 'input', 'ring', 'chart', 'sidebar'
    ]
    
    for name, value in tokens.items():
        if any(keyword in name for keyword in color_keywords):
            categorized['colors'][name] = value
        elif any(keyword in name for keyword in ['radius', 'spacing', 'size']):
            categorized['spacing'][name] = value
        elif any(keyword in name for keyword in ['font', 'weight']):
            categorized['typography'][name] = value
        elif 'shadow' in name:
            categorized['effects'][name] = value
        else:
            categorized['other'][name] = value
    
    return categorized

light_categorized = categorize_tokens(light_tokens)
dark_categorized = categorize_tokens(dark_tokens)

# Create final output structure
design_tokens = {
    'version': '1.0.0',
    'timestamp': datetime.now().isoformat(),
    'source': 'figma_make_theme.css',
    'description': 'Design tokens automatically extracted from Figma Make generated theme.css',
    
    # All tokens in flat format
    'tokens': {
        'light': light_tokens,
        'dark': dark_tokens
    },
    
    # Organized by category
    'categorized': {
        'light': light_categorized,
        'dark': dark_categorized
    },
    
    # Metadata
    'metadata': {
        'total_light_tokens': len(light_tokens),
        'total_dark_tokens': len(dark_tokens),
        'generated_at': datetime.now().isoformat(),
        'tool': 'Figma Make Token Extractor (Python)'
    }
}

# Write to JSON
OUTPUT_FILE.write_text(json.dumps(design_tokens, indent=2))
print(f'\n✅ Tokens extracted successfully!')
print(f'📝 Output file: {OUTPUT_FILE}')
print(f'📊 Total tokens: {len(light_tokens)} (light) + {len(dark_tokens)} (dark)')

# Display summary
print(f'\n📋 Token Summary:')
print(f'   Colors:      {len(light_categorized["colors"])}')
print(f'   Spacing:     {len(light_categorized["spacing"])}')
print(f'   Typography: {len(light_categorized["typography"])}')
print(f'   Effects:     {len(light_categorized["effects"])}')
print(f'   Other:       {len(light_categorized["other"])}')

# Show sample
print(f'\n📦 Sample colors:')
for name, value in list(light_categorized['colors'].items())[:3]:
    print(f'   --{name}: {value}')

print(f'\n🚀 Next steps:')
print(f'   1. Commit figma_exports/design-tokens.json to git')
print(f'   2. Serve from backend: GET /api/design/tokens')
print(f'   3. Use in frontend: import tokens from design-tokens.json')
