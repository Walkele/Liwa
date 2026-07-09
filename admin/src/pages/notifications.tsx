import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Send,
  Add,
  Edit,
  Delete,
  Visibility,
  Schedule,
  NotificationsActive,
  Email,
  Sms,
  Campaign
} from '@mui/icons-material';
import AdminLayout from '@/components/Layout/AdminLayout';
import withAuth from '@/utils/withAuth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'push' | 'email' | 'sms' | 'in-app';
  target: 'all' | 'active' | 'inactive' | 'specific';
  targetUsers?: string[];
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  recipientCount: number;
  openRate?: number;
  clickRate?: number;
}

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: 'push' | 'email' | 'sms' | 'in-app';
  category: 'trade' | 'user' | 'system' | 'marketing';
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'push' as 'push' | 'email' | 'sms' | 'in-app',
    target: 'all' as 'all' | 'active' | 'inactive' | 'specific',
    scheduledAt: '',
    targetUsers: [] as string[]
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    title: '',
    message: '',
    type: 'push' as 'push' | 'email' | 'sms' | 'in-app',
    category: 'system' as 'trade' | 'user' | 'system' | 'marketing'
  });

  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    marketingEnabled: true,
    systemEnabled: true
  });

  useEffect(() => {
    loadNotifications();
    loadTemplates();
    loadNotificationSettings();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/notifications/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings');
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings(data);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const sendNotification = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification)
      });

      if (response.ok) {
        setAlert({
          type: 'success',
          message: 'Notification sent successfully'
        });
        setCreateDialogOpen(false);
        setNewNotification({
          title: '',
          message: '',
          type: 'push',
          target: 'all',
          scheduledAt: '',
          targetUsers: []
        });
        loadNotifications();
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to send notification'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      });

      if (response.ok) {
        setAlert({
          type: 'success',
          message: 'Template saved successfully'
        });
        setTemplateDialogOpen(false);
        setNewTemplate({
          name: '',
          title: '',
          message: '',
          type: 'push',
          category: 'system'
        });
        loadTemplates();
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to save template'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      });

      if (response.ok) {
        setAlert({
          type: 'success',
          message: 'Notification settings updated successfully'
        });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to update notification settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success';
      case 'scheduled': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'push': return <NotificationsActive />;
      case 'email': return <Email />;
      case 'sms': return <Sms />;
      case 'in-app': return <Campaign />;
      default: return <NotificationsActive />;
    }
  };

  const renderNotificationsList = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Recent Notifications</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Notification
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Recipients</TableCell>
              <TableCell>Open Rate</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.message.substring(0, 50)}...
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    {getTypeIcon(notification.type)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {notification.type.toUpperCase()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={notification.target}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={notification.status}
                    color={getStatusColor(notification.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{notification.recipientCount.toLocaleString()}</TableCell>
                <TableCell>
                  {notification.openRate ? `${notification.openRate}%` : '-'}
                </TableCell>
                <TableCell>
                  <IconButton size="small">
                    <Visibility />
                  </IconButton>
                  <IconButton size="small">
                    <Edit />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderTemplates = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Notification Templates</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setTemplateDialogOpen(true)}
        >
          Create Template
        </Button>
      </Box>

      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6">{template.name}</Typography>
                  <Chip label={template.category} size="small" />
                </Box>
                <Typography variant="subtitle2" gutterBottom>
                  {template.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {template.message.substring(0, 100)}...
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center">
                    {getTypeIcon(template.type)}
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      {template.type.toUpperCase()}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderSettings = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Notification Settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Notification Channels
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Push Notifications" secondary="Send push notifications to mobile devices" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={notificationSettings.pushEnabled}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, pushEnabled: e.target.checked }))}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="Email Notifications" secondary="Send notifications via email" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={notificationSettings.emailEnabled}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="SMS Notifications" secondary="Send notifications via SMS" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={notificationSettings.smsEnabled}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="In-App Notifications" secondary="Show notifications within the app" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={notificationSettings.inAppEnabled}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, inAppEnabled: e.target.checked }))}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Notification Categories
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="System Notifications" secondary="Critical system updates and maintenance" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={notificationSettings.systemEnabled}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, systemEnabled: e.target.checked }))}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="Marketing Notifications" secondary="Promotional and marketing messages" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={notificationSettings.marketingEnabled}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, marketingEnabled: e.target.checked }))}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Button
            variant="contained"
            onClick={updateNotificationSettings}
            disabled={loading}
          >
            Save Settings
          </Button>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Notifications Management
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

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Notifications" />
            <Tab label="Templates" />
            <Tab label="Settings" />
          </Tabs>
        </Box>

        {tabValue === 0 && renderNotificationsList()}
        {tabValue === 1 && renderTemplates()}
        {tabValue === 2 && renderSettings()}

        {/* Create Notification Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create Notification</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Message"
                  value={newNotification.message}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newNotification.type}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, type: e.target.value as any }))}
                    label="Type"
                  >
                    <MenuItem value="push">Push Notification</MenuItem>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                    <MenuItem value="in-app">In-App</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Target</InputLabel>
                  <Select
                    value={newNotification.target}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, target: e.target.value as any }))}
                    label="Target"
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    <MenuItem value="active">Active Users</MenuItem>
                    <MenuItem value="inactive">Inactive Users</MenuItem>
                    <MenuItem value="specific">Specific Users</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Schedule For (Optional)"
                  value={newNotification.scheduledAt}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={sendNotification} variant="contained" disabled={loading}>
              {newNotification.scheduledAt ? 'Schedule' : 'Send Now'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Template Dialog */}
        <Dialog
          open={templateDialogOpen}
          onClose={() => setTemplateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create Template</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Template Name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Message"
                  value={newTemplate.message}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, message: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newTemplate.type}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, type: e.target.value as any }))}
                    label="Type"
                  >
                    <MenuItem value="push">Push Notification</MenuItem>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                    <MenuItem value="in-app">In-App</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value as any }))}
                    label="Category"
                  >
                    <MenuItem value="trade">Trade</MenuItem>
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="system">System</MenuItem>
                    <MenuItem value="marketing">Marketing</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTemplate} variant="contained" disabled={loading}>
              Save Template
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default withAuth(NotificationsPage);