import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Sms as SmsIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { tenantsAPI } from '../services/api';
import TenantForm from '../components/TenantForm';
import EnhancedTable from '../components/EnhancedTable';

function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedTenantForAction, setSelectedTenantForAction] = useState(null);
  
  // Load tenants
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await tenantsAPI.getAll();
        
        // Make sure tenants is always an array
        const data = Array.isArray(response.data) ? response.data : 
                    Array.isArray(response.data.results) ? response.data.results : [];
                    
        // Log detailed tenant data for debugging
        console.log('Tenants loaded:', data);
        
        // Examine tenant objects to understand structure
        if (data.length > 0) {
          console.log('First tenant structure:', JSON.stringify(data[0], null, 2));
          console.log('Unit field in first tenant:', data[0].unit);
          console.log('Unit details in first tenant:', data[0].unit_details);
        }
        
        setTenants(data);
      } catch (err) {
        console.error('Error fetching tenants:', err);
        setError('Failed to load tenants. Please try again later.');
        setTenants([]); // Ensure tenants is always an array even on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenants();
  }, []);
  
  const handleDeleteConfirm = async () => {
    if (!selectedTenantForAction) return;
    
    try {
      await tenantsAPI.delete(selectedTenantForAction.id);
      
      // Update the tenants list
      setTenants(tenants.filter(tenant => tenant.id !== selectedTenantForAction.id));
      
    } catch (err) {
      console.error('Error deleting tenant:', err);
      setError('Failed to delete tenant. Please try again.');
    } finally {
      setConfirmDeleteOpen(false);
      setSelectedTenantForAction(null);
    }
  };

  // Action handlers for Enhanced Table
  const handleRowAction = (action, tenant) => {
    setSelectedTenantForAction(tenant);
    
    // Add detailed logging for debugging
    console.log("Row action:", action);
    console.log("Tenant data:", tenant);
    console.log("Unit information:", {
      unit: tenant.unit,
      unit_id: tenant.unit_id,
      unit_details: tenant.unit_details
    });
    
    switch (action) {
      case 'edit':
        console.log("Editing tenant:", tenant);
        // Make sure we have all necessary data for editing
        setEditingTenant(tenant);
        setAddDialogOpen(true);
        break;
      case 'delete':
        setConfirmDeleteOpen(true);
        break;
      case 'email':
        if (tenant.email) {
          window.location.href = `mailto:${tenant.email}`;
        }
        break;
      case 'sms':
        if (tenant.phone_number) {
          // For SMS, we can use the tel: protocol with the sms prefix
          window.location.href = `sms:${tenant.phone_number}`;
        }
        break;
      default:
        break;
    }
  };

  const handleTenantFormSubmit = (tenantData) => {
    if (editingTenant) {
      // Update existing tenant
      setTenants(tenants.map(tenant => 
        tenant.id === editingTenant.id ? tenantData : tenant
      ));
    } else {
      // Add new tenant
      setTenants([...tenants, tenantData]);
    }
    setAddDialogOpen(false);
    setEditingTenant(null);
  };

  const handleAddTenant = () => {
    setEditingTenant(null);
    setAddDialogOpen(true);
  };
  
  // Table column configuration
  const columns = [
    {
      id: 'first_name',
      label: 'Name',
      minWidth: 170,
      searchable: true,
      format: (value, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'N/A'
    },
    {
      id: 'email',
      label: 'Email',
      minWidth: 200,
      searchable: true
    },
    {
      id: 'phone_number',
      label: 'Phone',
      minWidth: 130,
      searchable: true,
      format: (value, row) => value || row.phone || 'N/A'
    },
    {
      id: 'unit_details.unit_number',
      label: 'Unit',
      minWidth: 100,
      searchable: true,
      format: (value) => value || 'N/A'
    },
    {
      id: 'property_details.name',
      label: 'Property',
      minWidth: 150,
      searchable: true,
      format: (value, row) => {
        // Try multiple paths to get property name
        return value || 
               row.unit_details?.property_name || 
               row.property_details?.name || 
               'N/A';
      }
    },
    {
      id: 'move_in_date',
      label: 'Move In',
      minWidth: 120,
      format: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      id: 'move_out_date',
      label: 'Move Out',
      minWidth: 120,
      format: (value) => value ? new Date(value).toLocaleDateString() : 'Current'
    }
  ];
  
  // Action items for table
  const actionItems = [
    {
      label: 'Edit',
      icon: EditIcon,
      action: 'edit'
    },
    {
      label: 'Send Email',
      icon: EmailIcon,
      action: 'email'
    },
    {
      label: 'Send SMS',
      icon: SmsIcon,
      action: 'sms'
    },
    {
      label: 'Delete',
      icon: DeleteIcon,
      action: 'delete',
      color: 'error'
    }
  ];
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Tenant Management
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Tenants</Typography>
        </Breadcrumbs>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Header with Add Button */}
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: 2
      }}>
        <Typography variant="h6" color="text.secondary">
          Manage your tenants and their information
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTenant}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Add Tenant
        </Button>
      </Box>
      
      <EnhancedTable
        data={tenants}
        columns={columns}
        title="Tenants"
        loading={loading}
        onRowAction={handleRowAction}
        actionItems={actionItems}
        searchable={true}
        filterable={true}
        exportable={true}
        defaultSortColumn="first_name"
      />

      {/* Confirm Delete Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete tenant {selectedTenantForAction ? 
            `${selectedTenantForAction.first_name || ''} ${selectedTenantForAction.last_name || ''}`.trim() : 
            ''}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tenant Form Dialog */}
      <TenantForm
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setEditingTenant(null);
        }}
        onSubmit={handleTenantFormSubmit}
        tenant={editingTenant}
      />
    </Container>
  );
}

export default TenantList;