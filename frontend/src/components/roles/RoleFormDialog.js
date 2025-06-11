import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormHelperText,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useRoles } from '../../context/RoleContext';

const RoleFormDialog = ({ open, handleClose, role }) => {
  const { createRole, updateRole, permissions, contentTypes, loading } = useRoles();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: [],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [permissionsByType, setPermissionsByType] = useState({});

  const isEditing = !!role;

  // Initialize form with role data if editing
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        permission_ids: role.permissions?.map(p => p.id) || [],
      });
    } else {
      // Reset form for new role
      setFormData({
        name: '',
        description: '',
        permission_ids: [],
      });
    }
    setErrors({});
  }, [role, open]);

  // Group permissions by content type
  useEffect(() => {
    const groupedPermissions = {};
    permissions.forEach(permission => {
      const contentTypeName = permission.content_type.model;
      if (!groupedPermissions[contentTypeName]) {
        groupedPermissions[contentTypeName] = [];
      }
      groupedPermissions[contentTypeName].push(permission);
    });
    setPermissionsByType(groupedPermissions);
  }, [permissions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user changes input
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePermissionChange = (e) => {
    setFormData(prev => ({ ...prev, permission_ids: e.target.value }));
    if (errors.permission_ids) {
      setErrors(prev => ({ ...prev, permission_ids: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (isEditing) {
        await updateRole(role.id, {
          name: formData.name,
          description: formData.description,
          permission_ids: formData.permission_ids,
        });
      } else {
        await createRole({
          name: formData.name,
          description: formData.description,
          permission_ids: formData.permission_ids,
        });
      }
      
      handleClose();
    } catch (error) {
      console.error('Error saving role:', error);
      setErrors(prev => ({ 
        ...prev, 
        submit: error.response?.data?.detail || 'Failed to save role' 
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const getPermissionLabel = (permission) => {
    const operation = permission.operation.charAt(0).toUpperCase() + permission.operation.slice(1);
    const model = permission.content_type.model;
    return `${operation} ${model}`;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Role' : 'Create Role'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Role Name"
            name="name"
            fullWidth
            required
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            margin="normal"
          />
          
          <TextField
            label="Description"
            name="description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={handleChange}
            margin="normal"
          />
          
          <FormControl fullWidth margin="normal" error={!!errors.permission_ids}>
            <InputLabel id="permissions-select-label">Permissions</InputLabel>
            <Select
              labelId="permissions-select-label"
              id="permissions-select"
              multiple
              value={formData.permission_ids}
              onChange={handlePermissionChange}
              input={<OutlinedInput label="Permissions" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map(id => {
                    const permission = permissions.find(p => p.id === id);
                    return (
                      <Chip
                        key={id}
                        label={permission ? getPermissionLabel(permission) : id}
                        size="small"
                      />
                    );
                  })}
                </Box>
              )}
            >
              {Object.keys(permissionsByType).sort().map(contentType => [
                <MenuItem key={`header-${contentType}`} disabled divider>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                    {contentType.toUpperCase()}
                  </Typography>
                </MenuItem>,
                ...permissionsByType[contentType].map(permission => (
                  <MenuItem key={permission.id} value={permission.id}>
                    {getPermissionLabel(permission)}
                  </MenuItem>
                ))
              ])}
              
              {permissions.length === 0 && (
                <MenuItem disabled>No permissions available</MenuItem>
              )}
            </Select>
            {errors.permission_ids && (
              <FormHelperText>{errors.permission_ids}</FormHelperText>
            )}
          </FormControl>
          
          {errors.submit && (
            <Box sx={{ mt: 2 }}>
              <Typography color="error">{errors.submit}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary" 
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={20} /> : null}
        >
          {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleFormDialog;
