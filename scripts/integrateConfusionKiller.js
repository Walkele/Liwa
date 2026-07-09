#!/usr/bin/env node

/**
 * Confusion Killer Integration Script
 * 
 * This script helps integrate the Confusion Killer system with existing ChatScreen
 * by automatically adding imports, state variables, and basic structure.
 */

const fs = require('fs');
const path = require('path');

const CHAT_SCREEN_PATH = path.join(__dirname, '../src/screens/ChatScreen.js');
const BACKUP_PATH = path.join(__dirname, '../src/screens/ChatScreen.backup.js');

// New imports to add
const NEW_IMPORTS = `
// NEW: Confusion Killer System imports
import { TradeStatusBadge } from '../components/TradeStatusBadge';
import { DynamicTradeButtons } from '../components/DynamicTradeButtons';
import { ItemLockIndicator } from '../components/ItemLockIndicator';
import { ValueMeter } from '../components/ValueMeter';
import { DeclineReasonModal } from '../components/DeclineReasonModal';
import { TradeTray } from '../components/TradeTray';
import { OfflineQRFallback } from '../components/OfflineQRFallback';
import { WhatsNextFooter } from '../components/WhatsNextFooter';
import { TradeConfirmationStatus } from '../components/TradeConfirmationStatus';
import { ConfusionKillerService } from '../services/ConfusionKillerService';
import { ConfusionKillerIntegrationService } from '../services/ConfusionKillerIntegrationService';
`;

// New state variables to add
const NEW_STATE = `
  // NEW: Confusion Killer state
  const [tradeStatus, setTradeStatus] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineProposalData, setDeclineProposalData] = useState(null);
  const [itemLockStatus, setItemLockStatus] = useState({});
  const [canSendNudge, setCanSendNudge] = useState(false);
  const [showOfflineQR, setShowOfflineQR] = useState(false);
`;

// New useEffect to add
const NEW_USE_EFFECT = `
  // NEW: Load trade status using Confusion Killer service
  useEffect(() => {
    const loadTradeStatus = async () => {
      if (!conversationId || !user?.uid) return;
      
      try {
        const status = await ConfusionKillerService.getTradeStatus(conversationId, user.uid);
        setTradeStatus(status);
        
        // Check nudge eligibility
        const nudgeStatus = await ConfusionKillerService.canSendNudge(conversationId, user.uid);
        setCanSendNudge(nudgeStatus.canNudge);
        
      } catch (error) {
        console.error('Error loading trade status:', error);
      }
    };

    loadTradeStatus();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadTradeStatus, 10000);
    return () => clearInterval(interval);
  }, [conversationId, user?.uid, messages]);

  // NEW: Load item lock status
  useEffect(() => {
    const loadItemLockStatus = async () => {
      if (!messages.length) return;
      
      const itemIds = new Set();
      messages.forEach(msg => {
        if (msg.proposerItemId) itemIds.add(msg.proposerItemId);
        if (msg.targetItemId) itemIds.add(msg.targetItemId);
        if (msg.itemId) itemIds.add(msg.itemId);
      });
      
      const lockStatuses = {};
      for (const itemId of itemIds) {
        try {
          const status = await ConfusionKillerService.getItemLockStatus(itemId);
          lockStatuses[itemId] = status;
        } catch (error) {
          console.error(\`Error loading lock status for item \${itemId}:\`, error);
        }
      }
      
      setItemLockStatus(lockStatuses);
    };

    loadItemLockStatus();
  }, [messages]);
`;

function backupOriginalFile() {
  if (fs.existsSync(CHAT_SCREEN_PATH)) {
    fs.copyFileSync(CHAT_SCREEN_PATH, BACKUP_PATH);
    console.log('✅ Original ChatScreen.js backed up to ChatScreen.backup.js');
    return true;
  }
  console.error('❌ ChatScreen.js not found at expected path');
  return false;
}

function addImports(content) {
  // Find the last import statement
  const importRegex = /import.*from.*['"];/g;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length;
    
    return content.slice(0, insertIndex) + NEW_IMPORTS + content.slice(insertIndex);
  }
  
  return content;
}

