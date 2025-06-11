import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useRoles } from '../../context/RoleContext';
import EnhancedTable from '../EnhancedTable';
import RoleFormDialog from './RoleFormDialog';

const RolesList = () => {
  const { roles, loading, error, loadRoles } = useRoles();
  const [openForm, setOpenForm] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreateRole = () => {
    setEditRole(null);
    setOpenForm(true);
  };

  const handleEditRole = (role) => {
    setEditRole(role);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditRole(null);
  };

  const handleDeleteClick = (role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    // Delete role logic here
    setDeleteDialogOpen(false);
    setRoleToDelete(null);
    await loadRoles();
  };
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setRoleToDelete(null);
  };

  // Action handlers for Enhanced Table
  const handleRowAction = (action, role) => {
    switch (action) {
      case 'edit':
        handleEditRole(role);
        break;
      case 'delete':
        handleDeleteClick(role);
        break;
      default:
        break;
    }
  };

  // Table column configuration
  const columns = [
    {
      id: 'name',
      label: 'Name',
      minWidth: 150,
      searchable: true
    },
    {
      id: 'description',
      label: 'Description',
      minWidth: 200,
      searchable: true
    },
    {
      id: 'role_type',
      label: 'Type',
      minWidth: 100,
      format: (value) => (
        <Chip
          label={value === 'system' ? 'System' : 'Custom'}
          color={value === 'system' ? 'secondary' : 'primary'}
          variant={value === 'system' ? 'outlined' : 'filled'}
          size="small"
        />
      )
    },
    {
      id: 'permission_count',
      label: 'Permissions',
      minWidth: 120,
      format: (value) => `${value || 0} permissions`
    }
  ];

  // Action items for table
  const actionItems = [
    {
      label: 'Edit',
      icon: EditIcon,
      action: 'edit',
      condition: (row) => row.role_type !== 'system'
    },
    {
      label: 'Delete',
      icon: DeleteIcon,
      action: 'delete',
      color: 'error',
      condition: (row) => row.role_type !== 'system'
    }
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Role Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateRole}
        >
          Create Role
        </Button>
      </Box>      <EnhancedTable
        data={roles}
        columns={columns}
        title="Roles"
        loading={loading}
        onRowAction={handleRowAction}
        actionItems={actionItems}
        searchable={true}
        filterable={false}
        exportable={true}
        defaultSortColumn="name"
        defaultSortDirection="asc"
      />

      <RoleFormDialog
        open={openForm}
        handleClose={handleCloseForm}
        role={editRole}
      />

      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RolesList;
