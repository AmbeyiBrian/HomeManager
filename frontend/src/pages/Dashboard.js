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
  Chip
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
  PriorityHigh as PriorityHighIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import AnalyticsCharts from '../components/AnalyticsCharts';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    properties: [],
    units: [],
    tenants: [],
    tickets: [],
    pendingPayments: [],
    upcomingPayments: [],
    kpis: {
      rentCollected: 0,
      dueRent: 0,
      openTickets: 0,
      occupancyRate: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0
    }
  });
  const navigate = useNavigate();
  const { authInitialized } = useAuth();
  
  useEffect(() => {
    // Only fetch dashboard data when authentication is fully initialized
    if (!authInitialized) {
      return; // Exit early if auth isn't initialized
    }
      const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const requests = [
          dashboardAPI.getProperties(),
          dashboardAPI.getUnits(),
          dashboardAPI.getTenants(),
          dashboardAPI.getOpenTickets(),
          dashboardAPI.getPendingPayments(),
          dashboardAPI.getPaidPayments(),
          dashboardAPI.getKPIs()
        ];
          const [
          propertiesRes,
          unitsRes,
          tenantsRes,
          ticketsRes,
          pendingPaymentsRes,
          paidPaymentsRes,
          kpisRes
        ] = await Promise.all(requests);
        
        // Use backend KPI data (from summary_data endpoint) as primary source
        const backendKPIs = kpisRes?.data || {};
        
        // Fallback calculations from individual API responses if backend data is missing
        const totalUnitsFromAPI = unitsRes.data.count || unitsRes.data.results?.length || 0;
        const occupiedUnitsFromAPI = unitsRes.data.results?.filter(unit => unit.tenant !== null || unit.is_occupied).length || 0;
        const fallbackOccupancyRate = totalUnitsFromAPI > 0 ? (100 - backendKPIs.vacancy_rate || ((occupiedUnitsFromAPI / totalUnitsFromAPI) * 100)).toFixed(1) : 0;
        
        // Calculate rent collected from paid payments (fallback)
        const rentCollectedFallback = paidPaymentsRes.data.results?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        
        // Calculate due rent from pending payments (fallback)
        const dueRentFallback = pendingPaymentsRes.data.results?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        
        setDashboardData({
          properties: propertiesRes.data.results || [],
          units: unitsRes.data.results || [],
          tenants: tenantsRes.data.results || [],
          tickets: ticketsRes.data.results || [],
          pendingPayments: pendingPaymentsRes.data.results || [],
          paidPayments: paidPaymentsRes.data.results || [],
          kpis: {
            // Use backend data first, then fallback to calculated values
            rentCollected: backendKPIs.recent_payment_sum || rentCollectedFallback,
            dueRent: dueRentFallback, // Backend doesn't provide this, use calculated value
            openTickets: backendKPIs.open_tickets || ticketsRes.data.results?.length || 0,
            occupancyRate: fallbackOccupancyRate,
            totalUnits: backendKPIs.unit_count || totalUnitsFromAPI,
            occupiedUnits: backendKPIs.occupied_count || occupiedUnitsFromAPI,
            vacantUnits: (backendKPIs.unit_count - backendKPIs.occupied_count) || (totalUnitsFromAPI - occupiedUnitsFromAPI)
          }
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [authInitialized]); // Add authInitialized as dependency
  
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);  };  return (    <Box sx={{      flexGrow: 1, 
      p: { xs: 2, sm: 3, md: 4 }, 
      maxWidth: '1600px',
      width: '100%',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        component="h1" 
        sx={{ 
          mb: 3, 
          pb: 1, 
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          fontWeight: 'medium',
          px: 1
        }}
      >
        Dashboard Overview
      </Typography>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {/* KPI Section Title */}
      <Typography 
        variant="h5" 
        component="h2" 
        sx={{ 
          mb: 3, 
          fontWeight: 'medium',
          px: 1 
        }}
      >
        Performance Metrics
      </Typography>
      
        {/* KPI Cards */}      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }} sx={{ mb: 5, width: '100%', mx: 0 }}>        {/* Rent Collected KPI */}
        <Grid item xs={12} sm={6} md={3} lg={3}>
          <Paper 
            elevation={2}
            sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              height: '100%',
              backgroundColor: '#e8f5e9',
              borderLeft: '4px solid #4caf50',
              borderRadius: 1,
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Rent Collected
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(dashboardData.kpis.rentCollected)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Current month
                </Typography>
              </Box>
              <AttachMoneyIcon sx={{ color: '#4caf50', fontSize: 40 }} />
            </Box>
          </Paper>        </Grid>          {/* Due Rent KPI */}
        <Grid item xs={12} sm={6} md={3} lg={3}>
          <Paper 
            elevation={2}
            sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              height: '100%',
              backgroundColor: '#fff3e0',
              borderLeft: '4px solid #ff9800',
              borderRadius: 1,
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Due Rent
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(dashboardData.kpis.dueRent)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Outstanding balance
                </Typography>
              </Box>
              <PriorityHighIcon sx={{ color: '#ff9800', fontSize: 40 }} />
            </Box>
          </Paper>        </Grid>          {/* Open Tickets KPI */}
        <Grid item xs={12} sm={6} md={3} lg={3}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              height: '100%',
              backgroundColor: '#e3f2fd',
              borderLeft: '4px solid #2196f3',
              borderRadius: 1,
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Open Tickets
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                  {dashboardData.kpis.openTickets}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Maintenance issues
                </Typography>
              </Box>
              <BuildIcon sx={{ color: '#2196f3', fontSize: 40 }} />
            </Box>
          </Paper>        </Grid>          {/* Occupancy Rate KPI */}
        <Grid item xs={12} sm={6} md={3} lg={3}>
          <Paper 
            elevation={2}
            sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              height: '100%',
              backgroundColor: '#f3e5f5',
              borderLeft: '4px solid #9c27b0',
              borderRadius: 1,
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Occupancy Rate
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                  {dashboardData.kpis.occupancyRate}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {dashboardData.kpis.occupiedUnits}/{dashboardData.kpis.totalUnits} units
                </Typography>
              </Box>
              <PercentIcon sx={{ color: '#9c27b0', fontSize: 40 }} />
            </Box>
          </Paper>        </Grid>      </Grid>
      
      {/* Analytics Charts Section */}
      <Box sx={{ my: 4, borderBottom: '1px solid rgba(0,0,0,0.08)' }} />
      
      <Typography 
        variant="h5" 
        component="h2" 
        sx={{ 
          mb: 3, 
          fontWeight: 'medium',
          px: 1 
        }}
      >
        Analytics & Insights
      </Typography>
        <Box sx={{ width: '100%', overflowX: 'hidden' }}>
        <AnalyticsCharts dashboardData={dashboardData} />
      </Box>
      {/* Divider with vertical spacing */}
      <Box sx={{ my: 4, borderBottom: '1px solid rgba(0,0,0,0.08)' }} />
      
      {/* Section Title */}
      <Typography 
        variant="h5" 
        component="h2" 
        sx={{ 
          mb: 3, 
          fontWeight: 'medium',
          px: 1 
        }}
      >
        Property Management      </Typography>          {/* Properties and Units */}        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 6, mt: 1, width: '100%', mx: 0 }}>
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              height: '100%',
              borderRadius: 1,
              transition: 'box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: 3
              } 
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                pb: 1, 
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                fontWeight: 'medium',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >            
            <HomeIcon fontSize="small" color="primary" sx={{ fontSize: 20 }} />
              Properties
            </Typography>
            {dashboardData.properties.length > 0 ? (
              <List sx={{ p: 0 }}>
                {dashboardData.properties.slice(0, 5).map((property) => (
                  <ListItem 
                    button 
                    key={property.id}
                    onClick={() => navigate(`/properties/${property.id}`)}
                    sx={{ 
                      borderRadius: 1, 
                      mb: 0.5,
                      '&:hover': { 
                        bgcolor: 'rgba(0, 0, 0, 0.04)' 
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: { xs: 36, sm: 42 } }}>
                      <HomeIcon color="action" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={property.name} 
                      secondary={`${property.address.slice(0, 30)}${property.address.length > 30 ? '...' : ''}`}
                      primaryTypographyProps={{
                        fontWeight: 'medium',
                        variant: 'body2'
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        color: 'text.secondary'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No properties found. Add your first property to get started.
              </Typography>
            )}            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              sx={{ 
                mt: 2,
                borderRadius: 1.5,
                py: 1,
                textTransform: 'none',
                fontWeight: 'medium',
                boxShadow: 1
              }}
              onClick={() => navigate('/properties')}
            >
              Manage Properties
            </Button>
          </Paper>          </Grid>          {/* Recent Maintenance */}        
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              height: '100%',
              borderRadius: 1,
              transition: 'box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: 3
              } 
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                pb: 1, 
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                fontWeight: 'medium',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >              <BuildIcon fontSize="small" color="primary" sx={{ fontSize: 20 }} />
              Maintenance Tickets
            </Typography>            {dashboardData.tickets.length > 0 ? (
              <List sx={{ p: 0 }}>
                {dashboardData.tickets.slice(0, 5).map((ticket) => (
                  <ListItem 
                    button 
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    sx={{ 
                      borderRadius: 1, 
                      mb: 0.5,
                      '&:hover': { 
                        bgcolor: 'rgba(0, 0, 0, 0.04)' 
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: { xs: 36, sm: 42 } }}>
                      <BuildIcon color={ticket.priority === 'high' ? 'error' : ticket.priority === 'medium' ? 'warning' : 'info'} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={ticket.title} 
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.3 }}>
                          <Chip 
                            size="small" 
                            label={formatStatus(ticket.status)} 
                            color={getStatusColor(ticket.status)}
                            variant="outlined" 
                            sx={{ height: 18, fontSize: '0.7rem' }}
                          />
                          <Chip 
                            size="small" 
                            label={formatPriority(ticket.priority)}
                            color={ticket.priority === 'high' ? 'error' : ticket.priority === 'medium' ? 'warning' : 'info'}
                            variant="outlined" 
                            sx={{ height: 18, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      primaryTypographyProps={{
                        fontWeight: 'medium',
                        variant: 'body2'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No open maintenance tickets.
              </Typography>
            )}            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              sx={{ 
                mt: 2,
                borderRadius: 1.5,
                py: 1,
                textTransform: 'none',
                fontWeight: 'medium',
                boxShadow: 1
              }}
              onClick={() => navigate('/tickets')}
            >
              View All Tickets
            </Button>
          </Paper>        </Grid>          {/* Payment Reminders */}        
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              height: '100%',
              borderRadius: 1,
              transition: 'box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: 3
              } 
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                pb: 1, 
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                fontWeight: 'medium',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >              
             <AttachMoneyIcon fontSize="small" color="primary" sx={{ fontSize: 20 }} />
              Payment Reminders
            </Typography>            
            {dashboardData.pendingPayments.length > 0 ? (
              <List sx={{ p: 0 }}>
                {dashboardData.pendingPayments.slice(0, 5).map((payment) => (
                  <ListItem 
                    key={payment.id}
                    sx={{ 
                      borderRadius: 1, 
                      mb: 0.5,
                      py: { xs: 0.75, sm: 1 }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: { xs: 36, sm: 42 } }}>
                      <EventIcon color={new Date(payment.due_date) < new Date() ? 'error' : 'primary'} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {payment.tenant_name}
                          </Typography>
                          <Typography variant="body2" color="primary" fontWeight="bold">
                            {formatCurrency(payment.amount)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ mt: 0.5 }}>
                          Due: {new Date(payment.due_date).toLocaleDateString()}
                        </Typography>
                      }
                      sx={{ my: 0 }}
                    />
                    <Chip 
                      size="small" 
                      color={new Date(payment.due_date) < new Date() ? 'error' : 'warning'} 
                      label={new Date(payment.due_date) < new Date() ? 'Overdue' : 'Upcoming'}
                      sx={{ 
                        fontSize: '0.7rem', 
                        height: 22,
                        minWidth: 70,
                        ml: 0.5
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No pending payments.
              </Typography>
            )}            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              sx={{ 
                mt: 2,
                borderRadius: 1.5,
                py: 1,
                textTransform: 'none',
                fontWeight: 'medium',
                boxShadow: 1
              }}
              onClick={() => navigate('/payments')}
            >
              Manage Payments
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper component for summary cards
const SummaryCard = ({ title, count, subtitle, icon, onClick }) => (
  <Card elevation={2} sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {count}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {icon}
      </Box>
    </CardContent>
    <CardActions>
      <Button size="small" onClick={onClick}>View Details</Button>
    </CardActions>
  </Card>
);

// Helper component for KPI cards
const KpiCard = ({ title, value, icon, onClick }) => (
  <Card elevation={2} sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
        </Box>
        {icon}
      </Box>
    </CardContent>
    <CardActions>
      <Button size="small" onClick={onClick}>View Details</Button>
    </CardActions>
  </Card>
);

// Helper functions
const getTicketStatusIcon = (status) => {
  switch (status) {
    case 'new':
      return <WarningIcon color="error" />;
    case 'assigned':
      return <PersonIcon color="info" />;
    case 'in_progress':
      return <BuildIcon color="warning" />;
    case 'on_hold':
      return <ScheduleIcon color="warning" />;
    case 'resolved':
      return <CheckCircleIcon color="success" />;
    default:
      return <BuildIcon />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'new': return 'error';
    case 'assigned': return 'info';
    case 'in_progress': return 'warning';
    case 'resolved': return 'success';
    default: return 'default';
  }
};

const formatStatus = (status) => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatPriority = (priority) => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

export default Dashboard;
