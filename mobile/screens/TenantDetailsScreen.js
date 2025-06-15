import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import moment from 'moment';

const TenantDetailsScreen = ({ route, navigation }) => {
  const { tenantId, tenantData } = route.params;
  // Always initialize as null to ensure we fetch from API
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // tabs: details, payments, documents
  const { fetchTenantById, fetchAllPayments } = useAuth();    
  
  useEffect(() => {
    // Always fetch tenant details on initial render
    if (tenantId) {
      fetchTenantDetails();
    }
  }, [tenantId]);  
  
  const fetchTenantDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchTenantById(tenantId);
      if (response.success) {
        const tenantData = response.data;
        console.log('Tenant data received:', tenantData);
        setTenant(tenantData);
        
        // Now that we have all the tenant data including unit_details and lease info
        // We just need to fetch payment data
        if (tenantData) {
          await fetchTenantPayments(tenantData);
        }
      } else {
        setError(response.error || 'Failed to fetch tenant details');
      }
    } catch (err) {
      console.error('Error fetching tenant details:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTenantPayments = async (tenantData) => {
    const currentTenant = tenantData || tenant;
    if (!currentTenant || !currentTenant.id) return;
    
    setLoadingPayments(true);
    try {
      // Check if fetchAllPayments is available
      if (typeof fetchAllPayments === 'function') {        
        // Use fetchAllPayments with tenantId filter
        const response = await fetchAllPayments(true, 1, 10, null, null, currentTenant?.id);
        if (response.success) {
          setPayments(response.data);
        }
      } else {
        console.warn('fetchAllPayments function is not available');
        // Set empty payments array as fallback
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching tenant payments:', error);
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTenantDetails();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return moment(dateString).format('MMM DD, YYYY');
  };

  const handleEdit = () => {
    navigation.navigate('EditTenant', { tenant });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const renderPropertyUnitInfo = () => {
    if (tenant?.property_name && tenant?.unit_details?.unit_number) {
      return (
        <View style={styles.propertySection}>
          <Text style={styles.sectionTitle}>Property & Unit</Text>
          <TouchableOpacity 
            style={styles.propertyCard}
            onPress={() => {
              const unitObject = {
                id: tenant?.unit,
                unit_number: tenant?.unit_details?.unit_number,
                property_name: tenant?.property_name,
              };
              
              navigation.navigate('UnitDetail', {
                unit: unitObject,
                propertyName: tenant?.property_name,
                initialTab: 'tenants',
                selectedTenantId: tenant?.id
              });
            }}
          >
            <View style={styles.propertyCardHeader}>
              <Ionicons name="business" size={24} color="#3498db" />              
              <Text style={styles.propertyTitle}>{tenant?.property_name}</Text>
            </View>
            
            <View style={styles.unitDetailsContainer}>
              <View style={styles.unitContainer}>
                <Text style={styles.unitLabel}>Unit:</Text>
                <Text style={styles.unitNumber}>{tenant?.unit_details?.unit_number}</Text>
                
                <View style={[
                  styles.unitStatusBadge,
                  { backgroundColor: "#2ecc71" } // Green for active tenant
                ]}>
                  <Text style={styles.unitStatusText}>Occupied</Text>
                </View>
              </View>
              
              {/* Show lease details as property details */}
              <View style={styles.propertyDetailsRow}>
                <Text style={styles.propertyDetailLabel}>Property Type:</Text>
                <Text style={styles.propertyDetailValue}>Commercial</Text>
              </View>
              
              {/* Use unit_details from the tenant response */}
              {tenant?.unit_details && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.unitDetailsList}>                      <View style={styles.unitDetailsRow}>
                      <Text style={styles.unitDetailLabel}>Floor:</Text>
                      <Text style={styles.unitDetailValue}>{tenant.unit_details?.floor || 'N/A'}</Text>
                    </View>
                    <View style={styles.unitDetailsRow}>
                      <Text style={styles.unitDetailLabel}>Rent Amount:</Text>
                      <Text style={styles.unitDetailValue}>${tenant.unit_details?.monthly_rent || 'N/A'}</Text>
                    </View>
                    <View style={styles.unitDetailsRow}>
                      <Text style={styles.unitDetailLabel}>Security Deposit:</Text>
                      <Text style={styles.unitDetailValue}>${tenant.unit_details?.security_deposit || 'N/A'}</Text>
                    </View>
                  </View>
                </>
              )}
              
              <View style={styles.unitActionsContainer}>
                <TouchableOpacity 
                  style={styles.unitActionButton}
                  onPress={handleEdit}
                >
                  <Ionicons name="home-outline" size={16} color="#3498db" />
                  <Text style={styles.unitActionText}>Manage Unit Allocation</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.propertySection}>
        <Text style={styles.sectionTitle}>Property & Unit</Text>
        <View style={styles.noPropertyContainer}>
          <Ionicons name="home-outline" size={40} color="#ccc" />
          <Text style={styles.noPropertyText}>No property/unit assigned</Text>
          <TouchableOpacity 
            style={styles.allocateButton}
            onPress={handleEdit}
          >
            <Text style={styles.allocateButtonText}>Assign to Unit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading tenant details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>Error loading tenant details</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchTenantDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!tenant) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>Tenant not found</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleBack}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Render tab selector
  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'details' && styles.activeTab]}
        onPress={() => setActiveTab('details')}
      >
        <Ionicons 
          name="person-outline" 
          size={20} 
          color={activeTab === 'details' ? '#3498db' : '#666'} 
        />
        <Text style={[
          styles.tabText, 
          activeTab === 'details' && styles.activeTabText
        ]}>
          Details
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
        onPress={() => setActiveTab('payments')}
      >
        <Ionicons 
          name="cash-outline" 
          size={20} 
          color={activeTab === 'payments' ? '#3498db' : '#666'} 
        />
        <Text style={[
          styles.tabText, 
          activeTab === 'payments' && styles.activeTabText
        ]}>
          Payments
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
        onPress={() => setActiveTab('documents')}
      >
        <Ionicons 
          name="document-outline" 
          size={20} 
          color={activeTab === 'documents' ? '#3498db' : '#666'} 
        />
        <Text style={[
          styles.tabText, 
          activeTab === 'documents' && styles.activeTabText
        ]}>
          Documents
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render payment item
  const renderPaymentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.paymentItem}
      onPress={() => navigation.navigate('PaymentDetails', { payment: item })}
    >
      <View style={styles.paymentItemLeft}>
        <View style={[
          styles.paymentStatusIndicator,
          { backgroundColor: getPaymentStatusColor(item.status) }
        ]} />
        <View>
          <Text style={styles.paymentTitle}>
            {item.payment_type || 'Rent'} - {formatDate(item.payment_date)}
          </Text>
          <Text style={styles.paymentDescription}>
            Unit: {item.unit_number || 'N/A'}
          </Text>
        </View>
      </View>
      <View style={styles.paymentItemRight}>
        <Text style={styles.paymentAmount}>${item.amount || '0.00'}</Text>
        <Text style={[
          styles.paymentStatus,
          { color: getPaymentStatusColor(item.status) }
        ]}>
          {item.status || 'Unknown'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Get color based on payment status
  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return '#2ecc71';
      case 'pending':
        return '#f39c12';
      case 'overdue':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  // Render tabs content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <ScrollView 
            style={styles.tabContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person-circle" size={80} color="#3498db" />
              </View>
              <Text style={styles.tenantName}>{tenant?.name}</Text>              
              <View style={[
                styles.statusBadge,
                { backgroundColor: tenant?.active_lease ? '#2ecc71' : '#e74c3c' }
              ]}>
                <Text style={styles.statusText}>
                  {tenant?.active_lease ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            {renderPropertyUnitInfo()}
            
            {/* Tenant Summary Stats */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>                
                <Text style={styles.summaryValue}>
                  {tenant?.active_lease?.end_date ? 
                    moment(tenant.active_lease.end_date).diff(moment(), 'days') : 'N/A'}
                </Text>
                <Text style={styles.summaryLabel}>Days Left on Lease</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {tenant?.move_in_date ? 
                    moment().diff(moment(tenant.move_in_date), 'months') : 'N/A'}
                </Text>
                <Text style={styles.summaryLabel}>Months as Tenant</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {payments.filter(p => p.status?.toLowerCase() === 'paid').length || 0}
                </Text>
                <Text style={styles.summaryLabel}>Payments Made</Text>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{tenant.phone_number || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{tenant.email || 'N/A'}</Text>
              </View>
                {/* Emergency contact section */}
              {tenant.emergency_contact && (
                <View style={styles.infoRow}>
                  <Ionicons name="alert-circle-outline" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Emergency:</Text>
                  <Text style={styles.infoValue}>{tenant.emergency_contact}</Text>
                </View>
              )}
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Lease Information</Text>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Move-in:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(tenant.move_in_date)}
                </Text>
              </View>
              
              {tenant.move_out_date && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Move-Out:</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(tenant.move_out_date)}
                  </Text>
                </View>
              )}

              {tenant?.active_lease && (
                <>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <Text style={styles.infoLabel}>Lease Start:</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(tenant.active_lease.start_date)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <Text style={styles.infoLabel}>Lease End:</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(tenant.active_lease.end_date)}
                    </Text>
                  </View>
                </>
              )}
              
              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Rent Amount:</Text>
                <Text style={styles.infoValue}>
                  ${tenant.unit_details?.monthly_rent || 'N/A'}
                </Text>
              </View>
            </View>
            
            {/* Lease terms if available */}
            {tenant?.leases?.[0]?.terms && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Lease Terms</Text>
                <Text style={styles.notesText}>{tenant.leases[0].terms}</Text>
              </View>
            )}
            
            {/* Notes section if available */}
            {tenant.notes && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesText}>{tenant.notes}</Text>
              </View>
            )}
          </ScrollView>
        );
        
      case 'payments':
        return (
          <View style={styles.tabContent}>
            {loadingPayments ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Loading payments...</Text>
              </View>
            ) : payments.length > 0 ? (
              <FlatList
                data={payments}
                renderItem={renderPaymentItem}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}                    
                    onRefresh={() => {
                      setRefreshing(true);
                      fetchTenantPayments(tenant).finally(() => setRefreshing(false));
                    }}
                  />
                }
                ListHeaderComponent={
                  <View style={styles.paymentListHeader}>
                    <Text style={styles.paymentListTitle}>Payment History</Text>
                    <TouchableOpacity
                      style={styles.addPaymentButton}                      
                      onPress={() => navigation.navigate('AddPayment', {
                        tenantId: tenant?.id,
                        unitId: tenant?.unit,
                        propertyId: tenant?.property_id,
                        onPaymentAdded: () => fetchTenantPayments(tenant)
                      })}
                    >
                      <Ionicons name="add-circle" size={20} color="#3498db" />
                      <Text style={styles.addPaymentText}>Add Payment</Text>
                    </TouchableOpacity>
                  </View>
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="cash" size={60} color="#ddd" />
                    <Text style={styles.emptyStateTitle}>No Payments</Text>
                    <Text style={styles.emptyStateDescription}>
                      This tenant has no payment history yet
                    </Text>
                  </View>
                }
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cash" size={60} color="#ddd" />
                <Text style={styles.emptyStateTitle}>No Payments</Text>
                <Text style={styles.emptyStateDescription}>
                  This tenant has no payment history yet
                </Text>
              </View>
            )}
          </View>
        );
        
      case 'documents':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Ionicons name="document" size={60} color="#ddd" />
              <Text style={styles.emptyStateTitle}>No Documents</Text>
              <Text style={styles.emptyStateDescription}>
                No documents are available for this tenant
              </Text>
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.editFab}
        onPress={handleEdit}
      >
        <Ionicons name="create-outline" size={24} color="#fff" />
      </TouchableOpacity>
      
      {renderTabs()}
      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  editFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3498db',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 99,
  },
  // Profile section
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginBottom: 10,
  },
  tenantName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 12,
    backgroundColor: '#2ecc71',
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Summary stats
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  // Property and unit section
  propertySection: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  propertyCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  propertyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  unitDetailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  unitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  unitLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  unitNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    color: '#333',
  },
  unitStatusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  unitStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  propertyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  propertyDetailLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  propertyDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  unitDetailsList: {
    marginBottom: 10,
  },
  unitDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  unitDetailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  unitDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  unitActionsContainer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  unitActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  unitActionText: {
    color: '#3498db',
    marginLeft: 5,
    fontWeight: '500',
  },
  noPropertyContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  noPropertyText: {
    color: '#666',
    marginTop: 10,
    marginBottom: 15,
  },
  allocateButton: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  allocateButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  // Information sections
  sectionContainer: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  // Payments list
  paymentListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  paymentListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#f1f8fe',
  },
  addPaymentText: {
    marginLeft: 5,
    color: '#3498db',
    fontWeight: '500',
    fontSize: 14,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  paymentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentStatusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  paymentDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  paymentItemRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 10,
  },
  errorSubtext: {
    textAlign: 'center',
    color: '#666',
    marginTop: 5,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#3498db',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default TenantDetailsScreen;
