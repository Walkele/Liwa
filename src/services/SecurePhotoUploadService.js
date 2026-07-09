import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage } from '../config/firebase';
import { Image } from 'react-native';

/**
 * Secure Photo Upload Service
 * 
 * Handles secure photo uploads with validation
 * Inspired by:
 * - Instagram: Photo validation and compression
 * - Airbnb: Photo quality standards
 * - eBay: Image requirements and moderation
 */
export class SecurePhotoUploadService {
  
  static REQUIRED_PHOTO_COUNT = 3;
  static MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  static ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  static MIN_DIMENSION = 300; // Minimum 300px
  static MAX_DIMENSION = 4096; // Maximum 4096px
  static MAX_ASPECT_RATIO = 4; // Max 4:1 ratio
  
  /**
   * Validate photo before upload
   */
  static async validatePhoto(file) {
    const validationErrors = [];
    
    // Check file size
    if (file.size > this.MAX_PHOTO_SIZE) {
      validationErrors.push(`Photo too large. Maximum size is ${this.MAX_PHOTO_SIZE / 1024 / 1024}MB`);
    }
    
    // Check file type
    if (!this.ALLOWED_FORMATS.includes(file.type)) {
      validationErrors.push(`Invalid format. Allowed: ${this.ALLOWED_FORMATS.join(', ')}`);
    }
    
    // Skip dimension validation for now - will be done during upload
    // React Native dimension validation requires different approach
    
    return {
      valid: validationErrors.length === 0,
      errors: validationErrors
    };
  }

  /**
   * Get image dimensions using React Native
   */
  static async getImageDimensions(uri) {
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => {
          resolve({ width, height });
        },
        (error) => {
          reject(new Error('Failed to load image'));
        }
      );
    });
  }

  /**
   * Validate image dimensions (separate method for React Native)
   */
  static async validateImageDimensions(uri) {
    try {
      const dimensions = await this.getImageDimensions(uri);
      
      if (dimensions.width < this.MIN_DIMENSION || dimensions.height < this.MIN_DIMENSION) {
        return {
          valid: false,
          error: `Photo too small. Minimum dimension is ${this.MIN_DIMENSION}px`
        };
      }
      
      if (dimensions.width > this.MAX_DIMENSION || dimensions.height > this.MAX_DIMENSION) {
        return {
          valid: false,
          error: `Photo too large. Maximum dimension is ${this.MAX_DIMENSION}px`
        };
      }
      
      const aspectRatio = Math.max(dimensions.width, dimensions.height) / 
                         Math.min(dimensions.width, dimensions.height);
      
      if (aspectRatio > this.MAX_ASPECT_RATIO) {
        return {
          valid: false,
          error: `Aspect ratio too extreme. Maximum ratio is ${this.MAX_ASPECT_RATIO}:1`
        };
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Could not validate image dimensions'
      };
    }
  }

  /**
   * Compress image before upload
   * Note: In React Native, this would use expo-image-manipulator
   * For now, we'll skip compression and let Firebase handle it
   */
  static async compressImage(file, quality = 0.8) {
    // In React Native, compression would use expo-image-manipulator
    // For now, return the file as-is
    return file;
  }

  /**
   * Upload photos for an item
   */
  static async uploadItemPhotos(itemId, files, userId) {
    try {
      // Validate photo count
      if (files.length !== this.REQUIRED_PHOTO_COUNT) {
        throw new Error(
          `Exactly ${this.REQUIRED_PHOTO_COUNT} photos required. ${files.length} provided.`
        );
      }
      
      // Validate each photo (basic validation - size and type only)
      // Skip dimension validation for React Native blobs
      const validationResults = await Promise.all(
        files.map(file => this.validatePhoto(file))
      );
      
      const invalidPhotos = validationResults.filter(r => !r.valid);
      if (invalidPhotos.length > 0) {
        const allErrors = invalidPhotos.flatMap(r => r.errors);
        throw new Error(`Photo validation failed: ${allErrors.join(', ')}`);
      }
      
      // Upload each photo directly (blobs work in React Native)
      const uploadPromises = files.map(async (file, index) => {
        return this.uploadPhoto(itemId, index, file, userId);
      });
      
      const downloadURLs = await Promise.all(uploadPromises);
      
      return {
        success: true,
        photoURLs: downloadURLs,
        photoCount: downloadURLs.length
      };
    } catch (error) {
      console.error('Error uploading photos:', error);
      throw error;
    }
  }

  /**
   * Upload single photo - Simplified for React Native
   */
  static async uploadPhoto(itemId, photoIndex, file, userId) {
    try {
      // Generate secure filename
      const timestamp = Date.now();
      const filename = `${userId}_${itemId}_${photoIndex}_${timestamp}.jpg`;
      const path = `item_photos/${itemId}/${filename}`;
      
      const storageRef = ref(storage, path);
      
      // Upload with metadata - skip blob property validation
      const metadata = {
        contentType: file.type || 'image/jpeg',
        customMetadata: {
          uploadedBy: userId,
          itemId: itemId,
          photoIndex: photoIndex.toString(),
          uploadedAt: timestamp.toString()
        }
      };
      
      try {
        const snapshot = await uploadBytes(storageRef, file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
      } catch (uploadError) {
        console.error('Upload error details:', uploadError);
        // If upload fails, try without metadata
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }

  /**
   * Delete item photos
   */
  static async deleteItemPhotos(itemId) {
    try {
      const photosRef = ref(storage, `item_photos/${itemId}`);
      const listResult = await listAll(photosRef);
      
      const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deletePromises);
      
      console.log(`Deleted ${deletePromises.length} photos for item ${itemId}`);
    } catch (error) {
      console.error('Error deleting photos:', error);
      throw error;
    }
  }

  /**
   * Get photo URLs for an item
   */
  static async getItemPhotoURLs(itemId) {
    try {
      const photosRef = ref(storage, `item_photos/${itemId}`);
      const listResult = await listAll(photosRef);
      
      const urlPromises = listResult.items.map(itemRef => getDownloadURL(itemRef));
      const urls = await Promise.all(urlPromises);
      
      // Sort by photo index (filename contains index)
      urls.sort((a, b) => {
        const aIndex = parseInt(a.split('_')[2] || '0');
        const bIndex = parseInt(b.split('_')[2] || '0');
        return aIndex - bIndex;
      });
      
      return urls;
    } catch (error) {
      console.error('Error getting photo URLs:', error);
      return [];
    }
  }

  /**
   * Detect photo manipulation
   * Note: In React Native, this would use image analysis libraries
   * For now, we'll skip advanced detection
   */
  static async detectPhotoManipulation(file) {
    const warnings = [];
    
    // Basic checks
    if (file.size < 1000) {
      warnings.push('Very small file size');
    }
    
    return {
      hasWarnings: warnings.length > 0,
      warnings,
      riskLevel: warnings.length > 2 ? 'high' : warnings.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Generate photo requirements message
   */
  static getPhotoRequirements() {
    return {
      requiredCount: this.REQUIRED_PHOTO_COUNT,
      maxSize: `${this.MAX_PHOTO_SIZE / 1024 / 1024}MB`,
      allowedFormats: this.ALLOWED_FORMATS,
      requirements: [
        `Exactly ${this.REQUIRED_PHOTO_COUNT} photos required`,
        `Maximum file size: ${this.MAX_PHOTO_SIZE / 1024 / 1024}MB`,
        `Allowed formats: JPEG, PNG, WebP`,
        `Clear, well-lit photos recommended`,
        `Show item from multiple angles`,
        `Include any defects or wear`
      ]
    };
  }
}
