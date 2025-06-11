import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  Container, 
  Typography, 
  TextField, 
  InputAdornment,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Grid,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Fab,
  Tooltip,
  CardContent,
  CardActions,
  Avatar,
  LinearProgress,
  Badge
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Apartment as ApartmentIcon,
  Hotel as HotelIcon,
  Map as MapIcon,
  People as PeopleIcon,
  Build as BuildIcon,
  AttachMoney as AttachMoneyIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  Photo as PhotoIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { propertiesAPI, unitsAPI, maintenanceAPI, paymentsAPI } from '../services/api';
import EnhancedTable from '../components/EnhancedTable';

function EnhancedPropertyList() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [propertyStats, setPropertyStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [deleteDialog, setDeleteDialog] = useState({ open: false, property: null });
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchProperties = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const [propertiesRes, unitsRes] = await Promise.all([
        propertiesAPI.getAll(),
        unitsAPI.getAll()
      ]);
      
      const props = Array.isArray(propertiesRes.data) ? propertiesRes.data : 
                    Array.isArray(propertiesRes.data.results) ? propertiesRes.data.results : [];
      
      const units = Array.isArray(unitsRes.data) ? unitsRes.data : 
                   Array.isArray(unitsRes.data.results) ? unitsRes.data.results : [];
      
      // Calculate stats for each property
      const stats = {};
      for (const property of props) {
        const propertyUnits = units.filter(unit => unit.property === property.id);
        const occupiedUnits = propertyUnits.filter(unit => unit.tenant !== null).length;
        const totalUnits = propertyUnits.length;
        const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100) : 0;
        
        // Get maintenance tickets for this property
        try {
          const ticketsRes = await maintenanceAPI.getAllTickets();
          const propertyTickets = ticketsRes.data.results?.filter(ticket => 
            propertyUnits.some(unit => unit.id === ticket.unit)
          ) || [];
          const openTickets = propertyTickets.filter(ticket => 
            ['new', 'assigned', 'in_progress'].includes(ticket.status)
          ).length;
          
          stats[property.id] = {
            totalUnits,
            occupiedUnits,
            vacantUnits: totalUnits - occupiedUnits,
            occupancyRate: occupancyRate.toFixed(1),
            openTickets,
            totalTickets: propertyTickets.length
          };
        } catch (err) {
          console.warn('Error fetching tickets for property:', property.id);
          stats[property.id] = {
            totalUnits,
            occupiedUnits,
            vacantUnits: totalUnits - occupiedUnits,
            occupancyRate: occupancyRate.toFixed(1),
            openTickets: 0,
            totalTickets: 0
          };
        }
      }
      
      setProperties(props);
      setPropertyStats(stats);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties. Please try again later.');
      setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleRefresh = () => {
    fetchProperties(true);
  };

  const handleDelete = async (property) => {
    try {
      await propertiesAPI.delete(property.id);
      setProperties(prev => prev.filter(p => p.id !== property.id));
      setDeleteDialog({ open: false, property: null });
    } catch (err) {
      console.error('Error deleting property:', err);
      setError('Failed to delete property. Please try again.');
    }
  };

  const getPropertyIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'residential': return <HomeIcon />;
      case 'commercial': return <BusinessIcon />;
      case 'apartment': return <ApartmentIcon />;
      case 'short_term': return <HotelIcon />;
      default: return <BusinessIcon />;
    }
  };

  const getPropertyTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'residential': return 'primary';
      case 'commercial': return 'secondary';
      case 'apartment': return 'info';
      case 'short_term': return 'warning';
      default: return 'default';
    }
  };

  const formatPropertyType = (type) => {
    switch(type?.toLowerCase()) {
      case 'residential': return 'Residential';
      case 'commercial': return 'Commercial';
      case 'apartment': return 'Apartment';
      case 'short_term': return 'Short-Term';
      default: return type || 'Unknown';
    }
  };

  // Filter properties
  const filteredProperties = properties.filter(property => {
    const matchesSearch = !searchTerm || 
      property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || property.property_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const PropertyCard = ({ property }) => {
    const stats = propertyStats[property.id] || {};
    const [anchorEl, setAnchorEl] = useState(null);

    return (
      <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                {getPropertyIcon(property.property_type)}
              </Avatar>
              <Box>
                <Typography variant="h6" component="div" noWrap>
                  {property.name}
                </Typography>
                <Chip 
                  label={formatPropertyType(property.property_type)} 
                  size="small" 
                  color={getPropertyTypeColor(property.property_type)}
                />
              </Box>
            </Box>
            <IconButton 
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => { navigate(`/properties/${property.id}`); setAnchorEl(null); }}>
                <ViewIcon sx={{ mr: 1 }} /> View Details
              </MenuItem>
              <MenuItem onClick={() => { navigate(`/properties/${property.id}/edit`); setAnchorEl(null); }}>
                <EditIcon sx={{ mr: 1 }} /> Edit
              </MenuItem>
              <MenuItem onClick={() => { setDeleteDialog({ open: true, property }); setAnchorEl(null); }}>
                <DeleteIcon sx={{ mr: 1, color: 'error.main' }} /> Delete
              </MenuItem>
            </Menu>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <MapIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
            {property.address || 'No address provided'}
          </Typography>

          {property.description && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              {property.description.length > 100 ? 
                `${property.description.substring(0, 100)}...` : 
                property.description
              }
            </Typography>
          )}

          {/* Property Statistics */}
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="primary">
                    {stats.totalUnits || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Units
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="success.main">
                    {stats.occupancyRate || 0}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Occupied
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Occupancy</Typography>
                <Typography variant="body2">{stats.occupiedUnits || 0}/{stats.totalUnits || 0}</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={parseFloat(stats.occupancyRate) || 0}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>

            {stats.openTickets > 0 && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge badgeContent={stats.openTickets} color="error">
                  <BuildIcon color="action" />
                </Badge>
                <Typography variant="body2" color="text.secondary">
                  Open maintenance requests
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>

        <CardActions>
          <Button 
            size="small" 
            startIcon={<ViewIcon />}
            onClick={() => navigate(`/properties/${property.id}`)}
          >
            View Details
          </Button>
          <Button 
            size="small" 
            startIcon={<PeopleIcon />}
            onClick={() => navigate(`/properties/${property.id}/tenants`)}
          >
            Tenants
          </Button>
        </CardActions>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            Properties ({filteredProperties.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/properties/new')}
            >
              Add Property
            </Button>
          </Box>
        </Box>
        
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Properties</Typography>
        </Breadcrumbs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {refreshing && <LinearProgress sx={{ mb: 2 }} />}

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search properties by name, address..."
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
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Property Type</InputLabel>
              <Select
                value={filterType}
                label="Property Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="residential">Residential</MenuItem>
                <MenuItem value="commercial">Commercial</MenuItem>
                <MenuItem value="apartment">Apartment</MenuItem>
                <MenuItem value="short_term">Short-Term</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>View Mode</InputLabel>
              <Select
                value={viewMode}
                label="View Mode"
                onChange={(e) => setViewMode(e.target.value)}
              >
                <MenuItem value="card">Card View</MenuItem>
                <MenuItem value="table">Table View</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Property Grid/List */}
      {viewMode === 'card' ? (
        <Grid container spacing={3}>
          {filteredProperties.map((property) => (
            <Grid item key={property.id} xs={12} sm={6} md={4} lg={3}>
              <PropertyCard property={property} />
            </Grid>
          ))}
          {filteredProperties.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No properties found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {searchTerm || filterType !== 'all' ? 
                    'Try adjusting your search or filters' : 
                    'Get started by adding your first property'
                  }
                </Typography>
                {!searchTerm && filterType === 'all' && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/properties/new')}
                  >
                    Add Property
                  </Button>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      ) : (
        <EnhancedTable
          data={filteredProperties}
          columns={[
            { id: 'name', label: 'Property Name', minWidth: 170, searchable: true },
            { id: 'address', label: 'Address', minWidth: 200, searchable: true },
            { 
              id: 'property_type', 
              label: 'Type', 
              minWidth: 130, 
              format: (value) => formatPropertyType(value) 
            },
            { 
              id: 'id', 
              label: 'Units', 
              minWidth: 80, 
              align: 'center',
              format: (value) => propertyStats[value]?.totalUnits || 0
            },
            { 
              id: 'id', 
              label: 'Occupancy', 
              minWidth: 100, 
              align: 'center',
              format: (value) => `${propertyStats[value]?.occupancyRate || 0}%`
            },
            { 
              id: 'created_at', 
              label: 'Created', 
              minWidth: 120,
              format: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
            }
          ]}
          actions={[
            { label: 'View Details', icon: ViewIcon, action: 'view' },
            { label: 'Edit', icon: EditIcon, action: 'edit' },
            { label: 'Delete', icon: DeleteIcon, action: 'delete', color: 'error' }
          ]}
          onAction={(action, property) => {
            switch (action) {
              case 'view':
                navigate(`/properties/${property.id}`);
                break;
              case 'edit':
                navigate(`/properties/${property.id}/edit`);
                break;
              case 'delete':
                setDeleteDialog({ open: true, property });
                break;
              default:
                break;
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, property: null })}
      >
        <DialogTitle>Delete Property</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.property?.name}"? 
            This action cannot be undone and will also delete all associated units and data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, property: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDelete(deleteDialog.property)} 
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default EnhancedPropertyList;
