import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Container, 
  Grid, 
  Typography, 
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Paper,
  Chip
} from '@mui/material';
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Apartment as ApartmentIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { propertiesAPI, unitsAPI } from '../services/api';
import PropertyForm from '../components/PropertyForm';
import UnitForm from '../components/UnitForm';

function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  
  // Load property details
  useEffect(() => {
    const fetchProperty = async () => {
      try {        setLoading(true);
        setError(null);
        
        const response = await propertiesAPI.getById(id);
        setProperty(response.data);
      } catch (err) {
        console.error('Error fetching property details:', err);
        setError('Failed to load property details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchProperty();
    }
  }, [id]);
  
  // Load units for this property
  useEffect(() => {
    const fetchUnits = async () => {
      try {        setUnitsLoading(true);
        
        const response = await unitsAPI.getByProperty(id);
        
        // Make sure units is always an array
        const unitsData = Array.isArray(response.data) ? response.data : 
                        Array.isArray(response.data.results) ? response.data.results : [];
        setUnits(unitsData);
      } catch (err) {
        console.error('Error fetching units:', err);
        setUnits([]); // Ensure units is always an array even on error
      } finally {
        setUnitsLoading(false);
      }
    };
    
    if (id && selectedTab === 1) { // Only load units when on the Units tab
      fetchUnits();
    }
  }, [id, selectedTab]);
  
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };
  const handleDeleteProperty = async () => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }
    
    try {
      await propertiesAPI.delete(id);
      navigate('/properties', { replace: true });
    } catch (err) {
      console.error('Error deleting property:', err);
      setError('Failed to delete property. Please try again later.');
    }
  };
  
  const handleUnitFormOpen = (unit = null) => {
    setSelectedUnit(unit);
    setUnitFormOpen(true);
  };
  
  const handleUnitAdded = (newUnit) => {
    if (selectedUnit) {
      // Update existing unit
      setUnits(units.map(unit => 
        unit.id === selectedUnit.id ? newUnit : unit
      ));
    } else {
      // Add new unit
      setUnits([...units, newUnit]);
    }
    setUnitFormOpen(false);
    setSelectedUnit(null);
  };
  
  // Get property type icon
  const getPropertyIcon = () => {
    const type = property?.property_type?.toLowerCase();
    switch(type) {
      case 'residential':
        return <HomeIcon fontSize="large" />;
      case 'commercial':
        return <BusinessIcon fontSize="large" />;
      case 'short_term':
        return <ApartmentIcon fontSize="large" />;
      default:
        return <HomeIcon fontSize="large" />;
    }
  };
  
  // Format property type for display
  const formatPropertyType = () => {
    const type = property?.property_type?.toLowerCase();
    switch(type) {
      case 'residential':
        return 'Residential';
      case 'commercial':
        return 'Commercial';
      case 'short_term':
        return 'Short-Term Rental';
      default:
        return property?.property_type || 'Unknown';
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          component={RouterLink}
          to="/properties"
        >
          Back to Properties
        </Button>
      </Container>
    );
  }
  
  if (!property) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Property not found.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          component={RouterLink}
          to="/properties"
        >
          Back to Properties
        </Button>
      </Container>
    );
  }
  
  // If in edit mode, display the property form
  if (editMode) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Edit Property
          </Typography>
          <Breadcrumbs aria-label="breadcrumb">
            <Link component={RouterLink} to="/" underline="hover" color="inherit">
              Dashboard
            </Link>
            <Link component={RouterLink} to="/properties" underline="hover" color="inherit">
              Properties
            </Link>
            <Link 
              component={RouterLink} 
              to={`/properties/${id}`} 
              underline="hover" 
              color="inherit"
              onClick={(e) => {
                e.preventDefault();
                setEditMode(false);
              }}
            >
              {property.name}
            </Link>
            <Typography color="text.primary">Edit</Typography>
          </Breadcrumbs>
        </Box>
        
        <PropertyForm initialData={property} />
        
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="outlined"
            onClick={() => setEditMode(false)}
          >
            Cancel
          </Button>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" gutterBottom>
            {property.name || 'Unnamed Property'}
          </Typography>
          
          <Box>
            <IconButton 
              color="primary" 
              aria-label="edit property"
              onClick={() => setEditMode(true)}
              sx={{ mr: 1 }}
            >
              <EditIcon />
            </IconButton>
            <IconButton 
              color="error" 
              aria-label="delete property"
              onClick={handleDeleteProperty}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
        
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/properties" underline="hover" color="inherit">
            Properties
          </Link>
          <Typography color="text.primary">{property.name}</Typography>
        </Breadcrumbs>
      </Box>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          {/* Property Information Card */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'primary.light', 
                    borderRadius: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mr: 2
                  }}
                >
                  {getPropertyIcon()}
                </Box>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Property Details
                  </Typography>
                  <Chip 
                    label={formatPropertyType()} 
                    size="small"  
                    color={
                      property.property_type === 'commercial' ? 'primary' :
                      property.property_type === 'short_term' ? 'secondary' : 'default'
                    }
                    variant="outlined"
                  />
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body1">
                  {property.address || 'No address provided'}
                </Typography>
              </Box>
              
              {property.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {property.description}
                  </Typography>
                </Box>
              )}
              
              {property.organization_details && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Organization
                  </Typography>
                  <Typography variant="body1">
                    {property.organization_details.name || 'Unknown Organization'}
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Date Added
                </Typography>
                <Typography variant="body1">
                  {property.created_at 
                    ? new Date(property.created_at).toLocaleDateString() 
                    : 'Unknown'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Paper sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{ mb: 1 }}
              onClick={() => {
                setSelectedTab(1); // Switch to Units tab
                handleUnitFormOpen();
              }}
            >
              Add Unit
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<EditIcon />}
              sx={{ mb: 1 }}
              onClick={() => setEditMode(true)}
            >
              Edit Property
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          {/* Tabs for different property-related information */}
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={selectedTab} 
                onChange={handleTabChange}
                aria-label="property tabs"
                variant="fullWidth"
              >
                <Tab label="Overview" />
                <Tab label="Units" />
                <Tab label="Tenants" />
                <Tab label="Maintenance" />
              </Tabs>
            </Box>
            
            {/* Overview Tab */}
            {selectedTab === 0 && (
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Property Overview
                </Typography>
                <Typography paragraph>
                  This is an overview of your property. Here you can see key metrics and information.
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main">
                        {units.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Units
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="secondary.main">
                        {0} {/* This would be populated with actual tenant count */}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tenants
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {0} {/* This would be populated with actual maintenance count */}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Maintenance
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {units.reduce((acc, unit) => acc + (Number(unit.monthly_rent) || 0), 0).toLocaleString()} KES
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Monthly Rent
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            )}
            
            {/* Units Tab */}
            {selectedTab === 1 && (
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Units
                  </Typography>                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleUnitFormOpen()}
                  >
                    Add Unit
                  </Button>
                </Box>
                
                {unitsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : !Array.isArray(units) || units.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" paragraph>
                      No units have been added to this property yet.
                    </Typography>                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleUnitFormOpen()}
                    >
                      Add First Unit
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {units.map(unit => (
                      <Grid item xs={12} sm={6} key={unit.id || Math.random()}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Unit {unit.unit_number || 'Unknown'}
                            </Typography>
                            {unit.floor && (
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Floor: {unit.floor}
                              </Typography>
                            )}
                            <Typography variant="body1">
                              {unit.monthly_rent ? `${unit.monthly_rent} KES/month` : 'Rent not set'}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>                              <Chip 
                                label={unit.is_occupied ? 'Occupied' : 'Vacant'}
                                color={unit.is_occupied ? 'primary' : 'default'}
                                size="small"
                              />
                              <Box>
                                <Button 
                                  size="small" 
                                  onClick={() => handleUnitFormOpen(unit)}
                                  sx={{ mr: 1 }}
                                >
                                  Edit
                                </Button>
                                <Button size="small">View</Button>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            )}
            
            {/* Tenants Tab */}
            {selectedTab === 2 && (
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tenants
                </Typography>
                <Typography paragraph>
                  No tenants information available for this property yet.
                </Typography>
              </CardContent>
            )}
            
            {/* Maintenance Tab */}
            {selectedTab === 3 && (
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Maintenance
                </Typography>
                <Typography paragraph>
                  No maintenance tickets for this property yet.
                </Typography>
              </CardContent>
            )}
          </Card>
        </Grid>      </Grid>
      
      {/* Unit Form Dialog */}
      {unitFormOpen && (
        <UnitForm
          propertyId={property.id}
          initialData={selectedUnit}
          open={unitFormOpen}
          onClose={() => {
            setUnitFormOpen(false);
            setSelectedUnit(null);
          }}
          onUnitAdded={handleUnitAdded}
        />
      )}
    </Container>
  );
}

export default PropertyDetail;
