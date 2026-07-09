/**
 * Firebase Indexes Creation Script
 * 
 * This script helps create the required Firebase indexes for the bilateral confirmation system.
 * Run this after setting up Firebase CLI.
 */

const fs = require('fs');
const path = require('path');

// Required indexes for bilateral confirmation system
const requiredIndexes = {
  indexes: [
    {
      collectionGroup: "userActions",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "action", order: "ASCENDING" },
        { fieldPath: "userId", order: "ASCENDING" },
        { fieldPath: "timestamp", order: "ASCENDING" }
      ]
    },
    {
      collectionGroup: "messages",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "conversationId", order: "ASCENDING" },
        { fieldPath: "messageType", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "ASCENDING" }
      ]
    },
    {
      collectionGroup: "messages",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "messageType", order: "ASCENDING" },
        { fieldPath: "step", order: "ASCENDING" },
        { fieldPath: "userId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "messages",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "conversationId", order: "ASCENDING" },
        { fieldPath: "messageType", order: "ASCENDING" },
        { fieldPath: "step", order: "ASCENDING" },
        { fieldPath: "userId", order: "ASCENDING" }
      ]
    }
  ]
};

// Create firestore.indexes.json file
const indexesPath = path.join(process.cwd(), 'firestore.indexes.json');

try {
  fs.writeFileSync(indexesPath, JSON.stringify(requiredIndexes, null, 2));
  console.log('✅ Created firestore.indexes.json');
  console.log('📁 Location:', indexesPath);
  console.log('');
  console.log('🚀 Next steps:');
  console.log('1. Make sure Firebase CLI is installed: npm install -g firebase-tools');
  console.log('2. Login to Firebase: firebase login');
  console.log('3. Initialize project: firebase init firestore');
  console.log('4. Deploy indexes: firebase deploy --only firestore:indexes');
  console.log('');
  console.log('⚡ Or create indexes manually in Firebase Console:');
  console.log('https://console.firebase.google.com/project/liwach-19664/firestore/indexes');
} catch (error) {
  console.error('❌ Error creating firestore.indexes.json:', error);
}

module.exports = requiredIndexes;