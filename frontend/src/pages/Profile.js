import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  Divider,
  Avatar,
  Paper,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Key as KeyIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, authAPI } from '../services/api';

function Profile() {
  const { currentUser, currentOrganization, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: ''
  });
  
  // Password form data
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Load user data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the detailed profile data from the backend
        const profileResponse = await usersAPI.getProfile();
        Alert('Profile loaded successfully', 'success');
        const profileData = profileResponse.data;
        
        setFormData({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: profileData.email || '',
          phone: profileData.phone_number || '', 
          bio: profileData.bio || ''
        });
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [currentUser]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({
      ...passwordForm,
      [name]: value
    });
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare profile data for API - make sure field names match backend expectations
      const profileData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone, // Map phone to phone_number for backend
        bio: formData.bio
      };
      
      // Save profile data
      const response = await usersAPI.updateProfile(profileData);
      
      // Update user context to reflect changes
      updateUser(response.data);
      
      // Show success message
      setSuccess('Profile updated successfully!');
      setEditMode(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      // Display more specific error message if available from backend
      setError(
        err.response?.data?.detail || 
        err.response?.data?.error || 
        'Failed to update profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate passwords match
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await authAPI.changePassword({
        old_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      setSuccess('Password changed successfully!');
      setPasswordDialogOpen(false);
      
      // Reset form
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      console.error('Error changing password:', err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.old_password?.[0] || 
        err.response?.data?.new_password?.[0] || 
        'Failed to change password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Generate user initials for avatar
  const getUserInitials = () => {
    if (formData.first_name && formData.last_name) {
      return `${formData.first_name[0]}${formData.last_name[0]}`.toUpperCase();
    } else if (formData.first_name) {
      return formData.first_name[0].toUpperCase();
    } else if (formData.email) {
      return formData.email[0].toUpperCase();
    } else if (currentUser && currentUser.email) {
      return currentUser.email[0].toUpperCase();
    }
    return 'U';
  };
  
  if (loading && !currentUser) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          User Profile
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Profile</Typography>
        </Breadcrumbs>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setSuccess(false)}
        >
          {success}
        </Alert>
      )}
      
      <Grid container spacing={4}>
        {/* User Profile Card - Left Column */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar 
                sx={{ 
                  width: 120, 
                  height: 120, 
                  mx: 'auto',
                  bgcolor: 'primary.main',
                  fontSize: '2.5rem',
                  mb: 2
                }}
              >
                {getUserInitials()}
              </Avatar>
              
              <Typography variant="h5" sx={{ mb: 1 }}>
                {formData.first_name || formData.last_name
                  ? `${formData.first_name || ''} ${formData.last_name || ''}`.trim()
                  : 'User'
                }
              </Typography>              <Typography variant="body1" color="primary" gutterBottom>
                {currentUser?.roles?.map(role => role.name).join(', ') || currentUser?.role || 'User'} 
              </Typography>
              
              {currentOrganization?.name && (
                <Typography variant="body2" color="text.secondary">
                  {currentOrganization.name} 
                </Typography>
              )}
              
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                {formData.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{formData.email}</Typography>
                  </Box>
                )}
                
                {formData.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{formData.phone}</Typography>
                  </Box>
                )}
              </Box>
              
              <Button
                variant="outlined"
                startIcon={<KeyIcon />}
                onClick={() => setPasswordDialogOpen(true)}
                fullWidth
                color="primary"
                sx={{ mt: 2 }}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
          
          {/* Security Section - Moved from below to left column */}
          <Card elevation={3} sx={{ mt: 3, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ mb: { xs: 2, sm: 0 } }}>
                <Typography variant="h6">
                  Account Security
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your password and security settings
                </Typography>
              </Box>
              
              <Button
                startIcon={<LockIcon />}
                variant="outlined"
                onClick={() => setPasswordDialogOpen(true)}
              >
                Change Password
              </Button>
            </Box>
          </Card>
        </Grid>
        
        {/* Profile Information - Right Column */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">
                Profile Information
              </Typography>
              
              {editMode ? (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </Button>
              )}
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email Address"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone Number"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                  placeholder="+1234567890"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Bio"
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={4}
                  disabled={!editMode}
                  variant="outlined"
                  placeholder="Tell us about yourself..."
                />
              </Grid>
            </Grid>
            
            {editMode && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  onClick={() => setEditMode(false)}
                  sx={{ mr: 2 }}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            To change your password, please enter your current password and your new password.
          </DialogContentText>
          
          <TextField
            name="current_password"
            label="Current Password"
            type="password"
            fullWidth
            margin="normal"
            value={passwordForm.current_password}
            onChange={handlePasswordChange}
            required
          />
          
          <TextField
            name="new_password"
            label="New Password"
            type="password"
            fullWidth
            margin="normal"
            value={passwordForm.new_password}
            onChange={handlePasswordChange}
            required
            helperText="Password must be at least 8 characters"
          />
          
          <TextField
            name="confirm_password"
            label="Confirm New Password"
            type="password"
            fullWidth
            margin="normal"
            value={passwordForm.confirm_password}
            onChange={handlePasswordChange}
            required
            error={passwordForm.new_password !== passwordForm.confirm_password && passwordForm.confirm_password !== ''}
            helperText={
              passwordForm.new_password !== passwordForm.confirm_password && passwordForm.confirm_password !== ''
                ? "Passwords don't match"
                : ""
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={
              !passwordForm.current_password ||
              !passwordForm.new_password ||
              !passwordForm.confirm_password ||
              passwordForm.new_password !== passwordForm.confirm_password ||
              passwordForm.new_password.length < 8
            }
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Profile;
