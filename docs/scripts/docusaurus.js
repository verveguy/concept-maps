#!/usr/bin/env node

/**
 * Wrapper script to run docusaurus when dependencies are hoisted
 * This ensures docusaurus can be found even when node_modules is in parent directory
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to find docusaurus in various locations
const possiblePaths = [
  path.join(__dirname, '..', 'node_modules', '@docusaurus', 'core', 'bin', 'docusaurus.js'),
  path.join(__dirname, 'node_modules', '@docusaurus', 'core', 'bin', 'docusaurus.js'),
];

let docusaurusPath = null;
for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    docusaurusPath = possiblePath;
    break;
  }
}

const args = process.argv.slice(2);

if (docusaurusPath) {
  // Use the actual JavaScript file directly
  execSync(`node ${docusaurusPath} ${args.join(' ')}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} else {
  // Fallback to pnpm exec
  execSync(`pnpm exec docusaurus ${args.join(' ')}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}
