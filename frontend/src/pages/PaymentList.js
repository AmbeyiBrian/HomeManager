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
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Paper,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { paymentsAPI, propertiesAPI } from '../services/api';
import EnhancedTable from '../components/EnhancedTable';

function PaymentList() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [properties, setProperties] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Transform payment data to include property and tenant names
  const transformPaymentData = (payments, properties) => {
    return payments.map(payment => {
      // Find property by unit ID
      let property = null;
      let unit = null;
      
      // Find the unit in any of the properties
      for (const prop of properties) {
        if (prop.units && Array.isArray(prop.units)) {
          const foundUnit = prop.units.find(u => u.id === payment.unit);
          if (foundUnit) {
            unit = foundUnit;
            property = prop;
            break;
          }
        }
      }
      
      // Prepare enhanced payment object
      return {
        ...payment,
        unit_number: unit ? unit.unit_number : `Unit ${payment.unit}`,
        property_name: property ? property.name : 'Unknown Property',
        tenant_name: `Tenant ${payment.tenant}`, // We'll update this when tenant data is available
        unit_details: {
          unit_number: unit ? unit.unit_number : payment.unit,
          property: property ? property.id : null,
          property_details: {
            id: property ? property.id : null,
            name: property ? property.name : 'Unknown Property'
          }
        },
        tenant_details: {
          id: payment.tenant,
          first_name: '', // Will be updated when tenant data is available
          last_name: ''  // Will be updated when tenant data is available
        }
      };
    });
  };
  
  // Load payments
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [paymentsResponse, propertiesResponse] = await Promise.all([
          paymentsAPI.getAllPayments(),
          propertiesAPI.getAll()
        ]);
        
        // Make sure payments is always an array
        const paymentsData = Array.isArray(paymentsResponse.data) ? paymentsResponse.data : 
                    Array.isArray(paymentsResponse.data.results) ? paymentsResponse.data.results : [];
        
        // Make sure properties is always an array
        const propsData = Array.isArray(propertiesResponse.data) ? propertiesResponse.data : 
                      Array.isArray(propertiesResponse.data.results) ? propertiesResponse.data.results : [];
        
        // Set properties
        setProperties(propsData);
        
        // Transform and set payments with property names
        setPayments(transformPaymentData(paymentsData, propsData));
      } catch (err) {
        console.error('Error fetching payments or properties:', err);
        setError('Failed to load payments. Please try again later.');
        setPayments([]); // Ensure payments is always an array even on error
        setProperties([]); // Ensure properties is always an array even on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayments();
  }, []);
  // Properties are now loaded with payments in the first useEffect
  
  // Apply filters and search
  const filteredPayments = payments.filter(payment => {
    let matchesSearch = true;
    let matchesStatus = true;
    let matchesProperty = true;
    let matchesDate = true;
      // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesSearch = 
        payment.reference_number?.toLowerCase().includes(searchLower) ||
        payment.description?.toLowerCase().includes(searchLower) ||
        payment.tenant_name?.toLowerCase().includes(searchLower) ||
        payment.unit_number?.toString().toLowerCase().includes(searchLower) ||
        payment.property_name?.toLowerCase().includes(searchLower) ||
        payment.amount?.toString().includes(searchTerm);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      matchesStatus = payment.status === statusFilter;
    }
      // Apply property filter
    if (propertyFilter !== 'all') {
      matchesProperty = payment.property === Number(propertyFilter);
    }
    
    // Apply date range filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      const paymentDate = new Date(payment.payment_date || payment.created_at);
      matchesDate = paymentDate >= fromDate;
    }
    
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); // Set to end of day
      const paymentDate = new Date(payment.payment_date || payment.created_at);
      matchesDate = matchesDate && paymentDate <= toDate;
    }
    
    return matchesSearch && matchesStatus && matchesProperty && matchesDate;
  });
    // Get color for status chip
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'initiated':
        return 'info';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };
  // Format status for display
  const formatStatus = (status) => {
    switch(status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'initiated':
        return 'Initiated';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
    }
  };  // Action handlers for Enhanced Table
  const handleRowAction = (action, payment) => {
    switch (action) {
      case 'view':
        // Navigate to payment details
        navigate(`/payments/${payment.id}`);
        break;
      case 'edit':
        // Navigate to edit payment
        navigate(`/payments/${payment.id}/edit`);
        break;
      case 'delete':
        // Handle delete action
        if (window.confirm(`Are you sure you want to delete this payment of ${payment.amount} for ${payment.description || 'rent'}?`)) {
          setLoading(true);
          paymentsAPI.deletePayment(payment.id)
            .then(() => {
              // Filter out the deleted payment from state
              setPayments(prevPayments => prevPayments.filter(p => p.id !== payment.id));
            })
            .catch(err => {
              console.error('Error deleting payment:', err);
              setError('Failed to delete the payment. Please try again.');
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
      id: 'description',
      label: 'Description',
      minWidth: 180,
      searchable: true,
      format: (value) => value || 'Rent Payment'
    },
    {
      id: 'tenant_name',
      label: 'Tenant',
      minWidth: 150,
      searchable: true,
      format: (value, row) => {
        if (row.tenant_details && row.tenant_details.name) {
          return row.tenant_details.name;
        }
        return value || 'N/A';
      }
    },
    {
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
      id: 'amount',
      label: 'Amount',
      minWidth: 120,
      align: 'right',
      format: (value) => value ? `$${parseFloat(value).toFixed(2)}` : 'N/A'
    },
    {
      id: 'payment_date',
      label: 'Payment Date',
      minWidth: 120,
      format: (value, row) => {
        const date = value || row.created_at;
        return date ? new Date(date).toLocaleDateString() : 'N/A';
      }
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      format: (value) => (
        <Chip 
          label={formatStatus(value)} 
          color={getStatusColor(value)}
          size="small"
        />
      )
    },
    {
      id: 'payment_method',
      label: 'Method',
      minWidth: 100,
      format: (value) => value || 'N/A'
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
  // Custom filters for the table
  const customFilters = [
    {
      id: 'status',
      label: 'Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'initiated', label: 'Initiated' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' }
      ]
    },
    {
      id: 'property',
      label: 'Property',
      options: properties.map(prop => ({
        value: prop.id,
        label: prop.name
      }))
    }
  ];
  
  // Handle date range changes
  const handleDateChange = (type) => (e) => {
    setDateRange({
      ...dateRange,
      [type]: e.target.value
    });
  };
  
  // Format currency for display
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') {
      return 'KES 0.00';
    }
    return `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Payment History
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Payments</Typography>
        </Breadcrumbs>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {filteredPayments.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Payments
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(
                    filteredPayments.reduce((sum, payment) => {
                      return payment.status === 'completed' ? sum + (Number(payment.amount) || 0) : sum;
                    }, 0)
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Amount Received
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {formatCurrency(
                    filteredPayments.reduce((sum, payment) => {
                      return payment.status === 'pending' ? sum + (Number(payment.amount) || 0) : sum;
                    }, 0)
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Payments
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4">
                  {filteredPayments.filter(payment => payment.status === 'completed').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed Payments
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            placeholder="Search payments..."
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
        
        <Grid item xs={6} sm={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="initiated">Initiated</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={2}>
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
        
        <Grid item xs={6} sm={2}>
          <TextField
            fullWidth
            label="From Date"
            type="date"
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            value={dateRange.from}
            onChange={handleDateChange('from')}
          />
        </Grid>
        
        <Grid item xs={6} sm={2}>
          <TextField
            fullWidth
            label="To Date"
            type="date"
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            value={dateRange.to}
            onChange={handleDateChange('to')}
          />
        </Grid>
        
        <Grid item xs={12} sm={1}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', height: '100%' }}>
            <Button
              variant="contained"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPropertyFilter('all');
                setDateRange({ from: '', to: '' });
              }}
              size="small"
              sx={{ height: '40px' }}
            >
              Reset
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : !Array.isArray(filteredPayments) || filteredPayments.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Payments Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {searchTerm || statusFilter !== 'all' || propertyFilter !== 'all' || dateRange.from || dateRange.to
              ? 'No payments match your search criteria. Try adjusting your filters.'
              : 'There are no payment records in the system yet.'}
          </Typography>          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/payments/new')}
          >
            Record Payment
          </Button>
        </Card>      ) : (
        <EnhancedTable
          data={filteredPayments}
          columns={columns}
          title="Payments"
          loading={loading}
          onRowAction={handleRowAction}
          actionItems={actionItems}
          searchable={false} // We have external search
          filterable={true}
          exportable={true}
          customFilters={customFilters}
          defaultSortColumn="payment_date"
          defaultSortDirection="desc"
        />
      )}
    </Container>
  );
}

export default PaymentList;
