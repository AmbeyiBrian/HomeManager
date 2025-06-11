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
  CardHeader
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Build as MaintenanceIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  Cancel as CancelledIcon,
  Pause as OnHoldIcon,
  PlayArrow as InProgressIcon,
  FiberNew as NewIcon,
  Home as PropertyIcon,
  Room as UnitIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Assignment as AssignedIcon,
  Phone as PhoneIcon,  Email as EmailIcon,
  PriorityHigh as PriorityIcon,
  FilterList as FilterIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Refresh as RefreshIcon,
  DateRange as DateIcon,
  AttachMoney as CostIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { maintenanceAPI, propertiesAPI, tenantsAPI, unitsAPI } from '../services/api';
import EnhancedTable from '../components/EnhancedTable';

function EnhancedTicketList() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  
  // Additional state for related data
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0,
    averageResolutionTime: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter, priorityFilter, propertyFilter, categoryFilter, dateFilter]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [ticketsResponse, propertiesResponse, unitsResponse, tenantsResponse] = await Promise.all([
        maintenanceAPI.getAllTickets(),
        propertiesAPI.getAll(),
        unitsAPI.getAll(),
        tenantsAPI.getAll()
      ]);
      
      const ticketsData = Array.isArray(ticketsResponse.data) ? ticketsResponse.data : 
                         Array.isArray(ticketsResponse.data.results) ? ticketsResponse.data.results : [];
      
      const propertiesData = Array.isArray(propertiesResponse.data) ? propertiesResponse.data : 
                            Array.isArray(propertiesResponse.data.results) ? propertiesResponse.data.results : [];
      
      const unitsData = Array.isArray(unitsResponse.data) ? unitsResponse.data : 
                       Array.isArray(unitsResponse.data.results) ? unitsResponse.data.results : [];
      
      const tenantsData = Array.isArray(tenantsResponse.data) ? tenantsResponse.data : 
                         Array.isArray(tenantsResponse.data.results) ? tenantsResponse.data.results : [];
      
      // Enhanced ticket data with relationships
      const enhancedTickets = ticketsData.map(ticket => {
        const property = propertiesData.find(p => p.id === ticket.property);
        const unit = unitsData.find(u => u.id === ticket.unit);
        const tenant = tenantsData.find(t => t.id === ticket.tenant);
        
        return {
          ...ticket,
          property_name: property?.name || 'Unknown Property',
          property_details: property,
          unit_number: unit?.unit_number || ticket.unit,
          unit_details: unit,
          tenant_name: tenant ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() : null,
          tenant_details: tenant,
          daysOpen: ticket.status !== 'completed' && ticket.status !== 'cancelled' ? 
            Math.floor((new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24)) : 0,
          resolutionTime: ticket.status === 'completed' && ticket.updated_at ? 
            Math.floor((new Date(ticket.updated_at) - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24)) : null
        };
      });
      
      setTickets(enhancedTickets);
      setProperties(propertiesData);
      setUnits(unitsData);
      setTenants(tenantsData);
      
      // Calculate statistics
      calculateTicketStats(enhancedTickets);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load maintenance data. Please try again later.');
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateTicketStats = (ticketsData) => {
    const stats = {
      total: ticketsData.length,
      new: ticketsData.filter(t => t.status === 'new').length,
      inProgress: ticketsData.filter(t => t.status === 'in_progress').length,
      completed: ticketsData.filter(t => t.status === 'completed').length,
      urgent: ticketsData.filter(t => t.priority === 'urgent').length,
      averageResolutionTime: 0
    };
    
    const completedTickets = ticketsData.filter(t => t.status === 'completed' && t.resolutionTime !== null);
    if (completedTickets.length > 0) {
      stats.averageResolutionTime = Math.round(
        completedTickets.reduce((sum, ticket) => sum + ticket.resolutionTime, 0) / completedTickets.length
      );
    }
    
    setTicketStats(stats);
  };

  const filterTickets = () => {
    let filtered = [...tickets];
    
    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.title?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.id?.toString().includes(query) ||
        ticket.property_name?.toLowerCase().includes(query) ||
        ticket.unit_number?.toString().toLowerCase().includes(query) ||
        ticket.tenant_name?.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }
    
    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }
    
    // Property filter
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.property === parseInt(propertyFilter));
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === categoryFilter);
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(ticket => new Date(ticket.created_at) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(ticket => new Date(ticket.created_at) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(ticket => new Date(ticket.created_at) >= filterDate);
          break;
      }
    }
    
    setFilteredTickets(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
  };

  const handleRowAction = (action, ticket) => {
    switch (action) {
      case 'view':
        navigate(`/tickets/${ticket.id}`);
        break;
      case 'edit':
        navigate(`/tickets/${ticket.id}/edit`);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete ticket #${ticket.id}: "${ticket.title}"?`)) {
          setLoading(true);
          maintenanceAPI.deleteTicket(ticket.id)
            .then(() => {
              setTickets(prevTickets => prevTickets.filter(t => t.id !== ticket.id));
            })
            .catch(err => {
              console.error('Error deleting ticket:', err);
              setError('Failed to delete the ticket. Please try again.');
            })
            .finally(() => {
              setLoading(false);
            });
        }
        break;
      case 'assign':
        // Handle assignment logic
        break;
      case 'contact':
        if (ticket.tenant_details?.phone_number) {
          window.location.href = `tel:${ticket.tenant_details.phone_number}`;
        }
        break;
      case 'email':
        if (ticket.tenant_details?.email) {
          window.location.href = `mailto:${ticket.tenant_details.email}`;
        }
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'new': return 'info';
      case 'assigned': return 'primary';
      case 'in_progress': return 'warning';
      case 'on_hold': return 'secondary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'new': return <NewIcon />;
      case 'assigned': return <AssignedIcon />;
      case 'in_progress': return <InProgressIcon />;
      case 'on_hold': return <OnHoldIcon />;
      case 'completed': return <CompletedIcon />;
      case 'cancelled': return <CancelledIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatStatus = (status) => {
    return status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
  };

  const formatPriority = (priority) => {
    return priority ? priority.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Medium';
  };

  // Render ticket card
  const renderTicketCard = (ticket) => (
    <Grid item xs={12} sm={6} md={4} key={ticket.id}>
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
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: getStatusColor(ticket.status) + '.main' }}>
              {getStatusIcon(ticket.status)}
            </Avatar>
          }
          title={
            <Typography variant="h6" component="div">
              #{ticket.id} - {ticket.title}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip 
                size="small" 
                icon={getStatusIcon(ticket.status)}
                label={formatStatus(ticket.status)}
                color={getStatusColor(ticket.status)}
              />
              <Chip 
                size="small" 
                icon={<PriorityIcon />}
                label={formatPriority(ticket.priority)}
                color={getPriorityColor(ticket.priority)}
              />
            </Box>
          }
        />

        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {ticket.description?.substring(0, 100)}
            {ticket.description?.length > 100 && '...'}
          </Typography>

          <Stack spacing={1} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PropertyIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {ticket.property_name}
              </Typography>
            </Box>
            
            {ticket.unit_number && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <UnitIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Unit {ticket.unit_number}
                </Typography>
              </Box>
            )}
            
            {ticket.tenant_name && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {ticket.tenant_name}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {ticket.status === 'completed' ? 
                  `Resolved in ${ticket.resolutionTime} days` :
                  `Open for ${ticket.daysOpen} days`
                }
              </Typography>
            </Box>

            {ticket.category && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CategoryIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {ticket.category}
                </Typography>
              </Box>
            )}

            {ticket.estimated_cost && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CostIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Est. Cost: ${ticket.estimated_cost}
                </Typography>
              </Box>
            )}
          </Stack>

          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(ticket.created_at).toLocaleDateString()}
            </Typography>
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Box>
            {ticket.tenant_details?.phone_number && (
              <Tooltip title="Call Tenant">
                <IconButton 
                  size="small" 
                  onClick={() => handleRowAction('contact', ticket)}
                >
                  <PhoneIcon />
                </IconButton>
              </Tooltip>
            )}
            {ticket.tenant_details?.email && (
              <Tooltip title="Email Tenant">
                <IconButton 
                  size="small" 
                  onClick={() => handleRowAction('email', ticket)}
                >
                  <EmailIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box>
            <Tooltip title="View Details">
              <IconButton 
                size="small" 
                onClick={() => handleRowAction('view', ticket)}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton 
                size="small" 
                onClick={() => handleRowAction('edit', ticket)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton 
                size="small" 
                color="error"
                onClick={() => handleRowAction('delete', ticket)}
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
      id: 'id',
      label: 'Ticket #',
      minWidth: 80,
      searchable: true,
      format: (value) => `#${value}`
    },
    {
      id: 'title',
      label: 'Title',
      minWidth: 200,
      searchable: true
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      format: (value) => (
        <Chip 
          label={formatStatus(value)} 
          color={getStatusColor(value)}
          size="small"
          icon={getStatusIcon(value)}
        />
      )
    },
    {
      id: 'priority',
      label: 'Priority',
      minWidth: 100,      
      format: (value) => (
        <Chip 
          label={formatPriority(value)} 
          color={getPriorityColor(value)}
          size="small"
        />
      )
    },
    {
      id: 'property_name',
      label: 'Property',
      minWidth: 150,
      searchable: true,
      format: (value) => value || 'N/A'
    },
    {
      id: 'unit_number',
      label: 'Unit',
      minWidth: 80,
      searchable: true,
      format: (value) => value ? `Unit ${value}` : 'N/A'
    },
    {
      id: 'tenant_name',
      label: 'Tenant',
      minWidth: 150,
      searchable: true,
      format: (value) => value || 'N/A'
    },
    {
      id: 'daysOpen',
      label: 'Days Open',
      minWidth: 100,
      format: (value, row) => {
        if (row.status === 'completed' || row.status === 'cancelled') {
          return row.resolutionTime ? `${row.resolutionTime} days` : 'N/A';
        }
        return `${value} days`;
      }
    },
    {
      id: 'created_at',
      label: 'Created',
      minWidth: 120,
      format: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    }
  ];

  // Action items for table
  const actionItems = [
    {
      label: 'View Details',
      icon: VisibilityIcon,
      action: 'view'
    },
    {
      label: 'Edit',
      icon: EditIcon,
      action: 'edit'
    },
    {
      label: 'Call Tenant',
      icon: PhoneIcon,
      action: 'contact'
    },
    {
      label: 'Email Tenant',
      icon: EmailIcon,
      action: 'email'
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
          Enhanced Maintenance Management
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Maintenance</Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <MaintenanceIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div">
              {ticketStats.total}
            </Typography>
            <Typography color="text.secondary">
              Total Tickets
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <NewIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div">
              {ticketStats.new}
            </Typography>
            <Typography color="text.secondary">
              New Tickets
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <InProgressIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div">
              {ticketStats.inProgress}
            </Typography>
            <Typography color="text.secondary">
              In Progress
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <CompletedIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div">
              {ticketStats.completed}
            </Typography>
            <Typography color="text.secondary">
              Completed
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <PriorityIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div">
              {ticketStats.urgent}
            </Typography>
            <Typography color="text.secondary">
              Urgent Priority
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
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search tickets"
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
          
          <Grid item xs={6} md={1.5}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={1.5}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
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
          
          <Grid item xs={6} md={1.5}>
            <FormControl fullWidth>
              <InputLabel>Date</InputLabel>
              <Select
                value={dateFilter}
                label="Date"
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={1.5}>
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
          Showing {filteredTickets.length} of {tickets.length} tickets
        </Typography>
      </Box>

      {/* Content */}
      {filteredTickets.length === 0 && !loading ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <MaintenanceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Maintenance Tickets Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {searchTerm || statusFilter !== 'all' || propertyFilter !== 'all'
              ? 'No tickets match your search criteria. Try adjusting your filters.'
              : 'There are no maintenance tickets in the system yet.'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tickets/new')}
          >
            Create First Ticket
          </Button>
        </Card>
      ) : viewMode === 'card' ? (
        <Grid container spacing={3}>
          {filteredTickets.map(renderTicketCard)}
        </Grid>
      ) : (
        <EnhancedTable
          data={filteredTickets}
          columns={columns}
          title="Maintenance Tickets"
          loading={loading}
          onRowAction={handleRowAction}
          actionItems={actionItems}
          searchable={false} // We handle search externally
          filterable={false} // We handle filtering externally
          exportable={true}
          defaultSortColumn="created_at"
          defaultSortDirection="desc"
        />
      )}

      {/* Floating Action Button */}
      <Fab 
        color="primary" 
        aria-label="create ticket"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/tickets/new')}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
}

export default EnhancedTicketList;
