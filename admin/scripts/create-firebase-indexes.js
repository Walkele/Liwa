#!/usr/bin/env node

/**
 * Firebase Index Creation Script for Admin Dashboard
 * 
 * This script provides the Firebase CLI commands needed to create
 * the required indexes for the admin dashboard queries.
 * 
 * Run these commands in your terminal after installing Firebase CLI:
 * npm install -g firebase-tools
 * firebase login
 * firebase use your-project-id
 */

console.log('🔥 Firebase Index Creation Commands for Admin Dashboard');
console.log('=====================================================\n');

console.log('Run these commands in your terminal:\n');

// Basic indexes for users collection
console.log('1. Users Collection Indexes:');
console.log('firebase firestore:indexes');
console.log('');

// Create firestore.indexes.json content
const indexesConfig = {
  indexes: [
    {
      collectionGroup: "users",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "isBanned", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "users", 
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "isActive", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "users",
      queryScope: "COLLECTION", 
      fields: [
        { fieldPath: "trustScore", order: "DESCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "items",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "userId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "trades", 
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "sellerId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "reports",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "reportedId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    }
  ],
  fieldOverrides: []
};

console.log('2. Create firestore.indexes.json file with this content:');
console.log(JSON.stringify(indexesConfig, null, 2));
console.log('');

console.log('3. Deploy indexes:');
console.log('firebase deploy --only firestore:indexes');
console.log('');

console.log('Alternative: Use Firebase Console');
console.log('Visit: https://console.firebase.google.com/project/your-project/firestore/indexes');
console.log('');

console.log('✅ After creating indexes, the admin dashboard queries will work properly!');