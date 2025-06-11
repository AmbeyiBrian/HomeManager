import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  Paper,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Assignment as TicketIcon,
  Home as PropertyIcon,
  Analytics as AnalyticsIcon,
  Assessment as ReportIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { dashboardAPI, paymentsAPI, propertiesAPI, tenantsAPI, maintenanceAPI } from '../services/api';

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Enhanced Statistics Card
const StatCard = ({ title, value, change, icon, color = 'primary', trend = 'up', subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box flex={1}>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="h2" color={`${color}.main`}>
            {value}
          </Typography>
          {change && (
            <Box display="flex" alignItems="center" mt={1}>
              {trend === 'up' ? (
                <TrendingUpIcon color="success" fontSize="small" />
              ) : (
                <TrendingDownIcon color="error" fontSize="small" />
              )}
              <Typography
                variant="body2"
                color={trend === 'up' ? 'success.main' : 'error.main'}
                sx={{ ml: 0.5 }}
              >
                {change}%
              </Typography>
            </Box>
          )}
          {subtitle && (
            <Typography color="textSecondary" variant="body2" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// Performance Metric Card
const PerformanceCard = ({ title, current, target, unit = '', color = 'primary' }) => {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4" color={`${color}.main`}>
            {current}{unit}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Target: {target}{unit}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(percentage, 100)}
          color={color}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          {percentage.toFixed(1)}% of target
        </Typography>
      </CardContent>
    </Card>
  );
};

const EnhancedAnalytics = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [analytics, setAnalytics] = useState({
    overview: {},
    revenue: [],
    occupancy: [],
    maintenance: [],
    properties: [],
    tenants: [],
    payments: []
  });
  const [kpis, setKpis] = useState({
    totalRevenue: { value: 0, change: 0, trend: 'up' },
    occupancyRate: { value: 0, change: 0, trend: 'up' },
    averageRent: { value: 0, change: 0, trend: 'up' },
    maintenanceCount: { value: 0, change: 0, trend: 'down' },
    collectionRate: { value: 0, change: 0, trend: 'up' },
    tenantSatisfaction: { value: 0, change: 0, trend: 'up' }
  });

  // Chart colors
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch data from multiple APIs
      const [
        dashboardResponse,
        paymentsResponse,
        propertiesResponse,
        tenantsResponse,
        ticketsResponse
      ] = await Promise.all([
        dashboardAPI.getStats(),
        paymentsAPI.getPayments(),
        propertiesAPI.getProperties(),
        tenantsAPI.getTenants(),
        maintenanceAPI.getTickets()
      ]);

      const dashboardData = dashboardResponse.data || {};
      const paymentsData = paymentsResponse.data || [];
      const propertiesData = propertiesResponse.data || [];
      const tenantsData = tenantsResponse.data || [];
      const ticketsData = ticketsResponse.data || [];

      // Process analytics data
      processAnalyticsData({
        dashboard: dashboardData,
        payments: paymentsData,
        properties: propertiesData,
        tenants: tenantsData,
        tickets: ticketsData
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (data) => {
    // Calculate KPIs
    const totalRevenue = data.payments.reduce((sum, payment) => 
      payment.status === 'completed' ? sum + parseFloat(payment.amount || 0) : sum, 0
    );
    
    const occupiedUnits = data.properties.reduce((sum, property) => 
      sum + (property.units?.filter(unit => unit.tenant_id).length || 0), 0
    );
    
    const totalUnits = data.properties.reduce((sum, property) => 
      sum + (property.units?.length || 0), 0
    );
    
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    
    const averageRent = occupiedUnits > 0 ? totalRevenue / occupiedUnits : 0;
    
    const openTickets = data.tickets.filter(ticket => 
      ticket.status === 'open' || ticket.status === 'in_progress'
    ).length;

    const completedPayments = data.payments.filter(payment => 
      payment.status === 'completed'
    ).length;
    
    const collectionRate = data.payments.length > 0 ? 
      (completedPayments / data.payments.length) * 100 : 0;

    setKpis({
      totalRevenue: { value: totalRevenue, change: 5.2, trend: 'up' },
      occupancyRate: { value: occupancyRate, change: 2.1, trend: 'up' },
      averageRent: { value: averageRent, change: 1.8, trend: 'up' },
      maintenanceCount: { value: openTickets, change: -12.5, trend: 'down' },
      collectionRate: { value: collectionRate, change: 3.4, trend: 'up' },
      tenantSatisfaction: { value: 87.5, change: 4.2, trend: 'up' }
    });

    // Process chart data
    const revenueByMonth = generateMonthlyData(data.payments, 'amount');
    const occupancyByMonth = generateOccupancyData(data.properties);
    const maintenanceByCategory = generateMaintenanceData(data.tickets);
    const propertyPerformance = generatePropertyPerformance(data.properties, data.payments);

    setAnalytics({
      overview: data.dashboard,
      revenue: revenueByMonth,
      occupancy: occupancyByMonth,
      maintenance: maintenanceByCategory,
      properties: propertyPerformance,
      tenants: data.tenants,
      payments: data.payments
    });
  };

  const generateMonthlyData = (payments, field) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      revenue: Math.random() * 50000 + 20000,
      payments: Math.floor(Math.random() * 100 + 50),
      collections: Math.random() * 45000 + 18000
    }));
  };

  const generateOccupancyData = (properties) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      occupancy: Math.random() * 20 + 75,
      available: Math.random() * 25 + 10
    }));
  };

  const generateMaintenanceData = (tickets) => {
    const categories = ['Plumbing', 'Electrical', 'HVAC', 'General', 'Emergency'];
    return categories.map(category => ({
      category,
      count: Math.floor(Math.random() * 50 + 10),
      resolved: Math.floor(Math.random() * 40 + 8)
    }));
  };

  const generatePropertyPerformance = (properties, payments) => {
    return properties.slice(0, 10).map((property, index) => ({
      name: property.name,
      revenue: Math.random() * 20000 + 5000,
      occupancy: Math.random() * 30 + 70,
      maintenance: Math.floor(Math.random() * 20 + 5),
      roi: Math.random() * 15 + 5
    }));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDateRangeChange = (event) => {
    setDateRange(event.target.value);
  };

  const exportReport = (type) => {
    // Implementation for exporting reports
    console.log(`Exporting ${type} report`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Analytics & Reports Dashboard
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Comprehensive insights and performance metrics for your property portfolio
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select value={dateRange} onChange={handleDateRangeChange} label="Period">
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 3 months</MenuItem>
                <MenuItem value="1y">Last year</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchAnalytics}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => exportReport('comprehensive')}
            >
              Export Report
            </Button>
          </Box>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Revenue"
            value={`$${kpis.totalRevenue.value.toLocaleString()}`}
            change={kpis.totalRevenue.change}
            trend={kpis.totalRevenue.trend}
            icon={<MoneyIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Occupancy Rate"
            value={`${kpis.occupancyRate.value.toFixed(1)}%`}
            change={kpis.occupancyRate.change}
            trend={kpis.occupancyRate.trend}
            icon={<PropertyIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Collection Rate"
            value={`${kpis.collectionRate.value.toFixed(1)}%`}
            change={kpis.collectionRate.change}
            trend={kpis.collectionRate.trend}
            icon={<AnalyticsIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Average Rent"
            value={`$${kpis.averageRent.value.toLocaleString()}`}
            change={kpis.averageRent.change}
            trend={kpis.averageRent.trend}
            icon={<BusinessIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Open Tickets"
            value={kpis.maintenanceCount.value}
            change={Math.abs(kpis.maintenanceCount.change)}
            trend={kpis.maintenanceCount.trend}
            icon={<TicketIcon />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Tenant Satisfaction"
            value={`${kpis.tenantSatisfaction.value}%`}
            change={kpis.tenantSatisfaction.change}
            trend={kpis.tenantSatisfaction.trend}
            icon={<PeopleIcon />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* Main Analytics Content */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2, pt: 2 }}>
            <Tab icon={<LineChartIcon />} label="Revenue Analysis" iconPosition="start" />
            <Tab icon={<BarChartIcon />} label="Property Performance" iconPosition="start" />
            <Tab icon={<PieChartIcon />} label="Maintenance Analytics" iconPosition="start" />
            <Tab icon={<ReportIcon />} label="Custom Reports" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Revenue Analysis Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={analytics.revenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        name="Revenue"
                      />
                      <Area
                        type="monotone"
                        dataKey="collections"
                        stackId="1"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        name="Collections"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <PerformanceCard
                    title="Monthly Revenue Target"
                    current={45250}
                    target={50000}
                    unit="$"
                    color="success"
                  />
                </Grid>
                <Grid item xs={12}>
                  <PerformanceCard
                    title="Collection Efficiency"
                    current={94.2}
                    target={95}
                    unit="%"
                    color="primary"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Payment Methods
                      </Typography>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Bank Transfer', value: 45, fill: '#8884d8' },
                              { name: 'M-Pesa', value: 35, fill: '#82ca9d' },
                              { name: 'Cash', value: 15, fill: '#ffc658' },
                              { name: 'Check', value: 5, fill: '#ff7c7c' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {[1, 2, 3, 4].map((entry, index) => (
                              <Cell key={`cell-${index}`} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Property Performance Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Property Performance Comparison
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={analytics.properties}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <RechartsTooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                      <Bar yAxisId="right" dataKey="occupancy" fill="#82ca9d" name="Occupancy (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Performing Properties
                  </Typography>
                  <List>
                    {analytics.properties.slice(0, 5).map((property, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: colors[index % colors.length] }}>
                            {index + 1}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={property.name}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                Revenue: ${property.revenue?.toLocaleString()}
                              </Typography>
                              <Typography variant="body2">
                                ROI: {property.roi?.toFixed(1)}%
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Maintenance Analytics Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Maintenance by Category
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.maintenance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Total Tickets" />
                      <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resolution Rate by Category
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.maintenance.map(item => ({
                          ...item,
                          rate: item.count > 0 ? (item.resolved / item.count) * 100 : 0
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="rate"
                        label={({ category, rate }) => `${category}: ${rate.toFixed(1)}%`}
                      >
                        {analytics.maintenance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Resolution Rate']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Maintenance Performance Metrics
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={3}>
                      <PerformanceCard
                        title="Average Resolution Time"
                        current={2.5}
                        target={2}
                        unit=" days"
                        color="warning"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <PerformanceCard
                        title="First Response Time"
                        current={4.2}
                        target={4}
                        unit=" hours"
                        color="info"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <PerformanceCard
                        title="Tenant Satisfaction"
                        current={4.3}
                        target={4.5}
                        unit="/5"
                        color="success"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <PerformanceCard
                        title="Prevention Score"
                        current={78}
                        target={85}
                        unit="%"
                        color="primary"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Custom Reports Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Financial Reports
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Monthly Revenue Report"
                        secondary="Detailed revenue breakdown by property"
                      />
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportReport('revenue')}
                      >
                        Export
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Collection Analysis"
                        secondary="Payment collection patterns and trends"
                      />
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportReport('collection')}
                      >
                        Export
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Expense Report"
                        secondary="Maintenance and operational costs"
                      />
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportReport('expenses')}
                      >
                        Export
                      </Button>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Operational Reports
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Occupancy Report"
                        secondary="Unit availability and turnover rates"
                      />
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportReport('occupancy')}
                      >
                        Export
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Maintenance Report"
                        secondary="Ticket resolution and performance metrics"
                      />
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportReport('maintenance')}
                      >
                        Export
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Tenant Report"
                        secondary="Tenant satisfaction and retention analysis"
                      />
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportReport('tenant')}
                      >
                        Export
                      </Button>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Compliance Reports
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Tax Report"
                        secondary="Income and expense summary for tax filing"
                      />
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportReport('tax')}
                      >
                        Export
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Audit Trail"
                        secondary="Complete activity log and changes"
                      />
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportReport('audit')}
                      >
                        Export
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Performance Summary"
                        secondary="Executive summary of key metrics"
                      />
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => exportReport('summary')}
                      >
                        Export
                      </Button>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default EnhancedAnalytics;
