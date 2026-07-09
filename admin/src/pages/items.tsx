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
  Pagination
} from '@mui/material';
import {
  Visibility,
  Delete,
  Block,
  CheckCircle,
  Search,
  Refresh
} from '@mui/icons-material';
import AdminLayout from '@/components/Layout/AdminLayout';
import { ItemManagementService } from '@/services/ItemManagementService';
import withAuth from '@/utils/withAuth';

interface SwipeItItem {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  images: string[];
  userId: string;
  userName: string;
  userEmail: string;
  status: 'active' | 'archived' | 'reported' | 'banned';
  createdAt: any;
  updatedAt: any;
  reportCount: number;
  viewCount: number;
  offerCount: number;
  location?: string;
  tags?: string[];
}

const ItemsPage: React.FC = () => {
  const [items, setItems] = useState<SwipeItItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SwipeItItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ open: false, title: '', message: '', action: () => {} });
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadItems();
  }, [page, statusFilter, categoryFilter, sortBy, sortOrder, searchTerm]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await ItemManagementService.getItems({
        page,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        sortBy,
        sortOrder
      });
      
      setItems(result.items);
      setTotalPages(Math.ceil(result.total / itemsPerPage));
    } catch (error) {
      console.error('Error loading items:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load items. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (item: SwipeItItem) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const handleBanItem = (item: SwipeItItem) => {
    setConfirmDialog({
      open: true,
      title: 'Ban Item',
      message: `Are you sure you want to ban "${item.title}"? This will remove it from the platform and notify the user.`,
      action: async () => {
        try {
          await ItemManagementService.banItem(item.id, 'Banned by admin');
          setAlert({
            type: 'success',
            message: 'Item banned successfully'
          });
          loadItems();
        } catch (error) {
          setAlert({
            type: 'error',
            message: 'Failed to ban item'
          });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  const handleUnbanItem = async (item: SwipeItItem) => {
    try {
      await ItemManagementService.unbanItem(item.id);
      setAlert({
        type: 'success',
        message: 'Item unbanned successfully'
      });
      loadItems();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to unban item'
      });
    }
  };

  const handleDeleteItem = (item: SwipeItItem) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Item',
      message: `Are you sure you want to permanently delete "${item.title}"? This action cannot be undone.`,
      action: async () => {
        try {
          await ItemManagementService.deleteItem(item.id);
          setAlert({
            type: 'success',
            message: 'Item deleted successfully'
          });
          loadItems();
        } catch (error) {
          setAlert({
            type: 'error',
            message: 'Failed to delete item'
          });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'archived': return 'default';
      case 'reported': return 'warning';
      case 'banned': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Items Management
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

        {/* Filters and Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Search items"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                    <MenuItem value="reported">Reported</MenuItem>
                    <MenuItem value="banned">Banned</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    <MenuItem value="electronics">Electronics</MenuItem>
                    <MenuItem value="clothing">Clothing</MenuItem>
                    <MenuItem value="books">Books</MenuItem>
                    <MenuItem value="home">Home & Garden</MenuItem>
                    <MenuItem value="sports">Sports</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="createdAt">Created Date</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                    <MenuItem value="reportCount">Report Count</MenuItem>
                    <MenuItem value="viewCount">View Count</MenuItem>
                    <MenuItem value="offerCount">Offer Count</MenuItem>
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
                  onClick={loadItems}
                  startIcon={<Refresh />}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Items Table */}
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
                        <TableCell>Item</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Stats</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar
                                src={item.images?.[0]}
                                sx={{ mr: 2, width: 40, height: 40 }}
                              >
                                {item.title.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {item.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.description?.substring(0, 50)}...
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {item.userName || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.userEmail}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.category} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.status}
                              color={getStatusColor(item.status) as any}
                              size="small"
                            />
                            {item.reportCount > 0 && (
                              <Chip
                                label={`${item.reportCount} reports`}
                                color="warning"
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="caption" display="block">
                                Views: {item.viewCount || 0}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Offers: {item.offerCount || 0}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatDate(item.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewDetails(item)}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              {item.status === 'banned' ? (
                                <Tooltip title="Unban Item">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleUnbanItem(item)}
                                    color="success"
                                  >
                                    <CheckCircle />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Ban Item">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleBanItem(item)}
                                    color="warning"
                                  >
                                    <Block />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Delete Item">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteItem(item)}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
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

        {/* Item Details Dialog */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Item Details</DialogTitle>
          <DialogContent>
            {selectedItem && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    {selectedItem.title}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedItem.description}
                  </Typography>
                  <Box mb={2}>
                    <Chip label={selectedItem.category} sx={{ mr: 1 }} />
                    <Chip label={selectedItem.condition} sx={{ mr: 1 }} />
                    <Chip 
                      label={selectedItem.status} 
                      color={getStatusColor(selectedItem.status) as any}
                    />
                  </Box>
                  {selectedItem.tags && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Tags:
                      </Typography>
                      {selectedItem.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    User Information:
                  </Typography>
                  <Typography variant="body2">
                    Name: {selectedItem.userName || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Email: {selectedItem.userEmail}
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Statistics:
                  </Typography>
                  <Typography variant="body2">
                    Views: {selectedItem.viewCount || 0}
                  </Typography>
                  <Typography variant="body2">
                    Offers: {selectedItem.offerCount || 0}
                  </Typography>
                  <Typography variant="body2">
                    Reports: {selectedItem.reportCount || 0}
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Dates:
                  </Typography>
                  <Typography variant="body2">
                    Created: {formatDate(selectedItem.createdAt)}
                  </Typography>
                  <Typography variant="body2">
                    Updated: {formatDate(selectedItem.updatedAt)}
                  </Typography>
                  
                  {selectedItem.location && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Location:
                      </Typography>
                      <Typography variant="body2">
                        {selectedItem.location}
                      </Typography>
                    </>
                  )}
                </Grid>
                {selectedItem.images && selectedItem.images.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Images:
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedItem.images.map((image, index) => (
                        <Avatar
                          key={index}
                          src={image}
                          sx={{ width: 80, height: 80 }}
                          variant="rounded"
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        >
          <DialogTitle>{confirmDialog.title}</DialogTitle>
          <DialogContent>
            <Typography>{confirmDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDialog.action}
              color="primary"
              variant="contained"
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default withAuth(ItemsPage);