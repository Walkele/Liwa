// Client-side service that makes API calls to the backend

export interface TradeFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  filter?: string;
}

export interface SwipeItTrade {
  id: string;
  itemId: string;
  itemTitle: string;
  itemImages: string[];
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  type: 'cash' | 'trade' | 'service';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  amount?: number;
  offerDetails: string;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
  disputeReason?: string;
  meetingLocation?: string;
  tradeValue: number;
}

export class TradeManagementService {
  private static readonly API_BASE = '/api/trades';

  static async getTrades(filters: TradeFilters = {}) {
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
      console.error('Error fetching trades:', error);
      throw new Error('Failed to fetch trades');
    }
  }

  static async getTradeById(tradeId: string): Promise<SwipeItTrade | null> {
    try {
      const response = await fetch(`${this.API_BASE}/${tradeId}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching trade by ID:', error);
      throw new Error('Failed to fetch trade');
    }
  }

  static async cancelTrade(tradeId: string, reason: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${tradeId}/cancel`, {
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
      console.error('Error cancelling trade:', error);
      throw new Error('Failed to cancel trade');
    }
  }

  static async resolveTrade(tradeId: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${tradeId}/resolve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error resolving trade:', error);
      throw new Error('Failed to resolve trade');
    }
  }

  static async updateTradeStatus(tradeId: string, status: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${tradeId}`, {
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
      console.error('Error updating trade status:', error);
      throw new Error('Failed to update trade status');
    }
  }

  static async getTradeStats() {
    try {
      const response = await fetch(`${this.API_BASE}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching trade stats:', error);
      throw new Error('Failed to fetch trade statistics');
    }
  }

  static async getActiveTrades() {
    try {
      const response = await fetch(`${this.API_BASE}/active`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching active trades:', error);
      throw new Error('Failed to fetch active trades');
    }
  }

  static async getDisputedTrades() {
    try {
      const response = await fetch(`${this.API_BASE}/disputed`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching disputed trades:', error);
      throw new Error('Failed to fetch disputed trades');
    }
  }
}