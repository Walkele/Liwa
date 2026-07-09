import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  SwapHoriz,
  ShoppingCart,
  Report,
  Timeline,
  Download
} from '@mui/icons-material';
import AdminLayout from '@/components/Layout/AdminLayout';
import withAuth from '@/utils/withAuth';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalTrades: number;
    completedTrades: number;
    totalItems: number;
    activeItems: number;
    totalReports: number;
    pendingReports: number;
  };
  trends: {
    userGrowth: number;
    tradeGrowth: number;
    itemGrowth: number;
    reportGrowth: number;
  };
  topCategories: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  userActivity: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
    trades: number;
  }>;
  tradeMetrics: {
    averageTradeTime: number;
    successRate: number;
    averageRating: number;
    topTradeReasons: Array<{
      reason: string;
      count: number;
    }>;
  };
}

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/detailed?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        throw new Error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load analytics data'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch(`/api/analytics/export?timeRange=${timeRange}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setAlert({
          type: 'success',
          message: 'Analytics data exported successfully'
        });
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to export analytics data'
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getTrendIcon = (trend: number) => {
    return trend >= 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />;
  };

  const getTrendColor = (trend: number) => {
    return trend >= 0 ? 'success' : 'error';
  };

  if (loading || !analytics) {
    return (
      <AdminLayout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Analytics Dashboard
          </Typography>
          <LinearProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            Analytics Dashboard
          </Typography>
          <Box display="flex" gap={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="1d">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={exportData}
            >
              Export
            </Button>
          </Box>
        </Box>

        {alert && (
          <Alert 
            severity={alert.type} 
            onClose={() => setAlert(null)}
            sx={{ mb: 2 }}
          >
            {alert.message}
          </Alert>
        )}

        {/* Overview Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Users
                    </Typography>
                    <Typography variant="h4">
                      {formatNumber(analytics.overview.totalUsers)}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      {getTrendIcon(analytics.trends.userGrowth)}
                      <Typography 
                        variant="body2" 
                        color={getTrendColor(analytics.trends.userGrowth)}
                        sx={{ ml: 0.5 }}
                      >
                        {analytics.trends.userGrowth >= 0 ? '+' : ''}{analytics.trends.userGrowth}%
                      </Typography>
                    </Box>
                  </Box>
                  <People color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Trades
                    </Typography>
                    <Typography variant="h4">
                      {formatNumber(analytics.overview.totalTrades)}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      {getTrendIcon(analytics.trends.tradeGrowth)}
                      <Typography 
                        variant="body2" 
                        color={getTrendColor(analytics.trends.tradeGrowth)}
                        sx={{ ml: 0.5 }}
                      >
                        {analytics.trends.tradeGrowth >= 0 ? '+' : ''}{analytics.trends.tradeGrowth}%
                      </Typography>
                    </Box>
                  </Box>
                  <SwapHoriz color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Active Items
                    </Typography>
                    <Typography variant="h4">
                      {formatNumber(analytics.overview.activeItems)}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      {getTrendIcon(analytics.trends.itemGrowth)}
                      <Typography 
                        variant="body2" 
                        color={getTrendColor(analytics.trends.itemGrowth)}
                        sx={{ ml: 0.5 }}
                      >
                        {analytics.trends.itemGrowth >= 0 ? '+' : ''}{analytics.trends.itemGrowth}%
                      </Typography>
                    </Box>
                  </Box>
                  <ShoppingCart color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Pending Reports
                    </Typography>
                    <Typography variant="h4">
                      {formatNumber(analytics.overview.pendingReports)}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      {getTrendIcon(analytics.trends.reportGrowth)}
                      <Typography 
                        variant="body2" 
                        color={getTrendColor(analytics.trends.reportGrowth)}
                        sx={{ ml: 0.5 }}
                      >
                        {analytics.trends.reportGrowth >= 0 ? '+' : ''}{analytics.trends.reportGrowth}%
                      </Typography>
                    </Box>
                  </Box>
                  <Report color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Trade Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Trade Performance
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Success Rate
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Box width="100%" mr={1}>
                      <LinearProgress
                        variant="determinate"
                        value={analytics.tradeMetrics.successRate}
                        color="success"
                      />
                    </Box>
                    <Box minWidth={35}>
                      <Typography variant="body2" color="text.secondary">
                        {analytics.tradeMetrics.successRate}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Average Rating
                  </Typography>
                  <Typography variant="h6">
                    {analytics.tradeMetrics.averageRating.toFixed(1)} / 5.0
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Average Trade Time
                  </Typography>
                  <Typography variant="h6">
                    {analytics.tradeMetrics.averageTradeTime} hours
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Categories */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Categories
                </Typography>
                {analytics.topCategories.map((category, index) => (
                  <Box key={category.name} mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">
                        {category.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {category.count} ({category.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={category.percentage}
                      color={index === 0 ? 'primary' : index === 1 ? 'secondary' : 'inherit'}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* User Activity Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Daily Activity
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Active Users</TableCell>
                        <TableCell align="right">New Users</TableCell>
                        <TableCell align="right">Trades</TableCell>
                        <TableCell align="right">Growth</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.userActivity.map((day, index) => {
                        const prevDay = analytics.userActivity[index + 1];
                        const growth = prevDay 
                          ? ((day.activeUsers - prevDay.activeUsers) / prevDay.activeUsers * 100).toFixed(1)
                          : '0';
                        
                        return (
                          <TableRow key={day.date}>
                            <TableCell>
                              {new Date(day.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell align="right">
                              {day.activeUsers.toLocaleString()}
                            </TableCell>
                            <TableCell align="right">
                              {day.newUsers.toLocaleString()}
                            </TableCell>
                            <TableCell align="right">
                              {day.trades.toLocaleString()}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${growth >= '0' ? '+' : ''}${growth}%`}
                                color={parseFloat(growth) >= 0 ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
};

export default withAuth(AnalyticsPage);