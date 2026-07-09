import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LiwaSOPService } from '../services/LiwaSOPService';
import LoadingButton from './LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

const ContactSharingModal = ({ 
  visible, 
  onClose, 
  offerId, 
  conversationId, 
  otherUserName,
  onContactShared 
}) => {
  const { user } = useAuth();
  
  // Contact information state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [preferredContact, setPreferredContact] = useState('phone'); // 'phone' or 'email'
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  // Privacy controls
  const [sharePhone, setSharePhone] = useState(true);
  const [shareEmail, setShareEmail] = useState(false);
  const [shareOnlyForThisTrade, setShareOnlyForThisTrade] = useState(true);
  
  const { loading, withLoading } = useLoadingState();
  const { showError } = useNotification();

  const handleShareContact = async () => {
    // Validation
    if (!sharePhone && !shareEmail) {
      showError('No Contact Method', 'Please select at least one contact method to share.');
      return;
    }

    if (sharePhone && !phoneNumber.trim()) {
      showError('Phone Required', 'Please enter your phone number.');
      return;
    }

    if (shareEmail && !email.trim()) {
      showError('Email Required', 'Please enter your email address.');
      return;
    }

    await withLoading(
      async () => {
        const contactData = {
          userId: user.uid,
          userName: user.displayName || user.email,
          sharedAt: new Date(),
          shareOnlyForThisTrade,
          preferredContact,
          additionalNotes: additionalNotes.trim(),
          conversationId: conversationId
        };

        // Add contact methods based on user selection
        if (sharePhone && phoneNumber.trim()) {
          contactData.phoneNumber = phoneNumber.trim();
        }

        if (shareEmail && email.trim()) {
          contactData.email = email.trim();
        }

        // Try to update traditional trade if offer ID is available
        if (offerId) {
          try {
            await LiwaSOPService.shareContactInfoSOP(offerId, contactData);
            console.log('📞 Contact shared via traditional SOP service');
          } catch (error) {
            console.log('⚠️ Traditional SOP service failed, proceeding with callback only');
          }
        } else {
          console.log('📞 No offer ID - sharing contact info for counter-offer trade');
        }

        // Always call the callback for both traditional and counter-offer trades
        if (onContactShared) {
          onContactShared(contactData);
        } else {
          // Close modal for standalone usage
          onClose();
        }
      },
      {
        successMessage: `Your ${sharePhone && shareEmail ? 'phone and email' : sharePhone ? 'phone number' : 'email'} has been shared with ${otherUserName}.`,
        errorMessage: 'Failed to share contact information. Please try again.',
        showSuccessNotification: true
      }
    );
  };

  const formatPhoneNumber = (text) => {
    // Simple phone number formatting (US format)
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return text;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Contact Info</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Introduction */}
          <View style={styles.introContainer}>
            <Ionicons name="shield-checkmark" size={40} color="#4CAF50" />
            <Text style={styles.introTitle}>Safe Contact Exchange</Text>
            <Text style={styles.introText}>
              Share your contact information with {otherUserName} to coordinate your trade meeting.
            </Text>
          </View>

          {/* Contact Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Contact Methods</Text>
            
            {/* Phone Number */}
            <View style={styles.contactMethod}>
              <View style={styles.contactHeader}>
                <View style={styles.contactLabelContainer}>
                  <Ionicons name="call" size={20} color="#FF6B6B" />
                  <Text style={styles.contactLabel}>Phone Number</Text>
                </View>
                <Switch
                  value={sharePhone}
                  onValueChange={setSharePhone}
                  trackColor={{ false: '#ccc', true: '#FF6B6B' }}
                  thumbColor={sharePhone ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              {sharePhone && (
                <TextInput
                  style={styles.contactInput}
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                  keyboardType="phone-pad"
                  maxLength={14}
                />
              )}
            </View>

            {/* Email */}
            <View style={styles.contactMethod}>
              <View style={styles.contactHeader}>
                <View style={styles.contactLabelContainer}>
                  <Ionicons name="mail" size={20} color="#FF6B6B" />
                  <Text style={styles.contactLabel}>Email Address</Text>
                </View>
                <Switch
                  value={shareEmail}
                  onValueChange={setShareEmail}
                  trackColor={{ false: '#ccc', true: '#FF6B6B' }}
                  thumbColor={shareEmail ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              {shareEmail && (
                <TextInput
                  style={styles.contactInput}
                  placeholder="your.email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            </View>
          </View>

          {/* Preferred Contact Method */}
          {sharePhone && shareEmail && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⭐ Preferred Contact</Text>
              <View style={styles.preferredContactContainer}>
                <TouchableOpacity
                  style={[
                    styles.preferredContactButton,
                    preferredContact === 'phone' && styles.selectedPreferredContact
                  ]}
                  onPress={() => setPreferredContact('phone')}
                >
                  <Ionicons 
                    name="call" 
                    size={16} 
                    color={preferredContact === 'phone' ? 'white' : '#FF6B6B'} 
                  />
                  <Text style={[
                    styles.preferredContactText,
                    preferredContact === 'phone' && styles.selectedPreferredContactText
                  ]}>
                    Phone
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.preferredContactButton,
                    preferredContact === 'email' && styles.selectedPreferredContact
                  ]}
                  onPress={() => setPreferredContact('email')}
                >
                  <Ionicons 
                    name="mail" 
                    size={16} 
                    color={preferredContact === 'email' ? 'white' : '#FF6B6B'} 
                  />
                  <Text style={[
                    styles.preferredContactText,
                    preferredContact === 'email' && styles.selectedPreferredContactText
                  ]}>
                    Email
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Additional Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Additional Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Best times to call, communication preferences, etc."
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Privacy Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Privacy Settings</Text>
            <View style={styles.privacyOption}>
              <View style={styles.privacyLabelContainer}>
                <Ionicons name="lock-closed" size={20} color="#666" />
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.privacyLabel}>Trade-Only Contact</Text>
                  <Text style={styles.privacyDescription}>
                    Only share for this trade (recommended)
                  </Text>
                </View>
              </View>
              <Switch
                value={shareOnlyForThisTrade}
                onValueChange={setShareOnlyForThisTrade}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={shareOnlyForThisTrade ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Safety Tips */}
          <View style={styles.safetyTipsContainer}>
            <Text style={styles.safetyTipsTitle}>🛡️ Safety Tips</Text>
            <Text style={styles.safetyTip}>• Only share contact info for confirmed trades</Text>
            <Text style={styles.safetyTip}>• Meet in public, safe locations</Text>
            <Text style={styles.safetyTip}>• Trust your instincts - cancel if something feels wrong</Text>
            <Text style={styles.safetyTip}>• Report any suspicious behavior</Text>
          </View>
        </ScrollView>

        {/* Share Button */}
        <View style={styles.footer}>
          <LoadingButton
            title="Share Contact Info"
            onPress={handleShareContact}
            loading={loading}
            disabled={!sharePhone && !shareEmail}
            variant="primary"
            icon="share"
            style={styles.shareButton}
            textStyle={styles.shareButtonText}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  introContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 20,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  introText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  contactMethod: {
    marginBottom: 20,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  contactLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  contactInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  preferredContactContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  preferredContactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    backgroundColor: 'white',
  },
  selectedPreferredContact: {
    backgroundColor: '#FF6B6B',
  },
  preferredContactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 6,
  },
  selectedPreferredContactText: {
    color: 'white',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  safetyTipsContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  safetyTipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 10,
  },
  safetyTip: {
    fontSize: 14,
    color: '#BF360C',
    marginBottom: 5,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  shareButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ContactSharingModal;