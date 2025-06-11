import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent,
  Container, 
  Grid, 
  Tab, 
  Tabs, 
  Typography, 
  Button, 
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Add as AddIcon
} from '@mui/icons-material';
import MpesaSettings from '../components/MpesaSettings';
import { useAuth } from '../context/AuthContext';
import { organizationsAPI, authAPI } from '../services/api';

function OrganizationManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Get auth context
  const { authInitialized } = useAuth();
  // Load user's organization
  useEffect(() => {
    const fetchUserOrganization = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get the user's organization using the simplified method
        const response = await organizationsAPI.getMyOrganization();
        
        if (response.data) {
          // The getMyOrganization already returns the complete organization data
          // No need to make another API call
          setOrganization(response.data);
          console.log('Organization loaded successfully:', response.data);
        } else {
          setError('No organization found for this user.');
        }      } catch (err) {
        console.error('Error fetching organization:', err);
        
        // More specific error handling
        if (err.code === 'NO_ORGANIZATION') {
          setError('No organization found for this user. Please contact your administrator to be assigned to an organization.');
        } else if (err.response?.status === 404) {
          setError('No organization found for this user. Please contact your administrator to be assigned to an organization.');
        } else if (err.response?.status === 401) {
          setError('You are not authenticated. Please log in again.');
          // Optionally redirect to login
          // window.location.href = '/login';
        } else if (err.response?.status === 403) {
          setError('You do not have permission to view organization data.');
        } else if (err.message && err.message.includes('No organization found')) {
          setError('No organization found for this user. Please contact your administrator to be assigned to an organization.');
        } else {
          setError(`Failed to load organization data: ${err.message || 'Unknown error occurred. Please try refreshing the page.'}`);
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch if auth is initialized
    if (authInitialized) {
      fetchUserOrganization();
    }
  }, [authInitialized]);
  
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };
    const handleUpdateOrg = async (updatedData) => {
    if (!organization) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Use slug for the update if available, otherwise use ID
      const identifier = organization.slug || organization.id;
      const response = await organizationsAPI.update(identifier, updatedData);
      setOrganization(response.data);
      
      setSuccess('Organization updated successfully');
    } catch (err) {
      console.error('Error updating organization:', err);
      
      // More specific error handling
      if (err.response?.status === 404) {
        setError('Organization not found.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to update this organization.');
      } else if (err.response?.data?.detail) {
        setError(`Failed to update organization: ${err.response.data.detail}`);
      } else {
        setError(`Failed to update organization: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Organization Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your organization's details, and payment configuration.
        </Typography>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Snackbar 
        open={Boolean(success)} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          {success}
        </Alert>
      </Snackbar>
      
      {organization ? (
        <>
          <Paper sx={{ mb: 4, p: 2 }}>
            <Typography variant="h5" gutterBottom>
              {organization.name}
            </Typography>
            {organization.is_primary_owner && (
              <Typography variant="body2" color="primary">
                You are the primary owner of this organization
              </Typography>
            )}
          </Paper>
          
          <Paper sx={{ mb: 4 }}>            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Organization Details" />
              <Tab label="Payments" />
            </Tabs>
          </Paper>
            {/* Organization Details Tab */}
          {selectedTab === 0 && (
            <OrganizationDetails 
              organization={organization} 
              onUpdate={handleUpdateOrg} 
              saving={saving}
            />
          )}
                    
          {/* Payments Tab */}
          {selectedTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Payment Settings
              </Typography>
              <MpesaSettings organizationId={organization.id} />
            </Box>
          )}
        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {error ? 'Error Loading Organization' : 'No Organization Found'}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {error 
              ? 'There was a problem loading your organization. Please contact support for assistance.'
              : 'Please contact your administrator to be assigned to an organization.'
            }
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            {error && (
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            )}
          </Box>
        </Paper>
      )}
    </Container>
  );
}

// Organization Details Component
function OrganizationDetails({ organization, onUpdate, saving }) {
  const [name, setName] = useState(organization.name);
  const [email, setEmail] = useState(organization.email || '');
  const [phone, setPhone] = useState(organization.phone || '');
  const [website, setWebsite] = useState(organization.website || '');
  const [address, setAddress] = useState(organization.address || '');
  const [description, setDescription] = useState(organization.description || '');
  const [formChanged, setFormChanged] = useState(false);
  
  useEffect(() => {
    setName(organization.name);
    setEmail(organization.email || '');
    setPhone(organization.phone || '');
    setWebsite(organization.website || '');
    setAddress(organization.address || '');
    setDescription(organization.description || '');
    setFormChanged(false);
  }, [organization]);
  
  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    setFormChanged(true);
  };
  
  const handleSave = () => {
    onUpdate({
      name,
      email: email || null,
      phone: phone || null,
      website: website || null,
      address: address || null,
      description: description || null
    });
  };
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Organization Details
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Organization Name"
              fullWidth
              margin="normal"
              value={name}
              onChange={handleChange(setName)}
              required
            />
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={email}
              onChange={handleChange(setEmail)}
            />
            <TextField
              label="Phone"
              fullWidth
              margin="normal"
              value={phone}
              onChange={handleChange(setPhone)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Website"
              fullWidth
              margin="normal"
              value={website}
              onChange={handleChange(setWebsite)}
            />
            <TextField
              label="Address"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              value={address}
              onChange={handleChange(setAddress)}
            />
            <TextField
              label="Description"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              value={description}
              onChange={handleChange(setDescription)}
            />
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            disabled={saving || !formChanged}
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// Organization Properties Component
function OrganizationProperties({ organizationId }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        
        // Get all properties that belong to this organization using our API service
        console.log(`Fetching properties for organization: ${organizationId}`);
        const response = await organizationsAPI.getPropertiesByOrganization(organizationId);
        console.log('Properties response:', response.data);
        
        // Handle multiple possible response formats
        let props = [];
        if (response.data && response.data.results && Array.isArray(response.data.results)) {
          // Results from paginated response
          props = response.data.results;
        } else if (Array.isArray(response.data)) {
          // Direct array response
          props = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // Single object response
          props = [response.data];
        }
        console.log('Processed properties:', props);
        setProperties(props);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties. Please try again later.');
        setProperties([]); // Ensure properties is always an array even on error
      } finally {
        setLoading(false);
      }
    };
    
    if (organizationId) {
      fetchProperties();
    } else {
      setLoading(false);
      setProperties([]);
    }
  }, [organizationId]);
  
  if (loading) {
    return <CircularProgress />;
  }
  
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Properties
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            href="/properties/new"
          >
            Add Property
          </Button>
        </Box>
          {!Array.isArray(properties) || properties.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
            No properties found for this organization.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {properties.map(property => (
              <Grid item key={property?.id || Math.random()} xs={12} md={6} lg={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">{property?.name || 'Unnamed Property'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {property?.address || 'No address provided'}
                    </Typography>
                    <Typography variant="body2">
                      Type: {property?.property_type || 'Unknown'}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        href={`/properties/${property?.id}`}
                        disabled={!property?.id}
                      >
                        View Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}

// Organization Users Component
function OrganizationUsers({ organization, onUpdate }) {
  const [users, setUsers] = useState([]);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [addingUser, setAddingUser] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
    useEffect(() => {
    const fetchOrganizationUsers = async () => {
      if (!organization?.id) return;
      
      try {
        setError(null);
        // Get all users belonging to this organization
        const response = await organizationsAPI.getOrganizationUsers(organization.id);
        
        const allUsers = response.data.map(user => {
          // Mark the primary owner
          const isOwner = user.id === organization.primary_owner;
          return {
            ...user,
            role: isOwner ? 'Primary Owner' : 'Member'
          };
        });
        
        setUsers(allUsers);
      } catch (err) {
        console.error('Error fetching organization users:', err);
        setError('Failed to load users');
      }
    };
    
    fetchOrganizationUsers();
  }, [organization]);
  
  const handleAddUserClick = () => {
    setAddUserDialogOpen(true);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setError(null);
  };
  
  const handleUserSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearching(true);
      setError(null);
      
      // Search for users by email or username using our API service
      const response = await organizationsAPI.searchUsers(searchQuery);
      
      // Filter out users who are already in the organization
      const existingUserIds = users.map(user => user.id);
      const filteredResults = response.data.filter(user => !existingUserIds.includes(user.id));
      
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };
  
  const handleAddUser = async () => {
    if (!selectedUser) return;
    
    try {
      setAddingUser(true);
      setError(null);
      
      // Add user to the organization using our API service
      await organizationsAPI.addUserToOrganization(organization.id, selectedUser.id);
      
      // Refresh the organization data to include the new user
      const response = await organizationsAPI.getById(organization.id);
      onUpdate(response.data);
      
      setSuccessMessage(`${selectedUser.first_name || selectedUser.username} has been added to the organization.`);
      setAddUserDialogOpen(false);
    } catch (err) {
      console.error('Error adding user to organization:', err);
      setError(err.response?.data?.detail || 'Failed to add user to organization. Please try again.');
    } finally {
      setAddingUser(false);
    }
  };
  
  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }
    
    try {
      // Remove user from the organization using our API service
      await organizationsAPI.removeUserFromOrganization(organization.id, userId);
      
      // Refresh the organization data to update the user list
      const response = await organizationsAPI.getById(organization.id);
      onUpdate(response.data);
      
      setSuccessMessage('User has been removed from the organization.');
    } catch (err) {
      console.error('Error removing user:', err);
      setError(err.response?.data?.detail || 'Failed to remove user. Please try again.');
    }
  };
  
  return (
    <Card>
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
            onClose={() => setSuccessMessage(null)}
          >
            {successMessage}
          </Alert>
        )}
        
        <Typography variant="h6" gutterBottom>
          Organization Users
        </Typography>
        
        {/* Rest of the user management UI would go here */}
        {/* This component can remain largely the same as the original */}
      </CardContent>
    </Card>
  );
}

export default OrganizationManager;
