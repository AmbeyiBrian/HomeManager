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
  CircularProgress,
  Card,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { maintenanceAPI, propertiesAPI } from '../services/api';
import EnhancedTable from '../components/EnhancedTable';

function TicketList() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [properties, setProperties] = useState([]);
  
  // Transform ticket data to include property and unit names
  const transformTicketData = (tickets, properties) => {
    return tickets.map(ticket => {
      // Find property by ID
      const property = properties.find(p => p.id === ticket.property);
      
      // Prepare enhanced ticket object
      return {
        ...ticket,
        property_name: property?.name || 'Unknown Property',
        unit_number: ticket.unit ? `Unit ${ticket.unit}` : 'N/A',
        // Keep backwards compatibility with existing code
        unit_details: {
          unit_number: ticket.unit,
          property: ticket.property,
          property_details: {
            id: ticket.property,
            name: property?.name || 'Unknown Property'
          }
        }
      };
    });
  };
    // Load maintenance tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {        
        setLoading(true);
        setError(null);
        
        const [ticketsResponse, propertiesResponse] = await Promise.all([
          maintenanceAPI.getAllTickets(),
          propertiesAPI.getAll()
        ]);
        
        // Make sure tickets is always an array
        const ticketsData = Array.isArray(ticketsResponse.data) ? ticketsResponse.data : 
                    Array.isArray(ticketsResponse.data.results) ? ticketsResponse.data.results : [];
                    
        // Make sure properties is always an array
        const propsData = Array.isArray(propertiesResponse.data) ? propertiesResponse.data : 
                      Array.isArray(propertiesResponse.data.results) ? propertiesResponse.data.results : [];
        
        // Set properties
        setProperties(propsData);
        
        // Transform and set tickets with property names
        setTickets(transformTicketData(ticketsData, propsData));
      } catch (err) {
        console.error('Error fetching maintenance tickets or properties:', err);
        setError('Failed to load maintenance tickets. Please try again later.');
        setTickets([]); // Ensure tickets is always an array even on error
        setProperties([]); // Ensure properties is always an array even on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchTickets();
  }, []);
    // Properties are now loaded with tickets in the first useEffect
  
  // Apply filters and search
  const filteredTickets = tickets.filter(ticket => {
    let matchesSearch = true;
    let matchesStatus = true;
    let matchesProperty = true;
      // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesSearch = 
        ticket.title?.toLowerCase().includes(searchLower) ||
        ticket.description?.toLowerCase().includes(searchLower) ||
        ticket.unit_number?.toString().toLowerCase().includes(searchLower) ||
        ticket.property_name?.toLowerCase().includes(searchLower);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      matchesStatus = ticket.status === statusFilter;
    }
      // Apply property filter
    if (propertyFilter !== 'all') {
      matchesProperty = ticket.property === Number(propertyFilter);
    }
    
    return matchesSearch && matchesStatus && matchesProperty;
  });
    // Get color for status chip
  const getStatusColor = (status) => {
    switch(status) {
      case 'new':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'on_hold':
        return 'secondary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Format status for display
  const formatStatus = (status) => {
    switch(status) {
      case 'new':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'on_hold':
        return 'On Hold';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
    }
  };
  
  // Format priority for display
  const formatPriority = (priority) => {
    switch(priority) {
      case 'urgent':
        return 'Urgent';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return priority ? priority.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Medium';
    }
  };

  // Action handlers for Enhanced Table
  const handleRowAction = (action, ticket) => {
    switch (action) {
      case 'view':
        navigate(`/maintenance/${ticket.id}`);
        break;
      case 'edit':
        navigate(`/maintenance/${ticket.id}/edit`);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete ticket #${ticket.id}: "${ticket.title}"?`)) {
          setLoading(true);
          maintenanceAPI.deleteTicket(ticket.id)
            .then(() => {
              // Filter out the deleted ticket from state
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
      default:
        break;
    }
  };
  // Table column configuration
  const columns = [
    {
      id: 'id',
      label: 'Ticket #',
      minWidth: 80,
      searchable: true
    },
    {
      id: 'title',
      label: 'Title',
      minWidth: 200,
      searchable: true
    },    {
      id: 'unit_number',
      label: 'Unit',
      minWidth: 80,
      searchable: true,
      format: (value) => value || 'N/A'
    },
    {
      id: 'property_name',
      label: 'Property',
      minWidth: 150,
      searchable: true,
      format: (value) => value || 'N/A'
    },
    {
      id: 'priority',
      label: 'Priority',
      minWidth: 100,      format: (value) => (
        <Chip 
          label={formatPriority(value)} 
          color={
            value === 'urgent' ? 'error' :
            value === 'high' ? 'error' :
            value === 'medium' ? 'warning' :
            value === 'low' ? 'success' : 'default'
          }
          size="small"
        />
      )
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
        />
      )
    },
    {
      id: 'created_at',
      label: 'Created',
      minWidth: 120,
      format: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      id: 'updated_at',
      label: 'Updated',
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
      label: 'Delete',
      icon: DeleteIcon,
      action: 'delete',
      color: 'error'
    }
  ];

  // Custom filters for the table
  const customFilters = [
    {
      id: 'status',
      label: 'Status',
      options: [        { value: 'new', label: 'New' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },    {
      id: 'priority',
      label: 'Priority',
      options: [
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ]
    }
  ];
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Maintenance Tickets
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Maintenance</Typography>
        </Breadcrumbs>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            placeholder="Search tickets..."
            variant="outlined"
            size="small"
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
        
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="on_hold">On Hold</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Property</InputLabel>
            <Select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              label="Property"
            >
              <MenuItem value="all">All Properties</MenuItem>
              {properties.map(property => (
                <MenuItem key={property.id} value={property.id}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={2}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>            <Button
              variant="contained"
              startIcon={<AddIcon />}
              fullWidth
              onClick={() => navigate('/maintenance/new')}
            >
              Create Ticket
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : !Array.isArray(filteredTickets) || filteredTickets.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Maintenance Tickets Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {searchTerm || statusFilter !== 'all' || propertyFilter !== 'all'
              ? 'No tickets match your search criteria. Try adjusting your filters.'
              : 'There are no maintenance tickets in the system yet.'}
          </Typography>          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/maintenance/new')}
          >
            Create First Ticket
          </Button>
        </Card>
      ) : (        <EnhancedTable
          data={filteredTickets}
          columns={columns}
          title="Maintenance Tickets"
          loading={loading}
          onRowAction={handleRowAction}
          actionItems={actionItems}
          searchable={false} // We have external search
          filterable={true}
          exportable={true}
          customFilters={customFilters}
          defaultSortColumn="created_at"
          defaultSortDirection="desc"
        />
      )}
    </Container>
  );
}

export default TicketList;
