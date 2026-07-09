import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class MeetingConfirmationService {
  
  // Meeting status types
  static MEETING_STATUS = {
    SUGGESTED: 'suggested',
    CONFIRMED: 'confirmed',
    REJECTED: 'rejected',
    MODIFIED: 'modified'
  };

  /**
   * Suggest a meeting location and time
   */
  static async suggestMeeting(conversationId, suggestingUserId, meetingData) {
    try {
      console.log('📍 Creating meeting suggestion:', meetingData);

      const meetingDoc = {
        conversationId,
        suggestedBy: suggestingUserId,
        location: meetingData.location,
        time: meetingData.time,
        additionalNotes: meetingData.additionalNotes || '',
        isPublicPlace: meetingData.isPublicPlace || false,
        status: this.MEETING_STATUS.SUGGESTED,
        createdAt: serverTimestamp(),
        confirmedBy: null,
        confirmedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        // Safety features
        safetyVerified: meetingData.isPublicPlace || false,
        coordinates: meetingData.coordinates || null
      };

      const docRef = await addDoc(collection(db, 'meetingSuggestions'), meetingDoc);

      // Create system message for the suggestion
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: 'system',
        senderName: 'Liwa',
        text: `📍 Meeting location suggested: ${meetingData.location} at ${meetingData.time}`,
        messageType: 'meeting_suggestion',
        isSystemMessage: true,
        createdAt: serverTimestamp(),
        meetingSuggestionId: docRef.id,
        meetingData: {
          location: meetingData.location,
          time: meetingData.time,
          isPublicPlace: meetingData.isPublicPlace,
          additionalNotes: meetingData.additionalNotes,
          status: 'pending_confirmation'
        },
        actionRequired: true,
        actionType: 'confirm_meeting'
      });

      return {
        success: true,
        meetingSuggestionId: docRef.id,
        meetingData: meetingDoc
      };

    } catch (error) {
      console.error('❌ Error suggesting meeting:', error);
      throw error;
    }
  }

  /**
   * Confirm a meeting suggestion with strict validation
   */
  static async confirmMeeting(meetingSuggestionId, confirmingUserId, conversationId) {
    try {
      console.log('✅ Confirming meeting suggestion:', meetingSuggestionId);

      // Get the meeting suggestion to validate
      const meetingsQuery = query(
        collection(db, 'meetingSuggestions'),
        where('conversationId', '==', conversationId)
      );
      const snapshot = await getDocs(meetingsQuery);
      const allMeetings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Find the meeting being confirmed
      const meetingToConfirm = allMeetings.find(m => m.id === meetingSuggestionId);
      if (!meetingToConfirm) {
        throw new Error('Meeting suggestion not found');
      }

      // Check if there are any conflicting pending suggestions from the other user
      const conflictingSuggestions = allMeetings.filter(m => 
        m.id !== meetingSuggestionId &&
        m.status === this.MEETING_STATUS.SUGGESTED &&
        m.suggestedBy === confirmingUserId &&
        (m.location !== meetingToConfirm.location || m.time !== meetingToConfirm.time)
      );

      if (conflictingSuggestions.length > 0) {
        throw new Error('You have a different meeting suggestion pending. Please withdraw it first before confirming this one.');
      }

      // Update the meeting suggestion
      const meetingRef = doc(db, 'meetingSuggestions', meetingSuggestionId);
      await updateDoc(meetingRef, {
        status: this.MEETING_STATUS.CONFIRMED,
        confirmedBy: confirmingUserId,
        confirmedAt: serverTimestamp(),
        // Add grace period (default 15 minutes)
        gracePeriodMinutes: 15,
        strictAgreement: true
      });

      // Reject all other pending suggestions for this conversation
      for (const otherMeeting of allMeetings) {
        if (otherMeeting.id !== meetingSuggestionId && otherMeeting.status === this.MEETING_STATUS.SUGGESTED) {
          const otherRef = doc(db, 'meetingSuggestions', otherMeeting.id);
          await updateDoc(otherRef, {
            status: this.MEETING_STATUS.REJECTED,
            rejectedBy: 'system',
            rejectedAt: serverTimestamp(),
            rejectionReason: 'Another meeting was confirmed'
          });
        }
      }

      // Create confirmation message with strict agreement details
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: 'system',
        senderName: 'Liwa',
        text: `✅ Meeting confirmed! Both parties agreed to meet at:\n📍 ${meetingToConfirm.location}\n⏰ ${meetingToConfirm.time}\n\n⚠️ Grace period: 15 minutes. Please arrive on time or notify your partner.`,
        messageType: 'meeting_confirmed',
        isSystemMessage: true,
        createdAt: serverTimestamp(),
        meetingSuggestionId,
        actionRequired: false,
        meetingDetails: {
          location: meetingToConfirm.location,
          time: meetingToConfirm.time,
          gracePeriodMinutes: 15,
          strictAgreement: true
        }
      });

      // Create trade step confirmation for meeting arranged
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: confirmingUserId,
        text: '📍 Meeting details confirmed',
        messageType: 'trade_step_confirmation',
        step: 'meeting_arranged',
        userId: confirmingUserId,
        createdAt: serverTimestamp(),
        meetingSuggestionId
      });

      return { 
        success: true,
        confirmedMeeting: {
          location: meetingToConfirm.location,
          time: meetingToConfirm.time,
          gracePeriodMinutes: 15
        }
      };

    } catch (error) {
      console.error('❌ Error confirming meeting:', error);
      throw error;
    }
  }

  /**
   * Reject a meeting suggestion with optional counter-suggestion
   */
  static async rejectMeeting(meetingSuggestionId, rejectingUserId, conversationId, reason, counterSuggestion = null) {
    try {
      console.log('❌ Rejecting meeting suggestion:', meetingSuggestionId);

      // Update the meeting suggestion
      const meetingRef = doc(db, 'meetingSuggestions', meetingSuggestionId);
      await updateDoc(meetingRef, {
        status: this.MEETING_STATUS.REJECTED,
        rejectedBy: rejectingUserId,
        rejectedAt: serverTimestamp(),
        rejectionReason: reason
      });

      let messageText = `❌ Meeting suggestion declined. ${reason ? `Reason: ${reason}` : ''}`;
      
      // Create rejection message
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: 'system',
        senderName: 'Liwa',
        text: messageText,
        messageType: 'meeting_rejected',
        isSystemMessage: true,
        createdAt: serverTimestamp(),
        meetingSuggestionId,
        rejectionReason: reason
      });

      // If there's a counter-suggestion, create it
      if (counterSuggestion) {
        await this.suggestMeeting(conversationId, rejectingUserId, counterSuggestion);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Error rejecting meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting suggestions for a conversation
   */
  static async getMeetingSuggestions(conversationId) {
    try {
      const meetingsQuery = query(
        collection(db, 'meetingSuggestions'),
        where('conversationId', '==', conversationId)
      );

      const snapshot = await getDocs(meetingsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      console.error('❌ Error getting meeting suggestions:', error);
      return [];
    }
  }

  /**
   * Get the confirmed meeting for a conversation
   */
  static async getConfirmedMeeting(conversationId) {
    try {
      const meetingsQuery = query(
        collection(db, 'meetingSuggestions'),
        where('conversationId', '==', conversationId),
        where('status', '==', this.MEETING_STATUS.CONFIRMED)
      );

      const snapshot = await getDocs(meetingsQuery);
      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };

    } catch (error) {
      console.error('❌ Error getting confirmed meeting:', error);
      return null;
    }
  }

  /**
   * Check if meeting location is safe (public place)
   */
  static validateMeetingLocation(location) {
    const safeKeywords = [
      'mall', 'coffee shop', 'starbucks', 'mcdonalds', 'restaurant', 
      'library', 'park', 'station', 'plaza', 'center', 'public',
      'school', 'university', 'hospital', 'police', 'bank'
    ];

    const unsafeKeywords = [
      'home', 'house', 'apartment', 'private', 'bedroom', 'garage'
    ];

    const locationLower = location.toLowerCase();
    
    const isSafe = safeKeywords.some(keyword => locationLower.includes(keyword));
    const isUnsafe = unsafeKeywords.some(keyword => locationLower.includes(keyword));

    return {
      isSafe,
      isUnsafe,
      recommendation: isSafe ? 'safe' : isUnsafe ? 'unsafe' : 'unknown',
      suggestion: !isSafe ? 'Consider meeting at a public place like a coffee shop or mall for safety' : null
    };
  }

  /**
   * Check for conflicting meeting suggestions
   */
  static async checkMeetingConflicts(conversationId) {
    try {
      const meetings = await this.getMeetingSuggestions(conversationId);
      const pendingMeetings = meetings.filter(m => m.status === this.MEETING_STATUS.SUGGESTED);

      if (pendingMeetings.length <= 1) {
        return { hasConflict: false, conflicts: [] };
      }

      // Group by user
      const userSuggestions = {};
      pendingMeetings.forEach(meeting => {
        if (!userSuggestions[meeting.suggestedBy]) {
          userSuggestions[meeting.suggestedBy] = [];
        }
        userSuggestions[meeting.suggestedBy].push(meeting);
      });

      const users = Object.keys(userSuggestions);
      if (users.length < 2) {
        return { hasConflict: false, conflicts: [] };
      }

      // Check if users have different suggestions
      const conflicts = [];
      const user1Suggestions = userSuggestions[users[0]];
      const user2Suggestions = userSuggestions[users[1]];

      user1Suggestions.forEach(s1 => {
        user2Suggestions.forEach(s2 => {
          if (s1.location !== s2.location || s1.time !== s2.time) {
            conflicts.push({
              user1Suggestion: s1,
              user2Suggestion: s2,
              locationMismatch: s1.location !== s2.location,
              timeMismatch: s1.time !== s2.time
            });
          }
        });
      });

      return {
        hasConflict: conflicts.length > 0,
        conflicts,
        message: conflicts.length > 0 
          ? '⚠️ You and your partner have suggested different meeting details. Please discuss and agree on one option.'
          : null
      };

    } catch (error) {
      console.error('❌ Error checking meeting conflicts:', error);
      return { hasConflict: false, conflicts: [] };
    }
  }

  /**
   * Validate if both parties have agreed on exact same meeting details
   */
  static async validateMutualAgreement(conversationId) {
    try {
      const confirmedMeeting = await this.getConfirmedMeeting(conversationId);
      
      if (!confirmedMeeting) {
        return {
          isValid: false,
          message: 'No confirmed meeting found. Both parties must agree on meeting details.'
        };
      }

      if (!confirmedMeeting.strictAgreement) {
        return {
          isValid: false,
          message: 'Meeting was not confirmed with strict agreement protocol.'
        };
      }

      return {
        isValid: true,
        meeting: confirmedMeeting,
        message: 'Meeting details confirmed by both parties',
        gracePeriodMinutes: confirmedMeeting.gracePeriodMinutes || 15
      };

    } catch (error) {
      console.error('❌ Error validating mutual agreement:', error);
      return {
        isValid: false,
        message: 'Error validating meeting agreement'
      };
    }
  }
}

export default MeetingConfirmationService;