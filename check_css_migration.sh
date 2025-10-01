#!/bin/bash

# Script to identify CSS files that still contain hardcoded colors
echo "=== CSS FILES WITH HARDCODED COLORS ==="
echo "Searching for files in app/static/css/ with hardcoded hex colors..."
echo

# Find files with hex colors
grep -r "#[0-9a-fA-F]\{3,6\}" app/static/css/ --include="*.css" | grep -v variables.css | grep -v design-system.css

echo
echo "=== CSS FILES WITH HARDCODED FONT PROPERTIES ==="
echo "Searching for files with hardcoded font sizes/weights..."
echo

# Find files with hardcoded font properties
grep -r "font-size:\|font-weight:\|font-family:" app/static/css/ --include="*.css" | grep -v variables.css | grep -v design-system.css | head -20

echo
echo "=== MIGRATION PRIORITY ==="
echo "High priority files to update:"
echo "1. product/product-sidebar.css - Contains product accent colors"
echo "2. product/product-icons.css - Contains dark background colors"  
echo "3. product/filter-bar.css - Contains many hardcoded colors"
echo "4. track-alerts.css - Contains status colors"
echo "5. mainpage.css - Contains typography and color overrides"