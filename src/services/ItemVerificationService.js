import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Item Verification Service
 * 
 * Implements comprehensive item verification
 * Inspired by:
 * - StockX: Authentication service, condition grading
 * - Grailed: Brand verification, serial number checks
 * - Carvana: Professional inspection, 360-degree photos
 * - eBay: Detailed condition descriptions, defect disclosure
 */
export class ItemVerificationService {
  
  // Condition grades (like StockX/Grailed)
  static CONDITION_GRADES = {
    NEW: {
      id: 'new',
      label: 'New',
      description: 'Brand new, never used, original packaging',
      color: '#4CAF50',
      requirements: [
        'Original packaging intact',
        'All accessories included',
        'No signs of use',
        'Manufacturing seals intact'
      ]
    },
    LIKE_NEW: {
      id: 'like_new',
      label: 'Like New',
      description: 'Minimal use, like new condition',
      color: '#8BC34A',
      requirements: [
        'Used once or twice',
        'No visible wear',
        'Original packaging available',
        'All accessories present'
      ]
    },
    GOOD: {
      id: 'good',
      label: 'Good',
      description: 'Used but in good condition',
      color: '#FFC107',
      requirements: [
        'Minor signs of use',
        'Fully functional',
        'No major defects',
        'Packaging may be damaged'
      ]
    },
    FAIR: {
      id: 'fair',
      label: 'Fair',
      description: 'Visible wear but functional',
      color: '#FF9800',
      requirements: [
        'Visible wear marks',
        'Still fully functional',
        'Some accessories missing',
        'Functional defects disclosed'
      ]
    },
    POOR: {
      id: 'poor',
      label: 'Poor',
      description: 'Significant wear, may have issues',
      color: '#F44336',
      requirements: [
        'Significant wear',
        'May have functional issues',
        'Multiple defects',
        'For parts or repair'
      ]
    }
  };

  // Verification photo types
  static VERIFICATION_PHOTO_TYPES = {
    BRAND_TAG: {
      id: 'brand_tag',
      label: 'Brand Tag/Label',
      description: 'Clear photo of brand tag or label',
      required: true,
      icon: 'pricetag-outline'
    },
    SERIAL_NUMBER: {
      id: 'serial_number',
      label: 'Serial Number',
      description: 'Clear photo of serial number or model number',
      required: true,
      icon: 'barcode-outline'
    },
    ALL_ANGLES: {
      id: 'all_angles',
      label: 'All Angles',
      description: 'Front, back, sides, top, bottom views',
      required: true,
      icon: 'camera-outline'
    },
    CLOSE_UP: {
      id: 'close_up',
      label: 'Close-up Details',
      description: 'Close-up of any defects or special features',
      required: false,
      icon: 'search-outline'
    },
    WITH_USER: {
      id: 'with_user',
      label: 'With User',
      description: 'Photo with item and user (proof of possession)',
      required: true,
      icon: 'person-outline'
    },
    FUNCTIONALITY: {
      id: 'functionality',
      label: 'Functionality Demo',
      description: 'Video or photo showing item functioning',
      required: false,
      icon: 'play-circle-outline'
    },
    TIMESTAMP: {
      id: 'timestamp',
      label: 'Timestamped Photo',
      description: 'Photo with current date/time written on paper',
      required: true,
      icon: 'time-outline'
    },
    DIMENSIONS: {
      id: 'dimensions',
      label: 'Size/Dimensions',
      description: 'Photo showing item size with reference',
      required: false,
      icon: 'resize-outline'
    },
    PACKAGING: {
      id: 'packaging',
      label: 'Packaging',
      description: 'Photo of original packaging if available',
      required: false,
      icon: 'cube-outline'
    },
    ACCESSORIES: {
      id: 'accessories',
      label: 'Accessories',
      description: 'Photo of all included accessories',
      required: false,
      icon: 'extension-puzzle-outline'
    }
  };

