import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import LoadingButton from './LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

const TestItemCleanupButton = ({ onCleanupComplete }) => {
  const [cleanupStats, setCleanupStats] = useState(null);
  const { loading, withLoading } = useLoadingState();
  const { showSuccess, showError, showNotification } = useNotification();

  const isTestItem = (item) => {
    const testPatterns = [
      // Test titles
      /^test\d*$/i,
      /^sample/i,
      /^demo/i,
      /^mock/i,
      
      // Test descriptions
      /test item/i,
      /sample item/i,
      /demo item/i,
      
      // Test user patterns
      /test.*user/i,
      /sample.*user/i,
      
      // Generic test patterns
      /^item\d+$/i, // Generic item1, item2, etc.
      /^product\d+$/i, // Generic product1, product2, etc.
    ];
    
    // Check title
    if (testPatterns.some(pattern => pattern.test(item.title || ''))) {
      return true;
    }
    
    // Check description
    if (testPatterns.some(pattern => pattern.test(item.description || ''))) {
      return true;
    }
    
    // Check user name
    if (testPatterns.some(pattern => pattern.test(item.userName || ''))) {
      return true;
    }
    
    // Check for obvious test IDs
    if (item.id && (
      item.id.includes('test') ||
      item.id.includes('sample') ||
      item.id.includes('demo')
    )) {
      return true;
    }
    
    return false;
  };

  const findTestItems = async () => {
    const itemsQuery = query(collection(db, 'items'));
    const snapshot = await getDocs(itemsQuery);
    
    const testItems = [];
    const allItems = [];
    
    snapshot.forEach(doc => {
      const item = { id: doc.id, ...doc.data() };
      allItems.push(item);
      
      if (isTestItem(item)) {
        testItems.push(item);
      }
    });
    
    return { testItems, totalItems: allItems.length };
  };

  const handleCleanup = async () => {
    showNotification({
      type: 'warning',
      title: 'Clean Up Test Items',
      message: 'This will archive all test items found in the database. Are you sure?',
      autoHide: false,
      actions: [
        { title: 'Cancel', onPress: () => {}, style: 'secondary' },
        { title: 'Clean Up', onPress: executeCleanup, style: 'primary' }
      ]
    });
  };

  const executeCleanup = async () => {
    await withLoading(
      async () => {
        console.log('🧹 Starting test item cleanup...');
        
        const { testItems, totalItems } = await findTestItems();
        
        if (testItems.length === 0) {
          showSuccess('No Test Items', 'No test items found to clean up.');
          return;
        }
        
        console.log(`Found ${testItems.length} test items out of ${totalItems} total items`);
        
        let archivedCount = 0;
        let failedCount = 0;
        
        for (const item of testItems) {
          try {
            const itemRef = doc(db, 'items', item.id);
            await updateDoc(itemRef, {
              status: 'archived',
              isActive: false,
              isAvailable: false,
              isVisible: false,
              archivedAt: serverTimestamp(),
              archiveReason: 'test_data_cleanup',
              originalStatus: item.status || 'available',
              lastUpdated: serverTimestamp()
            });
            
            archivedCount++;
            console.log(`✅ Archived test item: ${item.title}`);
          } catch (error) {
            failedCount++;
            console.error(`❌ Failed to archive ${item.title}:`, error);
          }
        }
        
        const stats = {
          totalScanned: totalItems,
          testItemsFound: testItems.length,
          archivedCount,
          failedCount
        };
        
        setCleanupStats(stats);
        
        if (onCleanupComplete) {
          onCleanupComplete(stats);
        }
        
        showSuccess(
          'Cleanup Complete!',
          `Archived ${archivedCount} test items. ${failedCount > 0 ? `${failedCount} failed.` : ''}`
        );
      },
      {
        errorMessage: 'Failed to clean up test items',
        showErrorNotification: true
      }
    );
  };

  const handleScan = async () => {
    await withLoading(
      async () => {
        const { testItems, totalItems } = await findTestItems();
        
        const stats = {
          totalScanned: totalItems,
          testItemsFound: testItems.length,
          archivedCount: 0,
          failedCount: 0
        };
        
        setCleanupStats(stats);
        
        if (testItems.length > 0) {
          showNotification({
            type: 'info',
            title: 'Test Items Found',
            message: `Found ${testItems.length} test items out of ${totalItems} total items. Use the cleanup button to archive them.`,
            autoHide: true,
            duration: 5000
          });
        } else {
          showSuccess('Database Clean', 'No test items found in the database.');
        }
      },
      {
        errorMessage: 'Failed to scan for test items',
        showErrorNotification: true
      }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧹 Test Item Cleanup</Text>
      <Text style={styles.description}>
        Remove test items that shouldn't appear in the HomeScreen
      </Text>
      
      <View style={styles.buttonContainer}>
        <LoadingButton
          title="Scan for Test Items"
          onPress={handleScan}
          loading={loading}
          variant="secondary"
          icon="search"
          style={styles.button}
        />
        
        <LoadingButton
          title="Clean Up Test Items"
          onPress={handleCleanup}
          loading={loading}
          variant="danger"
          icon="trash"
          style={styles.button}
        />
      </View>
      
      {cleanupStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>📊 Last Scan Results:</Text>
          <Text style={styles.statItem}>Total items scanned: {cleanupStats.totalScanned}</Text>
          <Text style={styles.statItem}>Test items found: {cleanupStats.testItemsFound}</Text>
          {cleanupStats.archivedCount > 0 && (
            <Text style={styles.statItem}>Items archived: {cleanupStats.archivedCount}</Text>
          )}
          {cleanupStats.failedCount > 0 && (
            <Text style={[styles.statItem, styles.errorText]}>
              Failed to archive: {cleanupStats.failedCount}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  statsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  errorText: {
    color: '#FF4444',
  },
});

export default TestItemCleanupButton;