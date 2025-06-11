import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Checkbox,
  FormGroup,
  IconButton,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  VpnKey as KeyIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { roleAPI, usersAPI, organizationsAPI } from '../services/api';

// Helper function to convert role details to permissions array
const getRolePermissions = (roleDetails) => {
  if (!roleDetails) return [];
  
  const permissions = [];
  
  // Map backend permission booleans to permission strings
  if (roleDetails.can_manage_users) permissions.push('manage_users');
  if (roleDetails.can_manage_billing) permissions.push('manage_payments');
  if (roleDetails.can_manage_properties) permissions.push('manage_properties');
  if (roleDetails.can_manage_tenants) permissions.push('manage_tenants');
  if (roleDetails.can_view_reports) permissions.push('view_analytics');
  
  // Add additional permissions based on role type
  if (roleDetails.role_type === 'owner' || roleDetails.role_type === 'admin') {
    permissions.push('manage_roles');
    permissions.push('system_settings');
  }
  
  if (roleDetails.role_type !== 'guest') {
    permissions.push('view_dashboard');
    permissions.push('manage_tickets');
    permissions.push('manage_notices');
  }
  
  return permissions;
};

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`role-tabpanel-${index}`}
      aria-labelledby={`role-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Statistics Card Component
const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="h2" color={`${color}.main`}>
            {value}
          </Typography>
          {subtitle && (
            <Typography color="textSecondary" variant="body2">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const EnhancedRoleManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState({
    totalRoles: 0,
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0
  });
  
  // Dialog states
  const [roleDialog, setRoleDialog] = useState(false);
  const [userRoleDialog, setUserRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: []
  });
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);
  
  // Notification states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Available permissions
  const availablePermissions = [
    'view_dashboard',
    'manage_properties',
    'manage_tenants',
    'manage_tickets',
    'manage_payments',
    'manage_notices',
    'manage_users',
    'manage_roles',
    'view_analytics',
    'system_settings'
  ];
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesResponse, usersResponse, membershipsResponse] = await Promise.all([
        roleAPI.getRoles(),
        usersAPI.getAll(),
        roleAPI.getMemberships()
      ]);      const rolesData = rolesResponse.data || [];
      const usersData = usersResponse.data || [];
      const membershipsData = membershipsResponse.data || [];

      setRoles(rolesData);
      
      // Enhance users with their roles from memberships
      const enhancedUsers = usersData.map(user => {
        const userMemberships = membershipsData.filter(m => m.user === user.id);
        return {
          ...user,
          roles: userMemberships.map(m => ({
            id: m.role,
            name: m.role_details?.name || 'Unknown',
            membershipId: m.id,
            // Add other role details as needed
            permissions: getRolePermissions(m.role_details)
          }))
        };
      });
      
      setUsers(enhancedUsers);

      // Calculate statistics
      setStatistics({
        totalRoles: rolesData.length,
        totalUsers: enhancedUsers.length,
        activeUsers: enhancedUsers.filter(user => user.is_active).length,
        adminUsers: enhancedUsers.filter(user => 
          user.roles && user.roles.some(role => role.name === 'admin')
        ).length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading role management data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  const handleCreateRole = async () => {
    try {
      // Convert permissions array to role details format expected by the backend
      const roleData = {
        name: roleForm.name,
        description: roleForm.description || '',
        // Generate a slug from the name
        slug: roleForm.name.toLowerCase().replace(/\s+/g, '-'),
        // Default to 'member' role type, can be adjusted as needed
        role_type: 'member',
        // Map permissions to backend boolean fields
        can_manage_users: roleForm.permissions.includes('manage_users'),
        can_manage_billing: roleForm.permissions.includes('manage_payments'),
        can_manage_properties: roleForm.permissions.includes('manage_properties'),
        can_manage_tenants: roleForm.permissions.includes('manage_tenants'),
        can_view_reports: roleForm.permissions.includes('view_analytics')
      };

      const response = await roleAPI.createRole(roleData);
      setRoles([...roles, response.data]);
      setRoleDialog(false);
      setRoleForm({ name: '', description: '', permissions: [] });
      setSnackbar({
        open: true,
        message: 'Role created successfully',
        severity: 'success'
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error creating role:', error);
      setSnackbar({
        open: true,
        message: 'Error creating role',
        severity: 'error'
      });
    }
  };

  const handleUpdateRole = async () => {
    try {
      // Convert permissions array to role details format expected by the backend
      const roleData = {
        name: roleForm.name,
        description: roleForm.description || '',
        // Generate a slug from the name if it changed
        slug: selectedRole.name !== roleForm.name 
          ? roleForm.name.toLowerCase().replace(/\s+/g, '-') 
          : undefined, // Don't update slug if name didn't change
        // Map permissions to backend boolean fields
        can_manage_users: roleForm.permissions.includes('manage_users'),
        can_manage_billing: roleForm.permissions.includes('manage_payments'),
        can_manage_properties: roleForm.permissions.includes('manage_properties'),
        can_manage_tenants: roleForm.permissions.includes('manage_tenants'),
        can_view_reports: roleForm.permissions.includes('view_analytics')
      };

      const response = await roleAPI.updateRole(selectedRole.id, roleData);
      setRoles(roles.map(role => 
        role.id === selectedRole.id ? response.data : role
      ));
      setRoleDialog(false);
      setSelectedRole(null);
      setRoleForm({ name: '', description: '', permissions: [] });
      setSnackbar({
        open: true,
        message: 'Role updated successfully',
        severity: 'success'
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating role:', error);
      setSnackbar({
        open: true,
        message: 'Error updating role',
        severity: 'error'
      });
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await roleAPI.deleteRole(roleId);
      setRoles(roles.filter(role => role.id !== roleId));
      setSnackbar({
        open: true,
        message: 'Role deleted successfully',
        severity: 'success'
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting role:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting role',
        severity: 'error'
      });
    }
  };  const handleAssignRole = async (userId, roleId) => {
    try {
      // Check if the user already has a membership with any role
      const existingMembership = users.find(u => u.id === userId)?.roles?.find(r => r.membershipId);
      
      if (existingMembership) {
        // Update existing membership
        await roleAPI.updateMembership(existingMembership.membershipId, {
          role: roleId
        });
      } else {
        // Create new membership
        // First get the user's organization
        const currentOrg = localStorage.getItem('currentOrganization');
        let organizationId = null;
        
        if (currentOrg) {
          organizationId = JSON.parse(currentOrg).id;
        } else {
          // If not explicitly set, try to get from the first user's organization
          const firstUser = users.find(u => u.organization);
          if (firstUser) {
            organizationId = firstUser.organization;
          }
        }
        
        if (!organizationId) {
          throw new Error("Organization ID not found. Cannot assign role.");
        }
        
        await roleAPI.assignRole(userId, roleId);
      }
      
      setSnackbar({
        open: true,
        message: 'Role assigned successfully',
        severity: 'success'
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error assigning role:', error);
      setSnackbar({
        open: true,
        message: 'Error assigning role: ' + (error.message || 'Unknown error'),
        severity: 'error'
      });
    }
  };

  const handleMenuOpen = (event, target) => {
    setAnchorEl(event.currentTarget);
    setMenuTarget(target);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTarget(null);
  };
  const openRoleDialog = (role = null) => {
    if (role) {
      setSelectedRole(role);
      // Extract permissions from backend role format
      const permissions = getRolePermissions(role);
      
      setRoleForm({
        name: role.name || '',
        description: role.description || '',
        permissions: permissions
      });
    } else {
      setSelectedRole(null);
      setRoleForm({ name: '', description: '', permissions: [] });
    }
    setRoleDialog(true);
  };

  const getRoleColor = (roleName) => {
    const colors = {
      'admin': 'error',
      'manager': 'warning',
      'agent': 'info',
      'user': 'default'
    };
    return colors[roleName.toLowerCase()] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Enhanced Role & User Management
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Comprehensive role management, user assignments, and permissions control
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Roles"
            value={statistics.totalRoles}
            icon={<SecurityIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={statistics.totalUsers}
            icon={<PeopleIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={statistics.activeUsers}
            icon={<PersonIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Admin Users"
            value={statistics.adminUsers}
            icon={<AdminIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2, pt: 2 }}>
            <Tab icon={<GroupIcon />} label="User Role Assignments" iconPosition="start" />
            <Tab icon={<KeyIcon />} label="Role Definitions" iconPosition="start" />
            <Tab icon={<SettingsIcon />} label="Permissions Matrix" iconPosition="start" />
          </Tabs>
        </Box>

        {/* User Role Assignments Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">User Role Assignments</Typography>
            <Button
              variant="contained"
              startIcon={<AssignmentIcon />}
              onClick={() => setUserRoleDialog(true)}
            >
              Assign Role
            </Button>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2 }}>
                          {user.first_name?.[0] || user.email?.[0] || 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {user.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {user.roles?.map((role) => (
                          <Chip
                            key={role.id}
                            label={role.name}
                            size="small"
                            color={getRoleColor(role.name)}
                          />
                        )) || <Typography variant="body2" color="textSecondary">No roles</Typography>}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, { type: 'user', data: user })}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Role Definitions Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Role Definitions</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openRoleDialog()}
            >
              Create Role
            </Button>
          </Box>

          <Grid container spacing={3}>
            {roles.map((role) => (
              <Grid item xs={12} md={6} lg={4} key={role.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {role.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {role.description || 'No description'}
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, { type: 'role', data: role })}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Permissions ({role.permissions?.length || 0})
                    </Typography>                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {(() => {
                        const rolePermissions = getRolePermissions(role);
                        return (
                          <>
                            {rolePermissions.slice(0, 3).map((permission) => (
                              <Chip
                                key={permission}
                                label={permission.replace('_', ' ')}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {rolePermissions.length > 3 && (
                              <Chip
                                label={`+${rolePermissions.length - 3} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </>
                        );
                      })()}
                    </Box>
                    
                    <Box mt={2}>
                      <Typography variant="caption" color="textSecondary">
                        Users with this role: {users.filter(user => 
                          user.roles?.some(userRole => userRole.id === role.id)
                        ).length}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Permissions Matrix Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Permissions Matrix
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Overview of permissions assigned to each role
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Permission</TableCell>
                  {roles.map((role) => (
                    <TableCell key={role.id} align="center">
                      {role.name}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>                {availablePermissions.map((permission) => (
                  <TableRow key={permission}>
                    <TableCell>
                      <Typography variant="body2">
                        {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                    </TableCell>
                    {roles.map((role) => {
                      // Get permissions for this role
                      const rolePermissions = getRolePermissions(role);
                      
                      return (
                        <TableCell key={role.id} align="center">
                          {rolePermissions.includes(permission) ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <CancelIcon color="disabled" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Role Dialog */}
      <Dialog open={roleDialog} onClose={() => setRoleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedRole ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Role Name"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              sx={{ mb: 3 }}
            />
            
            <Typography variant="subtitle1" gutterBottom>
              Permissions
            </Typography>
            <FormGroup>
              <Grid container spacing={1}>
                {availablePermissions.map((permission) => (
                  <Grid item xs={12} sm={6} key={permission}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={roleForm.permissions.includes(permission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoleForm({
                                ...roleForm,
                                permissions: [...roleForm.permissions, permission]
                              });
                            } else {
                              setRoleForm({
                                ...roleForm,
                                permissions: roleForm.permissions.filter(p => p !== permission)
                              });
                            }
                          }}
                        />
                      }
                      label={permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog(false)}>Cancel</Button>
          <Button
            onClick={selectedRole ? handleUpdateRole : handleCreateRole}
            variant="contained"
          >
            {selectedRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {menuTarget?.type === 'role' && [
          <MenuItemComponent key="edit" onClick={() => {
            openRoleDialog(menuTarget.data);
            handleMenuClose();
          }}>
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText>Edit Role</ListItemText>
          </MenuItemComponent>,
          <MenuItemComponent key="delete" onClick={() => {
            handleDeleteRole(menuTarget.data.id);
            handleMenuClose();
          }}>
            <ListItemIcon><DeleteIcon /></ListItemIcon>
            <ListItemText>Delete Role</ListItemText>
          </MenuItemComponent>
        ]}
        {menuTarget?.type === 'user' && [
          <MenuItemComponent key="assign" onClick={() => {
            setSelectedUser(menuTarget.data);
            setUserRoleDialog(true);
            handleMenuClose();
          }}>
            <ListItemIcon><AssignmentIcon /></ListItemIcon>
            <ListItemText>Assign Role</ListItemText>
          </MenuItemComponent>
        ]}
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* User Role Assignment Dialog */}
      <Dialog open={userRoleDialog} onClose={() => setUserRoleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Role to User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {selectedUser && (
              <Typography variant="subtitle1" gutterBottom>
                Assign a role to {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})
              </Typography>
            )}
              <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="assign-role-label">Role</InputLabel>
              <Select
                labelId="assign-role-label"
                value={selectedRole ? selectedRole.id : ''}
                onChange={(e) => {
                  const roleId = e.target.value;
                  const role = roles.find(r => r.id === roleId);
                  setSelectedRole(role);
                }}
                label="Role"
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserRoleDialog(false)}>Cancel</Button>
          <Button 
            variant="contained"
            disabled={!selectedUser || !selectedRole}
            onClick={() => {
              handleAssignRole(selectedUser.id, selectedRole.id);
              setUserRoleDialog(false);
            }}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EnhancedRoleManagement;
