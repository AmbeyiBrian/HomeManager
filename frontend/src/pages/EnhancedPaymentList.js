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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  AttachMoney as PaymentIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Receipt as ReceiptIcon,
  CheckCircle as PaidIcon,
  Schedule as PendingIcon,
  Cancel as FailedIcon,
  Warning as OverdueIcon,
  Home as PropertyIcon,
  Room as UnitIcon,
  Person as PersonIcon,
  DateRange as DateIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  FilterList as FilterIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Refresh as RefreshIcon,
  Download as ExportIcon,
  Send as SendIcon,
  Print as PrintIcon,
  MonetizationOn as MoneyIcon,
  AccessTime as TimeIcon,
  Category as CategoryIcon,
  Payment as PaymentMethodIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { 
  paymentsAPI, 
  propertiesAPI, 
  tenantsAPI, 
  unitsAPI, 
  leasesAPI, 
  dashboardAPI 
} from '../services/api';
import EnhancedTable from '../components/EnhancedTable';

function EnhancedPaymentList() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  
  // Reference data
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  
  // UI states
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  
  // Statistics
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    averagePayment: 0,
    todayPayments: 0,
    monthlyGrowth: 0
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
        paymentsResponse,
        propertiesResponse,
        tenantsResponse,
        unitsResponse
      ] = await Promise.all([
        paymentsAPI.getAllPayments(),
        propertiesAPI.getAll(),
        tenantsAPI.getAll(),
        unitsAPI.getAll()
      ]);

      const paymentsData = Array.isArray(paymentsResponse.data) 
        ? paymentsResponse.data 
        : paymentsResponse.data?.results || [];
      
      const propertiesData = Array.isArray(propertiesResponse.data) 
        ? propertiesResponse.data 
        : propertiesResponse.data?.results || [];
      
      const tenantsData = Array.isArray(tenantsResponse.data) 
        ? tenantsResponse.data 
        : tenantsResponse.data?.results || [];
      
      const unitsData = Array.isArray(unitsResponse.data) 
        ? unitsResponse.data 
        : unitsResponse.data?.results || [];

      // Create lookup maps
      const tenantsMap = tenantsData.reduce((acc, tenant) => {
        acc[tenant.id] = tenant;
        return acc;
      }, {});

      const unitsMap = unitsData.reduce((acc, unit) => {
        acc[unit.id] = unit;
        return acc;
      }, {});

      const propertiesMap = propertiesData.reduce((acc, property) => {
        acc[property.id] = property;
        return acc;
      }, {});

      // Enhance payment data
      const enhancedPayments = paymentsData.map(payment => {
        const unit = unitsMap[payment.unit] || {};
        const property = propertiesMap[unit.property] || {};
        const tenant = tenantsMap[payment.tenant] || {};

        return {
          ...payment,
          tenant_details: tenant,
          unit_details: unit,
          property_details: property,
          tenant_name: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || `Tenant ${payment.tenant}`,
          unit_number: unit.unit_number || `Unit ${payment.unit}`,
          property_name: property.name || 'Unknown Property'
        };
      });

      setPayments(enhancedPayments);
      setProperties(propertiesData);
      setTenants(tenantsData);
      setUnits(unitsData);
      
      // Calculate statistics
      calculateStats(enhancedPayments);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load payment data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData) => {
    const totalPayments = paymentsData.length;
    const totalAmount = paymentsData.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
    const pendingPayments = paymentsData.filter(p => p.status === 'pending').length;
    const completedPayments = paymentsData.filter(p => p.status === 'completed').length;
    const failedPayments = paymentsData.filter(p => p.status === 'failed').length;
    const averagePayment = totalPayments > 0 ? totalAmount / totalPayments : 0;
    
    const today = new Date().toISOString().split('T')[0];
    const todayPayments = paymentsData.filter(p => 
      p.date_paid && p.date_paid.startsWith(today)
    ).length;

    setStats({
      totalPayments,
      totalAmount,
      pendingPayments,
      completedPayments,
      failedPayments,
      averagePayment,
      todayPayments,
      monthlyGrowth: 12.5 // This would come from analytics API
    });
  };

  // Apply filters
  useEffect(() => {
    let filtered = payments;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(payment =>
        payment.reference_number?.toLowerCase().includes(searchLower) ||
        payment.description?.toLowerCase().includes(searchLower) ||
        payment.tenant_name?.toLowerCase().includes(searchLower) ||
        payment.unit_number?.toLowerCase().includes(searchLower) ||
        payment.property_name?.toLowerCase().includes(searchLower) ||
        payment.amount?.toString().includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Property filter
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(payment => 
        payment.unit_details?.property?.toString() === propertyFilter
      );
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_method === paymentMethodFilter);
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(payment => 
        payment.date_paid >= dateRange.from
      );
    }
    if (dateRange.to) {
      filtered = filtered.filter(payment => 
        payment.date_paid <= dateRange.to
      );
    }

    // Amount range filter
    if (amountRange.min) {
      filtered = filtered.filter(payment => 
        parseFloat(payment.amount) >= parseFloat(amountRange.min)
      );
    }
    if (amountRange.max) {
      filtered = filtered.filter(payment => 
        parseFloat(payment.amount) <= parseFloat(amountRange.max)
      );
    }

    setFilteredPayments(filtered);
    setCurrentPage(1);
  }, [payments, searchTerm, statusFilter, propertyFilter, paymentMethodFilter, dateRange, amountRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDeleteClick = (payment) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    
    try {
      await paymentsAPI.deletePayment(paymentToDelete.id);
      setPayments(payments.filter(p => p.id !== paymentToDelete.id));
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError('Failed to delete payment. Please try again.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <PaidIcon color="success" />;
      case 'pending': return <PendingIcon color="warning" />;
      case 'failed': return <FailedIcon color="error" />;
      case 'overdue': return <OverdueIcon color="error" />;
      default: return <PaymentIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'bank_transfer': return <BankIcon />;
      case 'credit_card': return <CardIcon />;
      case 'mpesa': return <PaymentMethodIcon />;
      case 'cash': return <MoneyIcon />;
      default: return <PaymentIcon />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Pagination
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <PaymentIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{stats.totalPayments}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Payments
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
                <MoneyIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{formatCurrency(stats.totalAmount)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
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
                <Typography variant="h6">{stats.pendingPayments}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Payments
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
                <TrendingUpIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{formatCurrency(stats.averagePayment)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Payment
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
            placeholder="Search payments..."
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
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Property</InputLabel>
            <Select
              value={propertyFilter}
              label="Property"
              onChange={(e) => setPropertyFilter(e.target.value)}
            >
              <MenuItem value="all">All Properties</MenuItem>
              {properties.map((property) => (
                <MenuItem key={property.id} value={property.id.toString()}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={paymentMethodFilter}
              label="Payment Method"
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
            >
              <MenuItem value="all">All Methods</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="credit_card">Credit Card</MenuItem>
              <MenuItem value="mpesa">M-Pesa</MenuItem>
              <MenuItem value="cash">Cash</MenuItem>
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
      
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="From Date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="To Date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Min Amount"
            value={amountRange.min}
            onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Max Amount"
            value={amountRange.max}
            onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
          />
        </Grid>
      </Grid>
    </Paper>
  );

  const renderPaymentCards = () => (
    <Grid container spacing={2}>
      {paginatedPayments.map((payment) => (
        <Grid item xs={12} sm={6} md={4} key={payment.id}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: getStatusColor(payment.status) + '.main' }}>
                  {getStatusIcon(payment.status)}
                </Avatar>
              }
              action={
                <Box>
                  <IconButton size="small" onClick={() => navigate(`/payments/${payment.id}`)}>
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => navigate(`/payments/${payment.id}/edit`)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteClick(payment)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
              title={
                <Typography variant="h6">
                  {formatCurrency(payment.amount)}
                </Typography>
              }
              subheader={
                <Chip
                  label={payment.status}
                  color={getStatusColor(payment.status)}
                  size="small"
                />
              }
            />
            
            <CardContent>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ReceiptIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {payment.reference_number || 'No Reference'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {payment.tenant_name}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PropertyIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {payment.property_name} - {payment.unit_number}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getPaymentMethodIcon(payment.payment_method)}
                  <Typography variant="body2">
                    {payment.payment_method?.replace('_', ' ')?.toUpperCase() || 'N/A'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DateIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {formatDate(payment.date_paid)}
                  </Typography>
                </Box>
                
                {payment.description && (
                  <Typography variant="body2" color="text.secondary">
                    {payment.description}
                  </Typography>
                )}
              </Stack>
            </CardContent>
            
            <CardActions>
              <Button size="small" startIcon={<PrintIcon />}>
                Receipt
              </Button>
              <Button size="small" startIcon={<SendIcon />}>
                Resend
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const tableColumns = [
    {
      id: 'reference_number',
      label: 'Reference',
      minWidth: 120
    },
    {
      id: 'amount',
      label: 'Amount',
      minWidth: 100,
      format: (value) => formatCurrency(value)
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      format: (value) => (
        <Chip label={value} color={getStatusColor(value)} size="small" />
      )
    },
    {
      id: 'tenant_name',
      label: 'Tenant',
      minWidth: 150
    },
    {
      id: 'property_name',
      label: 'Property',
      minWidth: 150
    },
    {
      id: 'unit_number',
      label: 'Unit',
      minWidth: 80
    },
    {
      id: 'payment_method',
      label: 'Method',
      minWidth: 120,
      format: (value) => value?.replace('_', ' ')?.toUpperCase() || 'N/A'
    },
    {
      id: 'date_paid',
      label: 'Date Paid',
      minWidth: 120,
      format: formatDate
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 150,
      format: (value, row) => (
        <Box>
          <IconButton size="small" onClick={() => navigate(`/payments/${row.id}`)}>
            <VisibilityIcon />
          </IconButton>
          <IconButton size="small" onClick={() => navigate(`/payments/${row.id}/edit`)}>
            <EditIcon />
          </IconButton>
          <IconButton size="small" onClick={() => handleDeleteClick(row)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];

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
          <Typography color="text.primary">Payments</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Payment Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/payments/new')}
          >
            Record Payment
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
        Showing {paginatedPayments.length} of {filteredPayments.length} payments
        {searchTerm && ` matching "${searchTerm}"`}
      </Typography>

      {/* Payment List */}
      {viewMode === 'cards' ? (
        renderPaymentCards()
      ) : (
        <EnhancedTable
          data={paginatedPayments}
          columns={tableColumns}
          onRowClick={(payment) => navigate(`/payments/${payment.id}`)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Page {currentPage} of {totalPages}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add payment"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/payments/new')}
      >
        <AddIcon />
      </Fab>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Payment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this payment record? This action cannot be undone.
          </Typography>
          {paymentToDelete && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Payment: {formatCurrency(paymentToDelete.amount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reference: {paymentToDelete.reference_number}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default EnhancedPaymentList;
