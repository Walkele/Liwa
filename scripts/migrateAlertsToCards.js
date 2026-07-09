#!/usr/bin/env node

/**
 * Migration Script: Alert.alert to Card Notifications
 * 
 * This script helps identify and migrate Alert.alert usage to the new
 * card-based notification system.
 */

const fs = require('fs');
const path = require('path');

// Components that still need migration
const componentsToMigrate = [
  'src/components/AdvancedOfferCard.js',
  'src/components/CleanTradeInterface.js',
  'src/components/CounterOfferCard.js',
  'src/components/CounterOfferActionModal.js',
  'src/components/CounterOfferModal.js',
  'src/components/DeclineReasonModal.js',
  'src/components/EmergencyFixButton.js',
  'src/components/DynamicTradeButtons.js',
  'src/components/OfflineQRFallback.js',
  'src/components/ReOfferButton.js',
  'src/components/SafetyCodeVerification.js',
  'src/components/SecurityProvider.js',
  'src/components/SmartOfferButton.js'
];

// Migration patterns
const migrationPatterns = {
  // Import statements to add
  imports: {
    from: `import { Alert } from 'react-native';`,
    to: `import { useNotification } from '../context/NotificationContext';
import { useLoadingState } from '../hooks/useLoadingState';
import LoadingButton from './LoadingButton';`
  },
  
  // Hook usage to add
  hooks: {
    pattern: /const \[loading, setLoading\] = useState\(false\);/g,
    replacement: `const { loading, withLoading } = useLoadingState();
const { showError, showSuccess, showNotification } = useNotification();`
  },
  
  // Alert patterns to replace
  alerts: [
    {
      // Simple error alerts
      pattern: /Alert\.alert\(['"`]Error['"`],\s*(['"`][^'"`]*['"`]|[^)]+)\);/g,
      replacement: `showError('Error', $1);`
    },
    {
      // Success alerts
      pattern: /Alert\.alert\(['"`]Success['"`],\s*(['"`][^'"`]*['"`]|[^)]+)\);/g,
      replacement: `showSuccess('Success', $1);`
    },
    {
      // Confirmation alerts with actions
      pattern: /Alert\.alert\(\s*(['"`][^'"`]*['"`]),\s*(['"`][^'"`]*['"`]),\s*\[\s*\{[^}]*text:\s*['"`]Cancel['"`][^}]*\},\s*\{[^}]*text:\s*['"`][^'"`]*['"`][^}]*onPress:[^}]*\}\s*\]\s*\);/g,
      replacement: `showNotification({
  type: 'warning',
  title: $1,
  message: $2,
  autoHide: false,
  actions: [
    { title: 'Cancel', onPress: () => {}, style: 'secondary' },
    { title: 'Confirm', onPress: () => { /* Move onPress logic here */ }, style: 'primary' }
  ]
});`
    }
  ],
  
  // Button patterns to replace
  buttons: {
    pattern: /<TouchableOpacity[^>]*onPress=\{[^}]*\}[^>]*disabled=\{[^}]*loading[^}]*\}[^>]*>\s*(?:<Ionicons[^>]*\/>\s*)?<Text[^>]*>\s*\{loading \? ['"`][^'"`]*['"`] : ['"`][^'"`]*['"`]\}\s*<\/Text>\s*<\/TouchableOpacity>/g,
    replacement: `<LoadingButton
  title="Button Title"
  onPress={handleAction}
  loading={loading}
  variant="primary"
  icon="icon-name"
/>`
  }
};

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const alerts = [];
    
    // Find all Alert.alert usage
    const alertMatches = content.match(/Alert\.alert\([^)]*\)/g);
    if (alertMatches) {
      alertMatches.forEach((match, index) => {
        alerts.push({
          line: content.substring(0, content.indexOf(match)).split('\n').length,
          code: match,
          type: getAlertType(match)
        });
      });
    }
    
    return {
      file: filePath,
      alertCount: alerts.length,
      alerts,
      hasLoading: content.includes('useState(false)') && content.includes('loading'),
      hasImports: content.includes('useNotification'),
      needsMigration: alerts.length > 0
    };
  } catch (error) {
    return {
      file: filePath,
      error: error.message,
      needsMigration: false
    };
  }
}

function getAlertType(alertCode) {
  if (alertCode.includes('Error')) return 'error';
  if (alertCode.includes('Success')) return 'success';
  if (alertCode.includes('[') && alertCode.includes('Cancel')) return 'confirmation';
  return 'info';
}

function generateMigrationReport() {
  console.log('🔄 Alert.alert Migration Analysis\n');
  console.log('=' .repeat(50));
  
  const results = componentsToMigrate.map(analyzeFile);
  const needsMigration = results.filter(r => r.needsMigration);
  
  console.log(`📊 Summary:`);
  console.log(`   Total files analyzed: ${results.length}`);
  console.log(`   Files needing migration: ${needsMigration.length}`);
  console.log(`   Total alerts to migrate: ${needsMigration.reduce((sum, r) => sum + r.alertCount, 0)}\n`);
  
  needsMigration.forEach(result => {
    console.log(`📁 ${result.file}`);
    console.log(`   Alerts: ${result.alertCount}`);
    console.log(`   Has loading state: ${result.hasLoading ? '✅' : '❌'}`);
    console.log(`   Has notification imports: ${result.hasImports ? '✅' : '❌'}`);
    
    result.alerts.forEach(alert => {
      console.log(`   Line ${alert.line}: ${alert.type.toUpperCase()} - ${alert.code.substring(0, 60)}...`);
    });
    console.log('');
  });
  
  console.log('🛠️  Migration Steps:');
  console.log('1. Add notification imports to each file');
  console.log('2. Replace useState loading with useLoadingState hook');
  console.log('3. Replace Alert.alert with appropriate notification methods');
  console.log('4. Replace TouchableOpacity buttons with LoadingButton');
  console.log('5. Test each component thoroughly\n');
  
  console.log('📋 Priority Order (by alert count):');
  needsMigration
    .sort((a, b) => b.alertCount - a.alertCount)
    .forEach((result, index) => {
      console.log(`${index + 1}. ${result.file} (${result.alertCount} alerts)`);
    });
}

function generateMigrationTemplate(filePath) {
  const result = analyzeFile(filePath);
  if (!result.needsMigration) return null;
  
  console.log(`\n🔧 Migration Template for ${filePath}:`);
  console.log('=' .repeat(50));
  
  console.log('\n1. Add imports:');
  console.log('```javascript');
  console.log(`import { useNotification } from '../context/NotificationContext';`);
  console.log(`import { useLoadingState } from '../hooks/useLoadingState';`);
  console.log(`import LoadingButton from './LoadingButton';`);
  console.log('```');
  
  console.log('\n2. Add hooks:');
  console.log('```javascript');
  console.log(`const { loading, withLoading } = useLoadingState();`);
  console.log(`const { showError, showSuccess, showNotification } = useNotification();`);
  console.log('```');
  
  console.log('\n3. Replace alerts:');
  result.alerts.forEach((alert, index) => {
    console.log(`\nAlert ${index + 1} (Line ${alert.line}):`);
    console.log('```javascript');
    console.log(`// OLD: ${alert.code}`);
    console.log(`// NEW: ${getMigrationSuggestion(alert)}`);
    console.log('```');
  });
}

function getMigrationSuggestion(alert) {
  switch (alert.type) {
    case 'error':
      return `showError('Error', 'Your error message here');`;
    case 'success':
      return `showSuccess('Success', 'Your success message here');`;
    case 'confirmation':
      return `showNotification({
  type: 'warning',
  title: 'Confirm Action',
  message: 'Are you sure?',
  autoHide: false,
  actions: [
    { title: 'Cancel', onPress: () => {}, style: 'secondary' },
    { title: 'Confirm', onPress: handleConfirm, style: 'primary' }
  ]
});`;
    default:
      return `showInfo('Info', 'Your message here');`;
  }
}

// Run the analysis
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    generateMigrationReport();
  } else {
    const filePath = args[0];
    if (componentsToMigrate.includes(filePath)) {
      generateMigrationTemplate(filePath);
    } else {
      console.log(`❌ File ${filePath} not in migration list`);
    }
  }
}

module.exports = {
  analyzeFile,
  generateMigrationReport,
  generateMigrationTemplate,
  componentsToMigrate
};