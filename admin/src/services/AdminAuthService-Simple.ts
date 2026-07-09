import { db } from '@/config/firebase-client';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AdminUser } from '@/types';

export class AdminAuthServiceSimple {
  private static JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-secret';
  private static JWT_EXPIRES_IN = '24h';

  // Verify admin credentials using client SDK
  static async verifyAdmin(email: string, password: string): Promise<AdminUser | null> {
    try {
      const adminDocRef = doc(db, 'admins', email);
      const adminDoc = await getDoc(adminDocRef);
      
      if (!adminDoc.exists()) {
        return null;
      }

      const adminData = adminDoc.data();
      const isValidPassword = await bcrypt.compare(password, adminData?.hashedPassword);

      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await updateDoc(adminDocRef, {
        lastLoginAt: new Date(),
      });

      return {
        id: adminDoc.id,
        email: adminData?.email,
        displayName: adminData?.displayName,
        role: adminData?.role,
        permissions: adminData?.permissions || [],
        createdAt: adminData?.createdAt?.toDate(),
        lastLoginAt: new Date(),
        isActive: adminData?.isActive,
      };
    } catch (error) {
      console.error('Admin verification error:', error);
      return null;
    }
  }

  // Generate JWT token
  static generateToken(admin: AdminUser): string {
    return jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  // Verify JWT token
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Check if admin has permission
  static hasPermission(admin: AdminUser, permission: string): boolean {
    if (admin.role === 'super-admin') {
      return true; // Super admin has all permissions
    }
    
    return admin.permissions.includes(permission);
  }
}