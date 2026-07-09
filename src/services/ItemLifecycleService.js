export class ItemLifecycleService {
  
  // Determine the current lifecycle stage of an item
  static getItemLifecycleStage(item) {
    const status = item.status || 'available';
    const lockType = item.lockType || 'none';
    const transactionStage = item.transactionStatus?.transactionStage || 'available';
    
    // Determine lifecycle stage based on multiple factors
    let stage = 'available';
    let substage = null;
    let priority = 0; // Higher priority stages override lower ones
    
    // Stage 1: Available (Green)
    if (status === 'available' && lockType === 'none') {
      stage = 'available';
      priority = 1;
    }
    
    // Stage 2: Getting Interest (Blue)
    if (transactionStage === 'offers_pending' || item.swipeRightCount > 0) {
      stage = 'getting_interest';
      substage = transactionStage === 'offers_pending' ? 'has_offers' : 'has_likes';
      priority = 2;
    }
    
    // Stage 3: In Negotiation (Orange)
    if (status === 'pending' || lockType === 'soft') {
      stage = 'in_negotiation';
      substage = item.matchId ? 'matched' : 'offers_pending';
      priority = 3;
    }
    
    // Stage 4: Trade Active (Purple)
    if (status === 'locked' || lockType === 'hard' || transactionStage === 'trade_active') {
      stage = 'trade_active';
      substage = item.tradeId ? 'in_trade' : 'offer_accepted';
      priority = 4;
    }
    
    // Stage 5: Completed (Gray)
    if (status === 'sold' || status === 'traded' || transactionStage === 'completed') {
      stage = 'completed';
      substage = status === 'sold' ? 'sold' : 'traded';
      priority = 5;
    }
    
    // Stage 6: Archived/Inactive (Dark Gray)
    if (status === 'archived' || status === 'deleted' || item.isActive === false) {
      stage = 'archived';
      substage = status;
      priority = 6;
    }
    
    return {
      stage,
      substage,
      priority,
      ...this.getStageDetails(stage, substage)
    };
  }
  
  // Get detailed information about each lifecycle stage
  static getStageDetails(stage, substage) {
    const stages = {
      available: {
        label: 'Available',
        shortLabel: 'Available',
        color: '#4CAF50',
        backgroundColor: '#E8F5E8',
        icon: 'checkmark-circle',
        description: 'Ready for offers and trades',
        userAction: 'Make an offer or propose a trade',
        canInteract: true,
        showInSwipe: true
      },
      getting_interest: {
        label: 'Getting Interest',
        shortLabel: 'Popular',
        color: '#2196F3',
        backgroundColor: '#E3F2FD',
        icon: 'heart',
        description: substage === 'has_offers' ? 'Has pending offers' : 'People are interested',
        userAction: substage === 'has_offers' ? 'Join the queue' : 'Show interest quickly',
        canInteract: true,
        showInSwipe: true
      },
      in_negotiation: {
        label: 'In Negotiation',
        shortLabel: 'Negotiating',
        color: '#FF9800',
        backgroundColor: '#FFF3E0',
        icon: 'chatbubbles',
        description: substage === 'matched' ? 'Users are discussing trade' : 'Offers being considered',
        userAction: 'Join waitlist for next opportunity',
        canInteract: false,
        showInSwipe: true,
        showWarning: true
      },
      trade_active: {
        label: 'Trade in Progress',
        shortLabel: 'Trading',
        color: '#9C27B0',
        backgroundColor: '#F3E5F5',
        icon: 'swap-horizontal',
        description: 'Active trade in progress',
        userAction: 'Item unavailable - check back later',
        canInteract: false,
        showInSwipe: false
      },
      completed: {
        label: substage === 'sold' ? 'Sold' : 'Traded',
        shortLabel: substage === 'sold' ? 'Sold' : 'Traded',
        color: '#607D8B',
        backgroundColor: '#ECEFF1',
        icon: substage === 'sold' ? 'cash' : 'repeat',
        description: `Successfully ${substage === 'sold' ? 'sold' : 'traded'}`,
        userAction: 'Transaction completed',
        canInteract: false,
        showInSwipe: false
      },
      archived: {
        label: 'Archived',
        shortLabel: 'Archived',
        color: '#9E9E9E',
        backgroundColor: '#F5F5F5',
        icon: 'archive',
        description: 'No longer available',
        userAction: 'Item removed by owner',
        canInteract: false,
        showInSwipe: false
      }
    };
    
    return stages[stage] || stages.available;
  }
  
  // Get lifecycle progress percentage (0-100)
  static getLifecycleProgress(stage) {
    const progressMap = {
      available: 0,
      getting_interest: 20,
      in_negotiation: 50,
      trade_active: 80,
      completed: 100,
      archived: 100
    };
    
    return progressMap[stage] || 0;
  }
  
  // Get next possible stages for an item
  static getNextPossibleStages(currentStage) {
    const transitions = {
      available: ['getting_interest', 'in_negotiation', 'archived'],
      getting_interest: ['in_negotiation', 'trade_active', 'available', 'archived'],
      in_negotiation: ['trade_active', 'available', 'archived'],
      trade_active: ['completed', 'in_negotiation', 'archived'],
      completed: ['archived'],
      archived: []
    };
    
    return transitions[currentStage] || [];
  }
  
  // Get user-friendly timeline description
  static getTimelineDescription(item) {
    const lifecycle = this.getItemLifecycleStage(item);
    const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
    const daysSinceCreated = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));
    
    let timeline = `Posted ${daysSinceCreated === 0 ? 'today' : `${daysSinceCreated} days ago`}`;
    
    switch (lifecycle.stage) {
      case 'getting_interest':
        const interestCount = item.swipeRightCount || 0;
        timeline += ` • ${interestCount} people interested`;
        break;
      case 'in_negotiation':
        timeline += ` • In talks with potential buyers`;
        break;
      case 'trade_active':
        timeline += ` • Trade in progress`;
        break;
      case 'completed':
        timeline += ` • ${lifecycle.label.toLowerCase()} successfully`;
        break;
      case 'archived':
        timeline += ` • Removed from listings`;
        break;
    }
    
    return timeline;
  }
  
  // Get estimated time to completion
  static getEstimatedTimeToCompletion(stage) {
    const estimates = {
      available: 'Immediate - ready for offers',
      getting_interest: '1-3 days - building interest',
      in_negotiation: '2-5 days - finalizing details',
      trade_active: '1-2 days - completing trade',
      completed: 'Complete',
      archived: 'No longer available'
    };
    
    return estimates[stage] || 'Unknown';
  }
  
  // Check if user can perform specific actions
  static canUserPerformAction(item, action, userId) {
    const lifecycle = this.getItemLifecycleStage(item);
    const isOwner = item.userId === userId;
    
    const permissions = {
      view: true, // Always can view
      swipe: lifecycle.showInSwipe && !isOwner,
      offer: lifecycle.canInteract && !isOwner,
      message: lifecycle.canInteract && !isOwner,
      edit: isOwner && ['available', 'getting_interest'].includes(lifecycle.stage),
      archive: isOwner && lifecycle.stage !== 'archived',
      delete: isOwner
    };
    
    return permissions[action] || false;
  }
}

export default ItemLifecycleService;