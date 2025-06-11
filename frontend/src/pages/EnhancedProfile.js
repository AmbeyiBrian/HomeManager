import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Switch,
  FormControlLabel,
  Chip,
  Tab,
  Tabs,
  Badge,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Key as KeyIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PhotoCamera as PhotoCameraIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  History as HistoryIcon,
  Dashboard as DashboardIcon,
  AdminPanelSettings as AdminIcon,
  Group as TeamIcon,
  Assignment as ActivityIcon,
  TrendingUp as StatsIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, authAPI } from '../services/api';

function EnhancedProfile() {
  const navigate = useNavigate();
  const { user, currentOrganization, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  // UI states
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Profile data
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    bio: '',
    timezone: '',
    language: 'en',
    avatar: null
  });
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Notification preferences
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    payment_alerts: true,
    maintenance_alerts: true,
    lease_alerts: true,
    marketing_emails: false
  });
  
  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    session_timeout: 30,
    login_alerts: true,
    device_tracking: true
  });
  
  // User statistics and activity
  const [userStats, setUserStats] = useState({
    login_count: 0,
    last_login: null,
    account_created: null,
    properties_managed: 0,
    tenants_managed: 0,
    tickets_resolved: 0,
    payments_processed: 0,
    recent_activity: []
  });

  useEffect(() => {
    fetchUserData();
  }, []);  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Only call the getProfile endpoint that exists
      const profileResponse = await usersAPI.getProfile();
      const userData = profileResponse.data;
      
      // Map backend fields to frontend state
      setProfileData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone_number || '', // Backend uses phone_number
        department: userData.department || '',
        bio: userData.bio || '',
        timezone: userData.timezone || 'Africa/Nairobi',
        language: userData.language || 'en',
        avatar: userData.avatar || null
      });
      
      console.log('Profile Data:', userData);
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load profile data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Map frontend fields to backend field names
      const backendData = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        phone_number: profileData.phone, // Map to backend field name
        department: profileData.department,
        bio: profileData.bio,
        timezone: profileData.timezone,
        language: profileData.language
      };
      
      await usersAPI.updateProfile(backendData);
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      
      // Update the auth context
      if (updateUser) {
        updateUser(backendData);
      }
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordForm.new_password !== passwordForm.confirm_password) {
        setError('New passwords do not match');
        return;
      }
      
      setSaving(true);
      setError(null);
      
      await authAPI.changePassword(passwordForm);
      setSuccess('Password changed successfully!');
      setPasswordDialogOpen(false);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Failed to change password. Please check your current password.');
    } finally {
      setSaving(false);
    }
  };
  const handleNotificationUpdate = async (settings) => {
    try {
      // TODO: Implement when backend endpoint is available
      // await usersAPI.updateNotificationSettings(settings);
      setNotificationSettings(settings);
      setSuccess('Notification settings updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating notifications:', err);
      setError('Failed to update notification settings.');
    }
  };

  const handleSecurityUpdate = async (settings) => {
    try {
      // TODO: Implement when backend endpoint is available
      // await usersAPI.updateSecuritySettings(settings);
      setSecuritySettings(settings);
      setSuccess('Security settings updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating security settings:', err);
      setError('Failed to update security settings.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const renderProfileTab = () => (
    <Grid container spacing={3}>
      {/* Profile Header */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <IconButton
                    size="small"
                    sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                    onClick={() => setAvatarDialogOpen(true)}
                  >
                    <PhotoCameraIcon fontSize="small" />
                  </IconButton>
                }
              >
                <Avatar
                  sx={{ width: 120, height: 120, fontSize: '2rem' }}
                  src={profileData.avatar}
                >
                  {getInitials(profileData.first_name, profileData.last_name)}
                </Avatar>
              </Badge>
              
              <Box sx={{ flex: 1 }}>                <Typography variant="h4" gutterBottom>
                  {`${profileData.first_name} ${profileData.last_name}`}
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {user?.role?.replace('_', ' ')?.toUpperCase() || 'User'}
                </Typography>
                {currentOrganization?.name && (
                  <Typography variant="body1" color="primary" gutterBottom>
                    {currentOrganization.name}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip icon={<EmailIcon />} label={profileData.email} />
                  {profileData.phone && (
                    <Chip icon={<PhoneIcon />} label={profileData.phone} />
                  )}
                  {profileData.department && (
                    <Chip icon={<BusinessIcon />} label={profileData.department} />
                  )}
                </Stack>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={editMode ? "outlined" : "contained"}
                    startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? 'Cancel' : 'Edit Profile'}
                  </Button>
                  {editMode && (
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Profile Form */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title="Personal Information" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={profileData.department}
                  onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!editMode}>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={profileData.timezone}
                    label="Timezone"
                    onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                  >
                    <MenuItem value="Africa/Nairobi">East Africa Time (EAT)</MenuItem>
                    <MenuItem value="UTC">UTC</MenuItem>
                    <MenuItem value="America/New_York">Eastern Time</MenuItem>
                    <MenuItem value="Europe/London">Greenwich Mean Time</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  multiline
                  rows={3}
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  disabled={!editMode}
                  placeholder="Tell us about yourself..."
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Account Stats */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Account Statistics" />
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Account Created</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatDate(userStats.account_created)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Last Login</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatDate(userStats.last_login)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Total Logins</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {userStats.login_count || 0}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Properties Managed</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {userStats.properties_managed || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Tenants Managed</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {userStats.tenants_managed || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Tickets Resolved</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {userStats.tickets_resolved || 0}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSecurityTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Password & Authentication" />
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Last password change: {formatDate(userStats.last_password_change)}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<KeyIcon />}
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  Change Password
                </Button>
              </Box>
              
              <Divider />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={securitySettings.two_factor_enabled}
                    onChange={(e) => handleSecurityUpdate({
                      ...securitySettings,
                      two_factor_enabled: e.target.checked
                    })}
                  />
                }
                label="Two-Factor Authentication"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={securitySettings.login_alerts}
                    onChange={(e) => handleSecurityUpdate({
                      ...securitySettings,
                      login_alerts: e.target.checked
                    })}
                  />
                }
                label="Login Alerts"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={securitySettings.device_tracking}
                    onChange={(e) => handleSecurityUpdate({
                      ...securitySettings,
                      device_tracking: e.target.checked
                    })}
                  />
                }
                label="Device Tracking"
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Session Management" />
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Session Timeout
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={securitySettings.session_timeout}
                    onChange={(e) => handleSecurityUpdate({
                      ...securitySettings,
                      session_timeout: e.target.value
                    })}
                  >
                    <MenuItem value={15}>15 minutes</MenuItem>
                    <MenuItem value={30}>30 minutes</MenuItem>
                    <MenuItem value={60}>1 hour</MenuItem>
                    <MenuItem value={120}>2 hours</MenuItem>
                    <MenuItem value={0}>Never</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Button variant="outlined" color="error">
                Terminate All Sessions
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderNotificationsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Communication Preferences" />
          <CardContent>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.email_notifications}
                    onChange={(e) => handleNotificationUpdate({
                      ...notificationSettings,
                      email_notifications: e.target.checked
                    })}
                  />
                }
                label="Email Notifications"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.sms_notifications}
                    onChange={(e) => handleNotificationUpdate({
                      ...notificationSettings,
                      sms_notifications: e.target.checked
                    })}
                  />
                }
                label="SMS Notifications"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.push_notifications}
                    onChange={(e) => handleNotificationUpdate({
                      ...notificationSettings,
                      push_notifications: e.target.checked
                    })}
                  />
                }
                label="Push Notifications"
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Alert Categories" />
          <CardContent>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.payment_alerts}
                    onChange={(e) => handleNotificationUpdate({
                      ...notificationSettings,
                      payment_alerts: e.target.checked
                    })}
                  />
                }
                label="Payment Alerts"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.maintenance_alerts}
                    onChange={(e) => handleNotificationUpdate({
                      ...notificationSettings,
                      maintenance_alerts: e.target.checked
                    })}
                  />
                }
                label="Maintenance Alerts"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.lease_alerts}
                    onChange={(e) => handleNotificationUpdate({
                      ...notificationSettings,
                      lease_alerts: e.target.checked
                    })}
                  />
                }
                label="Lease Alerts"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.marketing_emails}
                    onChange={(e) => handleNotificationUpdate({
                      ...notificationSettings,
                      marketing_emails: e.target.checked
                    })}
                  />
                }
                label="Marketing Emails"
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderActivityTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Recent Activity" />
          <CardContent>
            <List>
              {userStats.recent_activity?.map((activity, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <ActivityIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.description}
                    secondary={formatDate(activity.timestamp)}
                  />
                </ListItem>
              ))}
              {(!userStats.recent_activity || userStats.recent_activity.length === 0) && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No recent activity to display
                </Typography>
              )}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Profile</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          My Profile
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PersonIcon />} label="Profile" />
          <Tab icon={<SecurityIcon />} label="Security" />
          <Tab icon={<NotificationsIcon />} label="Notifications" />
          <Tab icon={<HistoryIcon />} label="Activity" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && renderProfileTab()}
      {activeTab === 1 && renderSecurityTab()}
      {activeTab === 2 && renderNotificationsTab()}
      {activeTab === 3 && renderActivityTab()}

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Current Password"
              type={showCurrentPassword ? "text" : "password"}
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                    {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                )
              }}
            />
            <TextField
              fullWidth
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                )
              }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                )
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePasswordChange} variant="contained" disabled={saving}>
            {saving ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default EnhancedProfile;
