#!/usr/bin/env node

// SwipeIt Test Runner Script
// Runs comprehensive unit tests for the SwipeIt trading app

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 SwipeIt Unit Test Runner');
console.log('============================\n');

// Check if Jest is available
try {
  execSync('npx jest --version', { stdio: 'pipe' });
  console.log('✅ Jest is available');
} catch (error) {
  console.error('❌ Jest is not available. Please install dependencies:');
  console.error('   npm install');
  process.exit(1);
}

// Check test files
const testDir = path.join(__dirname, '..', '__tests__');
if (!fs.existsSync(testDir)) {
  console.error('❌ Test directory not found');
  process.exit(1);
}

const testFiles = [];
function findTestFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findTestFiles(filePath);
    } else if (file.endsWith('.test.js')) {
      testFiles.push(filePath);
    }
  });
}

findTestFiles(testDir);
console.log(`📁 Found ${testFiles.length} test files:`);
testFiles.forEach(file => {
  console.log(`   - ${path.relative(process.cwd(), file)}`);
});
console.log('');

// Run tests based on command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';

try {
  switch (testType) {
    case 'services':
      console.log('🔧 Running Service Tests...\n');
      execSync('npx jest __tests__/services/', { stdio: 'inherit' });
      break;
      
    case 'components':
      console.log('🎨 Running Component Tests...\n');
      execSync('npx jest __tests__/components/', { stdio: 'inherit' });
      break;
      
    case 'utils':
      console.log('🛠️ Running Utility Tests...\n');
      execSync('npx jest __tests__/utils/', { stdio: 'inherit' });
      break;
      
    case 'integration':
      console.log('🔗 Running Integration Tests...\n');
      execSync('npx jest __tests__/integration/', { stdio: 'inherit' });
      break;
      
    case 'coverage':
      console.log('📊 Running Tests with Coverage...\n');
      execSync('npx jest --coverage', { stdio: 'inherit' });
      break;
      
    case 'watch':
      console.log('👀 Running Tests in Watch Mode...\n');
      execSync('npx jest --watch', { stdio: 'inherit' });
      break;
      
    case 'ci':
      console.log('🤖 Running Tests for CI...\n');
      execSync('npx jest --ci --coverage --watchAll=false', { stdio: 'inherit' });
      break;
      
    case 'all':
    default:
      console.log('🚀 Running All Tests...\n');
      execSync('npx jest', { stdio: 'inherit' });
      break;
  }
  
  console.log('\n✅ Tests completed successfully!');
  
} catch (error) {
  console.error('\n❌ Tests failed!');
  console.error('Error:', error.message);
  process.exit(1);
}

// Show usage information
if (args.includes('--help') || args.includes('-h')) {
  console.log('\n📖 Usage:');
  console.log('  node scripts/runTests.js [type]');
  console.log('');
  console.log('📋 Test Types:');
  console.log('  all         - Run all tests (default)');
  console.log('  services    - Run service layer tests');
  console.log('  components  - Run component tests');
  console.log('  utils       - Run utility tests');
  console.log('  integration - Run integration tests');
  console.log('  coverage    - Run tests with coverage report');
  console.log('  watch       - Run tests in watch mode');
  console.log('  ci          - Run tests for CI/CD');
  console.log('');
  console.log('📊 Coverage Reports:');
  console.log('  HTML: coverage/lcov-report/index.html');
  console.log('  LCOV: coverage/lcov.info');
  console.log('');
}