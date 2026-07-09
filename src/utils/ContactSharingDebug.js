import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class ContactSharingDebug {
  static async testContactSharing(conversationId, user, testContactData) {
    console.log('🧪 Testing contact sharing...');
    console.log('🧪 Conversation ID:', conversationId);
    console.log('🧪 User:', { uid: user.uid, displayName: user.displayName, email: user.email });
    console.log('🧪 Test contact data:', testContactData);

    try {
      // Test 1: Simple message without contact info
      console.log('🧪 Test 1: Creating simple message...');
      const simpleMessage = {
        conversationId,
        senderId: user.uid,
        text: '🧪 Test message from ContactSharingDebug',
        createdAt: serverTimestamp(),
        messageType: 'text'
      };
      
      await addDoc(collection(db, 'messages'), simpleMessage);
      console.log('✅ Test 1 passed: Simple message created');

      // Test 2: Message with minimal contact info
      console.log('🧪 Test 2: Creating message with minimal contact info...');
      const minimalContactMessage = {
        conversationId,
        senderId: user.uid,
        text: '🧪 Test contact sharing',
        createdAt: serverTimestamp(),
        messageType: 'trade_step_confirmation',
        step: 'contact_exchange',
        userId: user.uid,
        contactInfo: {
          phoneNumber: testContactData.phoneNumber || '(555) 123-4567',
          userName: user.displayName || 'Test User'
        }
      };
      
      await addDoc(collection(db, 'messages'), minimalContactMessage);
      console.log('✅ Test 2 passed: Minimal contact message created');

      // Test 3: Full contact info message
      console.log('🧪 Test 3: Creating message with full contact info...');
      const fullContactMessage = {
        conversationId,
        senderId: user.uid,
        text: '🧪 Test full contact sharing',
        createdAt: serverTimestamp(),
        messageType: 'trade_step_confirmation',
        step: 'contact_exchange',
        userId: user.uid,
        contactInfo: {
          phoneNumber: testContactData.phoneNumber || '(555) 123-4567',
          email: testContactData.email || 'test@example.com',
          preferredContact: testContactData.preferredContact || 'phone',
          userName: user.displayName || 'Test User',
          additionalNotes: testContactData.additionalNotes || 'Test notes'
        }
      };
      
      await addDoc(collection(db, 'messages'), fullContactMessage);
      console.log('✅ Test 3 passed: Full contact message created');

      return { success: true, message: 'All tests passed!' };
    } catch (error) {
      console.error('🚨 Contact sharing test failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.code,
        details: error
      };
    }
  }

  static async debugFirebasePermissions(user) {
    console.log('🔍 Debugging Firebase permissions...');
    console.log('🔍 User auth state:', {
      uid: user?.uid,
      email: user?.email,
      displayName: user?.displayName,
      emailVerified: user?.emailVerified,
      isAnonymous: user?.isAnonymous
    });

    try {
      // Test basic write permission
      const testDoc = {
        test: true,
        timestamp: serverTimestamp(),
        userId: user.uid
      };

      await addDoc(collection(db, 'messages'), testDoc);
      console.log('✅ Basic write permission works');
      return true;
    } catch (error) {
      console.error('🚨 Firebase permission error:', error);
      return false;
    }
  }
}