function addStateVariables(content) {
  // Find existing useState declarations
  const useStateRegex = /const \[.*\] = useState\(.*\);/g;
  const useStates = content.match(useStateRegex);
  
  if (useStates && useStates.length > 0) {
    const lastUseState = useStates[useStates.length - 1];
    const lastUseStateIndex = content.lastIndexOf(lastUseState);
    const insertIndex = lastUseStateIndex + lastUseState.length;
    
    return content.slice(0, insertIndex) + NEW_STATE + content.slice(insertIndex);
  }
  
  return content;
}

function addUseEffects(content) {
  // Find existing useEffect declarations
  const useEffectRegex = /useEffect\(\(\) => \{[\s\S]*?\}, \[.*?\]\);/g;
  const useEffects = content.match(useEffectRegex);
  
  if (useEffects && useEffects.length > 0) {
    const lastUseEffect = useEffects[useEffects.length - 1];
    const lastUseEffectIndex = content.lastIndexOf(lastUseEffect);
    const insertIndex = lastUseEffectIndex + lastUseEffect.length;
    
    return content.slice(0, insertIndex) + NEW_USE_EFFECT + content.slice(insertIndex);
  }
  
  return content;
}

function addStylesComment(content) {
  // Add comment about new styles needed
  const stylesComment = `
  // NEW: Add these styles for Confusion Killer components
  // headerStatusBadge: { marginHorizontal: 8 },
  // itemLockSection: { marginTop: 12 },
  // itemLockIndicator: { marginBottom: 8 },
  // valueMeter: { marginTop: 12 },
  // confirmationStatus: { marginTop: 12 },
`;
  
  // Find StyleSheet.create
  const styleSheetIndex = content.indexOf('const styles = StyleSheet.create({');
  if (styleSheetIndex !== -1) {
    const insertIndex = styleSheetIndex + 'const styles = StyleSheet.create({'.length;
    return content.slice(0, insertIndex) + stylesComment + content.slice(insertIndex);
  }
  
  return content;
}

function integrateConfusionKiller() {
  console.log('🚀 Starting Confusion Killer Integration...');
  
  // Step 1: Backup original file
  if (!backupOriginalFile()) {
    return;
  }
  
  // Step 2: Read original content
  let content = fs.readFileSync(CHAT_SCREEN_PATH, 'utf8');
  
  // Step 3: Add imports
  console.log('📦 Adding new imports...');
  content = addImports(content);
  
  // Step 4: Add state variables
  console.log('🔧 Adding new state variables...');
  content = addStateVariables(content);
  
  // Step 5: Add useEffects
  console.log('⚡ Adding new useEffect hooks...');
  content = addUseEffects(content);
  
  // Step 6: Add styles comment
  console.log('🎨 Adding styles comment...');
  content = addStylesComment(content);
  
  // Step 7: Write updated content
  fs.writeFileSync(CHAT_SCREEN_PATH, content);
  
  console.log('✅ Basic integration complete!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Review the updated ChatScreen.js file');
  console.log('2. Follow the CONFUSION_KILLER_INTEGRATION_GUIDE.md for manual steps');
  console.log('3. Update your render methods to use new components');
  console.log('4. Add the new handler functions');
  console.log('5. Test the integration thoroughly');
  console.log('');
  console.log('💡 If something goes wrong, restore from ChatScreen.backup.js');
}

function showUsage() {
  console.log('Confusion Killer Integration Script');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/integrateConfusionKiller.js');
  console.log('');
  console.log('This script will:');
  console.log('- Backup your existing ChatScreen.js');
  console.log('- Add necessary imports');
  console.log('- Add new state variables');
  console.log('- Add new useEffect hooks');
  console.log('- Add style comments');
  console.log('');
  console.log('⚠️  Manual steps still required - see CONFUSION_KILLER_INTEGRATION_GUIDE.md');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
  } else {
    integrateConfusionKiller();
  }
}

module.exports = {
  integrateConfusionKiller,
  backupOriginalFile,
  addImports,
  addStateVariables,
  addUseEffects
};