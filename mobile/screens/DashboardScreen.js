import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import DashboardCard from '../components/DashboardCard';
import CacheBanner from '../components/CacheBanner';
import {
  OccupancyChart,
  RevenueChart,
  MaintenanceChart,
  PaymentStatusChart,
} from '../components/charts';

/**
 * Dashboard screen component
 * Shows analytics and summary data for properties, tickets, payments and tenants
 */
const DashboardScreen = ({ navigation }) => {
  const { user, isOffline, getCachedData, cacheDataForOffline } = useAuth();
  const { endpoints } = useApi();  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);  const [dashboardData, setDashboardData] = useState({
    properties: [],
    tenants: [],
    tickets: [],
    pendingPayments: [],
    fromCache: isOffline // Only show fromCache if we're actually offline at start
  });

  // Chart data states
  const [chartData, setChartData] = useState({
    occupancy: { occupied: 0, vacant: 0, maintenance: 0 },
    revenue: { months: [], values: [] },
    maintenance: { open: 0, inProgress: 0, completed: 0, closed: 0 },
    payments: { totalExpected: 0, collected: 0, pending: 0, overdue: 0 },
  });
  const [chartsLoading, setChartsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
        // Check if we're offline first
      if (isOffline) {
        // If offline, use cached data
        const dashboardSummary = await getCachedData('dashboard_summary') || {};
        const properties = await getCachedData('properties_data') || [];
        const tickets = await getCachedData('tickets_data') || [];
        const payments = await getCachedData('payments_data') || [];
        const tenants = await getCachedData('tenants_data') || [];
        
        setDashboardData({
          properties,
          tickets: tickets.filter(ticket => 
            ['new', 'assigned', 'in_progress'].includes(ticket.status)
          ),
          pendingPayments: payments.filter(payment => payment.status === 'pending'),
          tenants,
          summary: dashboardSummary,
          fromCache: true // This is correct since we're offline
        });

        setIsLoading(false);
        return;
      }
      
      try {
        // First fetch dashboard summary data from analytics endpoint
        const summaryResponse = await axios.get(endpoints.dashboardSummary);
        
        // Initialize responses as null
        let propertiesResponse = null;
        let ticketsResponse = null;
        let paymentsResponse = null;
        let tenantsResponse = null;
                
        try {
          // Fetch properties
          propertiesResponse = await axios.get(endpoints.properties);
        } catch (propError) {
          console.error('Error fetching properties:', propError.message);
        }
        
        try {          // Fetch tickets - use the open_tickets count from summary, but we still need the ticket details
          ticketsResponse = await axios.get(
            `${endpoints.tickets}?status=new&status=assigned&status=in_progress&status=on_hold`
          );
        } catch (ticketError) {
          console.error('Error fetching tickets:', ticketError.message);
        }
        
        try {
          // Fetch pending payments
          paymentsResponse = await axios.get(
            `${endpoints.payments}?status=pending`
          );
        } catch (paymentError) {
          console.error('Error fetching payments:', paymentError.message);
        }
        
        try {
          // Fetch tenants
          tenantsResponse = await axios.get(endpoints.tenants);
        } catch (tenantError) {
          console.error('Error fetching tenants:', tenantError.message);
        }
        
        // Extract data from responses, providing empty arrays as fallback
        const summaryData = summaryResponse.data;
        const propertiesData = propertiesResponse?.data?.results || [];
        const ticketsData = ticketsResponse?.data?.results || [];
        const paymentsData = paymentsResponse?.data?.results || [];
        const tenantsData = tenantsResponse?.          // Set data to state
        setDashboardData({
          properties: propertiesData,
          tickets: ticketsData,
          pendingPayments: paymentsData,
          tenants: tenantsData,
          summary: summaryData,
          fromCache: false // Explicitly mark as not from cache
        });
        
          
        // Cache data for offline use with our hybrid storage solution
        try {
          if (summaryData) await cacheDataForOffline('dashboard_summary', summaryData);
          if (propertiesData.length) await cacheDataForOffline('properties_data', propertiesData);
          if (ticketsData.length) await cacheDataForOffline('tickets_data', ticketsData);
          if (paymentsData.length) await cacheDataForOffline('payments_data', paymentsData);
          if (tenantsData.length) await cacheDataForOffline('tenants_data', tenantsData);
        } catch (cacheError) {
          console.error('Error caching dashboard data:', cacheError);
        }      } catch (error) {
        console.error('Error fetching online data:', error);
        
        // Try to fall back to cached data if online fetch fails
        const dashboardSummary = await getCachedData('dashboard_summary') || {};
        const properties = await getCachedData('properties_data') || [];
        const tickets = await getCachedData('tickets_data') || [];
        const payments = await getCachedData('payments_data') || [];
        const tenants = await getCachedData('tenants_data') || [];
        
        // Only mark as fromCache if we're actually offline or if we have a connection error
        const isNetworkError = error.message === 'Network Error' || error.code === 'ECONNABORTED';
        
        setDashboardData({
          properties,
          tickets: tickets.filter(ticket => 
            ['new', 'assigned', 'in_progress'].includes(ticket.status)
          ),
          pendingPayments: payments.filter(payment => payment.status === 'pending'),
          tenants,
          summary: dashboardSummary,
          error: `Error: ${error.message || 'Failed to fetch dashboard data'}`,
          fromCache: isOffline || isNetworkError
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error in dashboard data fetch:', error);
      setIsLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setChartsLoading(true);
      
      if (isOffline) {
        // Load cached analytics data
        const cachedAnalytics = await getCachedData('analytics_data') || {};
        setChartData({
          occupancy: cachedAnalytics.occupancy || { occupied: 0, vacant: 0, maintenance: 0 },
          revenue: cachedAnalytics.revenue || { months: [], values: [] },
          maintenance: cachedAnalytics.maintenance || { open: 0, inProgress: 0, completed: 0, closed: 0 },
          payments: cachedAnalytics.payments || { totalExpected: 0, collected: 0, pending: 0, overdue: 0 },
        });
        setChartsLoading(false);
        return;
      }

      try {
        // Fetch property metrics for occupancy data
        const propertyMetricsResponse = await axios.get(endpoints.propertyMetrics);
        const propertyMetrics = propertyMetricsResponse.data;

        // Fetch payment analytics
        const paymentAnalyticsResponse = await axios.get(endpoints.paymentAnalytics);
        const paymentAnalytics = paymentAnalyticsResponse.data;        // Process occupancy data
        const occupancyData = {
          occupied: propertyMetrics.total_occupied_units || 0,
          vacant: propertyMetrics.total_vacant_units || 0,
          maintenance: propertyMetrics.total_maintenance_units || 0,
        };

        // Process revenue data (last 6 months)
        const revenueData = {
          months: paymentAnalytics.monthly_revenue?.map(item => item.month) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          values: paymentAnalytics.monthly_revenue?.map(item => item.amount) || [0, 0, 0, 0, 0, 0],
        };

        // Process maintenance data
        const maintenanceData = {
          open: propertyMetrics.open_tickets || 0,
          inProgress: propertyMetrics.in_progress_tickets || 0,
          completed: propertyMetrics.completed_tickets || 0,
          closed: propertyMetrics.closed_tickets || 0,
        };

        // Process payment status data
        const paymentStatusData = {
          totalExpected: paymentAnalytics.total_expected || 0,
          collected: paymentAnalytics.total_collected || 0,
          pending: paymentAnalytics.total_pending || 0,
          overdue: paymentAnalytics.total_overdue || 0,
        };

        const analyticsData = {
          occupancy: occupancyData,
          revenue: revenueData,
          maintenance: maintenanceData,
          payments: paymentStatusData,
        };

        setChartData(analyticsData);

        // Cache the analytics data
        await cacheDataForOffline('analytics_data', analyticsData);

      } catch (error) {
        console.error('Error fetching analytics data:', error);
        
        // Try to load cached data as fallback
        const cachedAnalytics = await getCachedData('analytics_data') || {};
        setChartData({
          occupancy: cachedAnalytics.occupancy || { occupied: 0, vacant: 0, maintenance: 0 },
          revenue: cachedAnalytics.revenue || { months: [], values: [] },
          maintenance: cachedAnalytics.maintenance || { open: 0, inProgress: 0, completed: 0, closed: 0 },
          payments: cachedAnalytics.payments || { totalExpected: 0, collected: 0, pending: 0, overdue: 0 },
        });
      }
      
    } catch (error) {
      console.error('Error in analytics data fetch:', error);
    } finally {
      setChartsLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    
    // Only show from cache if we're actually offline
    if (!isOffline) {
      setDashboardData(prev => ({...prev, fromCache: false}));
    }
    
    await fetchDashboardData();
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAnalyticsData();
  }, []);
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );  }
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>      {/* Cache notification banner */}
      <CacheBanner 
        visible={dashboardData.fromCache} 
        message={isOffline ? "Offline mode - showing cached data" : "Showing cached data - pull to refresh"} 
      />
      
      {/* API debugger only shown in development */}
        
      {/* Dashboard Cards Row - Phase 1 Testing */}
      <View style={styles.cardsContainer}>        <DashboardCard
          title="Properties"
          value={dashboardData.summary?.property_count ? String(dashboardData.summary.property_count) : "0"}
          icon="home-outline"
          color="#3498db"
          subtitle={dashboardData.summary?.unit_count ? `${dashboardData.summary.unit_count} total units` : "0 total units"}
          trend={dashboardData.summary?.property_growth}
          loading={isLoading}
        />
        
        <DashboardCard
          title="Occupancy Rate"
          value={dashboardData.summary?.vacancy_rate ? `${(100 - dashboardData.summary.vacancy_rate).toFixed(1)}%` : "0.0%"}
          icon="people-outline"
          color="#2ecc71"
          subtitle={dashboardData.summary?.occupied_count ? `${dashboardData.summary.occupied_count} occupied` : "0 occupied"}
          trend={dashboardData.summary?.occupancy_trend}
          loading={isLoading}
        />
      </View>      {/* Second row of cards */}
      <View style={styles.cardsContainer}>        
        <DashboardCard
          title="Revenue (Month)"
          value={dashboardData.summary?.recent_payment_sum 
            ? `KSH ${Number(dashboardData.summary.recent_payment_sum).toLocaleString()}`
            : "KSH 0"}
          icon="cash-outline"
          color="#27ae60"
          subtitle="Last 30 days"
          trend={dashboardData.summary?.revenue_trend}
          loading={isLoading}
        />

        <DashboardCard
          title="Open Tickets"
          value={dashboardData.summary?.open_tickets 
            ? String(dashboardData.summary.open_tickets) 
            : "0"}
          icon="construct-outline"
          color="#e67e22"
          subtitle="Pending resolution"
          trend={dashboardData.summary?.tickets_trend}
          loading={isLoading}
        />
      </View>      {/* Charts Section */}
      <OccupancyChart 
        occupancyData={chartData.occupancy} 
        loading={chartsLoading} 
      />

      <RevenueChart 
        revenueData={chartData.revenue} 
        loading={chartsLoading} 
      />      <PaymentStatusChart 
        paymentData={chartData.payments} 
        loading={chartsLoading} 
      />

      <MaintenanceChart 
        maintenanceData={chartData.maintenance} 
        loading={chartsLoading} 
      />{/* Recent Activity Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="time-outline" size={24} color="#2c3e50" />
          <Text style={styles.cardTitle}>Recent Activity</Text>
        </View>
        
        {dashboardData.tickets && dashboardData.tickets.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Latest Tickets</Text>
            {dashboardData.tickets.slice(0, 3).map((ticket) => (
              <TouchableOpacity 
                key={ticket.id}
                style={styles.recentItem}
                onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
              >
                <View style={styles.priorityIndicator(ticket.priority || 'low')} />
                <View style={styles.recentItemContent}>
                  <Text style={styles.recentItemTitle} numberOfLines={1}>
                    {ticket.title ? String(ticket.title) : 'Untitled Ticket'}
                  </Text>
                  <Text style={styles.recentItemSubtitle} numberOfLines={1}>
                    {ticket.unit ? String(ticket.unit) : 'No Unit'} • {ticket.status ? String(ticket.status) : 'Unknown Status'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#bdc3c7" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {dashboardData.pendingPayments && dashboardData.pendingPayments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending Payments</Text>
            {dashboardData.pendingPayments.slice(0, 3).map((payment) => (
              <View key={payment.id} style={styles.recentItem}>
                <View style={[styles.priorityIndicator(), { backgroundColor: '#f39c12' }]} />
                <View style={styles.recentItemContent}>
                  <Text style={styles.recentItemTitle}>
                    {payment.tenant_name ? String(payment.tenant_name) : 'Unknown Tenant'}
                  </Text>
                  <Text style={styles.recentItemSubtitle}>
                    {payment.amount ? `$${Number(payment.amount).toLocaleString()}` : '$0'} • Due: {payment.due_date ? new Date(payment.due_date).toLocaleDateString() : 'Unknown'}
                  </Text>
                </View>
                <Text style={styles.amountText}>{payment.amount ? `$${Number(payment.amount).toLocaleString()}` : '$0'}</Text>
              </View>
            ))}
          </>
        )}

        {(!dashboardData.tickets || dashboardData.tickets.length === 0) && 
         (!dashboardData.pendingPayments || dashboardData.pendingPayments.length === 0) && (
          <Text style={styles.emptyText}>No recent activity</Text>
        )}
      </View>      {/* SMS Analytics Section */}
      {dashboardData.summary && dashboardData.summary.recent_sms_count > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbox-outline" size={24} color="#2c3e50" />
            <Text style={styles.cardTitle}>SMS Communications</Text>
          </View>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticItem}>
              <Text style={styles.analyticLabel}>Messages Sent</Text>
              <Text style={styles.analyticValue}>
                {dashboardData.summary.recent_sms_count ? String(dashboardData.summary.recent_sms_count) : '0'}
              </Text>
            </View>
            <View style={styles.analyticItem}>
              <Text style={styles.analyticLabel}>Delivery Rate</Text>
              <Text style={styles.analyticValue}>
                {dashboardData.summary.sms_delivery_rate ? `${String(dashboardData.summary.sms_delivery_rate)}%` : '0%'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',  
  },
  cardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 5,
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  analyticItem: {
    alignItems: 'center',
    flex: 1,
  },
  analyticLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  analyticValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    marginTop: 10,
  },
  statsNumber: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 20,
  },
  statsSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 15,
  },
  recentList: {
    marginBottom: 15,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priorityIndicator: (priority) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 
      priority === 'urgent' ? '#e74c3c' : 
      priority === 'high' ? '#f39c12' : 
      priority === 'medium' ? '#3498db' : '#2ecc71',
    marginRight: 10,
  }),
  recentItemContent: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  recentItemSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  viewAllButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#3498db',
    fontWeight: '600',
    fontSize: 16,
  },  
  emptyText: {    
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: 20,
  },
});

export default DashboardScreen;
