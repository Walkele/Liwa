import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { OnboardingService } from '../services/OnboardingService';

const { width } = Dimensions.get('window');

export default function FastOnboardingScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hotItems, setHotItems] = useState([]);
  const [trendingCategories, setTrendingCategories] = useState([]);
  const [onboardingProgress, setOnboardingProgress] = useState({
    steps: [],
    totalPoints: 0,
    completedSteps: 0
  });

  const onboardingSteps = [
    {
      id: 'welcome',
      title: 'Welcome to SwipeIt!',
      description: 'Discover amazing items in your area',
      icon: 'hand-left-outline',
      points: 10
    },
    {
      id: 'location',
      title: 'Find Local Treasures',
      description: 'See what\'s hot near you',
      icon: 'location-outline',
      points: 15
    },
    {
      id: 'categories',
      title: 'Trending Categories',
      description: 'Popular items people are trading',
      icon: 'trending-up-outline',
      points: 20
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Start exploring and trading',
      icon: 'checkmark-circle-outline',
      points: 25
    }
  ];

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      
      // Load hot items and trending categories
      const [hotItemsData, trendingData, progressData] = await Promise.all([
        OnboardingService.getLocalHotItems(user.location),
        OnboardingService.getTrendingCategories(user.location),
        OnboardingService.getOnboardingProgress(user.uid)
      ]);

      setHotItems(hotItemsData);
      setTrendingCategories(trendingData);
      setOnboardingProgress(progressData);
      
      // Set current step based on progress
      setCurrentStep(progressData.completedSteps);
    } catch (error) {
      console.error('Error loading onboarding data:', error);
      Alert.alert('Error', 'Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const completeStep = async (stepId) => {
    try {
      setLoading(true);
      
      const step = onboardingSteps.find(s => s.id === stepId);
      await OnboardingService.completeOnboardingStep(user.uid, stepId, step.points);
      
      // Update progress
      const updatedProgress = await OnboardingService.getOnboardingProgress(user.uid);
      setOnboardingProgress(updatedProgress);
      
      // Move to next step
      if (currentStep < onboardingSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Onboarding complete
        Alert.alert(
          'Congratulations!',
          `You've earned ${updatedProgress.totalPoints} points! Ready to start trading?`,
          [
            {
              text: 'Start Trading',
              onPress: () => navigation.replace('Main')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error completing step:', error);
      Alert.alert('Error', 'Failed to complete step');
    } finally {
      setLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="hand-left-outline" size={80} color="#FF6B6B" />
      <Text style={styles.stepTitle}>Welcome to SwipeIt!</Text>
      <Text style={styles.stepDescription}>
        The easiest way to trade items with people in your area. 
        Swipe, chat, and make deals safely!
      </Text>
      <View style={styles.pointsBadge}>
        <Ionicons name="star" size={16} color="#FFD700" />
        <Text style={styles.pointsText}>+10 points</Text>
      </View>
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="location-outline" size={80} color="#FF6B6B" />
      <Text style={styles.stepTitle}>Hot Items Near You</Text>
      <Text style={styles.stepDescription}>
        Check out what's popular in your area right now!
      </Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hotItemsContainer}>
        {hotItems.map((item, index) => (
          <View key={index} style={styles.hotItemCard}>
            <View style={styles.hotItemImagePlaceholder}>
              <Ionicons name="image-outline" size={30} color="#666" />
            </View>
            <Text style={styles.hotItemTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.hotItemViews}>{item.views} views</Text>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.pointsBadge}>
        <Ionicons name="star" size={16} color="#FFD700" />
        <Text style={styles.pointsText}>+15 points</Text>
      </View>
    </View>
  );

  const renderCategoriesStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="trending-up-outline" size={80} color="#FF6B6B" />
      <Text style={styles.stepTitle}>Trending Categories</Text>
      <Text style={styles.stepDescription}>
        See what categories are hot in your area
      </Text>
      
      <View style={styles.categoriesGrid}>
        {trendingCategories.map((category, index) => (
          <View key={index} style={styles.categoryCard}>
            <Ionicons name={category.icon} size={30} color="#FF6B6B" />
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryCount}>{category.itemCount} items</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.pointsBadge}>
        <Ionicons name="star" size={16} color="#FFD700" />
        <Text style={styles.pointsText}>+20 points</Text>
      </View>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="checkmark-circle-outline" size={80} color="#4CAF50" />
      <Text style={styles.stepTitle}>You're All Set!</Text>
      <Text style={styles.stepDescription}>
        Congratulations! You've earned {onboardingProgress.totalPoints} points.
        Ready to start trading?
      </Text>
      
      <View style={styles.completionStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{hotItems.length}</Text>
          <Text style={styles.statLabel}>Hot Items</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{trendingCategories.length}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{onboardingProgress.totalPoints}</Text>
          <Text style={styles.statLabel}>Points Earned</Text>
        </View>
      </View>
      
      <View style={styles.pointsBadge}>
        <Ionicons name="star" size={16} color="#FFD700" />
        <Text style={styles.pointsText}>+25 points</Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    const step = onboardingSteps[currentStep];
    
    switch (step.id) {
      case 'welcome':
        return renderWelcomeStep();
      case 'location':
        return renderLocationStep();
      case 'categories':
        return renderCategoriesStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderWelcomeStep();
    }
  };

  if (loading && hotItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading your personalized experience...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {currentStep + 1} of {onboardingSteps.length}
        </Text>
      </View>

      {/* Step Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, loading && styles.actionButtonDisabled]}
          onPress={() => completeStep(onboardingSteps[currentStep].id)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.actionButtonText}>
                {currentStep === onboardingSteps.length - 1 ? 'Start Trading' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
        
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.replace('Main')}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  progressContainer: {
    padding: 20,
    paddingBottom: 10
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  content: {
    flex: 1,
    padding: 20
  },
  stepContainer: {
    alignItems: 'center',
    paddingVertical: 20
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center'
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 20
  },
  pointsText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#856404'
  },
  hotItemsContainer: {
    marginVertical: 20
  },
  hotItemCard: {
    width: 120,
    marginRight: 15,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  hotItemImagePlaceholder: {
    height: 80,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  hotItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  hotItemViews: {
    fontSize: 12,
    color: '#666'
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 20
  },
  categoryCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4
  },
  categoryCount: {
    fontSize: 12,
    color: '#666'
  },
  completionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 30
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B'
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  actionContainer: {
    padding: 20,
    paddingTop: 10
  },
  actionButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  actionButtonDisabled: {
    opacity: 0.6
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8
  },
  skipButton: {
    alignItems: 'center',
    padding: 12
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16
  }
});