import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Tabs,
  Tab,
  Rating,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Visibility,
  Delete,
  Block,
  CheckCircle,
  Search,
  Refresh,
  Person,
  TrendingUp,
  Security,
  Star,
  Timeline,
  Edit
} from '@mui/icons-material';
import AdminLayout from '@/components/Layout/AdminLayout';
import { UserManagementService } from '@/services/UserManagementService';
import withAuth from '@/utils/withAuth';

interface SwipeItUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isActive: boolean;
  isBanned: boolean;
  trustScore: number;
  createdAt: any; // Can be Date, Firebase Timestamp, or string
  lastLoginAt?: any; // Can be Date, Firebase Timestamp, or string
  banReason?: string;
  bannedBy?: string;
  bannedAt?: any; // Can be Date, Firebase Timestamp, or string
  totalTrades?: number;
  completedTrades?: number;
  successRate?: number;
  averageRating?: number;
  reportCount?: number;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<SwipeItUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<SwipeItUser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [trustScoreDialogOpen, setTrustScoreDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [newTrustScore, setNewTrustScore] = useState(0);
  const [userStats, setUserStats] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tabValue, setTabValue] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const usersPerPage = 20;

  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter, sortBy, sortOrder, searchTerm, tabValue]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await UserManagementService.getUsers(page, usersPerPage, {
        status: statusFilter === 'all' ? undefined : statusFilter as any,
        search: searchTerm,
        sortBy: sortBy as any,
        sortOrder
      });
      
      setUsers(result.users as SwipeItUser[]);
      setHasMore(result.hasMore);
      setTotalPages(Math.ceil(result.total / usersPerPage));
    } catch (error) {
      console.error('Error loading users:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load users. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (user: SwipeItUser) => {
    setSelectedUser(user);
    setDetailsOpen(true);
    
    try {
      const [stats, activity] = await Promise.all([
        UserManagementService.getUserStats(user.id),
        UserManagementService.getUserActivity(user.id, 20)
      ]);
      setUserStats(stats);
      setUserActivity(activity);
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const handleBanUser = (user: SwipeItUser) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  };

  const handleSubmitBan = async () => {
    if (!selectedUser || !banReason.trim()) return;

    try {
      await UserManagementService.banUser(selectedUser.id, banReason, 'admin');
      setAlert({
        type: 'success',
        message: 'User banned successfully'
      });
      setBanDialogOpen(false);
      setBanReason('');
      loadUsers();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to ban user'
      });
    }
  };

  const handleUnbanUser = async (user: SwipeItUser) => {
    try {
      await UserManagementService.unbanUser(user.id, 'admin');
      setAlert({
        type: 'success',
        message: 'User unbanned successfully'
      });
      loadUsers();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to unban user'
      });
    }
  };

  const handleUpdateTrustScore = (user: SwipeItUser) => {
    setSelectedUser(user);
    setNewTrustScore(user.trustScore || 0);
    setTrustScoreDialogOpen(true);
  };

  const handleSubmitTrustScore = async () => {
    if (!selectedUser) return;

    try {
      await UserManagementService.updateTrustScore(selectedUser.id, newTrustScore, 'admin');
      setAlert({
        type: 'success',
        message: 'Trust score updated successfully'
      });
      setTrustScoreDialogOpen(false);
      loadUsers();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to update trust score'
      });
    }
  };

  const getStatusColor = (user: SwipeItUser) => {
    if (user.isBanned) return 'error';
    if (user.isActive) return 'success';
    return 'default';
  };

  const getStatusText = (user: SwipeItUser) => {
    if (user.isBanned) return 'Banned';
    if (user.isActive) return 'Active';
    return 'Inactive';
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const formatDate = (date: any) => {
    if (!date) return 'Never';
    
    // Handle Firebase Timestamp objects
    if (date && typeof date.toDate === 'function') {
      const jsDate = date.toDate();
      return jsDate.toLocaleDateString() + ' ' + jsDate.toLocaleTimeString();
    }
    
    // Handle regular Date objects
    if (date instanceof Date) {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      const jsDate = new Date(date);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toLocaleDateString() + ' ' + jsDate.toLocaleTimeString();
      }
    }
    
    return 'Invalid Date';
  };

  const getTabFilter = () => {
    switch (tabValue) {
      case 1: return 'active';
      case 2: return 'banned';
      default: return 'all';
    }
  };

  useEffect(() => {
    setStatusFilter(getTabFilter());
  }, [tabValue]);

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Users Management
        </Typography>

        {alert && (
          <Alert 
            severity={alert.type} 
            onClose={() => setAlert(null)}
            sx={{ mb: 2 }}
          >
            {alert.message}
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="All Users" />
            <Tab label="Active Users" />
            <Tab label="Banned Users" />
          </Tabs>
        </Box>

        {/* Filters and Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Search users"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="createdAt">Join Date</MenuItem>
                    <MenuItem value="lastLoginAt">Last Login</MenuItem>
                    <MenuItem value="trustScore">Trust Score</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={1}>
                <Button
                  variant="outlined"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  sx={{ minWidth: 'auto', p: 1 }}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  onClick={loadUsers}
                  startIcon={<Refresh />}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Trust Score</TableCell>
                        <TableCell>Activity</TableCell>
                        <TableCell>Join Date</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar
                                src={user.photoURL}
                                sx={{ mr: 2, width: 40, height: 40 }}
                              >
                                {user.displayName?.charAt(0) || user.email?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {user.displayName || 'No Name'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {user.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusText(user)}
                              color={getStatusColor(user) as any}
                              size="small"
                            />
                            {user.reportCount && user.reportCount > 0 && (
                              <Chip
                                label={`${user.reportCount} reports`}
                                color="warning"
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Typography variant="body2" sx={{ mr: 1 }}>
                                {user.trustScore || 0}
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={user.trustScore || 0}
                                color={getTrustScoreColor(user.trustScore || 0) as any}
                                sx={{ width: 60, height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="caption" display="block">
                                Trades: {user.totalTrades || 0}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Success: {user.successRate ? `${user.successRate.toFixed(1)}%` : '0%'}
                              </Typography>
                              {user.averageRating && (
                                <Box display="flex" alignItems="center">
                                  <Rating value={user.averageRating} size="small" readOnly />
                                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                                    ({user.averageRating.toFixed(1)})
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatDate(user.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatDate(user.lastLoginAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewDetails(user)}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Update Trust Score">
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateTrustScore(user)}
                                  color="primary"
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              {user.isBanned ? (
                                <Tooltip title="Unban User">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleUnbanUser(user)}
                                    color="success"
                                  >
                                    <CheckCircle />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Ban User">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleBanUser(user)}
                                    color="error"
                                  >
                                    <Block />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>User Details</DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                        <Avatar
                          src={selectedUser.photoURL}
                          sx={{ width: 80, height: 80, mb: 2 }}
                        >
                          {selectedUser.displayName?.charAt(0) || selectedUser.email?.charAt(0)}
                        </Avatar>
                        <Typography variant="h6">
                          {selectedUser.displayName || 'No Name'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedUser.email}
                        </Typography>
                        <Chip
                          label={getStatusText(selectedUser)}
                          color={getStatusColor(selectedUser) as any}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Trust Score
                      </Typography>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Typography variant="h4" sx={{ mr: 2 }}>
                          {selectedUser.trustScore || 0}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={selectedUser.trustScore || 0}
                          color={getTrustScoreColor(selectedUser.trustScore || 0) as any}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Joined:</strong> {formatDate(selectedUser.createdAt)}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Last Login:</strong> {formatDate(selectedUser.lastLoginAt)}
                      </Typography>
                      
                      {selectedUser.isBanned && (
                        <>
                          <Typography variant="body2" paragraph>
                            <strong>Ban Reason:</strong> {selectedUser.banReason}
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Banned At:</strong> {formatDate(selectedUser.bannedAt)}
                          </Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Statistics
                      </Typography>
                      {userStats && (
                        <>
                          <Typography variant="body2" paragraph>
                            <strong>Total Items:</strong> {userStats.totalItems}
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Active Items:</strong> {userStats.activeItems}
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Total Trades:</strong> {userStats.totalTrades}
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Completed Trades:</strong> {userStats.completedTrades}
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Success Rate:</strong> {userStats.successRate.toFixed(1)}%
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Average Rating:</strong> {userStats.averageRating.toFixed(1)}
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Reports:</strong> {userStats.reportCount}
                          </Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Recent Activity
                      </Typography>
                      <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                        {userActivity.map((activity, index) => (
                          <Box key={index} mb={1}>
                            <Typography variant="body2">
                              <strong>{activity.type.replace('_', ' ')}:</strong> {activity.data?.title || activity.data?.type}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(activity.timestamp)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Ban User Dialog */}
        <Dialog
          open={banDialogOpen}
          onClose={() => setBanDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Ban User</DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              Are you sure you want to ban {selectedUser?.displayName || selectedUser?.email}?
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Ban Reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Provide a reason for banning this user..."
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitBan}
              color="error"
              variant="contained"
              disabled={!banReason.trim()}
            >
              Ban User
            </Button>
          </DialogActions>
        </Dialog>

        {/* Trust Score Dialog */}
        <Dialog
          open={trustScoreDialogOpen}
          onClose={() => setTrustScoreDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Update Trust Score</DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              Update trust score for {selectedUser?.displayName || selectedUser?.email}
            </Typography>
            <TextField
              fullWidth
              type="number"
              label="Trust Score (0-100)"
              value={newTrustScore}
              onChange={(e) => setNewTrustScore(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              inputProps={{ min: 0, max: 100 }}
              sx={{ mt: 2 }}
            />
            <LinearProgress
              variant="determinate"
              value={newTrustScore}
              color={getTrustScoreColor(newTrustScore) as any}
              sx={{ mt: 2, height: 8, borderRadius: 4 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTrustScoreDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitTrustScore}
              variant="contained"
            >
              Update Score
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default withAuth(UsersPage);