import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';
import { DataFilter } from '../utils/DataFilter';

export class OnboardingService {
  
  // Onboarding steps and their completion criteria
  static ONBOARDING_STEPS = {
    LOCATION_PERMISSION: {
      id: 'location_permission',
      title: 'Enable Location',
      description: 'Find items near you',
      icon: 'location',
      required: true,
      points: 5
    },
    VIEW_HOT_ITEMS: {
      id: 'view_hot_items',
      title: 'Explore Hot Items',
      description: 'See what\'s popular in your area',
      icon: 'flame',
      required: true,
      points: 10
    },
    COMPLETE_PROFILE: {
      id: 'complete_profile',
      title: 'Complete Profile',
      description: 'Add your name and location',
      icon: 'person',
      required: true,
      points: 15
    },
    FIRST_SWIPE: {
      id: 'first_swipe',
      title: 'Try Swiping',
      description: 'Swipe on items you like',
      icon: 'heart',
      required: false,
      points: 10
    },
    POST_FIRST_ITEM: {
      id: 'post_first_item',
      title: 'Post Your First Item',
      description: 'Share something you want to trade',
      icon: 'add-circle',
      required: false,
      points: 20
    },
    SEND_FIRST_MESSAGE: {
      id: 'send_first_message',
      title: 'Start a Conversation',
      description: 'Message someone about their item',
      icon: 'chatbubble',
      required: false,
      points: 15
    }
  };

