// Payment Processing Dashboard
// Comprehensive payment management interface with real-time monitoring
// Following Google Material Design principles

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
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Payment,
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Refresh,
  Visibility,
  MoreVert,
  Add,
  Download,
  FilterList,
  Search,
  Lock,
  Unlock,
  Receipt,
  Assessment,
  Settings
} from '@mui/icons-material';
import AdminLayout from '@/components/Layout/AdminLayout';
import withAuth from '@/utils/withAuth';
import {
  PaymentTransaction,
  PaymentStatus,
  EscrowAccount,
  EscrowState,
  RevenueMetrics,
  PaymentAnalytics
} from '@/types/payment';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payment-tabpanel-${index}`}
      aria-labelledby={`payment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PaymentsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Payment data
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null);
  const [escrowAccounts, setEscrowAccounts] = useState<EscrowAccount[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    paymentMethod: '',
    dateRange: '7d'
  });

  // Dialog states
  const [transactionDetailOpen, setTransactionDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    loadPaymentData();
  }, [filters]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // Load transactions
      const transResponse = await fetch(`/api/payments?status=${filters.status}&paymentMethod=${filters.paymentMethod}`);
      if (transResponse.ok) {
        const transData = await transResponse.json();
        setTransactions(transData.transactions || []);
      }

      // Load analytics
      const analyticsResponse = await fetch(`/api/payments/analytics?timeRange=${filters.dateRange}`);
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setRevenueMetrics(analyticsData.revenueMetrics);
        setPaymentAnalytics(analyticsData.paymentAnalytics);
      }

      // Load escrow accounts
      const escrowResponse = await fetch('/api/payments/escrow');
      if (escrowResponse.ok) {
        const escrowData = await escrowResponse.json();
        setEscrowAccounts(escrowData.escrowAccounts || []);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load payment data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewTransaction = (transaction: PaymentTransaction) => {
    setSelectedTransaction(transaction);
    setTransactionDetailOpen(true);
  };

  const handleRefund = async () => {
    if (!selectedTransaction) return;

    try {
      const response = await fetch(`/api/payments/${selectedTransaction.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund',
          amount: parseFloat(refundAmount) || selectedTransaction.amount,
          reason: refundReason
        })
      });

      if (response.ok) {
        setAlert({
          type: 'success',
          message: 'Refund processed successfully'
        });
        setRefundDialogOpen(false);
        loadPaymentData();
      } else {
        throw new Error('Failed to process refund');
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to process refund'
      });
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    const colors: Record<PaymentStatus, any> = {
      pending: 'default',
      processing: 'info',
      succeeded: 'success',
      failed: 'error',
      refunded: 'warning',
      partially_refunded: 'warning',
      disputed: 'error',
      chargeback: 'error'
    };
    return colors[status] || 'default';
  };

  const getEscrowStateColor = (state: EscrowState) => {
    const colors: Record<EscrowState, any> = {
      holding: 'info',
      released: 'success',
      refunded: 'warning',
      partial_release: 'warning',
      disputed: 'error'
    };
    return colors[state] || 'default';
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  if (loading) {
    return (
      <AdminLayout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Payment Processing
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
            Payment Processing
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadPaymentData}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
            >
              New Payment
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

        {/* Revenue Overview Cards */}
        {revenueMetrics && (
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total Revenue
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(revenueMetrics.totalRevenue)}
                      </Typography>
                      <Box display="flex" alignItems="center" mt={1}>
                        <TrendingUp color="success" sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2" color="success.main">
                          +12.5%
                        </Typography>
                      </Box>
                    </Box>
                    <Payment color="primary" sx={{ fontSize: 40 }} />
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
                        Net Revenue
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(revenueMetrics.netRevenue)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        After fees
                      </Typography>
                    </Box>
                    <AccountBalance color="success" sx={{ fontSize: 40 }} />
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
                        Success Rate
                      </Typography>
                      <Typography variant="h4">
                        {revenueMetrics.successRate.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {revenueMetrics.transactionCount} transactions
                      </Typography>
                    </Box>
                    <Assessment color="info" sx={{ fontSize: 40 }} />
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
                        Refunds
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(revenueMetrics.refundAmount)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {((revenueMetrics.refundAmount / revenueMetrics.totalRevenue) * 100).toFixed(1)}% of revenue
                      </Typography>
                    </Box>
                    <Receipt color="warning" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Transactions" />
            <Tab label="Escrow" />
            <Tab label="Analytics" />
            <Tab label="Fee Management" />
          </Tabs>
        </Box>

        {/* Transactions Tab */}
        <TabPanel value={tabValue} index={0}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" gap={2}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      label="Status"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="succeeded">Succeeded</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                      <MenuItem value="refunded">Refunded</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Method</InputLabel>
                    <Select
                      value={filters.paymentMethod}
                      onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                      label="Method"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="card">Card</MenuItem>
                      <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                      <MenuItem value="wallet">Wallet</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box display="flex" gap={2}>
                  <Button variant="outlined" startIcon={<FilterList />}>
                    More Filters
                  </Button>
                  <Button variant="outlined" startIcon={<Download />}>
                    Export
                  </Button>
                </Box>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Transaction ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {transaction.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{transaction.userId}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>{transaction.paymentMethod}</TableCell>
                        <TableCell>
                          <Chip
                            label={transaction.status}
                            color={getStatusColor(transaction.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleViewTransaction(transaction)}
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton size="small">
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Escrow Tab */}
        <TabPanel value={tabValue} index={1}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Escrow Accounts
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Escrow ID</TableCell>
                      <TableCell>Transaction ID</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>State</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {escrowAccounts.map((escrow) => (
                      <TableRow key={escrow.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {escrow.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{escrow.transactionId}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(escrow.amount, escrow.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={escrow.state}
                            color={getEscrowStateColor(escrow.state)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(escrow.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Lock />
                          </IconButton>
                          <IconButton size="small">
                            <Unlock />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Analytics
              </Typography>
              {paymentAnalytics ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Payment Method Breakdown
                    </Typography>
                    {paymentAnalytics.paymentMethodBreakdown.map((method) => (
                      <Box key={method.method} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">{method.method}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {formatCurrency(method.amount)} ({method.percentage.toFixed(1)}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={method.percentage}
                        />
                      </Box>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Category Breakdown
                    </Typography>
                    {paymentAnalytics.categoryBreakdown.map((category) => (
                      <Box key={category.category} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">{category.category}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {formatCurrency(category.revenue)} ({category.percentage.toFixed(1)}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={category.percentage}
                        />
                      </Box>
                    ))}
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No analytics data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Fee Management Tab */}
        <TabPanel value={tabValue} index={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Fee Management
                </Typography>
                <Button variant="contained" startIcon={<Add />}>
                  Add Fee Structure
                </Button>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Fee management interface will be implemented here
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Transaction Detail Dialog */}
        <Dialog
          open={transactionDetailOpen}
          onClose={() => setTransactionDetailOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogContent>
            {selectedTransaction && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Transaction ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {selectedTransaction.id}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedTransaction.status}
                    color={getStatusColor(selectedTransaction.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Fee Amount
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(selectedTransaction.feeAmount, selectedTransaction.currency)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Net Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(selectedTransaction.netAmount, selectedTransaction.currency)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransaction.paymentMethod}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransaction.description}
                  </Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransactionDetailOpen(false)}>
              Close
            </Button>
            {selectedTransaction?.status === 'succeeded' && (
              <Button
                variant="contained"
                color="warning"
                onClick={() => {
                  setRefundDialogOpen(true);
                  setTransactionDetailOpen(false);
                }}
              >
                Process Refund
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Refund Dialog */}
        <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)}>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Refund Amount"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              sx={{ mt: 2 }}
              helperText={`Maximum: ${selectedTransaction ? formatCurrency(selectedTransaction.amount) : ''}`}
            />
            <TextField
              fullWidth
              label="Reason"
              multiline
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="contained" color="warning" onClick={handleRefund}>
              Process Refund
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default withAuth(PaymentsPage);