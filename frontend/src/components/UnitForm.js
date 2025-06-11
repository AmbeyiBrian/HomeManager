import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  InputAdornment,
  CircularProgress,
  Typography,
  Alert
} from '@mui/material';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

function UnitForm({ propertyId, onUnitAdded, initialData = null, open, onClose }) {
  const [formData, setFormData] = useState({
    unit_number: initialData?.unit_number || '',
    floor: initialData?.floor || '',
    monthly_rent: initialData?.monthly_rent || '',
    size_sqft: initialData?.size_sqft || '',
    bedrooms: initialData?.bedrooms || '',
    bathrooms: initialData?.bathrooms || '',
    is_occupied: initialData?.is_occupied || false,
    description: initialData?.description || '',
    property: propertyId
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.unit_number) {
        setError('Unit number is required');
        setLoading(false);
        return;
      }
      
      let response;
      
      // Create new unit
      if (!initialData) {
        response = await axios.post(`${API_URL}/properties/units/`, formData);
      } 
      // Update existing unit
      else {
        response = await axios.patch(`${API_URL}/properties/units/${initialData.id}/`, formData);
      }
      
      onUnitAdded(response.data);
      onClose();
      
    } catch (err) {
      console.error('Error saving unit:', err);
      setError(err.response?.data?.detail || 'Failed to save unit. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>{initialData ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="unit_number"
              label="Unit Number"
              fullWidth
              required
              value={formData.unit_number}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="floor"
              label="Floor"
              fullWidth
              value={formData.floor}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="monthly_rent"
              label="Monthly Rent"
              fullWidth
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">KES</InputAdornment>,
              }}
              value={formData.monthly_rent}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="size_sqft"
              label="Size (sq ft)"
              fullWidth
              type="number"
              value={formData.size_sqft}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="bedrooms"
              label="Bedrooms"
              fullWidth
              type="number"
              value={formData.bedrooms}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="bathrooms"
              label="Bathrooms"
              fullWidth
              type="number"
              value={formData.bathrooms}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="description"
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="is_occupied"
                  checked={formData.is_occupied}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              }
              label="Unit is currently occupied"
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.unit_number}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ mr: 1 }} />
          ) : initialData ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UnitForm;
