import { adminAuth, adminDb } from '@/config/firebase-admin';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AdminUser } from '@/types';

export class AdminAuthService {
  private static JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-secret';
  private static JWT_EXPIRES_IN = '24h';

  // Verify admin credentials
  static async verifyAdmin(email: string, password: string): Promise<AdminUser | null> {
    try {
      const adminDoc = await adminDb.collection('admins').doc(email).get();
      
      if (!adminDoc.exists) {
        return null;
      }

      const adminData = adminDoc.data();
      const isValidPassword = await bcrypt.compare(password, adminData?.hashedPassword);

      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await adminDoc.ref.update({
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

  // Create new admin user
  static async createAdmin(adminData: {
    email: string;
    password: string;
    displayName: string;
    role: 'super-admin' | 'admin' | 'moderator' | 'support';
    permissions: string[];
  }): Promise<AdminUser> {
    try {
      const hashedPassword = await bcrypt.hash(adminData.password, 12);

      const newAdmin = {
        email: adminData.email,
        displayName: adminData.displayName,
        role: adminData.role,
        permissions: adminData.permissions,
        hashedPassword,
        createdAt: new Date(),
        lastLoginAt: null,
        isActive: true,
      };

      await adminDb.collection('admins').doc(adminData.email).set(newAdmin);

      return {
        id: adminData.email,
        email: adminData.email,
        displayName: adminData.displayName,
        role: adminData.role,
        permissions: adminData.permissions,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
      };
    } catch (error) {
      console.error('Create admin error:', error);
      throw new Error('Failed to create admin user');
    }
  }

  // Get all admin users
  static async getAllAdmins(): Promise<AdminUser[]> {
    try {
      const adminsSnapshot = await adminDb.collection('admins').get();
      
      return adminsSnapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName,
        role: doc.data().role,
        permissions: doc.data().permissions || [],
        createdAt: doc.data().createdAt?.toDate(),
        lastLoginAt: doc.data().lastLoginAt?.toDate(),
        isActive: doc.data().isActive,
      }));
    } catch (error) {
      console.error('Get all admins error:', error);
      throw new Error('Failed to fetch admin users');
    }
  }

  // Update admin permissions
  static async updateAdminPermissions(adminId: string, permissions: string[]): Promise<void> {
    try {
      await adminDb.collection('admins').doc(adminId).update({
        permissions,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Update admin permissions error:', error);
      throw new Error('Failed to update admin permissions');
    }
  }

  // Deactivate admin
  static async deactivateAdmin(adminId: string): Promise<void> {
    try {
      await adminDb.collection('admins').doc(adminId).update({
        isActive: false,
        deactivatedAt: new Date(),
      });
    } catch (error) {
      console.error('Deactivate admin error:', error);
      throw new Error('Failed to deactivate admin');
    }
  }

  // Check if admin has permission
  static hasPermission(admin: AdminUser, permission: string): boolean {
    if (admin.role === 'super-admin') {
      return true; // Super admin has all permissions
    }
    
    return admin.permissions.includes(permission);
  }

  // Get admin permissions by role
  static getDefaultPermissions(role: string): string[] {
    const permissions = {
      'super-admin': ['*'], // All permissions
      'admin': [
        'users.read',
        'users.write',
        'items.read',
        'items.write',
        'trades.read',
        'trades.write',
        'reports.read',
        'reports.write',
        'analytics.read',
        'settings.read',
        'settings.write',
      ],
      'moderator': [
        'users.read',
        'items.read',
        'items.moderate',
        'trades.read',
        'reports.read',
        'reports.write',
        'analytics.read',
      ],
      'support': [
        'users.read',
        'items.read',
        'trades.read',
        'reports.read',
        'analytics.read',
      ],
    };

    return permissions[role as keyof typeof permissions] || [];
  }
}