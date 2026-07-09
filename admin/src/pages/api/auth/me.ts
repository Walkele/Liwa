import { NextApiRequest, NextApiResponse } from 'next';
import { AdminAuthService } from '@/services/AdminAuthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies['admin-token'];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT token
    const decoded = AdminAuthService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Return admin data
    res.status(200).json({
      success: true,
      admin: {
        id: decoded.id,
        email: decoded.email,
        displayName: decoded.displayName,
        role: decoded.role,
        permissions: decoded.permissions,
      },
    });
  } catch (error) {
    console.error('Get current admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}