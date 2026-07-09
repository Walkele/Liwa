// HomeScreen Diagnostic Tool - Debug why no items are showing

import { collection, query, orderBy, limit, getDocs, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class HomeScreenDiagnostic {
  
  static async diagnoseItemVisibility(userId) {
    console.log('🔍 HOMESCREEN DIAGNOSTIC - Starting analysis...');
    
    try {
      // 1. Check total items in database
      const allItemsQuery = query(
        collection(db, 'items'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const allItemsSnapshot = await getDocs(allItemsQuery);
      const allItems = allItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Total items in database: ${allItems.length}`);
      
      // 2. Analyze item statuses
      const statusCounts = {};
      allItems.forEach(item => {
        const status = item.status || 'undefined';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('📊 Item status breakdown:', statusCounts);
      
      // 3. Check available items specifically
      const availableItemsQuery = query(
        collection(db, 'items'),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const availableSnapshot = await getDocs(availableItemsQuery);
      const availableItems = availableSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Available items: ${availableItems.length}`);
      
      // 4. Analyze filtering stages
      console.log('\n🔍 FILTERING ANALYSIS:');
      
      // Stage 1: ItemArchiveService filtering
      const afterArchiveFilter = availableItems.filter(item => {
        const status = item.status || 'available';
        const isActive = item.isActive !== false;
        const isVisible = item.isVisible !== false;
        const isAvailable = item.isAvailable !== false;
        
        const activeStatuses = ['available', 'active', 'listed', 'published'];
        const inactiveStatuses = ['archived', 'deleted', 'removed', 'hidden'];
        
        return (
          activeStatuses.includes(status.toLowerCase()) &&
          !inactiveStatuses.includes(status.toLowerCase()) &&
          isActive &&
          isVisible &&
          isAvailable
        );
      });
      
      console.log(`📊 After archive filter: ${afterArchiveFilter.length} items`);
      
      // Stage 2: HomeScreen custom filtering
      const afterCustomFilter = afterArchiveFilter.filter(item => {
        // Filter out items with test-like names
        const isTestLike = (
          item.title?.toLowerCase().includes('test') ||
          item.title?.toLowerCase().includes('sample') ||
          item.title?.toLowerCase().includes('demo') ||
          item.description?.toLowerCase().includes('test') ||
          item.userName?.toLowerCase().includes('test')
        );
        
        // Filter out items that are locked, unavailable, or in trade
        const isUnavailable = (
          item.status === 'locked' ||
          item.status === 'unavailable' ||
          item.status === 'in_trade' ||
          item.status === 'pending_trade' ||
          item.status === 'traded' ||
          item.status === 'sold'
        );
        
        return !isTestLike && !isUnavailable && item.status === 'available';
      });
      
      console.log(`📊 After custom filter: ${afterCustomFilter.length} items`);
      
      // Stage 3: DataFilter.filterTestItems
      const afterDataFilter = afterCustomFilter.filter(item => {
        // Check obvious test patterns
        const obviousTestPatterns = {
          id: ['test_item_', 'sample_item_', 'demo_item_', 'mock_item_'],
          title: ['Test Item', 'Sample Item', 'Demo Item', 'Mock Item'],
          userName: ['Test User', 'Sample User', 'Demo User', 'Mock User'],
          location: ['Test City', 'Sample Location', 'Demo Location']
        };
        
        return !(
          obviousTestPatterns.id.some(pattern => item.id?.toLowerCase().includes(pattern.toLowerCase())) ||
          obviousTestPatterns.title.some(pattern => item.title?.includes(pattern)) ||
          obviousTestPatterns.userName.some(pattern => item.userName?.includes(pattern)) ||
          obviousTestPatterns.location.some(pattern => item.location === pattern)
        );
      });
      
      console.log(`📊 After DataFilter: ${afterDataFilter.length} items`);
      
      // 5. Show sample items at each stage
      console.log('\n📋 SAMPLE ITEMS:');
      
      if (allItems.length > 0) {
        console.log('Sample raw item:', {
          id: allItems[0].id,
          title: allItems[0].title,
          status: allItems[0].status,
          isActive: allItems[0].isActive,
          isVisible: allItems[0].isVisible,
          isAvailable: allItems[0].isAvailable,
          userName: allItems[0].userName,
          userId: allItems[0].userId
        });
      }
      
      if (availableItems.length > 0) {
        console.log('Sample available item:', {
          id: availableItems[0].id,
          title: availableItems[0].title,
          status: availableItems[0].status,
          userName: availableItems[0].userName
        });
      }
      
      // 6. Check for user's own items
      const userItems = allItems.filter(item => item.userId === userId);
      console.log(`📊 User's own items: ${userItems.length}`);
      
      // 7. Check for items from other users
      const otherUserItems = allItems.filter(item => item.userId !== userId);
      console.log(`📊 Items from other users: ${otherUserItems.length}`);
      
      // 8. Final recommendations
      console.log('\n💡 RECOMMENDATIONS:');
      
      if (allItems.length === 0) {
        console.log('❌ No items in database - need to create test data');
      } else if (availableItems.length === 0) {
        console.log('❌ No available items - all items have non-available status');
        console.log('🔧 Check why items are being marked as unavailable');
      } else if (afterArchiveFilter.length === 0) {
        console.log('❌ Archive filter removing all items - check isActive/isVisible flags');
      } else if (afterCustomFilter.length === 0) {
        console.log('❌ Custom filter too aggressive - check test-like filtering');
      } else if (afterDataFilter.length === 0) {
        console.log('❌ DataFilter removing all items - check test patterns');
      } else {
        console.log('✅ Items should be visible - check UI rendering');
      }
      
      return {
        totalItems: allItems.length,
        availableItems: availableItems.length,
        afterArchiveFilter: afterArchiveFilter.length,
        afterCustomFilter: afterCustomFilter.length,
        afterDataFilter: afterDataFilter.length,
        userItems: userItems.length,
        otherUserItems: otherUserItems.length,
        statusCounts,
        sampleItems: afterDataFilter.slice(0, 3)
      };
      
    } catch (error) {
      console.error('❌ Diagnostic error:', error);
      return null;
    }
  }
  
  // Quick fix to make items visible
  static async quickFixItemVisibility() {
    console.log('🔧 QUICK FIX - Making items visible...');
    
    try {
      // Get all items that might be hidden
      const itemsQuery = query(
        collection(db, 'items'),
        limit(50)
      );
      
      const snapshot = await getDocs(itemsQuery);
      let fixedCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        const item = docSnapshot.data();
        const itemRef = doc(db, 'items', docSnapshot.id);
        
        // Check if item needs fixing
        const needsFix = (
          item.status !== 'available' ||
          item.isActive === false ||
          item.isVisible === false ||
          item.isAvailable === false
        );
        
        if (needsFix && item.status !== 'archived' && item.status !== 'deleted') {
          await updateDoc(itemRef, {
            status: 'available',
            isActive: true,
            isVisible: true,
            isAvailable: true,
            lastUpdated: serverTimestamp()
          });
          
          fixedCount++;
          console.log(`✅ Fixed item: ${item.title}`);
        }
      }
      
      console.log(`🔧 Fixed ${fixedCount} items`);
      return fixedCount;
      
    } catch (error) {
      console.error('❌ Quick fix error:', error);
      return 0;
    }
  }
}

export default HomeScreenDiagnostic;