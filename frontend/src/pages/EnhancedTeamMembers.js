import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
  Stack,
  Fab,
  Badge,
  LinearProgress,
  CardActions,
  Divider,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  CircularProgress,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  People as TeamIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  AdminPanelSettings as AdminIcon,
  Business as ManagerIcon,
  Support as SupportIcon,
  Visibility as ViewerIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  MoreVert as MoreIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Send as InviteIcon,
  FilterList as FilterIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Refresh as RefreshIcon,
  Download as ExportIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Schedule as PendingIcon,
  Group as GroupIcon,
  SupervisorAccount as SupervisorIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { rolesAPI } from '../services/roleApi';

function EnhancedTeamMembers() {
  const navigate = useNavigate();
  const { currentUser, currentOrganization } = useAuth();
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
    // Reference data
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // UI states
  const [viewMode, setViewMode] = useState('cards');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMemberForMenu, setSelectedMemberForMenu] = useState(null);
  
  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: '',
    first_name: '',
    last_name: '',
    department: '',
    send_email: true
  });
  
  // Statistics
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingInvitations: 0,
    adminCount: 0,
    managerCount: 0,
    userCount: 0,
    recentJoins: 0,
    departmentCount: 0
  });

  // Load all data
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        membersResponse,
        rolesResponse
      ] = await Promise.all([
        teamAPI.getOrganizationMembers(),
        rolesAPI.getAllRoles(currentOrganization?.id).catch(() => ({ data: [] }))
      ]);

      const membersData = Array.isArray(membersResponse.data) 
        ? membersResponse.data 
        : membersResponse.data?.results || [];
      
      const rolesData = Array.isArray(rolesResponse.data) 
        ? rolesResponse.data 
        : rolesResponse.data?.results || [];

      // Extract departments from members
      const uniqueDepartments = [...new Set(
        membersData
          .map(member => member.department)
          .filter(Boolean)
      )];

      setMembers(membersData);
      setRoles(rolesData);
      setDepartments(uniqueDepartments);
      
      // Calculate statistics
      calculateStats(membersData);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load team data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (membersData) => {
    const totalMembers = membersData.length;
    const activeMembers = membersData.filter(m => m.is_active).length;
    const pendingInvitations = membersData.filter(m => m.status === 'pending').length;
    const adminCount = membersData.filter(m => m.role === 'admin' || m.role === 'owner').length;
    const managerCount = membersData.filter(m => m.role === 'manager').length;
    const userCount = membersData.filter(m => m.role === 'user' || m.role === 'staff').length;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentJoins = membersData.filter(m => 
      new Date(m.date_joined) > oneWeekAgo
    ).length;

    const uniqueDepartments = [...new Set(
      membersData.map(m => m.department).filter(Boolean)
    )].length;

    setStats({
      totalMembers,
      activeMembers,
      pendingInvitations,
      adminCount,
      managerCount,
      userCount,
      recentJoins,
      departmentCount: uniqueDepartments
    });
  };

  // Apply filters
  useEffect(() => {
    let filtered = members;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower) ||
        member.role?.toLowerCase().includes(searchLower) ||
        member.department?.toLowerCase().includes(searchLower)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(member => member.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(member => !member.is_active);
      } else {
        filtered = filtered.filter(member => member.status === statusFilter);
      }
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(member => member.department === departmentFilter);
    }

    setFilteredMembers(filtered);
  }, [members, searchTerm, roleFilter, statusFilter, departmentFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleInviteMember = async () => {
    try {
      await teamAPI.inviteMember(inviteForm);
      setInviteDialogOpen(false);
      setInviteForm({
        email: '',
        role: '',
        first_name: '',
        last_name: '',
        department: '',
        send_email: true
      });
      await fetchData();
    } catch (err) {
      console.error('Error inviting member:', err);
      setError('Failed to invite member. Please try again.');
    }
  };

  const handleDeleteClick = (member) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;
    
    try {
      await teamAPI.removeMember(memberToDelete.id);
      setMembers(members.filter(m => m.id !== memberToDelete.id));
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member. Please try again.');
    }
  };

  const handleToggleStatus = async (member) => {
    try {
      await teamAPI.updateMember(member.id, { is_active: !member.is_active });
      await fetchData();
    } catch (err) {
      console.error('Error updating member status:', err);
      setError('Failed to update member status. Please try again.');
    }
  };

  const handleEditMember = (member) => {
    setMemberToEdit(member);
    setEditDialogOpen(true);
  };

  const handleUpdateMember = async (updatedData) => {
    try {
      await teamAPI.updateMember(memberToEdit.id, updatedData);
      setEditDialogOpen(false);
      setMemberToEdit(null);
      await fetchData();
    } catch (err) {
      console.error('Error updating member:', err);
      setError('Failed to update member. Please try again.');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
      case 'owner': return <AdminIcon />;
      case 'manager': return <ManagerIcon />;
      case 'support': return <SupportIcon />;
      default: return <PersonIcon />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
      case 'owner': return 'error';
      case 'manager': return 'warning';
      case 'support': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (member) => {
    if (member.status === 'pending') return <PendingIcon color="warning" />;
    if (member.is_active) return <ActiveIcon color="success" />;
    return <InactiveIcon color="error" />;
  };

  const getStatusColor = (member) => {
    if (member.status === 'pending') return 'warning';
    if (member.is_active) return 'success';
    return 'error';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <TeamIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{stats.totalMembers}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Members
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <ActiveIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{stats.activeMembers}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Members
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <PendingIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{stats.pendingInvitations}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Invites
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                <AdminIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{stats.adminCount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Administrators
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select
              value={roleFilter}
              label="Role"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="support">Support</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Department</InputLabel>
            <Select
              value={departmentFilter}
              label="Department"
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <MenuItem value="all">All Departments</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
              color="primary"
            >
              {viewMode === 'cards' ? <ViewListIcon /> : <ViewModuleIcon />}
            </IconButton>
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
            <IconButton color="primary">
              <ExportIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderMemberCards = () => (
    <Grid container spacing={2}>
      {filteredMembers.map((member) => (
        <Grid item xs={12} sm={6} md={4} key={member.id}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: getRoleColor(member.role) + '.main' }}>
                  {getRoleIcon(member.role)}
                </Avatar>
              }
              action={
                <Box>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      setAnchorEl(e.currentTarget);
                      setSelectedMemberForMenu(member);
                    }}
                  >
                    <MoreIcon />
                  </IconButton>
                </Box>
              }
              title={
                <Typography variant="h6">
                  {`${member.first_name} ${member.last_name}`}
                </Typography>
              }
              subheader={
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    label={member.role}
                    color={getRoleColor(member.role)}
                    size="small"
                  />
                  <Chip
                    icon={getStatusIcon(member)}
                    label={member.status === 'pending' ? 'Pending' : (member.is_active ? 'Active' : 'Inactive')}
                    color={getStatusColor(member)}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              }
            />
            
            <CardContent>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2" noWrap>
                    {member.email}
                  </Typography>
                </Box>
                
                {member.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {member.phone}
                    </Typography>
                  </Box>
                )}
                  {member.department && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ManagerIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {member.department}
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BadgeIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    Joined {formatDate(member.date_joined)}
                  </Typography>
                </Box>
                
                {member.last_login && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Last login {formatDate(member.last_login)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
            
            <CardActions>
              <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditMember(member)}>
                Edit
              </Button>
              <Button 
                size="small" 
                startIcon={member.is_active ? <LockIcon /> : <UnlockIcon />}
                onClick={() => handleToggleStatus(member)}
              >
                {member.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderMemberTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Member</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Joined</TableCell>
            <TableCell>Last Login</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: getRoleColor(member.role) + '.main' }}>
                    {getRoleIcon(member.role)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {`${member.first_name} ${member.last_name}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {member.email}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={member.role}
                  color={getRoleColor(member.role)}
                  size="small"
                />
              </TableCell>
              <TableCell>{member.department || 'N/A'}</TableCell>
              <TableCell>
                <Chip
                  icon={getStatusIcon(member)}
                  label={member.status === 'pending' ? 'Pending' : (member.is_active ? 'Active' : 'Inactive')}
                  color={getStatusColor(member)}
                  size="small"
                />
              </TableCell>
              <TableCell>{formatDate(member.date_joined)}</TableCell>
              <TableCell>{formatDate(member.last_login)}</TableCell>
              <TableCell>
                <IconButton size="small" onClick={() => handleEditMember(member)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => handleToggleStatus(member)}>
                  {member.is_active ? <LockIcon /> : <UnlockIcon />}
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteClick(member)}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Team Members</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Team Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite Member
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {renderStatsCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Results Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredMembers.length} of {members.length} team members
        {searchTerm && ` matching "${searchTerm}"`}
      </Typography>

      {/* Member List */}
      {viewMode === 'cards' ? renderMemberCards() : renderMemberTable()}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="invite member"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setInviteDialogOpen(true)}
      >
        <PersonAddIcon />
      </Fab>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          handleEditMember(selectedMemberForMenu);
          setAnchorEl(null);
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit Member
        </MenuItem>
        <MenuItem onClick={() => {
          handleToggleStatus(selectedMemberForMenu);
          setAnchorEl(null);
        }}>
          {selectedMemberForMenu?.is_active ? <LockIcon sx={{ mr: 1 }} /> : <UnlockIcon sx={{ mr: 1 }} />}
          {selectedMemberForMenu?.is_active ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem onClick={() => {
          handleDeleteClick(selectedMemberForMenu);
          setAnchorEl(null);
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Remove Member
        </MenuItem>
      </Menu>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite New Team Member</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={inviteForm.first_name}
                onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={inviteForm.last_name}
                onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={inviteForm.role}
                  label="Role"
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                >
                  <MenuItem value="admin">Administrator</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="support">Support</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                value={inviteForm.department}
                onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={inviteForm.send_email}
                    onChange={(e) => setInviteForm({ ...inviteForm, send_email: e.target.checked })}
                  />
                }
                label="Send invitation email"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleInviteMember} variant="contained">
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this team member? This action cannot be undone.
          </Typography>
          {memberToDelete && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Member: {`${memberToDelete.first_name} ${memberToDelete.last_name}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email: {memberToDelete.email}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default EnhancedTeamMembers;
