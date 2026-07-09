import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { BlindReviewService } from '../services/BlindReviewService';

const ReviewSubmissionScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { tradeId, otherUserId, otherUserName, itemTitle } = route.params;

  // Review state
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [categories, setCategories] = useState({
    communication: 0,
    itemAccuracy: 0,
    timeliness: 0,
    professionalism: 0
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [tradeVerification, setTradeVerification] = useState(null);
  const [existingReview, setExistingReview] = useState(null);

  useEffect(() => {
    checkTradeEligibility();
    checkExistingReview();
  }, []);

  const checkTradeEligibility = async () => {
    try {
      const verification = await BlindReviewService.verifyTradeCompletion(tradeId, user.uid);
      setTradeVerification(verification);
      
      if (!verification.isValid) {
        Alert.alert(
          'Review Not Available',
          verification.reason,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error checking trade eligibility:', error);
      Alert.alert('Error', 'Unable to verify trade completion.');
    }
  };

  const checkExistingReview = async () => {
    try {
      const existing = await BlindReviewService.getExistingReview(tradeId, user.uid);
      if (existing) {
        setExistingReview(existing);
        Alert.alert(
          'Review Already Submitted',
          'You have already submitted a review for this trade.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error checking existing review:', error);
    }
  };

  const handleRatingPress = (selectedRating) => {
    setRating(selectedRating);
  };

  const handleCategoryRating = (category, selectedRating) => {
    setCategories(prev => ({
      ...prev,
      [category]: selectedRating
    }));
  };

  const submitReview = async () => {
    try {
      // Validation
      if (rating === 0) {
        Alert.alert('Rating Required', 'Please select an overall rating.');
        return;
      }

      if (comments.trim().length < 10) {
        Alert.alert('Comments Required', 'Please provide at least 10 characters of feedback.');
        return;
      }

      setLoading(true);

      const reviewData = {
        rating,
        comments: comments.trim(),
        categories
      };

      const result = await BlindReviewService.submitBlindReview(
        tradeId,
        user.uid,
        otherUserId,
        reviewData
      );

      if (result.success) {
        if (result.bothSubmitted) {
          Alert.alert(
            '🎉 Reviews Revealed!',
            'Both parties have submitted reviews. You can now see each other\'s feedback.',
            [
              {
                text: 'View Reviews',
                onPress: () => navigation.replace('ReviewResults', {
                  tradeId,
                  otherUserName,
                  itemTitle
                })
              }
            ]
          );
        } else {
          Alert.alert(
            '✅ Review Submitted!',
            'Your review has been submitted. It will be revealed when the other party also submits their review.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack()
              }
            ]
          );
        }
      }

    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (currentRating, onPress, size = 30) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={size}
              color={star <= currentRating ? '#FFD700' : '#DDD'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCategoryRating = (category, title, currentRating) => {
    return (
      <View style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{title}</Text>
        {renderStarRating(currentRating, (rating) => handleCategoryRating(category, rating), 24)}
      </View>
    );
  };

  if (existingReview) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.centerTitle}>Review Already Submitted</Text>
          <Text style={styles.centerSubtitle}>
            You have already submitted a review for this trade.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!tradeVerification?.isValid) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={80} color="#FF6B6B" />
          <Text style={styles.centerTitle}>Review Not Available</Text>
          <Text style={styles.centerSubtitle}>
            {tradeVerification?.reason || 'Trade must be completed before submitting reviews.'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Trade</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Trade Info */}
        <View style={styles.tradeInfoContainer}>
          <Text style={styles.tradeInfoTitle}>Trade with {otherUserName}</Text>
          <Text style={styles.tradeInfoSubtitle}>Item: {itemTitle}</Text>
          
          {tradeVerification?.qrVerified && (
            <View style={styles.verificationBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
              <Text style={styles.verificationText}>QR Verified Trade</Text>
            </View>
          )}
        </View>

        {/* Blind Review Notice */}
        <View style={styles.noticeContainer}>
          <Ionicons name="eye-off" size={24} color="#2196F3" />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Blind Review System</Text>
            <Text style={styles.noticeText}>
              Your review will remain hidden until both parties submit their reviews. 
              This prevents bias and ensures honest feedback.
            </Text>
          </View>
        </View>

        {/* Overall Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Rating</Text>
          <Text style={styles.sectionSubtitle}>How was your experience with {otherUserName}?</Text>
          {renderStarRating(rating, handleRatingPress)}
          
          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating === 5 ? 'Excellent!' : 
               rating === 4 ? 'Very Good' : 
               rating === 3 ? 'Good' : 
               rating === 2 ? 'Fair' : 'Poor'}
            </Text>
          )}
        </View>

        {/* Category Ratings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Ratings</Text>
          
          {renderCategoryRating('communication', 'Communication', categories.communication)}
          {renderCategoryRating('itemAccuracy', 'Item Accuracy', categories.itemAccuracy)}
          {renderCategoryRating('timeliness', 'Timeliness', categories.timeliness)}
          {renderCategoryRating('professionalism', 'Professionalism', categories.professionalism)}
        </View>

        {/* Comments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <Text style={styles.sectionSubtitle}>
            Share your experience (minimum 10 characters)
          </Text>
          <TextInput
            style={styles.commentsInput}
            placeholder="Describe your experience with this trade..."
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {comments.length}/500 characters
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (rating === 0 || comments.trim().length < 10 || loading) && styles.disabledButton
          ]}
          onPress={submitReview}
          disabled={rating === 0 || comments.trim().length < 10 || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="white" />
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Text style={styles.privacyText}>
            🔒 Your review will be kept private until both parties submit their reviews. 
            This ensures unbiased and honest feedback from both sides.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  headerButton: {
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  centerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  centerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tradeInfoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginVertical: 20,
    alignItems: 'center',
  },
  tradeInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tradeInfoSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 10,
  },
  verificationText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 5,
  },
  noticeContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  noticeContent: {
    flex: 1,
    marginLeft: 10,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  noticeText: {
    fontSize: 14,
    color: '#1565C0',
    marginTop: 5,
    lineHeight: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  starButton: {
    padding: 5,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginTop: 10,
  },
  categoryContainer: {
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  privacyNotice: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  privacyText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ReviewSubmissionScreen;