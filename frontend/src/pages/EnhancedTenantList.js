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
  DialogTitle,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Fab,
  Paper,
  Divider,
  ListItem,
  ListItemAvatar,
  ListItemText,
  List,
  CardActions,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  Money as MoneyIcon,
  Build as MaintenanceIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Refresh as RefreshIcon,
  Assignment as LeaseIcon,
  CheckCircle as ActiveIcon,
  Schedule as PendingIcon,
  Cancel as InactiveIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { tenantsAPI, leasesAPI, paymentsAPI, maintenanceAPI, propertiesAPI, unitsAPI } from '../services/api';
import TenantForm from '../components/TenantForm';
import EnhancedTable from '../components/EnhancedTable';

function EnhancedTenantList() {
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedTenantForAction, setSelectedTenantForAction] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  
  // Additional state for statistics
  const [tenantStats, setTenantStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    averageStay: 0,
    totalOccupancy: 0
  });
  const [properties, setProperties] = useState([]);

  // Load tenants and related data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter tenants based on search and filters
  useEffect(() => {
    filterTenants();
  }, [tenants, searchQuery, statusFilter, propertyFilter]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch tenants and properties in parallel
      const [tenantsResponse, propertiesResponse] = await Promise.all([
        tenantsAPI.getAll(),
        propertiesAPI.getAll()
      ]);
      
      const tenantsData = Array.isArray(tenantsResponse.data) ? tenantsResponse.data : 
                         Array.isArray(tenantsResponse.data.results) ? tenantsResponse.data.results : [];
      
      const propertiesData = Array.isArray(propertiesResponse.data) ? propertiesResponse.data : 
                            Array.isArray(propertiesResponse.data.results) ? propertiesResponse.data.results : [];
      
      // Enhanced tenant data with additional API calls
      const enhancedTenants = await Promise.all(
        tenantsData.map(async (tenant) => {
          try {
            // Get lease information
            const leasesResponse = await leasesAPI.getByTenant(tenant.id);
            const leases = Array.isArray(leasesResponse.data) ? leasesResponse.data : 
                          Array.isArray(leasesResponse.data.results) ? leasesResponse.data.results : [];
            
            // Get payment information
            const paymentsResponse = await paymentsAPI.getAllPayments();
            const allPayments = Array.isArray(paymentsResponse.data) ? paymentsResponse.data : 
                               Array.isArray(paymentsResponse.data.results) ? paymentsResponse.data.results : [];
            const tenantPayments = allPayments.filter(payment => 
              payment.tenant === tenant.id || payment.tenant_id === tenant.id
            );
            
            // Get maintenance tickets
            const ticketsResponse = await maintenanceAPI.getAllTickets();
            const allTickets = Array.isArray(ticketsResponse.data) ? ticketsResponse.data : 
                              Array.isArray(ticketsResponse.data.results) ? ticketsResponse.data.results : [];
            const tenantTickets = allTickets.filter(ticket => 
              ticket.tenant === tenant.id || ticket.tenant_id === tenant.id ||
              (tenant.unit && (ticket.unit === tenant.unit || ticket.unit_id === tenant.unit))
            );
            
            // Calculate statistics
            const activeLease = leases.find(lease => 
              !lease.end_date || new Date(lease.end_date) > new Date()
            );
            
            const pendingPayments = tenantPayments.filter(payment => 
              payment.status === 'pending' || payment.status === 'overdue'
            );
            
            const openTickets = tenantTickets.filter(ticket => 
              ['new', 'assigned', 'in_progress'].includes(ticket.status)
            );
            
            return {
              ...tenant,
              leases,
              activeLease,
              payments: tenantPayments,
              pendingPayments,
              tickets: tenantTickets,
              openTickets,
              status: activeLease ? 'active' : (leases.length > 0 ? 'inactive' : 'pending'),
              occupancyDays: activeLease ? 
                Math.floor((new Date() - new Date(activeLease.start_date)) / (1000 * 60 * 60 * 24)) : 0
            };
          } catch (error) {
            console.error(`Error enhancing tenant ${tenant.id}:`, error);
            return {
              ...tenant,
              leases: [],
              payments: [],
              tickets: [],
              pendingPayments: [],
              openTickets: [],
              status: 'unknown',
              occupancyDays: 0
            };
          }
        })
      );
      
      setTenants(enhancedTenants);
      setProperties(propertiesData);
      
      // Calculate statistics
      calculateTenantStats(enhancedTenants);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load tenant data. Please try again later.');
      setTenants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateTenantStats = (tenantsData) => {
    const stats = {
      total: tenantsData.length,
      active: tenantsData.filter(t => t.status === 'active').length,
      pending: tenantsData.filter(t => t.status === 'pending').length,
      inactive: tenantsData.filter(t => t.status === 'inactive').length,
      averageStay: 0,
      totalOccupancy: 0
    };
    
    const activeTenants = tenantsData.filter(t => t.status === 'active');
    if (activeTenants.length > 0) {
      stats.averageStay = Math.round(
        activeTenants.reduce((sum, tenant) => sum + tenant.occupancyDays, 0) / activeTenants.length
      );
      stats.totalOccupancy = Math.round((stats.active / stats.total) * 100);
    }
    
    setTenantStats(stats);
  };

  const filterTenants = () => {
    let filtered = [...tenants];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tenant => 
        `${tenant.first_name || ''} ${tenant.last_name || ''}`.toLowerCase().includes(query) ||
        (tenant.email && tenant.email.toLowerCase().includes(query)) ||
        (tenant.phone_number && tenant.phone_number.includes(query)) ||
        (tenant.unit_details?.unit_number && tenant.unit_details.unit_number.toLowerCase().includes(query)) ||
        (tenant.property_details?.name && tenant.property_details.name.toLowerCase().includes(query))
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.status === statusFilter);
    }
    
    // Property filter
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(tenant => 
        tenant.property_details?.id === parseInt(propertyFilter) ||
        tenant.unit_details?.property === parseInt(propertyFilter)
      );
    }
    
    setFilteredTenants(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTenantForAction) return;
    
    try {
      await tenantsAPI.delete(selectedTenantForAction.id);
      setTenants(tenants.filter(tenant => tenant.id !== selectedTenantForAction.id));
    } catch (err) {
      console.error('Error deleting tenant:', err);
      setError('Failed to delete tenant. Please try again.');
    } finally {
      setConfirmDeleteOpen(false);
      setSelectedTenantForAction(null);
    }
  };

  const handleRowAction = (action, tenant) => {
    setSelectedTenantForAction(tenant);
    
    switch (action) {
      case 'edit':
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
          window.location.href = `sms:${tenant.phone_number}`;
        }
        break;
      case 'phone':
        if (tenant.phone_number) {
          window.location.href = `tel:${tenant.phone_number}`;
        }
        break;
      default:
        break;
    }
  };

  const handleTenantFormSubmit = (tenantData) => {
    if (editingTenant) {
      setTenants(tenants.map(tenant => 
        tenant.id === editingTenant.id ? { ...tenant, ...tenantData } : tenant
      ));
    } else {
      setTenants([...tenants, tenantData]);
    }
    setAddDialogOpen(false);
    setEditingTenant(null);
    handleRefresh(); // Refresh to get updated data
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <ActiveIcon />;
      case 'pending': return <PendingIcon />;
      case 'inactive': return <InactiveIcon />;
      default: return <PersonIcon />;
    }
  };

  // Render tenant card
  const renderTenantCard = (tenant) => (
    <Grid item xs={12} sm={6} md={4} key={tenant.id}>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: (theme) => theme.shadows[8]
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
              <PersonIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="div">
                {`${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Unknown'}
              </Typography>
              <Chip 
                size="small" 
                icon={getStatusIcon(tenant.status)}
                label={tenant.status?.toUpperCase() || 'UNKNOWN'}
                color={getStatusColor(tenant.status)}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>

          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {tenant.email || 'No email'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {tenant.phone_number || 'No phone'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HomeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {tenant.unit_details?.unit_number || 'No unit'} - {tenant.property_details?.name || 'No property'}
              </Typography>
            </Box>
            
            {tenant.activeLease && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {tenant.occupancyDays} days occupied
                </Typography>
              </Box>
            )}
          </Stack>

          {/* Statistics */}
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Badge badgeContent={tenant.pendingPayments?.length || 0} color="error">
                    <MoneyIcon color="action" />
                  </Badge>
                  <Typography variant="caption" display="block">
                    Payments
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Badge badgeContent={tenant.openTickets?.length || 0} color="warning">
                    <MaintenanceIcon color="action" />
                  </Badge>
                  <Typography variant="caption" display="block">
                    Tickets
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Badge badgeContent={tenant.leases?.length || 0} color="info">
                    <LeaseIcon color="action" />
                  </Badge>
                  <Typography variant="caption" display="block">
                    Leases
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Box>
            <Tooltip title="Send Email">
              <IconButton 
                size="small" 
                onClick={() => handleRowAction('email', tenant)}
                disabled={!tenant.email}
              >
                <EmailIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Send SMS">
              <IconButton 
                size="small" 
                onClick={() => handleRowAction('sms', tenant)}
                disabled={!tenant.phone_number}
              >
                <SmsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Call">
              <IconButton 
                size="small" 
                onClick={() => handleRowAction('phone', tenant)}
                disabled={!tenant.phone_number}
              >
                <PhoneIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box>
            <Tooltip title="Edit">
              <IconButton 
                size="small" 
                onClick={() => handleRowAction('edit', tenant)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton 
                size="small" 
                color="error"
                onClick={() => handleRowAction('delete', tenant)}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardActions>
      </Card>
    </Grid>
  );

  // Table column configuration
  const columns = [
    {
      id: 'first_name',
      label: 'Name',
      minWidth: 170,
      searchable: true,
      format: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ mr: 1, bgcolor: 'primary.main', width: 32, height: 32 }}>
            <PersonIcon fontSize="small" />
          </Avatar>
          {`${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown'}
        </Box>
      )
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      format: (value, row) => (
        <Chip 
          size="small" 
          icon={getStatusIcon(row.status)}
          label={row.status?.toUpperCase() || 'UNKNOWN'}
          color={getStatusColor(row.status)}
        />
      )
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
        return value || 
               row.unit_details?.property_name || 
               row.property_details?.name || 
               'N/A';
      }
    },
    {
      id: 'occupancyDays',
      label: 'Occupancy',
      minWidth: 120,
      format: (value) => value ? `${value} days` : 'N/A'
    },
    {
      id: 'pendingPayments',
      label: 'Pending Payments',
      minWidth: 120,
      format: (value) => (
        <Badge badgeContent={value?.length || 0} color="error">
          <MoneyIcon color="action" />
        </Badge>
      )
    },
    {
      id: 'openTickets',
      label: 'Open Tickets',
      minWidth: 120,
      format: (value) => (
        <Badge badgeContent={value?.length || 0} color="warning">
          <MaintenanceIcon color="action" />
        </Badge>
      )
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
      label: 'Call',
      icon: PhoneIcon,
      action: 'phone'
    },
    {
      label: 'Delete',
      icon: DeleteIcon,
      action: 'delete',
      color: 'error'
    }
  ];
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Enhanced Tenant Management
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Tenants</Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <PersonIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div">
              {tenantStats.total}
            </Typography>
            <Typography color="text.secondary">
              Total Tenants
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <ActiveIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div">
              {tenantStats.active}
            </Typography>
            <Typography color="text.secondary">
              Active Tenants
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <TimeIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div">
              {tenantStats.averageStay}
            </Typography>
            <Typography color="text.secondary">
              Avg. Stay (days)
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <LocationIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div">
              {tenantStats.totalOccupancy}%
            </Typography>
            <Typography color="text.secondary">
              Occupancy Rate
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Filters and Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search tenants"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Property</InputLabel>
              <Select
                value={propertyFilter}
                label="Property"
                onChange={(e) => setPropertyFilter(e.target.value)}
              >
                <MenuItem value="all">All Properties</MenuItem>
                {properties.map((property) => (
                  <MenuItem key={property.id} value={property.id}>
                    {property.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title={viewMode === 'card' ? 'Table View' : 'Card View'}>
                <IconButton onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}>
                  {viewMode === 'card' ? <ViewListIcon /> : <ViewModuleIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading Progress */}
      {(loading || refreshing) && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredTenants.length} of {tenants.length} tenants
        </Typography>
      </Box>

      {/* Content */}
      {viewMode === 'card' ? (
        <Grid container spacing={3}>
          {filteredTenants.map(renderTenantCard)}
        </Grid>
      ) : (
        <EnhancedTable
          data={filteredTenants}
          columns={columns}
          title="Tenants"
          loading={loading}
          onRowAction={handleRowAction}
          actionItems={actionItems}
          searchable={false} // We handle search externally
          filterable={false} // We handle filtering externally
          exportable={true}
          defaultSortColumn="first_name"
        />
      )}

      {/* Floating Action Button */}
      <Fab 
        color="primary" 
        aria-label="add tenant"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          setEditingTenant(null);
          setAddDialogOpen(true);
        }}
      >
        <AddIcon />
      </Fab>

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

export default EnhancedTenantList;
