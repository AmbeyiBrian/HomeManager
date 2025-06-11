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
  Link
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { propertiesAPI } from '../services/api';
import EnhancedTable from '../components/EnhancedTable';

function PropertyList() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Removed viewMode state - using table view by default
  
  // Load properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await propertiesAPI.getAll();
        
        // Make sure properties is always an array
        const props = Array.isArray(response.data) ? response.data : 
                      Array.isArray(response.data.results) ? response.data.results : [];
        setProperties(props);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties. Please try again later.');
        setProperties([]); // Ensure properties is always an array even on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, []);
    // Filter properties based on search term
  const filteredProperties = searchTerm 
    ? properties.filter(property => 
        property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.property_type?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : properties;
    
    // Format property type for display
  const formatPropertyType = (type) => {
    switch(type?.toLowerCase()) {
      case 'residential':
        return 'Residential';
      case 'commercial':
        return 'Commercial';
      case 'short_term':
        return 'Short-Term Rental';
      default:
        return type || 'Unknown';
    }
  };

  // Action handlers for Enhanced Table
  const handleRowAction = (action, property) => {
    switch (action) {
      case 'view':
        navigate(`/properties/${property.id}`);
        break;
      case 'edit':
        navigate(`/properties/${property.id}/edit`);
        break;
      case 'delete':
        // Handle delete action
        console.log('Delete property:', property);
        break;
      default:
        break;
    }
  };

  // Table column configuration
  const columns = [
    {
      id: 'name',
      label: 'Property Name',
      minWidth: 170,
      searchable: true
    },
    {
      id: 'address',
      label: 'Address',
      minWidth: 200,
      searchable: true
    },
    {
      id: 'property_type',
      label: 'Type',
      minWidth: 130,
      searchable: true,
      format: (value) => formatPropertyType(value)
    },
    {
      id: 'total_units',
      label: 'Units',
      minWidth: 80,
      align: 'center'
    },
    {
      id: 'description',
      label: 'Description',
      minWidth: 200,
      searchable: true,
      format: (value) => value ? (value.length > 50 ? `${value.substring(0, 50)}...` : value) : 'N/A'
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
      icon: ViewIcon,
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Properties
        </Typography>
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
        </Alert>      )}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            placeholder="Search properties..."
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
            sx={{ width: { xs: '200px', sm: 250 } }}
          />
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={RouterLink}
          to="/properties/new"
        >
          Add Property
        </Button>
      </Box>
        {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : !Array.isArray(filteredProperties) || filteredProperties.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Properties Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {searchTerm 
              ? 'No properties match your search criteria. Try a different search term or clear the search.'
              : 'You haven\'t added any properties yet. Click "Add Property" to get started.'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/properties/new"
          >          Add First Property
          </Button>
        </Card>
      ) : (
        <EnhancedTable
          data={filteredProperties}
          columns={columns}
          title="Properties"
          loading={loading}
          onRowAction={handleRowAction}
          actionItems={actionItems}
          searchable={false} // We have external search
          filterable={true}
          exportable={true}
          defaultSortColumn="name"
        />
      )}
    </Container>
  );
}

export default PropertyList;
