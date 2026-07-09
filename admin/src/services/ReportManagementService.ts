// Client-side service that makes API calls to the backend

export interface ReportFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  priority?: string;
}

export interface SwipeItReport {
  id: string;
  type: 'user' | 'item' | 'trade';
  reportedId: string;
  reportedBy: string;
  reporterName: string;
  reporterEmail: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  resolution?: string;
  targetTitle?: string;
  targetUserName?: string;
  targetUserEmail?: string;
}

export class ReportManagementService {
  private static readonly API_BASE = '/api/reports';

  static async getReports(filters: ReportFilters = {}) {
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
      console.error('Error fetching reports:', error);
      throw new Error('Failed to fetch reports');
    }
  }

  static async getReportById(reportId: string): Promise<SwipeItReport | null> {
    try {
      const response = await fetch(`${this.API_BASE}/${reportId}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching report by ID:', error);
      throw new Error('Failed to fetch report');
    }
  }

  static async resolveReport(reportId: string, resolution: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolution }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error resolving report:', error);
      throw new Error('Failed to resolve report');
    }
  }

  static async dismissReport(reportId: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${reportId}/dismiss`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error dismissing report:', error);
      throw new Error('Failed to dismiss report');
    }
  }

  static async deleteReport(reportId: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/${reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error('Failed to delete report');
    }
  }

  static async getReportStats() {
    try {
      const response = await fetch(`${this.API_BASE}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching report stats:', error);
      throw new Error('Failed to fetch report statistics');
    }
  }

  static async getHighPriorityReports() {
    try {
      const response = await fetch(`${this.API_BASE}/high-priority`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching high priority reports:', error);
      throw new Error('Failed to fetch high priority reports');
    }
  }
}