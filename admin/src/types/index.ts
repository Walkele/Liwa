// User Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
  isBanned: boolean;
  trustScore: number;
  totalTrades: number;
  successfulTrades: number;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  preferences?: {
    notifications: boolean;
    publicProfile: boolean;
  };
}

// Item Types
export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  images: string[];
  userId: string;
  userName: string;
  userPhoto?: string;
  location: {
    city: string;
    state: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  status: 'active' | 'traded' | 'archived' | 'flagged';
  createdAt: Date;
  updatedAt: Date;
  views: number;
  likes: number;
  isPromoted: boolean;
  tags: string[];
  estimatedValue?: number;
}

// Trade Types
export interface Trade {
  id: string;
  type: 'cash' | 'trade' | 'service';
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'disputed';
  initiatorId: string;
  receiverId: string;
  itemId: string;
  offerDetails: {
    cashAmount?: number;
    offeredItems?: string[];
    serviceDescription?: string;
    message: string;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  meetingDetails?: {
    location: string;
    scheduledTime: Date;
    safetyCode?: string;
  };
  rating?: {
    initiatorRating: number;
    receiverRating: number;
    initiatorReview?: string;
    receiverReview?: string;
  };
}

// Conversation Types
export interface Conversation {
  id: string;
  participants: string[];
  itemId: string;
  tradeId?: string;
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Message Types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'system' | 'offer' | 'location';
  timestamp: Date;
  isRead: boolean;
  metadata?: {
    offerAmount?: number;
    imageUrl?: string;
    location?: {
      lat: number;
      lng: number;
      address: string;
    };
  };
}

// Analytics Types
export interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalItems: number;
  activeItems: number;
  totalTrades: number;
  completedTrades: number;
  revenue: number;
  userGrowth: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  tradeVolume: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  topCategories: {
    category: string;
    count: number;
  }[];
  topLocations: {
    location: string;
    count: number;
  }[];
}

// Report Types
export interface Report {
  id: string;
  type: 'user' | 'item' | 'trade' | 'message';
  reporterId: string;
  targetId: string;
  reason: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  evidence?: {
    screenshots: string[];
    messages: string[];
    additionalInfo: string;
  };
}

// Admin Types
export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: 'super-admin' | 'admin' | 'moderator' | 'support';
  permissions: string[];
  createdAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'trade' | 'message' | 'system' | 'promotion';
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  scheduledFor?: Date;
}

// System Types
export interface SystemSettings {
  maintenance: {
    isEnabled: boolean;
    message: string;
    scheduledStart?: Date;
    scheduledEnd?: Date;
  };
  features: {
    trading: boolean;
    messaging: boolean;
    notifications: boolean;
    promotions: boolean;
  };
  limits: {
    maxItemsPerUser: number;
    maxImagesPerItem: number;
    maxMessageLength: number;
    maxTradesPerDay: number;
  };
  moderation: {
    autoFlagKeywords: string[];
    requireApproval: boolean;
    trustScoreThreshold: number;
  };
}