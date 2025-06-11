import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TextField,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Email as EmailIcon } from '@mui/icons-material';
import { useRoles } from '../../context/RoleContext';
import { teamAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const UserRoleManagement = () => {
  const { roles, loading: rolesLoading } = useRoles();
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
        setLoading(true);
    setError(null);
    
    try {
      const response = await teamAPI.getOrganizationMembers();
      console.log('UserRoleManagement API Response:', response);
      
      const members = Array.isArray(response.data) ? response.data : response.data?.results || [];
      console.log('Members before transform:', members);
      
      // Transform the data if needed to match expected format
      const transformedMembers = members.map(role => {
        // Check for different response formats and handle accordingly
        const user = role.user || role.user_details || {};
        const roleInfo = role.role || role.role_details || {};
        
        return {
          id: user.id,
          user_id: user.id,
          email: user.email || 'Unknown',
          username: user.username || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          roles: [{ 
            id: role.id, 
            name: roleInfo.name || 'Unknown', 
            code: roleInfo.code || roleInfo.name?.toLowerCase() || 'unknown'
          }],
          is_active: role.is_active
        };
      });
      
      console.log('Transformed members:', transformedMembers);
      setUsers(transformedMembers);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAssignRole = (user) => {
    setSelectedUser(user);
    setSelectedRole('');
    setOpenAssignDialog(true);
  };
  const handleAssignRoleSubmit = async () => {
    if (!selectedUser || !selectedRole) return;
    
    setLoading(true);
    
    try {
      // Use teamAPI to assign role - the backend will handle the organization
      await teamAPI.addMember({
        email: selectedUser.email,
        first_name: selectedUser.first_name || '',
        last_name: selectedUser.last_name || '',
        phone_number: selectedUser.phone_number || '',
        role: selectedRole,
        is_active: true
      });
      
      await loadUsers();
      setOpenAssignDialog(false);
    } catch (err) {
      setError('Failed to assign role');
      console.error('Error assigning role:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleRemoveRole = async (user, roleId) => {
    setLoading(true);
    
    try {
      // Use teamAPI to remove role - the backend will handle the organization
      await teamAPI.deleteMember(roleId, user.id);
      await loadUsers();
    } catch (err) {
      setError('Failed to remove role');
      console.error('Error removing role:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInviteUser = () => {
    setInviteEmail('');
    setInviteRole('');
    setOpenInviteDialog(true);
  };
  const handleInviteSubmit = async () => {
    if (!inviteEmail || !inviteRole) return;
    
    setLoading(true);
    
    try {
      // Use teamAPI to invite user - the backend will handle the organization
      await teamAPI.addMember({
        email: inviteEmail,
        first_name: '', // These will need to be filled in by the user when they register
        last_name: '',
        phone_number: '',  // Required field, but will be properly validated by the form
        role: inviteRole,
        is_active: true
      });
      
      await loadUsers();
      setOpenInviteDialog(false);
    } catch (err) {
      setError('Failed to invite user');
      console.error('Error inviting user:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading || rolesLoading) {
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
          Team Members & Permissions
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<EmailIcon />}
          onClick={handleInviteUser}
        >
          Invite User
        </Button>
      </Box>
      
      {users.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography align="center" color="textSecondary" sx={{ py: 4 }}>
              No team members found. Invite users to collaborate on this organization.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.first_name} {user.last_name}
                    {user.is_primary_owner && (
                      <Chip
                        label="Owner"
                        color="secondary"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Box display="flex" flexWrap="wrap" gap={1}>                      {user.roles && user.roles.length > 0 ? user.roles.map((role) => (
                        <Chip
                          key={role.id}
                          label={role.name || 'Unknown Role'}
                          size="small"
                          onDelete={
                            !user.is_primary_owner
                              ? () => handleRemoveRole(user, role.id)
                              : undefined
                          }
                        />
                      )) : (
                        <Chip
                          label="No Role"
                          size="small"
                          color="default"
                        />
                      )}
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={() => handleAssignRole(user)}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {/* Additional actions if needed */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Assign Role Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)}>
        <DialogTitle>Assign Role</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Assign a role to {selectedUser?.first_name} {selectedUser?.last_name}
          </Typography>
          <FormControl fullWidth margin="normal">
            <InputLabel id="role-select-label">Role</InputLabel>
            <Select
              labelId="role-select-label"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              label="Role"
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAssignRoleSubmit}
            variant="contained"
            color="primary"
            disabled={!selectedRole}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Invite User Dialog */}
      <Dialog open={openInviteDialog} onClose={() => setOpenInviteDialog(false)}>
        <DialogTitle>Invite User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                margin="normal"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="invite-role-select-label">Role</InputLabel>
                <Select
                  labelId="invite-role-select-label"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  label="Role"
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInviteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleInviteSubmit}
            variant="contained"
            color="primary"
            disabled={!inviteEmail || !inviteRole}
          >
            Invite
          </Button>
        </DialogActions>
      </Dialog>
    </Box>  );
};

// No props needed anymore as the backend handles organization filtering automatically

export default UserRoleManagement;
