// Client-side service that makes API calls to the backend

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'banned' | 'all';
  sortBy?: 'createdAt' | 'lastLoginAt' | 'trustScore';
  sortOrder?: 'asc' | 'desc';
}

export interface SwipeItUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isActive: boolean;
  isBanned: boolean;
  trustScore: number;
  createdAt: Date;
  lastLoginAt?: Date;
  banReason?: string;
  bannedBy?: string;
  bannedAt?: Date;
  totalTrades?: number;
  completedTrades?: number;
  successRate?: number;
  averageRating?: number;
  reportCount?: number;
}

export class UserManagementService {
  private static readonly API_BASE = '/api/users';

  static async getUsers(
    page: number = 1,
    limit: number = 20,
    filters?: UserFilters
  ) {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${this.API_BASE}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  static async getUserById(userId: string): Promise<SwipeItUser | null> {
    try {
      const response = await fetch(`${this.API_BASE}/${userId}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw new Error('Failed to fetch user');
    }
  }

  static async banUser(userId: string, reason: string, bannedBy: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, bannedBy }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error banning user:', error);
      throw new Error('Failed to ban user');
    }
  }

  static async unbanUser(userId: string, unbannedBy: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${userId}/ban`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unbannedBy }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      throw new Error('Failed to unban user');
    }
  }

  static async updateTrustScore(userId: string, newScore: number, updatedBy: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${userId}/trust-score`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trustScore: newScore, updatedBy }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating trust score:', error);
      throw new Error('Failed to update trust score');
    }
  }

  static async getUserStats(userId: string) {
    try {
      const response = await fetch(`${this.API_BASE}/${userId}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw new Error('Failed to fetch user statistics');
    }
  }

  static async deleteUser(userId: string, deletedBy: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deletedBy }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user account');
    }
  }

  static async getUserActivity(userId: string, limit: number = 50) {
    try {
      const response = await fetch(`${this.API_BASE}/${userId}/activity?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw new Error('Failed to fetch user activity');
    }
  }

  static async getUsersStats() {
    try {
      const response = await fetch(`${this.API_BASE}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching users stats:', error);
      throw new Error('Failed to fetch users statistics');
    }
  }
}