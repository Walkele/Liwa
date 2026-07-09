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
  Tab
} from '@mui/material';
import {
  Visibility,
  SwapHoriz,
  CheckCircle,
  Cancel,
  Search,
  Refresh,
  TrendingUp,
  Schedule,
  Done
} from '@mui/icons-material';
import AdminLayout from '@/components/Layout/AdminLayout';
import { TradeManagementService } from '@/services/TradeManagementService';
import withAuth from '@/utils/withAuth';

interface SwipeItTrade {
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

const TradesPage: React.FC = () => {
  const [trades, setTrades] = useState<SwipeItTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState<SwipeItTrade | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const tradesPerPage = 20;

  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadTrades();
  }, [page, statusFilter, typeFilter, searchTerm, tabValue]);

  const loadTrades = async () => {
    try {
      setLoading(true);
      const result = await TradeManagementService.getTrades({
        page,
        limit: tradesPerPage,
        search: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        filter: getTabFilter()
      });
      
      setTrades(result.trades);
      setTotalPages(Math.ceil(result.total / tradesPerPage));
    } catch (error) {
      console.error('Error loading trades:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load trades. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getTabFilter = () => {
    switch (tabValue) {
      case 1: return 'active';
      case 2: return 'completed';
      case 3: return 'disputed';
      default: return undefined;
    }
  };

  const handleViewDetails = (trade: SwipeItTrade) => {
    setSelectedTrade(trade);
    setDetailsOpen(true);
  };

  const handleCancelTrade = async (trade: SwipeItTrade) => {
    try {
      await TradeManagementService.cancelTrade(trade.id, 'Cancelled by admin');
      setAlert({
        type: 'success',
        message: 'Trade cancelled successfully'
      });
      loadTrades();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to cancel trade'
      });
    }
  };

  const handleResolveTrade = async (trade: SwipeItTrade) => {
    try {
      await TradeManagementService.resolveTrade(trade.id);
      setAlert({
        type: 'success',
        message: 'Trade resolved successfully'
      });
      loadTrades();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to resolve trade'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'default';
      case 'disputed': return 'error';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cash': return 'success';
      case 'trade': return 'primary';
      case 'service': return 'secondary';
      default: return 'default';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Trades Management
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
            <Tab label="All Trades" />
            <Tab label="Active Trades" />
            <Tab label="Completed" />
            <Tab label="Disputed" />
          </Tabs>
        </Box>

        {/* Filters and Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Search trades"
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
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="accepted">Accepted</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="disputed">Disputed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="cash">Cash Offers</MenuItem>
                    <MenuItem value="trade">Item Trades</MenuItem>
                    <MenuItem value="service">Services</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  onClick={loadTrades}
                  startIcon={<Refresh />}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Trades Table */}
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
                        <TableCell>Participants</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {trades.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar
                                src={trade.itemImages?.[0]}
                                sx={{ mr: 2, width: 40, height: 40 }}
                              >
                                {trade.itemTitle?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {trade.itemTitle}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {trade.itemId}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                <strong>Seller:</strong> {trade.sellerName}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Buyer:</strong> {trade.buyerName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={trade.type.toUpperCase()}
                              color={getTypeColor(trade.type) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {trade.amount ? formatCurrency(trade.amount) : 
                               trade.tradeValue ? formatCurrency(trade.tradeValue) : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={trade.status.replace('_', ' ')}
                              color={getStatusColor(trade.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatDate(trade.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewDetails(trade)}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              {trade.status === 'disputed' && (
                                <Tooltip title="Resolve Dispute">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleResolveTrade(trade)}
                                    color="success"
                                  >
                                    <CheckCircle />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {['pending', 'accepted', 'in_progress'].includes(trade.status) && (
                                <Tooltip title="Cancel Trade">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCancelTrade(trade)}
                                    color="error"
                                  >
                                    <Cancel />
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

        {/* Trade Details Dialog */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Trade Details</DialogTitle>
          <DialogContent>
            {selectedTrade && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Trade Information
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Item:</strong> {selectedTrade.itemTitle}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Type:</strong> {selectedTrade.type.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Status:</strong> {selectedTrade.status.replace('_', ' ')}
                  </Typography>
                  {selectedTrade.amount && (
                    <Typography variant="body2" paragraph>
                      <strong>Amount:</strong> {formatCurrency(selectedTrade.amount)}
                    </Typography>
                  )}
                  <Typography variant="body2" paragraph>
                    <strong>Offer Details:</strong> {selectedTrade.offerDetails}
                  </Typography>
                  {selectedTrade.meetingLocation && (
                    <Typography variant="body2" paragraph>
                      <strong>Meeting Location:</strong> {selectedTrade.meetingLocation}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Participants
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Seller:</strong> {selectedTrade.sellerName}
                    <br />
                    <strong>Email:</strong> {selectedTrade.sellerEmail}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Buyer:</strong> {selectedTrade.buyerName}
                    <br />
                    <strong>Email:</strong> {selectedTrade.buyerEmail}
                  </Typography>
                  
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Timeline
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Created:</strong> {formatDate(selectedTrade.createdAt)}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Updated:</strong> {formatDate(selectedTrade.updatedAt)}
                  </Typography>
                  {selectedTrade.completedAt && (
                    <Typography variant="body2" paragraph>
                      <strong>Completed:</strong> {formatDate(selectedTrade.completedAt)}
                    </Typography>
                  )}
                  
                  {selectedTrade.disputeReason && (
                    <>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Dispute Information
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Reason:</strong> {selectedTrade.disputeReason}
                      </Typography>
                    </>
                  )}
                </Grid>
                {selectedTrade.itemImages && selectedTrade.itemImages.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Item Images
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedTrade.itemImages.map((image, index) => (
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
      </Box>
    </AdminLayout>
  );
};

export default withAuth(TradesPage);