  // Get local hot items for onboarding
  static async getLocalHotItems(userLocation, radiusKm = 25, limitCount = 20) {
    try {
      console.log('🔥 Loading local hot items for onboarding...');
      
      // Get recent items (hot items are recent + popular)
      const recentItemsQuery = query(
        collection(db, 'items'),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc'),
        limit(50) // Get more to filter and sort
      );

      const recentSnapshot = await getDocs(recentItemsQuery);
      let allItems = recentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter out test data
      allItems = DataFilter.filterTestItems(allItems);

      // Calculate "hotness" score for each item
      const hotItems = allItems.map(item => {
        const hotnessScore = this.calculateHotnessScore(item);
        return {
          ...item,
          hotnessScore,
          isHot: hotnessScore > 50
        };
      });

      // Sort by hotness score and take top items
      const sortedHotItems = hotItems
        .sort((a, b) => b.hotnessScore - a.hotnessScore)
        .slice(0, limitCount);

      // Add location distance if user location is available
      if (userLocation) {
        sortedHotItems.forEach(item => {
          if (item.locationCoords) {
            item.distance = this.calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              item.locationCoords.latitude,
              item.locationCoords.longitude
            );
          }
        });
      }

      console.log(`✅ Found ${sortedHotItems.length} hot items`);
      return sortedHotItems;

    } catch (error) {
      console.error('Error getting local hot items:', error);
      return [];
    }
  }

  // Calculate item "hotness" score
  static calculateHotnessScore(item) {
    const now = new Date();
    const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
    const ageHours = (now - createdAt) / (1000 * 60 * 60);
    
    let score = 0;
    
    // Recency score (newer = hotter)
    if (ageHours < 24) score += 30;
    else if (ageHours < 72) score += 20;
    else if (ageHours < 168) score += 10;
    
    // Engagement score
    score += (item.views || 0) * 2;
    score += (item.likes || 0) * 5;
    score += (item.messageCount || 0) * 10;
    
    // Price attractiveness (reasonable prices are hotter)
    if (item.price > 0 && item.price < 1000) {
      score += 15;
    }
    
    // Category popularity
    const popularCategories = ['Electronics', 'Clothing', 'Sports'];
    if (popularCategories.includes(item.category)) {
      score += 10;
    }
    
    // Boost multiplier
    if (item.isBoosted) {
      score *= (item.boostMultiplier || 1.5);
    }
    
    return Math.round(score);
  }

  // Get user's onboarding progress
  static async getUserOnboardingProgress(userId) {
    try {
      const onboardingQuery = query(
        collection(db, 'user_onboarding'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(onboardingQuery);
      
      if (snapshot.empty) {
        // Create initial onboarding record
        const initialProgress = {
          userId,
          completedSteps: [],
          totalPoints: 0,
          startedAt: serverTimestamp(),
          isComplete: false
        };
        
        await addDoc(collection(db, 'user_onboarding'), initialProgress);
        return initialProgress;
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      return null;
    }
  }

  // Mark onboarding step as complete
  static async completeOnboardingStep(userId, stepId) {
    try {
      console.log(`✅ Completing onboarding step: ${stepId} for user: ${userId}`);
      
      const progress = await this.getUserOnboardingProgress(userId);
      if (!progress) return;

      const step = this.ONBOARDING_STEPS[stepId.toUpperCase()];
      if (!step) {
        console.error('Invalid onboarding step:', stepId);
        return;
      }

      // Check if step is already completed
      if (progress.completedSteps.includes(stepId)) {
        console.log('Step already completed:', stepId);
        return;
      }

      // Update progress
      const updatedSteps = [...progress.completedSteps, stepId];
      const newPoints = progress.totalPoints + step.points;
      const isComplete = this.checkOnboardingComplete(updatedSteps);

      await updateDoc(doc(db, 'user_onboarding', progress.id), {
        completedSteps: updatedSteps,
        totalPoints: newPoints,
        isComplete,
        [`stepCompletedAt.${stepId}`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Award onboarding points to user
      await updateDoc(doc(db, 'users', userId), {
        onboardingPoints: newPoints,
        onboardingComplete: isComplete
      });

      console.log(`✅ Onboarding step completed: ${stepId} (+${step.points} points)`);
      
      return {
        stepCompleted: stepId,
        pointsEarned: step.points,
        totalPoints: newPoints,
        isOnboardingComplete: isComplete
      };

    } catch (error) {
      console.error('Error completing onboarding step:', error);
      throw error;
    }
  }

  // Check if onboarding is complete
  static checkOnboardingComplete(completedSteps) {
    const requiredSteps = Object.entries(this.ONBOARDING_STEPS)
      .filter(([key, step]) => step.required)
      .map(([key]) => key.toLowerCase());
    
    return requiredSteps.every(step => completedSteps.includes(step));
  }

  // Get onboarding completion percentage
  static getOnboardingProgress(completedSteps) {
    const totalSteps = Object.keys(this.ONBOARDING_STEPS).length;
    const completedCount = completedSteps.length;
    return Math.round((completedCount / totalSteps) * 100);
  }

  // Get next recommended step
  static getNextOnboardingStep(completedSteps) {
    const allSteps = Object.entries(this.ONBOARDING_STEPS);
    
    // Find first uncompleted required step
    for (const [key, step] of allSteps) {
      if (step.required && !completedSteps.includes(key.toLowerCase())) {
        return { key: key.toLowerCase(), ...step };
      }
    }
    
    // Find first uncompleted optional step
    for (const [key, step] of allSteps) {
      if (!step.required && !completedSteps.includes(key.toLowerCase())) {
        return { key: key.toLowerCase(), ...step };
      }
    }
    
    return null; // All steps completed
  }

  // Calculate distance between coordinates
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  // Get trending categories in user's area
  static async getTrendingCategories(userLocation, radiusKm = 25) {
    try {
      // Get recent items to analyze trends
      const recentItemsQuery = query(
        collection(db, 'items'),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(recentItemsQuery);
      const items = snapshot.docs.map(doc => doc.data());
      
      // Count items by category
      const categoryCounts = {};
      items.forEach(item => {
        const category = item.category || 'Other';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      // Sort categories by popularity
      const trendingCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({
          category,
          count,
          percentage: Math.round((count / items.length) * 100)
        }));

      return trendingCategories;
    } catch (error) {
      console.error('Error getting trending categories:', error);
      return [];
    }
  }
}

export default OnboardingService;