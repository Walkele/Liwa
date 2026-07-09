import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  IconButton,
  Button,
} from '@mui/material';
import {
  People,
  Inventory,
  SwapHoriz,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Refresh,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AdminLayout from '@/components/Layout/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalItems: number;
  activeItems: number;
  totalTrades: number;
  completedTrades: number;
  revenue: number;
  userGrowth: {
    daily: number[];
  };
  tradeVolume: {
    daily: number[];
  };
  topCategories: { category: string; count: number }[];
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

export default function DashboardPage() {
  const { admin, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !admin) {
      router.push('/login');
    }
  }, [admin, loading, router]);

  useEffect(() => {
    if (admin) {
      fetchDashboardData();
    }
  }, [admin]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/analytics/dashboard');
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !admin) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // Prepare chart data
  const userGrowthData = stats?.userGrowth.daily.map((value, index) => ({
    day: `Day ${index + 1}`,
    users: value,
  })) || [];

  const tradeVolumeData = stats?.tradeVolume.daily.map((value, index) => ({
    day: `Day ${index + 1}`,
    trades: value,
  })) || [];

  const categoryData = stats?.topCategories.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
  })) || [];

  return (
    <AdminLayout>
      <Box sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard Overview
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboardData}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </Box>

        {isLoading ? (
          <LinearProgress sx={{ mb: 3 }} />
        ) : (
          <>
            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        <People />
                      </Avatar>
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Total Users
                        </Typography>
                        <Typography variant="h5">
                          {stats?.totalUsers.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          {stats?.activeUsers || 0} active
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                        <Inventory />
                      </Avatar>
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Total Items
                        </Typography>
                        <Typography variant="h5">
                          {stats?.totalItems.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          {stats?.activeItems || 0} active
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                        <SwapHoriz />
                      </Avatar>
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Total Trades
                        </Typography>
                        <Typography variant="h5">
                          {stats?.totalTrades.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          {stats?.completedTrades || 0} completed
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                        <TrendingUp />
                      </Avatar>
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Revenue
                        </Typography>
                        <Typography variant="h5">
                          ${stats?.revenue.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          This month
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      User Growth (Last 30 Days)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="users" stroke="#FF6B6B" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Top Categories
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Recent Activity & System Status */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Activity
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'success.main' }}>
                            <CheckCircle />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="New user registered"
                          secondary="2 minutes ago"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.main' }}>
                            <SwapHoriz />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Trade completed successfully"
                          secondary="5 minutes ago"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <Warning />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Item reported by user"
                          secondary="10 minutes ago"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      System Status
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText primary="Database" />
                        <Chip label="Healthy" color="success" size="small" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Firebase Auth" />
                        <Chip label="Healthy" color="success" size="small" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Storage" />
                        <Chip label="Healthy" color="success" size="small" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Notifications" />
                        <Chip label="Healthy" color="success" size="small" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </AdminLayout>
  );
}