  // Category-specific verification requirements
  static CATEGORY_REQUIREMENTS = {
    electronics: {
      requiredPhotos: ['brand_tag', 'serial_number', 'all_angles', 'with_user', 'timestamp'],
      optionalPhotos: ['functionality', 'close_up', 'packaging', 'accessories'],
      requiredFields: ['serialNumber', 'model', 'powerStatus'],
      conditionSensitive: true
    },
    clothing: {
      requiredPhotos: ['brand_tag', 'all_angles', 'with_user', 'timestamp'],
      optionalPhotos: ['close_up', 'dimensions', 'packaging'],
      requiredFields: ['size', 'material', 'brand'],
      conditionSensitive: true
    },
    shoes: {
      requiredPhotos: ['brand_tag', 'all_angles', 'with_user', 'timestamp', 'dimensions'],
      optionalPhotos: ['close_up', 'packaging'],
      requiredFields: ['size', 'brand', 'condition'],
      conditionSensitive: true
    },
    jewelry: {
      requiredPhotos: ['brand_tag', 'serial_number', 'all_angles', 'with_user', 'timestamp'],
      optionalPhotos: ['close_up', 'packaging'],
      requiredFields: ['material', 'weight', 'authenticity'],
      conditionSensitive: true
    },
    books: {
      requiredPhotos: ['all_angles', 'with_user', 'timestamp'],
      optionalPhotos: ['close_up', 'packaging'],
      requiredFields: ['isbn', 'edition', 'condition'],
      conditionSensitive: true
    },
    furniture: {
      requiredPhotos: ['all_angles', 'with_user', 'timestamp', 'dimensions'],
      optionalPhotos: ['close_up', 'functionality'],
      requiredFields: ['dimensions', 'material', 'assembly'],
      conditionSensitive: true
    },
    sports: {
      requiredPhotos: ['brand_tag', 'all_angles', 'with_user', 'timestamp'],
      optionalPhotos: ['close_up', 'functionality'],
      requiredFields: ['brand', 'size', 'condition'],
      conditionSensitive: true
    },
    other: {
      requiredPhotos: ['all_angles', 'with_user', 'timestamp'],
      optionalPhotos: ['close_up', 'packaging'],
      requiredFields: ['description'],
      conditionSensitive: false
    }
  };

  /**
   * Get verification requirements for item category
   */
  static getVerificationRequirements(category) {
    const categoryKey = category?.toLowerCase() || 'other';
    return this.CATEGORY_REQUIREMENTS[categoryKey] || this.CATEGORY_REQUIREMENTS.other;
  }

  /**
   * Request additional verification photos
   */
  static async requestVerificationPhotos(itemId, requestedPhotoTypes, requesterId, requesterName) {
    try {
      const verificationRef = await addDoc(collection(db, 'item_verifications'), {
        itemId,
        requestedPhotoTypes,
        requesterId,
        requesterName,
        status: 'pending',
        requestedAt: serverTimestamp(),
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
      });
      
      // Create notification for seller
      await addDoc(collection(db, 'notifications'), {
        userId: requesterId,
        type: 'verification_request',
        itemId,
        verificationId: verificationRef.id,
        message: `Additional verification photos requested for your item`,
        requestedPhotoTypes,
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        createdAt: serverTimestamp(),
        read: false
      });
      
      return { success: true, verificationId: verificationRef.id };
    } catch (error) {
      console.error('Error requesting verification photos:', error);
      throw error;
    }
  }

