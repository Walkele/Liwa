import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import { AntiFraudService } from './AntiFraudService';

export class EnhancedSecurityService {
  
  // Security risk levels
  static RISK_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  };

  // Security flags
  static SECURITY_FLAGS = {
    DEVICE_ROOTED: 'device_rooted',
    EMULATOR_DETECTED: 'emulator_detected',
    LOCATION_SPOOFED: 'location_spoofed',
    VELOCITY_ABUSE: 'velocity_abuse',
    SUSPICIOUS_BEHAVIOR: 'suspicious_behavior',
    API_TAMPERING: 'api_tampering',
    MEDIA_MANIPULATION: 'media_manipulation'
  };

  // 1. COMPREHENSIVE DEVICE FINGERPRINTING
  static async generateDeviceFingerprint() {
    try {
      console.log('🔍 Generating comprehensive device fingerprint');
      
      const fingerprint = {
        // Basic device info
        isDevice: Device.isDevice,
        deviceType: Device.deviceType,
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        modelId: Device.modelId,
        designName: Device.designName,
        productName: Device.productName,
        deviceYearClass: Device.deviceYearClass,
        totalMemory: Device.totalMemory,
        
        // OS info
        osName: Device.osName,
        osVersion: Device.osVersion,
        osBuildId: Device.osBuildId,
        osInternalBuildId: Device.osInternalBuildId,
        osBuildFingerprint: Device.osBuildFingerprint,
        platformApiLevel: Device.platformApiLevel,
        
        // Timestamps
        createdAt: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        
        // Screen info (if available)
        screenWidth: global.screen?.width || 'unknown',
        screenHeight: global.screen?.height || 'unknown',
        
        // Generate unique hash
        hash: null
      };
      
      // Generate hash from fingerprint data
      fingerprint.hash = this.generateFingerprintHash(fingerprint);
      
      console.log('📱 Device fingerprint generated');
      return fingerprint;
      
    } catch (error) {
      console.error('❌ Error generating device fingerprint:', error);
      return { error: error.message, riskLevel: this.RISK_LEVELS.HIGH };
    }
  }

  // 2. ADVANCED DEVICE INTEGRITY CHECKS
  static async performDeviceIntegrityCheck(userId) {
    try {
      console.log('🛡️ Performing advanced device integrity check');
      
      const checks = {
        deviceFingerprint: await this.generateDeviceFingerprint(),
        emulatorDetection: await this.detectEmulator(),
        rootDetection: await this.detectRootedDevice(),
        debuggerDetection: await this.detectDebugger(),
        vpnDetection: await this.detectVPN(),
        riskAssessment: null
      };
      
      // Calculate overall risk score
      const riskScore = this.calculateDeviceRiskScore(checks);
      checks.riskAssessment = {
        score: riskScore,
        level: this.getRiskLevel(riskScore),
        flags: this.getSecurityFlags(checks),
        timestamp: new Date().toISOString()
      };
      
      // Store device integrity record
      await this.storeDeviceIntegrityRecord(userId, checks);
      
      console.log(`🔒 Device integrity check completed. Risk level: ${checks.riskAssessment.level}`);
      return checks;
      
    } catch (error) {
      console.error('❌ Device integrity check failed:', error);
      return { 
        error: error.message, 
        riskAssessment: { 
          score: 100, 
          level: this.RISK_LEVELS.CRITICAL,
          flags: [this.SECURITY_FLAGS.SUSPICIOUS_BEHAVIOR]
        }
      };
    }
  }

  // 3. EMULATOR DETECTION
  static async detectEmulator() {
    try {
      const indicators = {
        isDevice: Device.isDevice,
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        productName: Device.productName
      };
      
      const emulatorIndicators = [
        !Device.isDevice,
        Device.brand === 'generic',
        Device.manufacturer === 'Genymotion',
        Device.modelName?.includes('Emulator'),
        Device.modelName?.includes('Android SDK'),
        Device.productName?.includes('sdk'),
        Device.productName?.includes('emulator')
      ];
      
      const detectedCount = emulatorIndicators.filter(Boolean).length;
      const isEmulator = detectedCount >= 2;
      
      return {
        isEmulator,
        confidence: detectedCount / emulatorIndicators.length,
        indicators,
        detectedCount
      };
      
    } catch (error) {
      console.error('Error detecting emulator:', error);
      return { isEmulator: false, error: error.message };
    }
  }

  // 4. ROOTED DEVICE DETECTION
  static async detectRootedDevice() {
    try {
      // Note: This is a simplified check. In production, use a dedicated library
      const rootIndicators = {
        suspiciousApps: false, // Would check for root apps
        suspiciousPaths: false, // Would check for root paths
        buildTags: Device.osBuildFingerprint?.includes('test-keys') || false,
        debuggable: false // Would check if app is debuggable in production
      };
      
      const indicatorCount = Object.values(rootIndicators).filter(Boolean).length;
      const isRooted = indicatorCount >= 1;
      
      return {
        isRooted,
        confidence: indicatorCount / Object.keys(rootIndicators).length,
        indicators: rootIndicators
      };
      
    } catch (error) {
      console.error('Error detecting rooted device:', error);
      return { isRooted: false, error: error.message };
    }
  }

  // 5. DEBUGGER DETECTION
  static async detectDebugger() {
    try {
      // Check for debugging indicators
      const debugIndicators = {
        debuggerAttached: false, // Would check for attached debugger
        developmentMode: __DEV__ || false,
        remoteDebugging: false // Would check for remote debugging
      };
      
      const isDebugging = Object.values(debugIndicators).some(Boolean);
      
      return {
        isDebugging,
        indicators: debugIndicators
      };
      
    } catch (error) {
      console.error('Error detecting debugger:', error);
      return { isDebugging: false, error: error.message };
    }
  }

  // 6. VPN DETECTION
  static async detectVPN() {
    try {
      // Basic VPN detection (in production, use IP geolocation services)
      const networkInfo = {
        hasVPN: false, // Would check network interfaces
        suspiciousIP: false, // Would check IP against VPN databases
        geoMismatch: false // Would compare GPS vs IP location
      };
      
      return networkInfo;
      
    } catch (error) {
      console.error('Error detecting VPN:', error);
      return { hasVPN: false, error: error.message };
    }
  }

  // 7. IMAGE SECURITY AND EXIF STRIPPING
  static async processSecureImage(imageUri, options = {}) {
    try {
      console.log('🖼️ Processing image for security and EXIF removal');
      
      // Strip EXIF data and resize if needed
      const processedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          // Resize to max dimensions to reduce file size
          { resize: { width: options.maxWidth || 1200 } }
        ],
        {
          compress: options.quality || 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false
        }
      );
      
      // Additional security checks
      const securityCheck = {
        originalUri: imageUri,
        processedUri: processedImage.uri,
        sizeReduced: true,
        exifStripped: true,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Image processed securely');
      return {
        processedImage,
        securityCheck
      };
      
    } catch (error) {
      console.error('❌ Error processing secure image:', error);
      throw error;
    }
  }

  // 8. BEHAVIORAL ANALYSIS
  static async analyzeBehavioralPatterns(userId, action, metadata = {}) {
    try {
      console.log('🧠 Analyzing behavioral patterns for fraud detection');
      
      const now = new Date();
      const timeWindows = {
        last5Minutes: new Date(now.getTime() - 5 * 60 * 1000),
        lastHour: new Date(now.getTime() - 60 * 60 * 1000),
        lastDay: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      };
      
      // Analyze action frequency
      const actionFrequency = await this.getActionFrequency(userId, action, timeWindows);
      
      // Check for suspicious patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(actionFrequency, action);
      
      // Calculate behavior risk score
      const behaviorRisk = this.calculateBehaviorRisk(actionFrequency, suspiciousPatterns);
      
      // Store behavioral data
      await this.storeBehavioralData(userId, action, metadata, behaviorRisk);
      
      return {
        actionFrequency,
        suspiciousPatterns,
        behaviorRisk,
        isAllowed: behaviorRisk.score < 70 // Allow if risk score < 70
      };
      
    } catch (error) {
      console.error('❌ Behavioral analysis error:', error);
      return { isAllowed: false, error: error.message };
    }
  }

  // 9. SECURE QR CODE VALIDATION
  static async validateSecureQR(qrData, userLocation, userId) {
    try {
      console.log('🔐 Validating secure QR code');
      
      const parsedData = JSON.parse(qrData);
      
      // Validate QR structure
      if (!parsedData.tradeId || !parsedData.token || !parsedData.expiryTime) {
        throw new Error('Invalid QR code structure');
      }
      
      // Check expiry
      if (Date.now() > parsedData.expiryTime) {
        throw new Error('QR code has expired');
      }
      
      // Validate checksum
      const expectedChecksum = AntiFraudService.generateQRChecksum(parsedData);
      if (parsedData.checksum !== expectedChecksum) {
        throw new Error('QR code integrity check failed');
      }
      
      // Validate location proximity (within 50 meters)
      if (parsedData.location && userLocation) {
        const distance = AntiFraudService.calculateDistance(
          parsedData.location,
          userLocation
        );
        
        if (distance > 0.05) { // 50 meters in km
          throw new Error('QR code location mismatch - users must be within 50 meters');
        }
      }
      
      // Validate TOTP token
      const expectedToken = AntiFraudService.generateTOTP(
        parsedData.tradeId,
        parsedData.userId,
        parsedData.timestamp
      );
      
      if (parsedData.token !== expectedToken) {
        throw new Error('QR code authentication failed');
      }
      
      console.log('✅ QR code validation successful');
      return {
        isValid: true,
        tradeId: parsedData.tradeId,
        userId: parsedData.userId,
        timestamp: parsedData.timestamp
      };
      
    } catch (error) {
      console.error('❌ QR code validation failed:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  // HELPER METHODS
  static generateFingerprintHash(fingerprint) {
    const { hash, createdAt, ...dataToHash } = fingerprint;
    const str = JSON.stringify(dataToHash);
    let hash_value = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash_value = ((hash_value << 5) - hash_value) + char;
      hash_value = hash_value & hash_value;
    }
    return hash_value.toString(16);
  }

  static calculateDeviceRiskScore(checks) {
    let score = 0;
    
    if (checks.emulatorDetection?.isEmulator) score += 50;
    if (checks.rootDetection?.isRooted) score += 40;
    if (checks.debuggerDetection?.isDebugging) score += 30;
    if (checks.vpnDetection?.hasVPN) score += 20;
    
    return Math.min(score, 100);
  }

  static getRiskLevel(score) {
    if (score >= 80) return this.RISK_LEVELS.CRITICAL;
    if (score >= 60) return this.RISK_LEVELS.HIGH;
    if (score >= 30) return this.RISK_LEVELS.MEDIUM;
    return this.RISK_LEVELS.LOW;
  }

  static getSecurityFlags(checks) {
    const flags = [];
    
    if (checks.emulatorDetection?.isEmulator) {
      flags.push(this.SECURITY_FLAGS.EMULATOR_DETECTED);
    }
    if (checks.rootDetection?.isRooted) {
      flags.push(this.SECURITY_FLAGS.DEVICE_ROOTED);
    }
    if (checks.debuggerDetection?.isDebugging) {
      flags.push(this.SECURITY_FLAGS.SUSPICIOUS_BEHAVIOR);
    }
    
    return flags;
  }

  static async storeDeviceIntegrityRecord(userId, checks) {
    try {
      await addDoc(collection(db, 'deviceIntegrityRecords'), {
        userId,
        checks,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error storing device integrity record:', error);
    }
  }

  static async getActionFrequency(userId, action, timeWindows) {
    // This would query the database for user actions in different time windows
    // For now, returning mock data
    return {
      last5Minutes: 0,
      lastHour: 0,
      lastDay: 0
    };
  }

  static detectSuspiciousPatterns(frequency, action) {
    const patterns = [];
    
    // Define limits per action type
    const limits = {
      swipe: { per5Min: 50, perHour: 200, perDay: 1000 },
      message: { per5Min: 20, perHour: 100, perDay: 500 },
      offer: { per5Min: 5, perHour: 20, perDay: 100 }
    };
    
    const actionLimits = limits[action] || limits.swipe;
    
    if (frequency.last5Minutes > actionLimits.per5Min) {
      patterns.push('excessive_5min_activity');
    }
    if (frequency.lastHour > actionLimits.perHour) {
      patterns.push('excessive_hourly_activity');
    }
    if (frequency.lastDay > actionLimits.perDay) {
      patterns.push('excessive_daily_activity');
    }
    
    return patterns;
  }

  static calculateBehaviorRisk(frequency, patterns) {
    let score = 0;
    
    // Add risk for each suspicious pattern
    patterns.forEach(pattern => {
      switch (pattern) {
        case 'excessive_5min_activity':
          score += 40;
          break;
        case 'excessive_hourly_activity':
          score += 30;
          break;
        case 'excessive_daily_activity':
          score += 20;
          break;
      }
    });
    
    return {
      score: Math.min(score, 100),
      level: this.getRiskLevel(score),
      patterns
    };
  }

  static async storeBehavioralData(userId, action, metadata, risk) {
    try {
      await addDoc(collection(db, 'behavioralAnalysis'), {
        userId,
        action,
        metadata,
        risk,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error storing behavioral data:', error);
    }
  }
}

export default EnhancedSecurityService;