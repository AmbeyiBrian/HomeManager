import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  Button,
  TextField,
  Paper,
  Tab,
  Tabs,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  LinearProgress,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  ListItemIcon
} from '@mui/material';
import {
  Business as BusinessIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  CreditCard as CreditCardIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Storage as StorageIcon,
  Analytics as AnalyticsIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Cloud as CloudIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { organizationsAPI, paymentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`org-tabpanel-${index}`}
      aria-labelledby={`org-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Statistics Card Component
const StatCard = ({ title, value, icon, color = 'primary', subtitle, change }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="h2" color={`${color}.main`}>
            {value}
          </Typography>
          {change && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
              {change}
            </Typography>
          )}
          {subtitle && (
            <Typography color="textSecondary" variant="body2" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// Feature Toggle Component
const FeatureToggle = ({ title, description, enabled, onChange, premium = false }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">
              {title}
            </Typography>
            {premium && (
              <Chip
                label="Premium"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
          <Typography variant="body2" color="textSecondary">
            {description}
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={onChange}
              disabled={premium}
            />
          }
          label=""
        />
      </Box>
    </CardContent>
  </Card>
);

const EnhancedOrganizationManager = () => {
  const { currentOrganization } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    storageUsed: 0,
    storageLimit: 0,
    apiCalls: 0,
    apiLimit: 0
  });
  
  // Form states
  const [orgForm, setOrgForm] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    timezone: '',
    currency: '',
    language: ''
  });
  
  const [brandingForm, setBrandingForm] = useState({
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    logo: null,
    favicon: null,
    customCss: ''
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: false,
    passwordMinLength: 8,
    passwordExpiration: 90,
    sessionTimeout: 30,
    ipWhitelist: '',
    allowPublicRegistration: false
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    slackIntegration: false,
    webhookUrl: '',
    dailyReports: true,
    weeklyReports: true,
    monthlyReports: true
  });
  
  const [features, setFeatures] = useState({
    advancedAnalytics: false,
    customBranding: false,
    apiAccess: true,
    multipleProperties: true,
    bulkOperations: false,
    automatedReports: false,
    integrations: false,
    customFields: false
  });
  
  // Dialog states
  const [editDialog, setEditDialog] = useState(false);
  const [brandingDialog, setBrandingDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Notification states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchOrganizationData();
  }, []);
  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      
      // Get organization data from AuthContext and API
      const orgResponse = await organizationsAPI.getMyOrganization();
      const orgData = orgResponse.data;

      setOrganization(orgData);
      
      // Populate form with organization data
      if (orgData) {
        setOrgForm({
          name: orgData.name || '',
          description: orgData.description || '',
          email: orgData.email || '',
          phone: orgData.phone || '',
          address: orgData.address || '',
          website: orgData.website || '',
          timezone: orgData.timezone || '',
          currency: orgData.currency || 'USD',
          language: orgData.language || 'en'
        });
        
        setBrandingForm({
          primaryColor: orgData.branding?.primaryColor || '#1976d2',
          secondaryColor: orgData.branding?.secondaryColor || '#dc004e',
          logo: orgData.branding?.logo || null,
          favicon: orgData.branding?.favicon || null,
          customCss: orgData.branding?.customCss || ''
        });
      }

      // Calculate statistics using mock data for now
      setStatistics({
        totalUsers: 0, // Will be populated when user management is properly implemented
        activeUsers: 0,
        storageUsed: 2.3, // GB - mock data
        storageLimit: 10, // GB
        apiCalls: 15420,
        apiLimit: 50000
      });

    } catch (error) {
      console.error('Error fetching organization data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading organization data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSaveOrganization = async () => {
    try {
      setSaving(true);
      
      const response = await organizationsAPI.updateOrganization(organization.id, orgForm);
      setOrganization(response.data);
      
      setSnackbar({
        open: true,
        message: 'Organization updated successfully',
        severity: 'success'
      });
      
      setEditDialog(false);
    } catch (error) {
      console.error('Error updating organization:', error);
      setSnackbar({
        open: true,
        message: 'Error updating organization',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      setSaving(true);
      
      const response = await organizationsAPI.updateBranding(organization.id, brandingForm);
      setOrganization({ ...organization, branding: response.data });
      
      setSnackbar({
        open: true,
        message: 'Branding updated successfully',
        severity: 'success'
      });
      
      setBrandingDialog(false);
    } catch (error) {
      console.error('Error updating branding:', error);
      setSnackbar({
        open: true,
        message: 'Error updating branding',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFeatureToggle = (feature) => {
    setFeatures({
      ...features,
      [feature]: !features[feature]
    });
  };

  const getSubscriptionStatus = () => {
    if (!organization?.subscription) return 'free';
    return organization.subscription.status || 'free';
  };

  const getSubscriptionColor = (status) => {
    const colors = {
      'active': 'success',
      'trial': 'warning',
      'expired': 'error',
      'free': 'default'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}
              src={organization?.branding?.logo}
            >
              <BusinessIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1">
                {organization?.name || 'Organization Management'}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Comprehensive organization settings and configuration
              </Typography>
              <Chip
                label={`${getSubscriptionStatus().toUpperCase()} Plan`}
                color={getSubscriptionColor(getSubscriptionStatus())}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditDialog(true)}
            >
              Edit Details
            </Button>
            <Button
              variant="outlined"
              startIcon={<PaletteIcon />}
              onClick={() => setBrandingDialog(true)}
            >
              Customize Branding
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={statistics.totalUsers}
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={statistics.activeUsers}
            icon={<CheckCircleIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Storage Used"
            value={`${statistics.storageUsed}GB`}
            subtitle={`of ${statistics.storageLimit}GB`}
            icon={<StorageIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="API Calls"
            value={statistics.apiCalls.toLocaleString()}
            subtitle={`of ${statistics.apiLimit.toLocaleString()}`}
            icon={<CloudIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2, pt: 2 }}>
            <Tab icon={<SettingsIcon />} label="General Settings" iconPosition="start" />
            <Tab icon={<SecurityIcon />} label="Security" iconPosition="start" />
            <Tab icon={<NotificationsIcon />} label="Notifications" iconPosition="start" />
            <Tab icon={<CreditCardIcon />} label="Billing" iconPosition="start" />
            <Tab icon={<AnalyticsIcon />} label="Usage & Limits" iconPosition="start" />
            <Tab icon={<PaletteIcon />} label="Features" iconPosition="start" />
          </Tabs>
        </Box>

        {/* General Settings Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Organization Information
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Organization Name"
                        value={orgForm.name}
                        onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        value={orgForm.email}
                        onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={3}
                        value={orgForm.description}
                        onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={orgForm.phone}
                        onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Website"
                        value={orgForm.website}
                        onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Address"
                        value={orgForm.address}
                        onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                        disabled
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Regional Settings
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={orgForm.timezone}
                        onChange={(e) => setOrgForm({ ...orgForm, timezone: e.target.value })}
                        label="Timezone"
                        disabled
                      >
                        <MenuItem value="UTC">UTC</MenuItem>
                        <MenuItem value="America/New_York">Eastern Time</MenuItem>
                        <MenuItem value="America/Chicago">Central Time</MenuItem>
                        <MenuItem value="America/Denver">Mountain Time</MenuItem>
                        <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                        <MenuItem value="Africa/Nairobi">East Africa Time</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={orgForm.currency}
                        onChange={(e) => setOrgForm({ ...orgForm, currency: e.target.value })}
                        label="Currency"
                        disabled
                      >
                        <MenuItem value="USD">USD - US Dollar</MenuItem>
                        <MenuItem value="EUR">EUR - Euro</MenuItem>
                        <MenuItem value="GBP">GBP - British Pound</MenuItem>
                        <MenuItem value="KES">KES - Kenyan Shilling</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={orgForm.language}
                        onChange={(e) => setOrgForm({ ...orgForm, language: e.target.value })}
                        label="Language"
                        disabled
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                        <MenuItem value="sw">Swahili</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Authentication Settings
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={securitySettings.twoFactorRequired}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            twoFactorRequired: e.target.checked
                          })}
                        />
                      }
                      label="Require Two-Factor Authentication"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={securitySettings.allowPublicRegistration}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            allowPublicRegistration: e.target.checked
                          })}
                        />
                      }
                      label="Allow Public Registration"
                    />
                    <TextField
                      fullWidth
                      label="Minimum Password Length"
                      type="number"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        passwordMinLength: parseInt(e.target.value)
                      })}
                    />
                    <TextField
                      fullWidth
                      label="Password Expiration (days)"
                      type="number"
                      value={securitySettings.passwordExpiration}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        passwordExpiration: parseInt(e.target.value)
                      })}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Session & Access Control
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={3}>
                    <TextField
                      fullWidth
                      label="Session Timeout (minutes)"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        sessionTimeout: parseInt(e.target.value)
                      })}
                    />
                    <TextField
                      fullWidth
                      label="IP Whitelist (comma-separated)"
                      multiline
                      rows={3}
                      value={securitySettings.ipWhitelist}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        ipWhitelist: e.target.value
                      })}
                      placeholder="192.168.1.1, 10.0.0.1"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Security settings changes require administrator approval and may affect all users in the organization.
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Communication Channels
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.emailNotifications}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: e.target.checked
                          })}
                        />
                      }
                      label="Email Notifications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.smsNotifications}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            smsNotifications: e.target.checked
                          })}
                        />
                      }
                      label="SMS Notifications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.slackIntegration}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            slackIntegration: e.target.checked
                          })}
                        />
                      }
                      label="Slack Integration"
                    />
                    <TextField
                      fullWidth
                      label="Webhook URL"
                      value={notificationSettings.webhookUrl}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        webhookUrl: e.target.value
                      })}
                      placeholder="https://hooks.slack.com/..."
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Report Delivery
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.dailyReports}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            dailyReports: e.target.checked
                          })}
                        />
                      }
                      label="Daily Reports"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.weeklyReports}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            weeklyReports: e.target.checked
                          })}
                        />
                      }
                      label="Weekly Reports"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.monthlyReports}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            monthlyReports: e.target.checked
                          })}
                        />
                      }
                      label="Monthly Reports"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Billing Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Subscription
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                      <Typography variant="h4" color="primary">
                        {getSubscriptionStatus().toUpperCase()} Plan
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {organization?.subscription?.description || 'Basic features included'}
                      </Typography>
                    </Box>
                    <Button variant="contained" color="primary">
                      Upgrade Plan
                    </Button>
                  </Box>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="h6" gutterBottom>
                    Billing History
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography variant="body2" color="textSecondary">
                              No billing history available
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Usage Summary
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Storage Usage
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(statistics.storageUsed / statistics.storageLimit) * 100}
                        sx={{ mt: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption">
                        {statistics.storageUsed}GB of {statistics.storageLimit}GB used
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        API Calls
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(statistics.apiCalls / statistics.apiLimit) * 100}
                        sx={{ mt: 1, height: 8, borderRadius: 4 }}
                        color="warning"
                      />
                      <Typography variant="caption">
                        {statistics.apiCalls.toLocaleString()} of {statistics.apiLimit.toLocaleString()} calls
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Usage & Limits Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Usage
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <PeopleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Users"
                        secondary={`${statistics.activeUsers} active of ${statistics.totalUsers} total`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <StorageIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Storage"
                        secondary={`${statistics.storageUsed}GB used of ${statistics.storageLimit}GB limit`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <CloudIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="API Calls"
                        secondary={`${statistics.apiCalls.toLocaleString()} this month`}
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
                    Plan Limits
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Maximum Users"
                        secondary="Unlimited"
                      />
                      <Chip label="Current Plan" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Storage Limit"
                        secondary={`${statistics.storageLimit}GB`}
                      />
                      <Chip label="Current Plan" size="small" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="API Calls/Month"
                        secondary={`${statistics.apiLimit.toLocaleString()}`}
                      />
                      <Chip label="Current Plan" size="small" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Features Tab */}
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" gutterBottom>
            Feature Management
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Enable or disable features for your organization. Some features may require a premium subscription.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FeatureToggle
                title="Advanced Analytics"
                description="Detailed reporting and insights across all modules"
                enabled={features.advancedAnalytics}
                onChange={() => handleFeatureToggle('advancedAnalytics')}
                premium={true}
              />
              <FeatureToggle
                title="Custom Branding"
                description="Customize colors, logos, and styling"
                enabled={features.customBranding}
                onChange={() => handleFeatureToggle('customBranding')}
                premium={true}
              />
              <FeatureToggle
                title="API Access"
                description="Full REST API access for integrations"
                enabled={features.apiAccess}
                onChange={() => handleFeatureToggle('apiAccess')}
              />
              <FeatureToggle
                title="Bulk Operations"
                description="Import/export data and bulk operations"
                enabled={features.bulkOperations}
                onChange={() => handleFeatureToggle('bulkOperations')}
                premium={true}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FeatureToggle
                title="Multiple Properties"
                description="Manage unlimited properties and units"
                enabled={features.multipleProperties}
                onChange={() => handleFeatureToggle('multipleProperties')}
              />
              <FeatureToggle
                title="Automated Reports"
                description="Scheduled report generation and delivery"
                enabled={features.automatedReports}
                onChange={() => handleFeatureToggle('automatedReports')}
                premium={true}
              />
              <FeatureToggle
                title="Third-party Integrations"
                description="Connect with external services and tools"
                enabled={features.integrations}
                onChange={() => handleFeatureToggle('integrations')}
                premium={true}
              />
              <FeatureToggle
                title="Custom Fields"
                description="Add custom fields to entities"
                enabled={features.customFields}
                onChange={() => handleFeatureToggle('customFields')}
                premium={true}
              />
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Edit Organization Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Organization Details</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Organization Name"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={orgForm.email}
                  onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={orgForm.description}
                  onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={orgForm.phone}
                  onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={orgForm.website}
                  onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveOrganization} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EnhancedOrganizationManager;
