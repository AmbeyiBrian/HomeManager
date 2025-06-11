import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
// Using native date inputs for simplicity
import { tenantsAPI, unitsAPI } from '../services/api';

function TenantForm({ open, onClose, onSubmit, tenant = null }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    unit: '',
    move_in_date: null,
    move_out_date: null,
    emergency_contact: ''
  });
  
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  
  // Load units when dialog opens
  useEffect(() => {
    if (open) {
      loadUnits();
    }
  }, [open]);
    // Load form data when editing
  useEffect(() => {    if (tenant) {
      // For debugging
      console.log("Setting form data from tenant:", tenant);
      
      // Determine the unit ID to use from tenant data
      let unitId = '';
      if (tenant.unit) {
        unitId = tenant.unit;
      } else if (tenant.unit_id) {
        unitId = tenant.unit_id;
      } else if (tenant.unit_details && tenant.unit_details.id) {
        unitId = tenant.unit_details.id;
      }
      
      console.log("Using unit ID:", unitId);
      
      setFormData({
        first_name: tenant.first_name || '',
        last_name: tenant.last_name || '',
        email: tenant.email || '',
        phone: tenant.phone_number || tenant.phone || '',
        unit: unitId,
        move_in_date: tenant.move_in_date || '',
        move_out_date: tenant.move_out_date || '',
        emergency_contact: tenant.emergency_contact || ''
      });
    } else {
      // Reset form for new tenant
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        unit: '',
        move_in_date: '',
        move_out_date: '',
        emergency_contact: ''
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [tenant, open]);
    const loadUnits = async () => {
    try {
      setUnitsLoading(true);
      const response = await unitsAPI.getAll();
      
      // Log values for debugging
      console.log("Loaded units:", response.data.results);
      console.log("Current tenant:", tenant);
      
      // Filter for vacant units (or current tenant's unit if editing)
      // Add better handling for the current tenant's unit
      const availableUnits = response.data.results.filter(unit => {
        // Always include vacant units
        if (!unit.is_occupied) return true;
        
        // If editing a tenant, include the tenant's current unit
        if (tenant) {
          // Check multiple possible unit ID formats
          return unit.id === tenant.unit || 
                 unit.id === tenant.unit_id || 
                 unit.id === tenant.unit_details?.id ||
                 String(unit.id) === String(tenant.unit) ||
                 (unit.unit_details && unit.unit_details.id === tenant.unit);
        }
        
        return false;
      });
      
      console.log("Available units for selection:", availableUnits);
      setUnits(availableUnits);
    } catch (error) {
      console.error('Error loading units:', error);
      setSubmitError('Failed to load available units. Please try again.');
    } finally {
      setUnitsLoading(false);
    }
  };
  
  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };
    const handleDateChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user changes date
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    if (!formData.unit) {
      newErrors.unit = 'Unit selection is required';
    }
    
    if (!formData.move_in_date) {
      newErrors.move_in_date = 'Move-in date is required';
    }
    
    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (basic)
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
      // Date validation
    if (formData.move_in_date && formData.move_out_date) {
      const moveInDate = new Date(formData.move_in_date);
      const moveOutDate = new Date(formData.move_out_date);
      if (moveOutDate <= moveInDate) {
        newErrors.move_out_date = 'Move-out date must be after move-in date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
    const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setSubmitError(null);
      try {
      let submitData;
      
      if (tenant) {
        // For updates, only send changed fields (PATCH behavior)
        submitData = {};
        
        // Check each field for changes
        if (formData.first_name.trim() !== (tenant.first_name || '')) {
          submitData.first_name = formData.first_name.trim();
        }
        if (formData.last_name.trim() !== (tenant.last_name || '')) {
          submitData.last_name = formData.last_name.trim();
        }
        if (formData.email.trim() !== (tenant.email || '')) {
          submitData.email = formData.email.trim() || null;
        }
        if (formData.phone.trim() !== (tenant.phone_number || tenant.phone || '')) {
          submitData.phone_number = formData.phone.trim() || null;
          submitData.phone = formData.phone.trim() || null; // For backward compatibility
        }
        if (String(formData.unit) !== String(tenant.unit)) {
          submitData.unit = formData.unit;
        }
        if (formData.move_in_date !== (tenant.move_in_date || '')) {
          submitData.move_in_date = formData.move_in_date;
        }
        if (formData.move_out_date !== (tenant.move_out_date || '')) {
          submitData.move_out_date = formData.move_out_date || null;
        }
        if (formData.emergency_contact.trim() !== (tenant.emergency_contact || '')) {
          submitData.emergency_contact = formData.emergency_contact.trim() || null;
        }
        
        // If no fields changed, don't make the API call
        if (Object.keys(submitData).length === 0) {
          console.log("No changes detected, skipping update");
          onClose();
          return;
        }
      } else {
        // For creates, send all fields
        submitData = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim() || null,
          phone_number: formData.phone.trim() || null,
          phone: formData.phone.trim() || null, // For backward compatibility
          unit: formData.unit,
          move_in_date: formData.move_in_date,
          move_out_date: formData.move_out_date || null,
          emergency_contact: formData.emergency_contact.trim() || null
        };
      }
      
      // Debug info
      console.log("Submitting tenant data:", submitData);
      console.log("Operation type:", tenant ? "PATCH (update)" : "POST (create)");
      
      let result;
      if (tenant) {
        // Update existing tenant using PATCH
        result = await tenantsAPI.update(tenant.id, submitData);
      } else {
        // Create new tenant
        result = await tenantsAPI.create(submitData);
      }
      
      onSubmit(result.data);
      onClose();
    } catch (error) {
      console.error('Error submitting tenant:', error);
      
      if (error.response?.data) {
        // Handle validation errors from backend
        const backendErrors = error.response.data;
        const newErrors = {};
        
        Object.keys(backendErrors).forEach(field => {
          if (Array.isArray(backendErrors[field])) {
            newErrors[field] = backendErrors[field][0];
          } else {
            newErrors[field] = backendErrors[field];
          }
        });
        
        setErrors(newErrors);
        setSubmitError('Please fix the errors below and try again.');
      } else {
        setSubmitError('Failed to save tenant. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };
    return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
        <DialogTitle>
          {tenant ? 'Edit Tenant' : 'Add New Tenant'}
        </DialogTitle>
        
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Name Fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                value={formData.first_name}
                onChange={handleInputChange('first_name')}
                error={!!errors.first_name}
                helperText={errors.first_name}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                value={formData.last_name}
                onChange={handleInputChange('last_name')}
                error={!!errors.last_name}
                helperText={errors.last_name}
                fullWidth
                required
              />
            </Grid>
            
            {/* Contact Information */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                error={!!errors.phone}
                helperText={errors.phone}
                fullWidth
              />
            </Grid>
            
            {/* Unit Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.unit} required>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={formData.unit}
                  onChange={handleInputChange('unit')}
                  label="Unit"
                  disabled={unitsLoading}
                >
                  {unitsLoading ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Loading units...
                    </MenuItem>
                  ) : units.length === 0 ? (
                    <MenuItem disabled>
                      No available units found
                    </MenuItem>
                  ) : (
                    units.map(unit => (
                      <MenuItem key={unit.id} value={unit.id}>
                        Unit {unit.unit_number} - {unit.property_name || 'Unknown Property'}
                        {unit.monthly_rent && ` ($${unit.monthly_rent}/month)`}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {errors.unit && <FormHelperText>{errors.unit}</FormHelperText>}
              </FormControl>
            </Grid>
              {/* Dates */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Move-in Date"
                type="date"
                value={formData.move_in_date}
                onChange={handleDateChange('move_in_date')}
                error={!!errors.move_in_date}
                helperText={errors.move_in_date}
                fullWidth
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Move-out Date"
                type="date"
                value={formData.move_out_date}
                onChange={handleDateChange('move_out_date')}
                error={!!errors.move_out_date}
                helperText={errors.move_out_date}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            {/* Emergency Contact */}
            <Grid item xs={12}>
              <TextField
                label="Emergency Contact"
                value={formData.emergency_contact}
                onChange={handleInputChange('emergency_contact')}
                error={!!errors.emergency_contact}
                helperText={errors.emergency_contact}
                fullWidth
                placeholder="Name and phone number"
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading || unitsLoading}
          >
            {loading ? (
              <CircularProgress size={20} />
            ) : (
              tenant ? 'Update Tenant' : 'Add Tenant'
            )}
          </Button>        </DialogActions>
      </Dialog>
    );
  }

export default TenantForm;
