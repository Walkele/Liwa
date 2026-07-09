
import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import SwipeScreen from './src/screens/SwipeScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import TradeScreen from './src/screens/TradeScreen';
import TradeManagementScreen from './src/screens/TradeManagementScreen';
import TradeLifecycleScreen from './src/screens/TradeLifecycleScreen';
import TradeActionsHub from './src/screens/TradeActionsHub';
import TradeVerificationScreen from './src/screens/TradeVerificationScreen';
import TradeRulesScreen from './src/screens/TradeRulesScreen';
import SearchScreen from './src/screens/SearchScreen';
import PostScreen from './src/screens/PostScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ItemDetailsScreen from './src/screens/ItemDetailsScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OffersScreen from './src/screens/OffersScreen';
import AllOffersScreen from './src/screens/AllOffersScreen';
import MyItemsScreen from './src/screens/MyItemsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import TradeHistoryScreen from './src/screens/TradeHistoryScreen';
import DatabaseCleanupScreen from './src/screens/DatabaseCleanupScreen';
import EnhancedChatScreen from './src/screens/EnhancedChatScreen';
import QRVerificationScreen from './src/screens/QRVerificationScreen';
import SafeExchangeZonesScreen from './src/screens/SafeExchangeZonesScreen';
import PremiumSubscriptionScreen from './src/screens/PremiumSubscriptionScreen';
import ItemBoostScreen from './src/screens/ItemBoostScreen';
import FastOnboardingScreen from './src/screens/FastOnboardingScreen';
import LocalHotItemsScreen from './src/screens/LocalHotItemsScreen';
import MakeBetterOfferScreen from './src/screens/MakeBetterOfferScreen';
import DataConsistencyFixScreen from './src/screens/DataConsistencyFixScreen';
import DatabaseStandardizationScreen from './src/screens/DatabaseStandardizationScreen';
import ProductionReadinessScreen from './src/screens/ProductionReadinessScreen';
import LocationPickerScreen from './src/screens/LocationPickerScreen';
import ReviewSubmissionScreen from './src/screens/ReviewSubmissionScreen';
import ArchivedItemsScreen from './src/screens/ArchivedItemsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import OfferComparisonScreen from './src/screens/OfferComparisonScreen';
import MyOffersScreen from './src/screens/MyOffersScreen';
import TradeProposalScreen from './src/screens/TradeProposalScreen';
import LifecycleGuideScreen from './src/screens/LifecycleGuideScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import IdentityVerificationScreen from './src/screens/IdentityVerificationScreen';
import ShippingScreen from './src/screens/ShippingScreen';
import SellerDashboardScreen from './src/screens/SellerDashboardScreen';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TradeProvider } from './src/context/TradeContext';
import { NotificationProvider } from './src/context/NotificationContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Swipe') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Matches') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={typeof size === 'number' ? size : parseInt(size) || 24} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="ItemDetails" component={ItemDetailsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Post" component={PostScreen} />
      <Stack.Screen name="TradeProposal" component={TradeProposalScreen} />
      <Stack.Screen name="Trade" component={TradeScreen} />
      <Stack.Screen name="TradeManagement" component={TradeManagementScreen} />
      <Stack.Screen name="TradeLifecycle" component={TradeLifecycleScreen} />
      <Stack.Screen name="TradeActions" component={TradeActionsHub} />
      <Stack.Screen name="TradeVerification" component={TradeVerificationScreen} />
      <Stack.Screen name="TradeRules" component={TradeRulesScreen} />
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen name="AllOffers" component={AllOffersScreen} />
      <Stack.Screen name="MyItems" component={MyItemsScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="TradeHistory" component={TradeHistoryScreen} />
      <Stack.Screen name="DatabaseCleanup" component={DatabaseCleanupScreen} />
      <Stack.Screen name="EnhancedChat" component={EnhancedChatScreen} />
      <Stack.Screen name="QRVerification" component={QRVerificationScreen} />
      <Stack.Screen name="SafeExchangeZones" component={SafeExchangeZonesScreen} />
      <Stack.Screen name="PremiumSubscription" component={PremiumSubscriptionScreen} />
      <Stack.Screen name="ItemBoost" component={ItemBoostScreen} />
      <Stack.Screen name="FastOnboarding" component={FastOnboardingScreen} />
      <Stack.Screen name="LocalHotItems" component={LocalHotItemsScreen} />
      <Stack.Screen name="MakeBetterOffer" component={MakeBetterOfferScreen} />
      <Stack.Screen name="DataConsistencyFix" component={DataConsistencyFixScreen} />
      <Stack.Screen name="DatabaseStandardization" component={DatabaseStandardizationScreen} />
      <Stack.Screen name="ProductionReadiness" component={ProductionReadinessScreen} />
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="ReviewSubmission" component={ReviewSubmissionScreen} />
      <Stack.Screen name="ArchivedItems" component={ArchivedItemsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="OfferComparison" component={OfferComparisonScreen} />
      <Stack.Screen name="MyOffers" component={MyOffersScreen} />
      <Stack.Screen name="LifecycleGuide" component={LifecycleGuideScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
      <Stack.Screen name="Shipping" component={ShippingScreen} />
      <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TradeProvider>
        <NotificationProvider>
          <AppNavigator />
        </NotificationProvider>
      </TradeProvider>
    </AuthProvider>
  );
}
