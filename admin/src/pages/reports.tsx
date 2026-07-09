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
  Delete,
  Block,
  CheckCircle,
  Search,
  Refresh,
  Warning,
  Report,
  Person,
  Inventory
} from '@mui/icons-material';
import AdminLayout from '@/components/Layout/AdminLayout';
import { ReportManagementService } from '@/services/ReportManagementService';
import withAuth from '@/utils/withAuth';

interface SwipeItReport {
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

const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<SwipeItReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<SwipeItReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const reportsPerPage = 20;

  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadReports();
  }, [page, statusFilter, typeFilter, searchTerm, tabValue]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const result = await ReportManagementService.getReports({
        page,
        limit: reportsPerPage,
        search: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        priority: tabValue === 1 ? 'high' : undefined
      });
      
      setReports(result.reports);
      setTotalPages(Math.ceil(result.total / reportsPerPage));
    } catch (error) {
      console.error('Error loading reports:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load reports. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: SwipeItReport) => {
    setSelectedReport(report);
    setDetailsOpen(true);
  };

  const handleResolveReport = (report: SwipeItReport) => {
    setSelectedReport(report);
    setResolveDialogOpen(true);
  };

  const handleSubmitResolution = async () => {
    if (!selectedReport || !resolution.trim()) return;

    try {
      await ReportManagementService.resolveReport(selectedReport.id, resolution);
      setAlert({
        type: 'success',
        message: 'Report resolved successfully'
      });
      setResolveDialogOpen(false);
      setResolution('');
      loadReports();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to resolve report'
      });
    }
  };

  const handleDismissReport = async (report: SwipeItReport) => {
    try {
      await ReportManagementService.dismissReport(report.id);
      setAlert({
        type: 'success',
        message: 'Report dismissed successfully'
      });
      loadReports();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to dismiss report'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'reviewed': return 'info';
      case 'resolved': return 'success';
      case 'dismissed': return 'default';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user': return <Person />;
      case 'item': return <Inventory />;
      case 'trade': return <Report />;
      default: return <Warning />;
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
          Reports Management
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
            <Tab label="All Reports" />
            <Tab label="High Priority" />
          </Tabs>
        </Box>

        {/* Filters and Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Search reports"
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
                    <MenuItem value="reviewed">Reviewed</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="dismissed">Dismissed</MenuItem>
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
                    <MenuItem value="user">User Reports</MenuItem>
                    <MenuItem value="item">Item Reports</MenuItem>
                    <MenuItem value="trade">Trade Reports</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  onClick={loadReports}
                  startIcon={<Refresh />}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Reports Table */}
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
                        <TableCell>Type</TableCell>
                        <TableCell>Reported Item/User</TableCell>
                        <TableCell>Reporter</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {getTypeIcon(report.type)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2">
                                {report.targetTitle || report.targetUserName || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {report.targetUserEmail || report.reportedId}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {report.reporterName || 'Anonymous'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {report.reporterEmail}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {report.reason}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={report.status}
                              color={getStatusColor(report.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatDate(report.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewDetails(report)}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              {report.status === 'pending' && (
                                <>
                                  <Tooltip title="Resolve Report">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleResolveReport(report)}
                                      color="success"
                                    >
                                      <CheckCircle />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Dismiss Report">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDismissReport(report)}
                                      color="error"
                                    >
                                      <Block />
                                    </IconButton>
                                  </Tooltip>
                                </>
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

        {/* Report Details Dialog */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Report Details</DialogTitle>
          <DialogContent>
            {selectedReport && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {selectedReport.type.charAt(0).toUpperCase() + selectedReport.type.slice(1)} Report
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Reason:</strong> {selectedReport.reason}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Description:</strong> {selectedReport.description}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Reporter:</strong> {selectedReport.reporterName} ({selectedReport.reporterEmail})
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Reported:</strong> {formatDate(selectedReport.createdAt)}
                  </Typography>
                  {selectedReport.reviewedAt && (
                    <Typography variant="body2" paragraph>
                      <strong>Reviewed:</strong> {formatDate(selectedReport.reviewedAt)}
                    </Typography>
                  )}
                  {selectedReport.resolution && (
                    <Typography variant="body2" paragraph>
                      <strong>Resolution:</strong> {selectedReport.resolution}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Resolve Report Dialog */}
        <Dialog
          open={resolveDialogOpen}
          onClose={() => setResolveDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Resolve Report</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Resolution Details"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe how this report was resolved..."
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitResolution}
              variant="contained"
              disabled={!resolution.trim()}
            >
              Resolve
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default withAuth(ReportsPage);