import { DatabaseCleanupService } from '../services/DatabaseCleanupService';
import { Alert } from 'react-native';

export class ProductionCleanup {
  
  // Execute comprehensive cleanup for production deployment
  static async executeProductionCleanup() {
    try {
      console.log('🚀 Starting production cleanup process...');
      
      // Step 1: Clean all test/mock data from database
      console.log('📊 Cleaning database...');
      const dbResults = await DatabaseCleanupService.cleanAllTestData();
      
      // Step 2: Get cleanup statistics
      console.log('📈 Getting cleanup statistics...');
      const stats = await DatabaseCleanupService.getCleanupStats();
      
      const summary = {
        database: dbResults,
        remaining: stats,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Production cleanup completed successfully!');
      console.log('📊 Cleanup Summary:', summary);
      
      return summary;
      
    } catch (error) {
      console.error('❌ Error during production cleanup:', error);
      throw error;
    }
  }
  
  // Verify cleanup completion
  static async verifyCleanupCompletion() {
    try {
      const stats = await DatabaseCleanupService.getCleanupStats();
      
      const hasTestData = 
        stats.testItems > 0 ||
        stats.testConversations > 0 ||
        stats.testMessages > 0 ||
        stats.testOffers > 0;
      
      return {
        isClean: !hasTestData,
        stats: stats,
        recommendations: hasTestData ? [
          'Run cleanup again to remove remaining test data',
          'Check for any custom test data patterns',
          'Verify all test users are removed'
        ] : [
          'Database is clean and ready for production',
          'Remove development tools from UI',
          'Update environment to production'
        ]
      };
      
    } catch (error) {
      console.error('❌ Error verifying cleanup:', error);
      return {
        isClean: false,
        error: error.message
      };
    }
  }
  
  // Show cleanup confirmation dialog
  static showCleanupConfirmation(onConfirm) {
    Alert.alert(
      '🧹 Production Cleanup',
      'This will permanently remove ALL test and mock data from your database:\n\n' +
      '• Test items and listings\n' +
      '• Test conversations and messages\n' +
      '• Test offers and trades\n' +
      '• Mock user profiles\n\n' +
      'This action cannot be undone. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clean Database',
          style: 'destructive',
          onPress: onConfirm
        }
      ]
    );
  }
  
  // Show cleanup results
  static showCleanupResults(results) {
    const totalCleaned = Object.values(results.database).reduce((sum, count) => sum + count, 0);
    
    Alert.alert(
      '✅ Cleanup Complete!',
      `Successfully removed ${totalCleaned} test records:\n\n` +
      `• ${results.database.items} test items\n` +
      `• ${results.database.conversations} test conversations\n` +
      `• ${results.database.messages} test messages\n` +
      `• ${results.database.offers} test offers\n` +
      `• ${results.database.trades} test trades\n\n` +
      'Your database is now clean and ready for production!',
      [{ text: 'OK' }]
    );
  }
}