import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField
} from '@mui/material';
import {
  Home as HomeIcon,
  Person as PersonIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowForwardIcon,
  AttachMoney as AttachMoneyIcon,
  Percent as PercentIcon,
  Event as EventIcon,
  PriorityHigh as PriorityHighIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  LocalAtm as LocalAtmIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  dashboardAPI, 
  analyticsAPI, 
  organizationsAPI, 
  maintenanceAPI, 
  paymentsAPI,
  noticesAPI,
  smsAPI 
} from '../services/api';
import AnalyticsCharts from '../components/AnalyticsCharts';

const EnhancedDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');
  const [quickActionDialog, setQuickActionDialog] = useState(null);
  
  const [dashboardData, setDashboardData] = useState({
    properties: [],
    units: [],
    tenants: [],
    tickets: [],
    pendingPayments: [],
    upcomingPayments: [],
    recentNotices: [],
    smsAnalytics: {},
    paymentAnalytics: {},
    propertyMetrics: {},
    kpis: {
      rentCollected: 0,
      dueRent: 0,
      openTickets: 0,
      occupancyRate: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      totalTenants: 0,
      totalProperties: 0,
      maintenanceRequests: 0,
      collectionRate: 0,
      avgRentAmount: 0
    }
  });
    const navigate = useNavigate();
  const { authInitialized, currentUser, currentOrganization } = useAuth();
  const fetchDashboardData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Get KPI data from backend
      const kpiResponse = await dashboardAPI.getKPIs().catch(() => ({ data: {} }));

      // Core dashboard data
      const coreRequests = [
        dashboardAPI.getProperties(),
        dashboardAPI.getUnits(),
        dashboardAPI.getTenants(),
        dashboardAPI.getOpenTickets(),
        dashboardAPI.getPendingPayments(),
        dashboardAPI.getPaidPayments(),
      ];

      // Enhanced analytics requests
      const analyticsRequests = [
        analyticsAPI.getPropertyMetrics().catch(() => ({ data: {} })),
        analyticsAPI.getPaymentAnalytics().catch(() => ({ data: {} })),
        analyticsAPI.getSMSAnalytics().catch(() => ({ data: {} })),
        noticesAPI.getAll(1, 5).catch(() => ({ data: { results: [] } })),
      ];

      const [
        propertiesRes,
        unitsRes,
        tenantsRes,
        ticketsRes,
        pendingPaymentsRes,
        paidPaymentsRes,
        propertyMetricsRes,
        paymentAnalyticsRes,
        smsAnalyticsRes,
        recentNoticesRes
      ] = await Promise.all([...coreRequests, ...analyticsRequests]);

      // Use backend KPI data if available, otherwise calculate from API responses
      const kpiData = kpiResponse.data;
      
      // Fallback calculations if KPI endpoint data is missing
      const totalUnits = kpiData.unit_count || unitsRes.data.count || unitsRes.data.results?.length || 0;
      const occupiedUnits = kpiData.occupied_count || unitsRes.data.results?.filter(unit => 
        unit.tenant !== null || unit.lease_status === 'active'
      ).length || 0;
      const totalProperties = kpiData.property_count || propertiesRes.data.count || propertiesRes.data.results?.length || 0;
      const totalTenants = kpiData.tenant_count || tenantsRes.data.count || tenantsRes.data.results?.length || 0;
      const openTickets = kpiData.open_tickets || ticketsRes.data.results?.filter(ticket => 
        ['new', 'assigned', 'in_progress'].includes(ticket.status)
      ).length || 0;

      // Payment calculations
      const totalRentDue = pendingPaymentsRes.data.results?.reduce((sum, payment) => 
        sum + parseFloat(payment.amount || 0), 0) || 0;
      const totalRentCollected = kpiData.recent_payment_sum || paidPaymentsRes.data.results?.reduce((sum, payment) => 
        sum + parseFloat(payment.amount || 0), 0) || 0;
      
      const collectionRate = totalRentDue > 0 ? 
        ((totalRentCollected / (totalRentCollected + totalRentDue)) * 100) : 100;
      const avgRentAmount = totalTenants > 0 ? 
        ((totalRentCollected + totalRentDue) / totalTenants) : 0;
      
      // Occupancy rate calculation
      const occupancyRate = kpiData.vacancy_rate !== undefined ? 
        (100 - kpiData.vacancy_rate) : 
        (totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100) : 0);

      setDashboardData({
        properties: propertiesRes.data.results || [],
        units: unitsRes.data.results || [],
        tenants: tenantsRes.data.results || [],
        tickets: ticketsRes.data.results || [],
        pendingPayments: pendingPaymentsRes.data.results || [],
        paidPayments: paidPaymentsRes.data.results || [],
        recentNotices: recentNoticesRes.data.results || [],
        smsAnalytics: smsAnalyticsRes.data || {},
        paymentAnalytics: paymentAnalyticsRes.data || {},
        propertyMetrics: propertyMetricsRes.data || {},
        kpis: {
          rentCollected: totalRentCollected,
          dueRent: totalRentDue,
          openTickets,
          occupancyRate: occupancyRate.toFixed(1),
          totalUnits,
          occupiedUnits,
          vacantUnits: totalUnits - occupiedUnits,
          totalTenants,
          totalProperties,
          maintenanceRequests: ticketsRes.data.count || ticketsRes.data.results?.length || 0,
          collectionRate: collectionRate.toFixed(1),
          avgRentAmount
        }
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authInitialized) return;
    fetchDashboardData();
  }, [authInitialized, selectedTimeframe]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'new': return 'warning';
      default: return 'default';
    }
  };

  const QuickActions = () => (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Quick Actions
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/properties/new')}
            sx={{ py: 1 }}
          >
            Add Property
          </Button>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={() => navigate('/tenants')}
            sx={{ py: 1 }}
          >
            Add Tenant
          </Button>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<NotificationsIcon />}
            onClick={() => navigate('/notices')}
            sx={{ py: 1 }}
          >
            Send Notice
          </Button>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<PhoneIcon />}
            onClick={() => setQuickActionDialog('sms')}
            sx={{ py: 1 }}
          >
            Send SMS
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, maxWidth: '1600px', width: '100%', margin: '0 auto' }}>      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'medium' }}>
            {currentOrganization?.name || 'HomeManager'}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Dashboard Overview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={selectedTimeframe}
              label="Timeframe"
              onChange={(e) => setSelectedTimeframe(e.target.value)}
            >
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {refreshing && <LinearProgress sx={{ mb: 2 }} />}

      {/* Quick Actions */}
      <QuickActions />

      {/* Enhanced KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            borderLeft: '4px solid #4caf50'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Rent Collected
                  </Typography>                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    {formatCurrency(dashboardData?.kpis?.rentCollected || 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Collection Rate: {dashboardData?.kpis?.collectionRate || 0}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4caf50', width: 48, height: 48 }}>
                  <AttachMoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
            borderLeft: '4px solid #ff9800'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Outstanding Rent
                  </Typography>                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                    {formatCurrency(dashboardData?.kpis?.dueRent || 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Avg: {formatCurrency(dashboardData?.kpis?.avgRentAmount || 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800', width: 48, height: 48 }}>
                  <LocalAtmIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Property Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            borderLeft: '4px solid #2196f3'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Occupancy Rate
                  </Typography>                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {dashboardData?.kpis?.occupancyRate || 0}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {dashboardData?.kpis?.occupiedUnits || 0}/{dashboardData?.kpis?.totalUnits || 0} units
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#2196f3', width: 48, height: 48 }}>
                  <BusinessIcon />
                </Avatar>
              </Box>
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={parseFloat(dashboardData?.kpis?.occupancyRate || 0)} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)',
            borderLeft: '4px solid #e91e63'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Maintenance Tickets
                  </Typography>                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#c2185b' }}>
                    {dashboardData?.kpis?.openTickets || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total: {dashboardData?.kpis?.maintenanceRequests || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e91e63', width: 48, height: 48 }}>
                  <BuildIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Secondary KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
              {dashboardData?.kpis?.totalProperties || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Properties
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
              {dashboardData?.kpis?.totalTenants || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Tenants
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
              {dashboardData?.kpis?.occupiedUnits || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Occupied Units
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" color="warning.main" sx={{ fontWeight: 'bold' }}>
              {dashboardData?.kpis?.vacantUnits || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Vacant Units
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Content Sections */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Recent Maintenance Requests
            </Typography>            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {dashboardData?.tickets?.length > 0 ? (
                <List dense>
                  {dashboardData.tickets.slice(0, 5).map((ticket) => (
                    <ListItem 
                      key={ticket.id} 
                      button 
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      divider
                    >
                      <ListItemIcon>
                        <BuildIcon color={getStatusColor(ticket.status)} />
                      </ListItemIcon>
                      <ListItemText
                        primary={ticket.title || ticket.description?.substring(0, 50)}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {ticket.property_name || 'Property'} - Unit {ticket.unit_number || 'N/A'}
                            </Typography>
                            <Chip 
                              label={ticket.status} 
                              size="small" 
                              color={getStatusColor(ticket.status)}
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
                  No recent maintenance requests
                </Typography>
              )}
            </Box>
            <CardActions>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/tickets')}
              >
                View All Tickets
              </Button>
            </CardActions>
          </Paper>
        </Grid>

        {/* Pending Payments */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Pending Payments
            </Typography>            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {dashboardData?.pendingPayments?.length > 0 ? (
                <List dense>
                  {dashboardData.pendingPayments.slice(0, 5).map((payment) => (
                    <ListItem key={payment.id} divider>
                      <ListItemIcon>
                        <AttachMoneyIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${payment.tenant_name || 'Tenant'} - ${formatCurrency(payment.amount)}`}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              Due: {new Date(payment.due_date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {payment.property_name} - Unit {payment.unit_number}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
                  No pending payments
                </Typography>
              )}
            </Box>
            <CardActions>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/payments')}
              >
                View All Payments
              </Button>
            </CardActions>
          </Paper>
        </Grid>

        {/* Recent Notices */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Recent Notices
            </Typography>            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {dashboardData?.recentNotices?.length > 0 ? (
                <List dense>
                  {dashboardData.recentNotices.map((notice) => (
                    <ListItem key={notice.id} divider>
                      <ListItemIcon>
                        <NotificationsIcon color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary={notice.title}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {notice.message?.substring(0, 100)}...
                            </Typography>
                            <Typography variant="caption" display="block" color="textSecondary">
                              {new Date(notice.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
                  No recent notices
                </Typography>
              )}
            </Box>
            <CardActions>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/notices')}
              >
                View All Notices
              </Button>
            </CardActions>
          </Paper>
        </Grid>

        {/* Analytics Charts */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              Analytics Overview
            </Typography>
            <AnalyticsCharts data={dashboardData} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EnhancedDashboard;
