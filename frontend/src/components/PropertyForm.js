import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000/api';

/**
 * Property form component for creating and editing properties
 * @param {Object} props
 * @param {Object} props.initialData - Initial property data for editing (optional)
 */
function PropertyForm({ initialData }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Get currentUser from AuthContext

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    property_type: 'residential',
    description: '',
    organization: '' // Organization field remains
  });

  // Component state
  const [loading, setLoading] = useState(false); // Keep loading for initialData if any future use
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // Removed: const [organizations, setOrganizations] = useState([]);
  // Removed: const [organizationsLoading, setOrganizationsLoading] = useState(true);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        property_type: initialData.property_type || 'residential',
        description: initialData.description || '',
        organization: initialData.organization || '' // Keep for editing
      });
    } else if (currentUser && currentUser.organization) {
      // For new properties, set organization from current user
      setFormData(prevData => ({
        ...prevData,
        organization: currentUser.organization.id
      }));
    }
  }, [initialData, currentUser]);

  // Get auth context
  const { authInitialized } = useAuth();

  // Removed: useEffect hook for fetchOrganizations

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.name) {
      setError('Property name is required');
      return;
    }

    if (!formData.address) {
      setError('Property address is required');
      return;
    }

    // Ensure organization is set, especially for new properties
    let payload = { ...formData };
    if (!payload.organization && currentUser && currentUser.organization) {
      payload.organization = currentUser.organization.id;
    }

    // If organization is still not set (e.g. user has no org), handle error
    if (!payload.organization) {
        setError('User organization is not available. Cannot create property.');
        return;
    }

    try {
      setSaving(true);
      setError(null);
      // Create new property
      if (!initialData) {
        const response = await axios.post(`${API_URL}/properties/properties/`, payload);
        navigate(`/properties/${response.data.id}`);
      }
      // Update existing property
      else {
        await axios.patch(`${API_URL}/properties/properties/${initialData.id}/`, payload);
        navigate(`/properties/${initialData.id}`);
      }

    } catch (err) {
      console.error('Error saving property:', err);
      setError(err.response?.data?.detail || 'Failed to save property. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Removed: organizationsLoading check, as it's no longer used.
  // if (organizationsLoading) {
  // return (
  // <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
  // <CircularProgress />
  // </Box>
  // );
  // }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {initialData ? 'Edit Property' : 'Create New Property'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Property Name"
                fullWidth
                required
                value={formData.name}
                onChange={handleInputChange}
                disabled={saving}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Property Type</InputLabel>
                <Select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleInputChange}
                  label="Property Type"
                  disabled={saving}
                >
                  <MenuItem value="residential">Residential</MenuItem>
                  <MenuItem value="commercial">Commercial</MenuItem>
                  <MenuItem value="short_term">Short-Term Rental</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="address"
                label="Property Address"
                fullWidth
                required
                multiline
                rows={2}
                value={formData.address}
                onChange={handleInputChange}
                disabled={saving}
              />
            </Grid>

            {/* Organization dropdown - REMOVED */}
            {/*
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Organization (optional)</InputLabel>
                <Select
                  name="organization"
                  value={formData.organization || ''}
                  onChange={handleInputChange}
                  label="Organization (optional)"
                  disabled={saving}
                > <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {Array.isArray(organizations) ? (
                    organizations.map((org) => (
                      <MenuItem key={org?.id || Math.random()} value={org?.id}>
                        {org?.name || 'Unnamed Organization'}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Error loading organizations</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            */}

            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={handleInputChange}
                disabled={saving}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/properties')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : initialData ? 'Update Property' : 'Create Property'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
}

export default PropertyForm;