  /**
   * Submit verification photos
   */
  static async submitVerificationPhotos(verificationId, photoUrls, submitterId) {
    try {
      const verificationRef = doc(db, 'item_verifications', verificationId);
      await updateDoc(verificationRef, {
        submittedPhotoUrls: photoUrls,
        submittedAt: serverTimestamp(),
        submittedBy: submitterId,
        status: 'submitted'
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error submitting verification photos:', error);
      throw error;
    }
  }

  /**
   * Review verification photos
   */
  static async reviewVerificationPhotos(verificationId, approved, reviewerId, notes = '') {
    try {
      const verificationRef = doc(db, 'item_verifications', verificationId);
      await updateDoc(verificationRef, {
        status: approved ? 'approved' : 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: serverTimestamp(),
        reviewNotes: notes
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error reviewing verification photos:', error);
      throw error;
    }
  }

  /**
   * Create item verification record
   */
  static async createItemVerification(itemId, userId, verificationData) {
    try {
      const verificationRef = await addDoc(collection(db, 'item_verifications'), {
        itemId,
        userId,
        ...verificationData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      return { success: true, verificationId: verificationRef.id };
    } catch (error) {
      console.error('Error creating item verification:', error);
      throw error;
    }
  }

  /**
   * Verify item condition
   */
  static async verifyItemCondition(itemId, conditionGrade, defectList, userId) {
    try {
      const verificationRef = await addDoc(collection(db, 'item_conditions'), {
        itemId,
        userId,
        conditionGrade,
        defectList,
        verifiedAt: serverTimestamp(),
        status: 'verified'
      });
      
      // Update item with condition
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        conditionGrade,
        defectList,
        conditionVerified: true,
        conditionVerifiedAt: serverTimestamp()
      });
      
      return { success: true, verificationId: verificationRef.id };
    } catch (error) {
      console.error('Error verifying item condition:', error);
      throw error;
    }
  }

  /**
   * Request proof of possession
   */
  static async requestProofOfPossession(itemId, requesterId, requesterName) {
    try {
      const proofRef = await addDoc(collection(db, 'proof_of_possession'), {
        itemId,
        requesterId,
        requesterName,
        status: 'pending',
        requestedAt: serverTimestamp(),
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });
      
      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId: requesterId,
        type: 'proof_request',
        itemId,
        proofId: proofRef.id,
        message: 'Proof of possession requested',
        requirements: [
          'Photo with item and current date/time on paper',
          'Clear view of item features',
          'User visible in photo'
        ],
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: serverTimestamp(),
        read: false
      });
      
      return { success: true, proofId: proofRef.id };
    } catch (error) {
      console.error('Error requesting proof of possession:', error);
      throw error;
    }
  }

  /**
   * Submit proof of possession
   */
  static async submitProofOfPossession(proofId, photoUrl, userId) {
    try {
      const proofRef = doc(db, 'proof_of_possession', proofId);
      await updateDoc(proofRef, {
        photoUrl,
        submittedAt: serverTimestamp(),
        submittedBy: userId,
        status: 'submitted'
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error submitting proof of possession:', error);
      throw error;
    }
  }

  /**
   * Get item verification status
   */
  static async getItemVerificationStatus(itemId) {
    try {
      const verificationsRef = collection(db, 'item_verifications');
      const q = query(verificationsRef, where('itemId', '==', itemId));
      const snapshot = await getDocs(q);
      
      const verifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const latestVerification = verifications.sort((a, b) => 
        b.createdAt?.toDate() - a.createdAt?.toDate()
      )[0];
      
      return {
        verifications,
        latestVerification,
        verificationStatus: latestVerification?.status || 'none',
        verificationLevel: this.calculateVerificationLevel(verifications)
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      throw error;
    }
  }

  /**
   * Calculate verification level
   */
  static calculateVerificationLevel(verifications) {
    if (verifications.length === 0) return 'none';
    
    const approvedCount = verifications.filter(v => v.status === 'approved').length;
    const totalCount = verifications.length;
    
    if (approvedCount === totalCount) return 'verified';
    if (approvedCount > 0) return 'partially_verified';
    return 'pending';
  }

  /**
   * Generate verification checklist for item
   */
  static generateVerificationChecklist(item) {
    const requirements = this.getVerificationRequirements(item.category);
    const checklist = [];
    
    // Required photos
    requirements.requiredPhotos.forEach(photoType => {
      const photoInfo = this.VERIFICATION_PHOTO_TYPES[photoType];
      checklist.push({
        type: photoType,
        label: photoInfo.label,
        description: photoInfo.description,
        required: true,
        completed: false
      });
    });
    
    // Optional photos
    requirements.optionalPhotos.forEach(photoType => {
      const photoInfo = this.VERIFICATION_PHOTO_TYPES[photoType];
      checklist.push({
        type: photoType,
        label: photoInfo.label,
        description: photoInfo.description,
        required: false,
        completed: false
      });
    });
    
    // Required fields
    requirements.requiredFields.forEach(field => {
      checklist.push({
        type: 'field',
        label: field,
        description: `Provide ${field} information`,
        required: true,
        completed: false
      });
    });
    
    return {
      checklist,
      requiredCount: requirements.requiredPhotos.length + requirements.requiredFields.length,
      optionalCount: requirements.optionalPhotos.length,
      totalCount: checklist.length
    };
  }

  /**
   * Detect verification fraud
   */
  static detectVerificationFraud(verificationData) {
    const warnings = [];
    
    // Check for photo reuse (same photo used multiple times)
    const photoUrls = verificationData.photoUrls || [];
    const uniqueUrls = new Set(photoUrls);
    if (photoUrls.length !== uniqueUrls.size) {
      warnings.push({
        type: 'photo_reuse',
        severity: 'high',
        message: 'Duplicate photos detected'
      });
    }
    
    // Check for timestamp too old
    if (verificationData.submittedAt) {
      const hoursSinceRequest = (Date.now() - verificationData.submittedAt.toDate()) / (1000 * 60 * 60);
      if (hoursSinceRequest > 48) {
        warnings.push({
          type: 'late_submission',
          severity: 'medium',
          message: 'Verification submitted too late'
        });
      }
    }
    
    // Check for missing required photos
    const requirements = this.getVerificationRequirements(verificationData.category);
    const submittedTypes = verificationData.submittedPhotoTypes || [];
    const missingRequired = requirements.requiredPhotos.filter(
      type => !submittedTypes.includes(type)
    );
    
    if (missingRequired.length > 0) {
      warnings.push({
        type: 'missing_required',
        severity: 'high',
        message: `Missing required photos: ${missingRequired.join(', ')}`
      });
    }
    
    return {
      hasWarnings: warnings.length > 0,
      warnings,
      riskLevel: warnings.filter(w => w.severity === 'high').length > 0 ? 'high' : 
                 warnings.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Get condition grade information
   */
  static getConditionGradeInfo(gradeId) {
    return this.CONDITION_GRADES[gradeId.toUpperCase()] || null;
  }

  /**
   * Validate condition grade
   */
  static validateConditionGrade(gradeId, defectList) {
    const gradeInfo = this.getConditionGradeInfo(gradeId);
    
    if (!gradeInfo) {
      return { valid: false, error: 'Invalid condition grade' };
    }
    
    // Check if defect count matches grade
    const defectCount = defectList?.length || 0;
    
    if (gradeId === 'new' && defectCount > 0) {
      return { valid: false, error: 'New items cannot have defects' };
    }
    
    if (gradeId === 'like_new' && defectCount > 2) {
      return { valid: false, error: 'Like new items should have minimal defects' };
    }
    
    return { valid: true };
  }
}
