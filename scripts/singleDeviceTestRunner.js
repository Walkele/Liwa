#!/usr/bin/env node

/**
 * 🎯 Single Device Test Runner
 * Interactive testing tool for SwipeIt features
 */

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SingleDeviceTestRunner {
  constructor() {
    this.currentUser = null;
    this.testSession = {
      startTime: new Date(),
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0
    };
  }

  async start() {
    console.log('🚀 SwipeIt Single Device Test Runner');
    console.log('=====================================\n');
    
    await this.showMainMenu();
  }

  async showMainMenu() {
    console.log('Choose testing method:');
    console.log('1. 🤖 Run Automated Multi-User Tests');
    console.log('2. 🌐 Web + Mobile Testing Guide');
    console.log('3. 📱 Single Device Manual Testing');
    console.log('4. 🧪 Run Existing Test Suite');
    console.log('5. 📊 Generate Test Report');
    console.log('6. 🔧 Setup Test Environment');
    console.log('0. Exit\n');

    const choice = await this.askQuestion('Select option (0-6): ');
    await this.handleMenuChoice(choice);
  }

  async handleMenuChoice(choice) {
    switch (choice) {
      case '1':
        await this.runAutomatedTests();
        break;
      case '2':
        await this.showWebMobileGuide();
        break;
      case '3':
        await this.runSingleDeviceTests();
        break;
      case '4':
        await this.runExistingTestSuite();
        break;
      case '5':
        await this.generateTestReport();
        break;
      case '6':
        await this.setupTestEnvironment();
        break;
      case '0':
        console.log('👋 Goodbye!');
        process.exit(0);
        break;
      default:
        console.log('❌ Invalid option. Please try again.\n');
        await this.showMainMenu();
    }
  }

  async runAutomatedTests() {
    console.log('\n🤖 Running Automated Multi-User Tests...\n');
    
    try {
      // Run the automated test script
      execSync('node scripts/automatedMultiUserTest.js', { stdio: 'inherit' });
      console.log('\n✅ Automated tests completed!');
    } catch (error) {
      console.log('\n❌ Automated tests failed:', error.message);
    }
    
    await this.askQuestion('\nPress Enter to continue...');
    await this.showMainMenu();
  }

  async showWebMobileGuide() {
    console.log('\n🌐 Web + Mobile Testing Guide');
    console.log('==============================\n');
    
    console.log('SETUP STEPS:');
    console.log('1. Start your app: npm start');
    console.log('2. Press "w" in terminal to open web version');
    console.log('3. Scan QR code with Expo Go on mobile\n');
    
    console.log('TESTING WORKFLOW:');
    console.log('📱 Mobile (User1): Post items, browse, make offers');
    console.log('💻 Web (User2): Accept/decline offers, counter offers');
    console.log('🔄 Switch: Logout/login on web to test User3\n');
    
    console.log('WHAT TO TEST:');
    console.log('• Cash offers: Mobile → Web');
    console.log('• Trade offers: Web → Mobile');
    console.log('• Service offers: Mobile → Web');
    console.log('• Counter offers: Back and forth');
    console.log('• Multi-offers: Multiple users on same item');
    console.log('• Completion: Accept → Meet → Complete\n');
    
    await this.askQuestion('Press Enter to continue...');
    await this.showMainMenu();
  }

  async runSingleDeviceTests() {
    console.log('\n📱 Single Device Manual Testing');
    console.log('================================\n');
    
    console.log('QUICK TESTING SCENARIOS:');
    console.log('1. Login as User1 → Post 3 items');
    console.log('2. Logout → Login as User2 → Make cash offer');
    console.log('3. Logout → Login as User1 → Accept offer');
    console.log('4. Test counter offer flow');
    console.log('5. Test multi-offers on same item');
    console.log('6. Test completion workflow\n');
    
    const startTest = await this.askQuestion('Start guided testing? (y/n): ');
    
    if (startTest.toLowerCase() === 'y') {
      await this.runGuidedTests();
    }
    
    await this.showMainMenu();
  }

  async runGuidedTests() {
    console.log('\n🎯 Guided Testing Session');
    console.log('=========================\n');
    
    const tests = [
      {
        name: 'User Setup',
        description: 'Login as User1 and post 3 items',
        steps: [
          '1. Open app and login as User1',
          '2. Go to Post screen',
          '3. Post iPhone 14 Pro ($800)',
          '4. Post MacBook Air ($1200)', 
          '5. Post Gaming Chair ($300)'
        ]
      },
      {
        name: 'Cash Offer',
        description: 'Switch to User2 and make cash offer',
        steps: [
          '1. Logout from User1',
          '2. Login as User2',
          '3. Browse items and find iPhone 14 Pro',
          '4. Make cash offer of $750',
          '5. Verify offer appears in messages'
        ]
      },
      {
        name: 'Offer Response',
        description: 'Switch back to User1 and respond',
        steps: [
          '1. Logout from User2',
          '2. Login as User1',
          '3. Check messages for new offer',
          '4. Either Accept or make Counter offer',
          '5. Verify response is sent'
        ]
      }
    ];

    for (const test of tests) {
      console.log(`\n📋 TEST: ${test.name}`);
      console.log(`Description: ${test.description}\n`);
      
      console.log('STEPS:');
      test.steps.forEach(step => console.log(`  ${step}`));
      
      const result = await this.askQuestion('\nTest result (pass/fail/skip): ');
      
      this.testSession.testsRun++;
      if (result.toLowerCase() === 'pass') {
        this.testSession.testsPassed++;
        console.log('✅ Test passed!');
      } else if (result.toLowerCase() === 'fail') {
        this.testSession.testsFailed++;
        console.log('❌ Test failed!');
        const issue = await this.askQuestion('Describe the issue: ');
        console.log(`Issue logged: ${issue}`);
      } else {
        console.log('⏭️ Test skipped');
      }
    }
    
    console.log('\n📊 Session Summary:');
    console.log(`Tests Run: ${this.testSession.testsRun}`);
    console.log(`Passed: ${this.testSession.testsPassed}`);
    console.log(`Failed: ${this.testSession.testsFailed}`);
  }

  async runExistingTestSuite() {
    console.log('\n🧪 Running Existing Test Suite...\n');
    
    const testCommands = [
      { name: 'Unit Tests', command: 'npm run test:unit:real' },
      { name: 'Integration Tests', command: 'npm run test:integration:real' },
      { name: 'Performance Tests', command: 'npm run test:performance' },
      { name: 'Simple Tests', command: 'npm run test:simple' }
    ];

    for (const test of testCommands) {
      console.log(`\n🔄 Running ${test.name}...`);
      
      try {
        execSync(test.command, { stdio: 'inherit' });
        console.log(`✅ ${test.name} completed successfully`);
      } catch (error) {
        console.log(`❌ ${test.name} failed`);
      }
    }
    
    await this.askQuestion('\nPress Enter to continue...');
    await this.showMainMenu();
  }

  async generateTestReport() {
    console.log('\n📊 Generating Test Report...\n');
    
    try {
      execSync('npm run quality:gates', { stdio: 'inherit' });
      console.log('\n✅ Test report generated successfully!');
    } catch (error) {
      console.log('\n❌ Failed to generate report:', error.message);
    }
    
    await this.askQuestion('\nPress Enter to continue...');
    await this.showMainMenu();
  }

  async setupTestEnvironment() {
    console.log('\n🔧 Setting up Test Environment...\n');
    
    const setupSteps = [
      { name: 'Clean Database', command: 'node scripts/cleanDatabaseExceptUsers.js' },
      { name: 'Setup Test Data', command: 'node scripts/setupCleanDatabase.js' },
      { name: 'Create Test Users', command: 'node scripts/createTestUsers.js' }
    ];

    for (const step of setupSteps) {
      console.log(`🔄 ${step.name}...`);
      
      try {
        execSync(step.command, { stdio: 'inherit' });
        console.log(`✅ ${step.name} completed`);
      } catch (error) {
        console.log(`⚠️ ${step.name} - using existing setup`);
      }
    }
    
    console.log('\n✅ Test environment ready!');
    await this.askQuestion('\nPress Enter to continue...');
    await this.showMainMenu();
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

// Run the test runner
if (require.main === module) {
  const runner = new SingleDeviceTestRunner();
  runner.start().catch(console.error);
}

module.exports = SingleDeviceTestRunner;