#!/usr/bin/env node

/**
 * Extract tokens from Figma Make theme.css
 * Creates design-tokens.json for backend/API
 * 
 * Usage: node extract-tokens.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your theme file
const THEME_FILE = path.join(__dirname, 'src/styles/theme.css');
const OUTPUT_FILE = path.join(__dirname, 'figma_exports/design-tokens.json');

// Create output directory if it doesn't exist
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Created directory: ${outputDir}`);
}

// Read the theme.css file
console.log(`📖 Reading: ${THEME_FILE}`);
const themeCss = fs.readFileSync(THEME_FILE, 'utf8');

// Parse CSS variables
const lightTokens = {};
const darkTokens = {};

// Split into light mode (:root) and dark mode (.dark)
const rootMatch = themeCss.match(/:root\s*{([^}]+)}/s);
const darkMatch = themeCss.match(/\.dark\s*{([^}]+)}/s);

// Helper function to extract variables from CSS block
function extractVariables(cssBlock) {
  const tokens = {};
  const varRegex = /--([a-z0-9-]+):\s*([^;]+);/gi;
  let match;

  while ((match = varRegex.exec(cssBlock)) !== null) {
    const name = match[1];
    const value = match[2].trim();
    tokens[name] = value;
  }

  return tokens;
}

// Extract light mode tokens
if (rootMatch) {
  Object.assign(lightTokens, extractVariables(rootMatch[1]));
  console.log(`✅ Extracted ${Object.keys(lightTokens).length} light mode tokens`);
}

// Extract dark mode tokens
if (darkMatch) {
  Object.assign(darkTokens, extractVariables(darkMatch[1]));
  console.log(`✅ Extracted ${Object.keys(darkTokens).length} dark mode tokens`);
}

// Organize tokens by category
function categorizeTokens(tokens) {
  const categorized = {
    colors: {},
    spacing: {},
    typography: {},
    effects: {},
    other: {}
  };

  for (const [name, value] of Object.entries(tokens)) {
    if (name.includes('color') || name === 'primary' || name === 'secondary' || 
        name === 'accent' || name === 'destructive' || name === 'background' || 
        name === 'foreground' || name === 'border' || name === 'muted' || 
        name === 'popover' || name === 'card' || name === 'input' ||
        name === 'ring' || name === 'chart' || name === 'sidebar') {
      categorized.colors[name] = value;
    } else if (name.includes('radius') || name.includes('spacing') || name.includes('size')) {
      categorized.spacing[name] = value;
    } else if (name.includes('font') || name.includes('weight')) {
      categorized.typography[name] = value;
    } else if (name.includes('shadow')) {
      categorized.effects[name] = value;
    } else {
      categorized.other[name] = value;
    }
  }

  return categorized;
}

const lightCategorized = categorizeTokens(lightTokens);
const darkCategorized = categorizeTokens(darkTokens);

// Create final output structure
const designTokens = {
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  source: 'figma_make_theme.css',
  description: 'Design tokens automatically extracted from Figma Make generated theme.css',
  
  // All tokens in flat format (for easy lookup)
  tokens: {
    light: lightTokens,
    dark: darkTokens
  },

  // Organized by category
  categorized: {
    light: lightCategorized,
    dark: darkCategorized
  },

  // For backend API convenience
  metadata: {
    total_light_tokens: Object.keys(lightTokens).length,
    total_dark_tokens: Object.keys(darkTokens).length,
    generated_at: new Date().toISOString(),
    tool: 'Figma Make Token Extractor'
  }
};

// Write to JSON file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(designTokens, null, 2));
console.log(`\n✅ Tokens extracted successfully!`);
console.log(`📝 Output file: ${OUTPUT_FILE}`);
console.log(`📊 Total tokens: ${Object.keys(lightTokens).length} (light) + ${Object.keys(darkTokens).length} (dark)`);

// Display summary
console.log(`\n📋 Token Summary:`);
console.log(`   Colors:      ${Object.keys(lightCategorized.colors).length}`);
console.log(`   Spacing:     ${Object.keys(lightCategorized.spacing).length}`);
console.log(`   Typography: ${Object.keys(lightCategorized.typography).length}`);
console.log(`   Effects:     ${Object.keys(lightCategorized.effects).length}`);
console.log(`   Other:       ${Object.keys(lightCategorized.other).length}`);

// Show sample output
console.log(`\n📦 Sample structure:`);
console.log(JSON.stringify({
  version: designTokens.version,
  tokens: {
    light: { __sample: '...' },
    dark: { __sample: '...' }
  },
  categorized: {
    light: {
      colors: { __sampleCount: Object.keys(lightCategorized.colors).length },
      spacing: { __sampleCount: Object.keys(lightCategorized.spacing).length }
    }
  }
}, null, 2));

console.log(`\n🚀 Ready to use!`);
console.log(`   1. Commit figma_exports/design-tokens.json to git`);
console.log(`   2. Serve from backend: GET /api/design/tokens`);
console.log(`   3. Use in frontend: import tokens from design-tokens.json`);
