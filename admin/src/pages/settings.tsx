import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Save,
  Refresh,
  Security,
  Notifications,
  Payment,
  Settings as SettingsIcon,
  Delete,
  Add,
  Edit,
  Warning
} from '@mui/icons-material';
import AdminLayout from '@/components/Layout/AdminLayout';
import withAuth from '@/utils/withAuth';

interface AppSettings {
  // General Settings
  appName: string;
  appVersion: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxItemsPerUser: number;
  maxActiveTradesPerUser: number;
  
  // Security Settings
  requireEmailVerification: boolean;
  requirePhoneVerification: boolean;
  minTrustScoreForTrades: number;
  autoSuspendThreshold: number;
  
  // Trade Settings
  tradeTimeoutHours: number;
  maxCounterOffers: number;
  requireMeetingConfirmation: boolean;
  allowCashOffers: boolean;
  
  // Notification Settings
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  
  // Content Moderation
  autoModerationEnabled: boolean;
  profanityFilterEnabled: boolean;
  imageAnalysisEnabled: boolean;
  
  // Feature Flags
  serviceOffersEnabled: boolean;
  premiumFeaturesEnabled: boolean;
  locationBasedMatching: boolean;
  qrCodeVerification: boolean;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'SwipeIt',
    appVersion: '1.0.0',
    maintenanceMode: false,
    registrationEnabled: true,
    maxItemsPerUser: 50,
    maxActiveTradesPerUser: 10,
    requireEmailVerification: true,
    requirePhoneVerification: false,
    minTrustScoreForTrades: 20,
    autoSuspendThreshold: 5,
    tradeTimeoutHours: 48,
    maxCounterOffers: 3,
    requireMeetingConfirmation: true,
    allowCashOffers: true,
    pushNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    autoModerationEnabled: true,
    profanityFilterEnabled: true,
    imageAnalysisEnabled: false,
    serviceOffersEnabled: true,
    premiumFeaturesEnabled: false,
    locationBasedMatching: true,
    qrCodeVerification: true
  });

  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const [bannedWords, setBannedWords] = useState<string[]>([
    'spam', 'scam', 'fake', 'stolen'
  ]);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [bannedWordDialogOpen, setBannedWordDialogOpen] = useState(false);

  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTrades: 0,
    systemHealth: 95,
    storageUsed: 45,
    apiCalls: 12500
  });

  useEffect(() => {
    loadSettings();
    loadSystemStats();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/system/stats');
      if (response.ok) {
        const data = await response.json();
        setSystemStats(data);
      }
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setAlert({
          type: 'success',
          message: 'Settings saved successfully'
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to save settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const addBannedWord = () => {
    if (newBannedWord.trim() && !bannedWords.includes(newBannedWord.trim())) {
      setBannedWords(prev => [...prev, newBannedWord.trim()]);
      setNewBannedWord('');
      setBannedWordDialogOpen(false);
    }
  };

  const removeBannedWord = (word: string) => {
    setBannedWords(prev => prev.filter(w => w !== word));
  };

  const renderGeneralSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="App Name"
          value={settings.appName}
          onChange={(e) => handleSettingChange('appName', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="App Version"
          value={settings.appVersion}
          onChange={(e) => handleSettingChange('appVersion', e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.maintenanceMode}
              onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
              color="warning"
            />
          }
          label="Maintenance Mode"
        />
        {settings.maintenanceMode && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            App is in maintenance mode. Users cannot access the app.
          </Alert>
        )}
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.registrationEnabled}
              onChange={(e) => handleSettingChange('registrationEnabled', e.target.checked)}
            />
          }
          label="Allow New User Registration"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Max Items Per User"
          value={settings.maxItemsPerUser}
          onChange={(e) => handleSettingChange('maxItemsPerUser', parseInt(e.target.value))}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Max Active Trades Per User"
          value={settings.maxActiveTradesPerUser}
          onChange={(e) => handleSettingChange('maxActiveTradesPerUser', parseInt(e.target.value))}
        />
      </Grid>
    </Grid>
  );

  const renderSecuritySettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.requireEmailVerification}
              onChange={(e) => handleSettingChange('requireEmailVerification', e.target.checked)}
            />
          }
          label="Require Email Verification"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.requirePhoneVerification}
              onChange={(e) => handleSettingChange('requirePhoneVerification', e.target.checked)}
            />
          }
          label="Require Phone Verification"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Minimum Trust Score for Trades"
          value={settings.minTrustScoreForTrades}
          onChange={(e) => handleSettingChange('minTrustScoreForTrades', parseInt(e.target.value))}
          helperText="Users below this score cannot initiate trades"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Auto-Suspend Report Threshold"
          value={settings.autoSuspendThreshold}
          onChange={(e) => handleSettingChange('autoSuspendThreshold', parseInt(e.target.value))}
          helperText="Auto-suspend users after this many reports"
        />
      </Grid>
    </Grid>
  );

  const renderTradeSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Trade Timeout (Hours)"
          value={settings.tradeTimeoutHours}
          onChange={(e) => handleSettingChange('tradeTimeoutHours', parseInt(e.target.value))}
          helperText="Auto-cancel trades after this time"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Max Counter Offers"
          value={settings.maxCounterOffers}
          onChange={(e) => handleSettingChange('maxCounterOffers', parseInt(e.target.value))}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.requireMeetingConfirmation}
              onChange={(e) => handleSettingChange('requireMeetingConfirmation', e.target.checked)}
            />
          }
          label="Require Meeting Confirmation"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.allowCashOffers}
              onChange={(e) => handleSettingChange('allowCashOffers', e.target.checked)}
            />
          }
          label="Allow Cash Offers"
        />
      </Grid>
    </Grid>
  );

  const renderModerationSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.autoModerationEnabled}
              onChange={(e) => handleSettingChange('autoModerationEnabled', e.target.checked)}
            />
          }
          label="Auto Moderation Enabled"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.profanityFilterEnabled}
              onChange={(e) => handleSettingChange('profanityFilterEnabled', e.target.checked)}
            />
          }
          label="Profanity Filter Enabled"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.imageAnalysisEnabled}
              onChange={(e) => handleSettingChange('imageAnalysisEnabled', e.target.checked)}
            />
          }
          label="AI Image Analysis"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Banned Words
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          {bannedWords.map((word) => (
            <Chip
              key={word}
              label={word}
              onDelete={() => removeBannedWord(word)}
              color="error"
              variant="outlined"
            />
          ))}
        </Box>
        <Button
          startIcon={<Add />}
          onClick={() => setBannedWordDialogOpen(true)}
          variant="outlined"
        >
          Add Banned Word
        </Button>
      </Grid>
    </Grid>
  );

  const renderSystemStats = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Users
            </Typography>
            <Typography variant="h4">
              {systemStats.totalUsers.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Active Users
            </Typography>
            <Typography variant="h4">
              {systemStats.activeUsers.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Trades
            </Typography>
            <Typography variant="h4">
              {systemStats.totalTrades.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              API Calls Today
            </Typography>
            <Typography variant="h4">
              {systemStats.apiCalls.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <Box display="flex" alignItems="center">
              <Box width="100%" mr={1}>
                <LinearProgress
                  variant="determinate"
                  value={systemStats.systemHealth}
                  color={systemStats.systemHealth > 90 ? 'success' : systemStats.systemHealth > 70 ? 'warning' : 'error'}
                />
              </Box>
              <Box minWidth={35}>
                <Typography variant="body2" color="text.secondary">
                  {systemStats.systemHealth}%
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Storage Usage
            </Typography>
            <Box display="flex" alignItems="center">
              <Box width="100%" mr={1}>
                <LinearProgress
                  variant="determinate"
                  value={systemStats.storageUsed}
                  color={systemStats.storageUsed > 80 ? 'error' : systemStats.storageUsed > 60 ? 'warning' : 'primary'}
                />
              </Box>
              <Box minWidth={35}>
                <Typography variant="body2" color="text.secondary">
                  {systemStats.storageUsed}%
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          System Settings
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
            <Tab label="General" />
            <Tab label="Security" />
            <Tab label="Trading" />
            <Tab label="Moderation" />
            <Tab label="System Stats" />
          </Tabs>
        </Box>

        <Card>
          <CardContent>
            {tabValue === 0 && renderGeneralSettings()}
            {tabValue === 1 && renderSecuritySettings()}
            {tabValue === 2 && renderTradeSettings()}
            {tabValue === 3 && renderModerationSettings()}
            {tabValue === 4 && renderSystemStats()}

            {tabValue !== 4 && (
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={saveSettings}
                  disabled={loading}
                >
                  Save Settings
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadSettings}
                  disabled={loading}
                >
                  Reset
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Banned Word Dialog */}
        <Dialog
          open={bannedWordDialogOpen}
          onClose={() => setBannedWordDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Banned Word</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Banned Word"
              value={newBannedWord}
              onChange={(e) => setNewBannedWord(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBannedWordDialogOpen(false)}>Cancel</Button>
            <Button onClick={addBannedWord} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default withAuth(SettingsPage);