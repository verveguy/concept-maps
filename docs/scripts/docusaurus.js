#!/usr/bin/env node

/**
 * Wrapper script to run docusaurus when dependencies are hoisted
 * This ensures docusaurus can be found even when node_modules is in parent directory
 */

const { execSync } = require('child_process');
const path = require('path');

// Try to find docusaurus in various locations
const possiblePaths = [
  path.join(__dirname, 'node_modules', '.bin', 'docusaurus'),
  path.join(__dirname, '..', 'node_modules', '.bin', 'docusaurus'),
  path.join(__dirname, '..', 'node_modules', '@docusaurus', 'core', 'bin', 'docusaurus.js'),
];

let docusaurusPath = null;
for (const possiblePath of possiblePaths) {
  try {
    require.resolve(possiblePath);
    docusaurusPath = possiblePath;
    break;
  } catch (e) {
    // Continue searching
  }
}

if (!docusaurusPath) {
  // Fallback to pnpm exec
  const args = process.argv.slice(2);
  execSync(`pnpm exec docusaurus ${args.join(' ')}`, { stdio: 'inherit', cwd: __dirname });
} else {
  const args = process.argv.slice(2);
  execSync(`node ${docusaurusPath} ${args.join(' ')}`, { stdio: 'inherit', cwd: __dirname });
}
