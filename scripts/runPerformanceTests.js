// Performance-Enhanced Test Runner
const { execSync } = require('child_process');
const PerformanceTracker = require('../__tests__/utils/PerformanceTracker');
const fs = require('fs');
const path = require('path');

class PerformanceTestRunner {
  constructor() {
    this.tracker = new PerformanceTracker();
    this.results = {
      unit: { passed: 0, failed: 0, duration: 0 },
      integration: { passed: 0, failed: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, duration: 0 }
    };
  }
  
  async runAllTestsWithPerformanceTracking() {
    console.log('🚀 Starting Performance-Tracked Test Suite...\n');
    
    const overallStart = Date.now();
    
    try {
      // Unit Tests with Performance Tracking
      await this.runTestCategoryWithTracking('unit', [
        '__tests__/automated/unit/services/ServiceOfferService.test.js',
        '__tests__/automated/unit/services/ServiceOfferService.real.test.js',
        '__tests__/automated/unit/services/CashOfferService.test.js',
        '__tests__/automated/unit/services/ItemLockingService.test.js',
        '__tests__/automated/unit/components/ServiceOfferCard.test.js'
      ]);
      
      // Integration Tests with Performance Tracking
      await this.runTestCategoryWithTracking('integration', [
        '__tests__/automated/integration/CompleteLifecycleTests.test.js',
        '__tests__/automated/integration/ItemLockingTests.test.js',
        '__tests__/automated/integration/MultipleOffersTests.test.js',
        '__tests__/automated/integration/CounterOfferTests.test.js'
      ]);
      
      // E2E Tests with Performance Tracking (if available)
      if (process.env.RUN_E2E === 'true') {
        await this.runE2ETestsWithTracking();
      }
      
      const overallDuration = Date.now() - overallStart;
      
      // Generate comprehensive performance report
      const performanceReport = this.tracker.generatePerformanceReport();
      performanceReport.overallDuration = overallDuration;
      
      this.savePerformanceReport(performanceReport);
      this.displayPerformanceResults(performanceReport);
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      process.exit(1);
    }
  }
  
  async runTestCategoryWithTracking(category, testFiles) {
    console.log(`📊 Running ${category.toUpperCase()} tests with performance tracking...`);
    
    const suiteStart = this.tracker.startSuite(category);
    
    for (const testFile of testFiles) {
      const testName = path.basename(testFile, '.test.js');
      
      try {
        console.log(`  🧪 ${testName}`);
        
        const testStart = this.tracker.startTest(testName, category);
        
        // Record system metrics before test
        this.tracker.recordSystemMetrics();
        
        execSync(`npx jest ${testFile} --config jest.config.json --silent`, {
          stdio: 'pipe'
        });
        
        // Record system metrics after test
        this.tracker.recordSystemMetrics();
        
        this.tracker.endTest(testName, category, 'passed');
        
        console.log(`    ✅ Passed (${Date.now() - testStart}ms)`);
        this.results[category].passed++;
        
      } catch (error) {
        this.tracker.endTest(testName, category, 'failed');
        console.log(`    ❌ Failed`);
        this.results[category].failed++;
      }
    }
    
    this.tracker.endSuite(category);
    const suiteDuration = Date.now() - suiteStart;
    this.results[category].duration = suiteDuration;
    
    console.log(`  📊 ${category} suite completed in ${suiteDuration}ms\n`);
  }
  
  async runE2ETestsWithTracking() {
    console.log('🎭 Running E2E tests with performance tracking...');
    
    const suiteStart = this.tracker.startSuite('e2e');
    
    const e2eTests = [
      'ServiceOfferWorkflow'
    ];
    
    for (const testName of e2eTests) {
      try {
        console.log(`  🎭 ${testName}`);
        
        const testStart = this.tracker.startTest(testName, 'e2e');
        
        execSync(`npx detox test __tests__/e2e/${testName}.e2e.js --configuration ios.sim.debug`, {
          stdio: 'pipe'
        });
        
        this.tracker.endTest(testName, 'e2e', 'passed');
        
        console.log(`    ✅ Passed (${Date.now() - testStart}ms)`);
        this.results.e2e.passed++;
        
      } catch (error) {
        this.tracker.endTest(testName, 'e2e', 'failed');
        console.log(`    ❌ Failed`);
        this.results.e2e.failed++;
      }
    }
    
    this.tracker.endSuite('e2e');
    this.results.e2e.duration = Date.now() - suiteStart;
  }
  
  savePerformanceReport(report) {
    const reportsDir = path.join('test-reports', 'performance');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, `performance-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Performance report saved: ${reportPath}`);
  }
  
  displayPerformanceResults(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`Total Duration: ${report.overallDuration}ms`);
    console.log(`Average Test Time: ${report.summary.averageTestTime.toFixed(1)}ms`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    
    console.log('\n🐌 Slowest Tests:');
    report.summary.slowestTests.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.name}: ${test.duration}ms`);
    });
    
    console.log('\n⚡ Fastest Tests:');
    report.summary.fastestTests.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.name}: ${test.duration}ms`);
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Performance Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
        console.log(`     Action: ${rec.action}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run performance tests
const runner = new PerformanceTestRunner();
runner.runAllTestsWithPerformanceTracking().catch(error => {
  console.error('❌ Performance test runner failed:', error);
  process.exit(1);
});