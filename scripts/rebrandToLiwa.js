#!/usr/bin/env node

/**
 * Liwa Rebranding Script
 * 
 * This script helps replace "SwipeIt" with "Liwa" throughout the codebase
 * Run with: node scripts/rebrandToLiwa.js
 */

const fs = require('fs');
const path = require('path');

// Files and directories to process
const filesToProcess = [
  // Documentation files
  'PROJECT_SUMMARY.md',
  'FINAL_PROJECT_STATUS_COMPREHENSIVE.md',
  'SWIPEIT_ECOSYSTEM_COMPLETE.md',
  'requirements.md',
  'design.md',
  
  // Service files that might have Liwa references
  'src/services/LiwaSOPService.js',
  
  // Any remaining component files
  'src/components/SystemMessage.js',
  
  // Test files
  '__tests__/**/*.js',
  
  // Admin files
  'admin/README.md',
  'admin/SETUP_GUIDE.md'
];

// Replacement patterns
const replacements = [
  { from: /SwipeIt/g, to: 'Liwa' },
  { from: /swipeit/g, to: 'liwa' },
  { from: /SWIPEIT/g, to: 'LIWA' },
  { from: /SwapIt/g, to: 'Liwa' },
  { from: /swapit/g, to: 'liwa' },
  { from: /SWAPIT/g, to: 'LIWA' }
];

function processFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🚀 Starting Liwa rebranding process...\n');
  
  filesToProcess.forEach(processFile);
  
  console.log('\n🎉 Rebranding complete!');
  console.log('\n📝 Manual steps still needed:');
  console.log('1. Update app.json/app.config.js with new app name');
  console.log('2. Update Firebase project settings if needed');
  console.log('3. Update any hardcoded strings in the UI');
  console.log('4. Test the app to ensure everything works');
  console.log('5. Update app store listings and marketing materials');
}

if (require.main === module) {
  main();
}

module.exports = { processFile, replacements };