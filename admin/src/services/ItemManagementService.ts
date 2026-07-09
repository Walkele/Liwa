// Client-side service that makes API calls to the backend

export interface ItemFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SwipeItItem {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  images: string[];
  userId: string;
  userName?: string;
  userEmail?: string;
  status: 'active' | 'archived' | 'reported' | 'banned';
  createdAt: any;
  updatedAt: any;
  reportCount: number;
  viewCount: number;
  offerCount: number;
  location?: string;
  tags?: string[];
}

export class ItemManagementService {
  private static readonly API_BASE = '/api/items';

  static async getItems(filters: ItemFilters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${this.API_BASE}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching items:', error);
      throw new Error('Failed to fetch items');
    }
  }

  static async getItemById(itemId: string): Promise<SwipeItItem | null> {
    try {
      const response = await fetch(`${this.API_BASE}/${itemId}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching item by ID:', error);
      throw new Error('Failed to fetch item');
    }
  }

  static async banItem(itemId: string, reason: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${itemId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error banning item:', error);
      throw new Error('Failed to ban item');
    }
  }

  static async unbanItem(itemId: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${itemId}/ban`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error unbanning item:', error);
      throw new Error('Failed to unban item');
    }
  }

  static async deleteItem(itemId: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete item');
    }
  }

  static async updateItemStatus(itemId: string, status: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      throw new Error('Failed to update item status');
    }
  }

  static async getItemStats() {
    try {
      const response = await fetch(`${this.API_BASE}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching item stats:', error);
      throw new Error('Failed to fetch item statistics');
    }
  }

  static async getReportedItems() {
    try {
      const response = await fetch(`${this.API_BASE}/reported`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching reported items:', error);
      throw new Error('Failed to fetch reported items');
    }
  }
}