/**
 * Security Patch Service
 * 
 * Implements security patches following OWASP and industry best practices
 * Inspired by:
 * - OWASP Top 10 vulnerabilities
 * - Payment Card Industry (PCI) DSS
 * - NIST Cybersecurity Framework
 */

export class SecurityPatchService {
  
  /**
   * Validate and sanitize user input
   */
  static sanitizeInput(input, maxLength = 1000) {
    if (!input) return '';
    
    // Trim and limit length
    let sanitized = input.trim().slice(0, maxLength);
    
    // Remove potentially dangerous characters
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi, // Event handlers
      /<iframe[^>]*>.*?<\/iframe>/gi, // Iframes
      /<object[^>]*>.*?<\/object>/gi, // Objects
      /<embed[^>]*>/gi, // Embeds
      /data:[^;]*;base64/gi, // Data URLs
    ];
    
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }

  /**
   * Validate phone number
   */
  static validatePhoneNumber(phone) {
    if (!phone) return { valid: false, error: 'Phone number required' };
    
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check length (10-15 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return { valid: false, error: 'Invalid phone number length' };
    }
    
    // Check for obviously fake numbers
    const fakePatterns = [
      /^0{10,}$/, // All zeros
      /^1{10,}$/, // All ones
      /^1234567890$/, // Sequential
      /^(\d)\1{9,}$/, // Repeated digits
    ];
    
    if (fakePatterns.some(pattern => pattern.test(cleaned))) {
      return { valid: false, error: 'Invalid phone number format' };
    }
    
    return { valid: true, cleaned };
  }

  /**
   * Validate email address
   */
  static validateEmail(email) {
    if (!email) return { valid: false, error: 'Email required' };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }
    
    // Check for disposable email domains
    const disposableDomains = [
      'tempmail.com', 'guerrillamail.com', 'mailinator.com',
      '10minutemail.com', 'yopmail.com', 'sharklasers.com'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) {
      return { valid: false, error: 'Disposable email not allowed' };
    }
    
    return { valid: true };
  }

  /**
   * Validate monetary amount
   */
  static validateAmount(amount, min = 0, max = 1000000) {
    if (amount === null || amount === undefined) {
      return { valid: false, error: 'Amount required' };
    }
    
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) {
      return { valid: false, error: 'Invalid amount format' };
    }
    
    if (numAmount < min) {
      return { valid: false, error: `Amount must be at least ${min}` };
    }
    
    if (numAmount > max) {
      return { valid: false, error: `Amount cannot exceed ${max}` };
    }
    
    // Check for suspicious decimal places
    const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return { valid: false, error: 'Amount cannot have more than 2 decimal places' };
    }
    
    return { valid: true, amount: numAmount };
  }

  /**
   * Detect suspicious activity patterns
   */
  static detectSuspiciousActivity(userActivity) {
    const warnings = [];
    
    // Check for rapid actions
    if (userActivity.actionsPerMinute > 10) {
      warnings.push({
        type: 'rapid_actions',
        severity: 'high',
        message: 'Unusually high activity rate detected'
      });
    }
    
    // Check for pattern repetition
    const actionTypes = userActivity.actions.map(a => a.type);
    const uniqueTypes = new Set(actionTypes);
    if (uniqueTypes.size < actionTypes.length * 0.3) {
      warnings.push({
        type: 'repetitive_actions',
        severity: 'medium',
        message: 'Repetitive action pattern detected'
      });
    }
    
    // Check for timing patterns (bot-like)
    const intervals = [];
    for (let i = 1; i < userActivity.actions.length; i++) {
      intervals.push(userActivity.actions[i].timestamp - userActivity.actions[i-1].timestamp);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    if (variance < 100) { // Very consistent timing
      warnings.push({
        type: 'bot_like_timing',
        severity: 'high',
        message: 'Consistent timing pattern detected'
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
   * Rate limiting check
   */
  static checkRateLimit(userId, actionType, limits) {
    const key = `${userId}_${actionType}`;
    const now = Date.now();
    
    // Get current rate limit data (would be stored in Redis/DB in production)
    const currentData = this.getRateLimitData(key);
    
    if (!currentData) {
      this.setRateLimitData(key, {
        count: 1,
        windowStart: now,
        userId,
        actionType
      });
      return { allowed: true };
    }
    
    const windowDuration = limits.windowMs || 60000; // Default 1 minute
    const maxRequests = limits.maxRequests || 10;
    
    // Reset if window expired
    if (now - currentData.windowStart > windowDuration) {
      this.setRateLimitData(key, {
        count: 1,
        windowStart: now,
        userId,
        actionType
      });
      return { allowed: true };
    }
    
    // Check if limit exceeded
    if (currentData.count >= maxRequests) {
      const retryAfter = Math.ceil((currentData.windowStart + windowDuration - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      };
    }
    
    // Increment count
    currentData.count++;
    this.setRateLimitData(key, currentData);
    
    return { allowed: true };
  }

  /**
   * Placeholder for rate limit data storage (implement with Redis/DB)
   */
  static getRateLimitData(key) {
    // In production, this would query Redis or database
    const stored = localStorage.getItem(`rate_limit_${key}`);
    return stored ? JSON.parse(stored) : null;
  }

  static setRateLimitData(key, data) {
    // In production, this would store in Redis or database
    localStorage.setItem(`rate_limit_${key}`, JSON.stringify(data));
  }

  /**
   * Validate geographic consistency
   */
  static validateGeographicConsistency(userLocation, activityLocation) {
    if (!userLocation || !activityLocation) {
      return { valid: true }; // Skip if location data unavailable
    }
    
    // Calculate distance between locations (simplified)
    const distance = this.calculateDistance(
      userLocation.lat, userLocation.lng,
      activityLocation.lat, activityLocation.lng
    );
    
    // Allow 100km travel within 1 hour
    const maxDistance = 100; // km
    const maxTime = 3600000; // 1 hour in ms
    
    const timeDiff = activityLocation.timestamp - userLocation.timestamp;
    const maxPossibleDistance = (timeDiff / maxTime) * maxDistance;
    
    if (distance > maxPossibleDistance) {
      return {
        valid: false,
        error: 'Location change too fast for travel time',
        distance,
        maxAllowed: maxPossibleDistance
      };
    }
    
    return { valid: true };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Detect account takeover attempts
   */
  static detectAccountTakeover(user, loginAttempt) {
    const warnings = [];
    
    // Check for unusual login location
    if (user.lastLoginLocation && loginAttempt.location) {
      const distance = this.calculateDistance(
        user.lastLoginLocation.lat, user.lastLoginLocation.lng,
        loginAttempt.location.lat, loginAttempt.location.lng
      );
      
      if (distance > 500) { // More than 500km from last login
        warnings.push({
          type: 'unusual_location',
          severity: 'high',
          message: 'Login from unusual location',
          distance: `${distance.toFixed(0)}km`
        });
      }
    }
    
    // Check for unusual device
    if (user.lastDevice && loginAttempt.device !== user.lastDevice) {
      warnings.push({
        type: 'new_device',
        severity: 'medium',
        message: 'Login from new device'
      });
    }
    
    // Check for unusual time
    const hour = new Date(loginAttempt.timestamp).getHours();
    if (hour < 5 || hour > 23) {
      warnings.push({
        type: 'unusual_time',
        severity: 'low',
        message: 'Login at unusual time'
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
   * SQL injection prevention (for database queries)
   */
  static preventSQLInjection(input) {
    if (typeof input !== 'string') return input;
    
    // Remove SQL injection patterns
    const sqlPatterns = [
      /('|--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter)/gi,
      /union\s+select/gi,
      /or\s+1\s*=\s*1/gi,
      /or\s+1\s*=\s*1/gi,
    ];
    
    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }

  /**
   * XSS prevention
   */
  static preventXSS(input) {
    if (typeof input !== 'string') return input;
    
    // Escape HTML entities
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return input.replace(/[&<>"'/]/g, char => escapeMap[char]);
  }

  /**
   * CSRF token validation
   */
  static validateCSRFToken(token, sessionToken) {
    if (!token || !sessionToken) {
      return { valid: false, error: 'CSRF token missing' };
    }
    
    // In production, compare with stored session token
    // Also check token expiration
    return { valid: token === sessionToken };
  }

  /**
   * Check for data exfiltration patterns
   */
  static detectDataExfiltration(userActivity) {
    const warnings = [];
    
    // Check for large data transfers
    const largeTransfers = userActivity.actions.filter(a => 
      a.dataSize && a.dataSize > 10 * 1024 * 1024 // 10MB
    );
    
    if (largeTransfers.length > 3) {
      warnings.push({
        type: 'large_data_transfers',
        severity: 'high',
        message: 'Multiple large data transfers detected'
      });
    }
    
    // Check for rapid API calls
    const apiCalls = userActivity.actions.filter(a => a.type === 'api_call');
    if (apiCalls.length > 50) {
      warnings.push({
        type: 'rapid_api_calls',
        severity: 'medium',
        message: 'Unusually high API call rate'
      });
    }
    
    return {
      hasWarnings: warnings.length > 0,
      warnings,
      riskLevel: warnings.filter(w => w.severity === 'high').length > 0 ? 'high' : 
                 warnings.length > 0 ? 'medium' : 'low'
    };
  }
}
