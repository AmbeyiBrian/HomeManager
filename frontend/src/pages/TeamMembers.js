import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Lock as LockIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { teamAPI, organizationsAPI } from '../services/api';

// Define available roles
const ROLES = [
  { 
    value: 'admin', 
    label: 'Administrator', 
    description: 'Full access to all features and settings' 
  },
  { 
    value: 'manager', 
    label: 'Property Manager', 
    description: 'Manage properties, tenants, and maintenance' 
  },
  { 
    value: 'accountant', 
    label: 'Finance Manager', 
    description: 'Handle payments and financial reporting' 
  },
  { 
    value: 'maintenance', 
    label: 'Maintenance Staff', 
    description: 'View and respond to maintenance tickets' 
  },
  { 
    value: 'caretaker', 
    label: 'Caretaker', 
    description: 'On-site property management' 
  },
  { 
    value: 'viewer', 
    label: 'Read-Only User', 
    description: 'View-only access to data' 
  }
];

const TeamMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);  // Organization ID is no longer needed as the backend auto-filters by user's organization
  const { currentUser } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to trigger rerenders

  // Function to refresh the team members data
  const refreshTeamMembers = () => {
    console.log('Manually refreshing team members data');
    setRefreshKey(prevKey => prevKey + 1);
  };

  // Helper function to check for common API problems
  const checkApiResponse = (response) => {
    // Check if we got a 403 forbidden response
    if (response?.status === 403) {
      setError('You don\'t have permission to view team members. Please contact your administrator.');
      return false;
    }
    
    // Check if we have an empty or invalid response
    if (!response || !response.data) {
      setError('No data received from the server. Please try refreshing the page.');
      return false;
    }
    
    return true;
  };
  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching team members via teamAPI...');
        const response = await teamAPI.getOrganizationMembers();
        console.log('teamAPI response:', response);
        // Handle array or paginated data
        const raw = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];
        const membersList = raw;
        const transformed = transformMemberData(membersList);
        setMembers(transformed);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Failed to load team members. Please try again.');
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  const handleOpenDialog = (member = null) => {
    if (member) {
      setSelectedMember(member);
      formik.setValues({
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        phone_number: member.phone_number || '',
        role: member.role,
        is_active: member.is_active
      });
    } else {
      setSelectedMember(null);
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMember(null);
    formik.resetForm();
  };

  const handleOpenDeleteDialog = (member) => {
    setSelectedMember(member);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedMember(null);
  };
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Invalid email format')
      .required('Email is required'),
    first_name: Yup.string()
      .required('First name is required'),
    last_name: Yup.string()
      .required('Last name is required'),    phone_number: Yup.string()
      .required('Phone number is required for SMS notifications')
      .matches(/^[0-9+\-\s]*$/, 'Invalid phone number format')
      .max(15, 'Phone number must be at most 15 characters'),
    role: Yup.string()
      .required('Role is required')
  });const formik = useFormik({
    initialValues: {
      email: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      role: 'viewer',
      is_active: true
    },    validationSchema,    onSubmit: async (values) => {
      try {        // Organization check no longer needed - backend will handle organization filtering
        
        setLoading(true);
          if (selectedMember) {
          // Update existing member - include user_id for profile updates
          await teamAPI.updateMember(selectedMember.id, {
            ...values,
            user_id: selectedMember.user_id
          });
        } else {
          // Create new member role
          console.log("Submitting team member form with values:", values);
          try {
            await teamAPI.addMember(values);
          } catch (err) {
            console.error("Error in addMember:", err);
            if (err.response) {
              setError(`Failed to add member: ${err.response.data?.detail || JSON.stringify(err.response.data)}`);
            } else {
              setError(`Failed to add member: ${err.message}`);
            }
            setLoading(false);
            return;
          }
        }
        
        // Refresh member list
        const response = await teamAPI.getOrganizationMembers();
        
        // Get the actual data array, handling both array and paginated responses
        const membersData = Array.isArray(response.data) 
          ? response.data 
          : response.data?.results || [];
        
        // Use the utility function to transform data consistently
        const transformedMembers = transformMemberData(membersData);
        
        setMembers(transformedMembers);
        setLoading(false);
        
        setSuccess(selectedMember ? 
          'Team member updated successfully!' : 
          'Team member added successfully! If this is a new user, they will receive an SMS with their login credentials.');
        
        handleCloseDialog();
      } catch (err) {
        console.error('Error saving team member:', err);
        setError('Failed to save team member. Please try again.');
        setLoading(false);
      }
    },
  });  const handleDeleteMember = async () => {
    try {
      await teamAPI.deleteMember(selectedMember.id, selectedMember.user_id);
      
      // Refresh member list after both operations complete
      const response = await teamAPI.getOrganizationMembers();
      
      // Get the actual data array, handling both array and paginated responses
      const membersData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.results || [];
      
      // Use the utility function to transform data consistently
      const transformedMembers = transformMemberData(membersData);
      
      setMembers(transformedMembers);
      
      setSuccess("Team member removed and account deactivated successfully");
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Error deleting team member:', err);
      setError('Failed to remove team member. Please try again.');
      handleCloseDeleteDialog();
    }
  };
  // Function to transform API response into consistent member objects
  const transformMemberData = (membersData) => {
    if (!membersData || membersData.length === 0) {
      console.log('No member data to transform');
      return [];
    }
    
    console.log('Raw API response data structure:', JSON.stringify(membersData[0]));

    const transformedMembers = membersData
      .map(data => {
        try {
          // Handle different API response formats
          // 1. Direct user objects from OrganizationUserViewSet
          if (data.username) {
            // This is a direct User object from OrganizationUserViewSet
            const user = data;
            
            // Try to extract role information from user_roles if available
            const roleInfo = user.user_roles && user.user_roles.length > 0 
              ? user.user_roles[0].role 
              : { name: 'Unknown' };
              
            const roleCode = roleInfo.name ? roleInfo.name.toLowerCase() : 'unknown';
            
            return {
              id: user.id, // Use user ID as fallback for role ID
              email: user.email || 'Unknown',
              first_name: user.first_name || '',
              last_name: user.last_name || '',
              phone_number: user.phone_number || '',
              role: roleCode,
              is_active: user.is_active !== undefined ? user.is_active : true,
              user_id: user.id
            };
          }
          
          // 2. Role-based response format (from previous implementation)
          // Extract user information from either user or user_details
          const user = data.user_details || data.user || {};
          
          // Extract role information from either role or role_details
          const roleInfo = data.role_details || data.role || {};
          
          // Get role code, handling different API response formats
          const roleCode = roleInfo.code || 
            (roleInfo.name ? roleInfo.name.toLowerCase() : 'unknown');
          
          // Skip invalid entries
          if (!user || !user.id) {
            console.error('Invalid user data in role:', data);
            return null;
          }
          
          return {
            id: data.id,
            email: user.email || 'Unknown',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            phone_number: user.phone_number || '',
            role: roleCode,
            is_active: data.is_active !== undefined ? data.is_active : true,
            user_id: user.id          };
        } catch (error) {
          console.error('Error transforming member data:', error, data);
          return null;
        }
      })
      .filter(member => member !== null); // Remove any null entries
      
    console.log(`Transformed ${membersData.length} API records into ${transformedMembers.length} member objects`);
    return transformedMembers;
  };

  // Get color for role chip based on role code
  const getRoleColor = (role) => {
    // Handle invalid or missing role values
    if (!role) {
      console.warn('Role is undefined or null in getRoleColor');
      return 'default';
    }
    
    try {
      switch (role.toLowerCase()) {
        case 'admin':
          return 'error';
        case 'manager':
          return 'primary';
        case 'accountant':
          return 'success';
        case 'maintenance':
          return 'warning';
        case 'caretaker':
          return 'info';
        case 'viewer':
          return 'default';
        default:
          console.log('Unknown role:', role);
          return 'default';
      }
    } catch (error) {
      console.error('Error in getRoleColor:', error);
      return 'default';
    }
  };

  // Add a sample member for testing purposes
  const addSampleMember = () => {    // Organization ID check no longer needed - backend handles this automatically
    
    const sampleMember = {
      id: 'sample-id-' + Date.now(),
      email: 'sample@example.com',
      first_name: 'Sample',
      last_name: 'User',
      phone_number: '+1234567890',
      role: 'viewer',
      is_active: true,
      user_id: 'sample-user-id'
    };
    
    setMembers(prevMembers => [...prevMembers, sampleMember]);
    setSuccess("Added a sample team member for testing display.");
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom component="h1">
          Team Members
        </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={refreshTeamMembers}
              disabled={loading}
            >
              Refresh Data
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={loading}
            >
              Add Team Member
            </Button>
          </Box>
      </Box>      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>{success}</Alert>}      <Paper sx={{ width: '100%', mb: 2 }}>        
        {/* Team Members content */}
        <Box sx={{ py: 2 }}>          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.length > 0 ? (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{`${member.first_name} ${member.last_name}`}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {member.role ? (
                          <Chip 
                            label={typeof member.role === 'string' ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Unknown'} 
                            color={getRoleColor(member.role)}
                            size="small"
                          />
                        ) : (
                          <Chip 
                            label="Unknown" 
                            color="default"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={member.is_active ? 'Active' : 'Inactive'}
                          color={member.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleOpenDialog(member)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton 
                            color="error"
                            onClick={() => handleOpenDeleteDialog(member)}
                            disabled={currentUser && currentUser.id === member.id} // Prevent deleting yourself
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Typography>No team members found. Add your first team member to get started.</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button 
                            variant="outlined" 
                            color="secondary" 
                            size="small"
                            onClick={addSampleMember}
                          >
                            Add Sample Member (Test)
                          </Button>
                          
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>      {/* Add/Edit Member Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {selectedMember ? 'Edit Team Member' : 'Add New Team Member'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>              {selectedMember 
                ? 'Update team member information and role.'
                : 'Add a new team member to your organization. If the email is not associated with an existing account, a new user account will be created, and the user will receive login details via SMS.'}
            </DialogContentText>
            
            <TextField
              autoFocus
              margin="dense"
              id="email"
              name="email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              disabled={selectedMember !== null} // Email can't be changed once set
              sx={{ mb: 2 }}
            />
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                margin="dense"
                id="first_name"
                name="first_name"
                label="First Name"
                type="text"
                fullWidth
                variant="outlined"
                value={formik.values.first_name}
                onChange={formik.handleChange}
                error={formik.touched.first_name && Boolean(formik.errors.first_name)}
                helperText={formik.touched.first_name && formik.errors.first_name}
              />
              
              <TextField
                margin="dense"
                id="last_name"
                name="last_name"
                label="Last Name"
                type="text"
                fullWidth
                variant="outlined"
                value={formik.values.last_name}
                onChange={formik.handleChange}
                error={formik.touched.last_name && Boolean(formik.errors.last_name)}
                helperText={formik.touched.last_name && formik.errors.last_name}
              />
            </Box>
            
            <TextField
              margin="dense"
              id="phone_number"
              name="phone_number"
              label="Phone Number"
              type="tel"
              fullWidth
              variant="outlined"
              value={formik.values.phone_number}
              onChange={formik.handleChange}
              error={formik.touched.phone_number && Boolean(formik.errors.phone_number)}
              helperText={formik.touched.phone_number && formik.errors.phone_number}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                id="role"
                name="role"
                value={formik.values.role}
                label="Role"
                onChange={formik.handleChange}
                error={formik.touched.role && Boolean(formik.errors.role)}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle2">{role.label}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {role.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedMember && (
              <FormControl fullWidth>
                <InputLabel id="status-select-label">Status</InputLabel>
                <Select
                  labelId="status-select-label"
                  id="is_active"
                  name="is_active"
                  value={formik.values.is_active}
                  label="Status"
                  onChange={(e) => formik.setFieldValue('is_active', e.target.value)}
                >
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              startIcon={selectedMember ? <EditIcon /> : <PersonAddIcon />}
            >
              {selectedMember ? 'Update' : 'Add Member'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove {selectedMember?.first_name} {selectedMember?.last_name} from your team?
            <br /><br />
            This will remove their role in the organization and deactivate their user account.
            They will no longer be able to log in to the system unless an administrator reactivates their account.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteMember} variant="contained" color="error" startIcon={<DeleteIcon />}>
            Remove & Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamMembers;
