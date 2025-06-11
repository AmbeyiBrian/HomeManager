import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

const UnitDetailScreen = ({ route, navigation }) => {
  // Log the incoming route params for debugging
  console.log('UnitDetailScreen - route.params:', route.params);
  
  // Extract parameters, supporting both direct unit object and separate fields
  const { 
    unit: directUnit, 
    propertyName,
    unitId,
    unitNumber,
    selectedTenantId,
    initialTab: routeInitialTab
  } = route.params || {};
  
  // Log the extracted unit information
  console.log('UnitDetailScreen - directUnit:', directUnit);
  console.log('UnitDetailScreen - unitId:', unitId);
  console.log('UnitDetailScreen - unitNumber:', unitNumber);
  
  // Create a unit object even if we received separate parameters
  const constructedInitialUnit = directUnit || (unitId || unitNumber ? {
    id: unitId,
    unit_number: unitNumber,
    property_name: propertyName
  } : null);
  
  console.log('UnitDetailScreen - constructedInitialUnit:', constructedInitialUnit);

  const [unit, setUnit] = useState(constructedInitialUnit);
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [lease, setLease] = useState(null);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { 
    isOffline,
    fetchUnitDetails,
    fetchUnitTenants,
    fetchUnitLease,
    fetchUnitPayments,
    fetchUnitTickets
  } = useAuth();
  const { endpoints } = useApi();
    useEffect(() => {
    if (unit?.id) {
      loadUnitDetails();
    }
  }, [unit?.id]);
  const loadUnitDetails = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // If we don't have a unit ID, we can't load details
      if (!unit?.id) {
        console.error('Cannot load unit details: Missing unit ID');
        setLoading(false);
        return;
      }
      
      // Load unit details first
      const unitResponse = await fetchUnitDetails(unit.id, forceRefresh);
      if (unitResponse.success) {
        setUnit(unitResponse.data);
      } else {
        console.error('Error loading unit details:', unitResponse.error);
      }
      
      // Then load tenant data
      try {
        const tenantResponse = await fetchUnitTenants(unit.id, forceRefresh);
        
        if (tenantResponse.success && tenantResponse.data) {
          // Handle both array and single object responses
          if (Array.isArray(tenantResponse.data)) {
            // If it's an array, use the first tenant (if any exist)
            if (tenantResponse.data.length > 0) {
              const tenantData = tenantResponse.data[0];
              setTenant(tenantData);
            } else {
              setTenant(null);
            }
          } else if (typeof tenantResponse.data === 'object') {
            // If it's a single object
            setTenant(tenantResponse.data);
          } else {
            setTenant(null);
          }
        } else {
          setTenant(null);
        }
      } catch (tenantError) {
        console.error('Error fetching tenant:', tenantError);
        setTenant(null);
      }
      
      // Load other data
      try {
        const [leaseResponse, paymentsResponse, ticketsResponse] = await Promise.all([
          fetchUnitLease(unit.id, forceRefresh),
          fetchUnitPayments(unit.id, forceRefresh),
          fetchUnitTickets(unit.id, forceRefresh),
        ]);
        
        if (leaseResponse.success) {
          setLease(leaseResponse.data);
        }
        
        if (paymentsResponse.success) {
          setPayments(paymentsResponse.data);
        }
          if (ticketsResponse.success) {
          setTickets(ticketsResponse.data);
        }
      } catch (dataError) {
        // Don't show alert for these secondary data errors, just log them
        console.log('Info: Error loading secondary unit data (this is often normal for new units)');
        
        // Only log detailed error if it's not a 404 (which is expected for new units)
        if (!(dataError.response && dataError.response.status === 404)) {
          console.error('Error loading additional unit data:', dataError);
          const errorMessage = dataError.response?.data 
            ? JSON.stringify(dataError.response.data)
            : dataError.message;
          console.log(`Additional data error details: ${errorMessage}`);
        }
      }
        } catch (error) {
      console.error('Error loading unit details:', error);
      
      // More detailed error message with response data if available
      let errorMessage = 'Failed to load unit details';
      
      if (error.response) {
        // The server responded with an error status
        const responseData = error.response.data;
        if (typeof responseData === 'object') {
          errorMessage += ': ' + JSON.stringify(responseData);
        } else if (responseData) {
          errorMessage += ': ' + responseData;
        } else {
          errorMessage += ` (Status: ${error.response.status})`;
        }
      } else if (error.message) {
        // Network error or other error with message
        errorMessage += ': ' + error.message;
      }
      
      Alert.alert('Error', errorMessage);      // Don't show alert for 404 errors since they are expected
      if (error.response && error.response.status === 404) {
        console.log('404 error - this is often expected for new units/properties');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };// All fetch functions have been moved to AuthContext.js
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUnitDetails(true); // Pass true to force refresh
    setRefreshing(false);
  };  const handleAddTenant = () => {
    if (!unit?.id) {
      Alert.alert('Error', 'Cannot add tenant - missing unit information');
      return;
    }
    navigation.navigate('AddTenant', { 
      unitId: unit?.id, 
      propertyName,
      unitNumber: unit?.unit_number
    });
  };

  const handleEditUnit = () => {
    if (!unit) {
      Alert.alert('Error', 'Cannot edit unit - missing unit information');
      return;
    }
    navigation.navigate('EditUnit', { unit, propertyName });
  };

  const handleCreateTicket = () => {
    if (!unit?.id) {
      Alert.alert('Error', 'Cannot create ticket - missing unit information');
      return;
    }
    navigation.navigate('CreateTicket', { 
      unitId: unit?.id,
      propertyId: unit?.property,
      unitNumber: unit?.unit_number
    });
  };

  const handleRecordPayment = () => {
    if (!unit?.id) {
      Alert.alert('Error', 'Cannot record payment - missing unit information');
      return;
    }
    navigation.navigate('RecordPayment', { 
      unitId: unit?.id,
      propertyId: unit?.property,
      unitNumber: unit?.unit_number,
      rent: unit?.monthly_rent
    });
  };
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }
  
  // Handle the case where we don't have valid unit data
  if (!unit) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>No unit information available</Text>
        <Text style={styles.errorSubtext}>The requested unit details could not be loaded</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={14} color="#fff" />
          <Text style={styles.offlineText}>Showing cached data</Text>
        </View>
      )}
        <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.propertyName}>{propertyName || 'Property'}</Text>
          <Text style={styles.unitNumber}>Unit {unit?.unit_number || 'N/A'}</Text>          <View style={styles.badgeRow}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: unit?.is_occupied ? '#e74c3c' : '#2ecc71' }
            ]}>
              <Text style={styles.statusText}>
                {unit?.is_occupied ? 'Occupied' : 'Vacant'}
              </Text>
            </View>
            
            {unit?.floor && (
              <View style={styles.detailBadge}>
                <Ionicons name="business-outline" size={14} color="#7f8c8d" />
                <Text style={styles.badgeText}>Floor {unit.floor}</Text>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditUnit}
        >
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unit Details</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Size</Text>
            <Text style={styles.detailValue}>{unit?.size || '--'} sqft</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Bedrooms</Text>
            <Text style={styles.detailValue}>{unit?.bedrooms || '--'}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Bathrooms</Text>
            <Text style={styles.detailValue}>{unit?.bathrooms || '--'}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Monthly Rent</Text>
            <Text style={styles.detailValue}>KES {unit?.monthly_rent || '--'}</Text>
          </View>
        </View>
        
        {unit?.description && (
          <View style={styles.description}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.descriptionText}>{unit.description}</Text>
          </View>
        )}
      </View>
        <View style={styles.section}>        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tenant</Text>
          {/* Only show Add Tenant button if unit is not occupied or no tenant record exists */}
          {(unit && (!unit.is_occupied || !tenant)) && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddTenant}
            >
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.addButtonText}>Add Tenant</Text>
            </TouchableOpacity>
          )}
        </View>          {tenant ? (
          <View style={styles.tenantCard}>
            <View style={styles.tenantInfo}>
              <Text style={styles.tenantName}>
                {tenant.name || 
                 (tenant.first_name || tenant.last_name ? 
                  `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() : 
                  'Unknown Tenant')}
              </Text>
              
              {(tenant.phone_number || tenant.phone) && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={14} color="#7f8c8d" />
                  <Text style={styles.infoText}>{tenant.phone_number || tenant.phone}</Text>
                </View>
              )}
              
              {tenant.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={14} color="#7f8c8d" />
                  <Text style={styles.infoText}>{tenant.email}</Text>
                </View>
              )}
                <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color="#7f8c8d" />
                <Text style={styles.infoText}>
                  Moved in: {tenant.move_in_date ? 
                    (() => {
                      try {
                        return new Date(tenant.move_in_date).toLocaleDateString();
                      } catch (e) {
                        return tenant.move_in_date;
                      }
                    })() : 'Unknown'}
                </Text>
              </View>
            </View>
              {(tenant.id || tenant._id) && (
              <TouchableOpacity 
                style={styles.viewButton}
                onPress={() => navigation.navigate('TenantDetail', { tenantId: tenant.id || tenant._id })}
              >
                <Ionicons name="chevron-forward" size={20} color="#3498db" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={40} color="#ddd" />
            <Text style={styles.emptyStateText}>No tenant assigned</Text>
            <Text style={styles.emptyStateSubtext}>Add a tenant to manage lease and rent collection</Text>
            {unit.is_occupied && (
              <Text style={styles.emptyStateSubtext}>
                Unit is marked as occupied but no tenant record found.
              </Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lease</Text>
        
        {lease ? (
          <View style={styles.leaseCard}>
            <View style={styles.leaseInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color="#7f8c8d" />
                <Text style={styles.infoText}>
                  Period: {new Date(lease.start_date).toLocaleDateString()} - {new Date(lease.end_date).toLocaleDateString()}
                </Text>
              </View>
              
              {lease.signed_at && (
                <View style={styles.infoRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#2ecc71" />
                  <Text style={styles.infoText}>
                    Signed: {new Date(lease.signed_at).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
              {lease.document && (
              <TouchableOpacity 
                style={styles.documentButton}
                onPress={() => { console.log("Document viewer would open here") }}
              >
                <Ionicons name="document-text-outline" size={18} color="#3498db" />
                <Text style={styles.documentButtonText}>View</Text>
              </TouchableOpacity>
            )}
          </View>        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={40} color="#ddd" />
            <Text style={styles.emptyStateText}>No lease agreement</Text>
            <Text style={styles.emptyStateSubtext}>A lease will be created after adding a tenant</Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#3498db' }]}
          onPress={handleCreateTicket}
        >
          <Ionicons name="construct-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Report Issue</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#2ecc71' }]}
          onPress={handleRecordPayment}
        >
          <Ionicons name="cash-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Record Payment</Text>
        </TouchableOpacity>
      </View>
      
      {/* Recent Payments Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('UnitPayments', { unitId: unit.id })}
          >
            <Text style={styles.viewAllButtonText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color="#3498db" />
          </TouchableOpacity>
        </View>
        
        {payments.length > 0 ? (
          payments.slice(0, 3).map((payment) => (
            <View style={styles.paymentItem} key={payment.id}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentDate}>
                  {new Date(payment.payment_date).toLocaleDateString()}
                </Text>
                <Text style={styles.paymentType}>{payment.payment_method}</Text>
              </View>
              <Text style={styles.paymentAmount}>KES {payment.amount}</Text>
              <View style={[
                styles.paymentStatus, 
                { backgroundColor: payment.status === 'completed' ? '#2ecc71' : '#f39c12' }
              ]}>
                <Text style={styles.paymentStatusText}>
                  {payment.status === 'completed' ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          ))        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={40} color="#ddd" />
            <Text style={styles.emptyStateText}>No payment records</Text>
            <Text style={styles.emptyStateSubtext}>Use the "Record Payment" button to add rent payments</Text>
          </View>
        )}
      </View>
      
      {/* Recent Tickets Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Maintenance Issues</Text>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('UnitTickets', { unitId: unit.id })}
          >
            <Text style={styles.viewAllButtonText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color="#3498db" />
          </TouchableOpacity>
        </View>
        
        {tickets.length > 0 ? (
          tickets.slice(0, 3).map((ticket) => (
            <TouchableOpacity 
              style={styles.ticketItem} 
              key={ticket.id}
              onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
            >
              <View style={[
                styles.ticketStatus, 
                { 
                  backgroundColor: 
                    ticket.status === 'new' ? '#f39c12' : 
                    ticket.status === 'assigned' ? '#3498db' :
                    ticket.status === 'in_progress' ? '#9b59b6' :
                    ticket.status === 'completed' ? '#2ecc71' : '#e74c3c'
                }
              ]} />
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketTitle}>{ticket.title}</Text>
                <Text style={styles.ticketDate}>
                  {new Date(ticket.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#bbb" />
            </TouchableOpacity>
          ))        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={40} color="#ddd" />
            <Text style={styles.emptyStateText}>No maintenance issues</Text>
            <Text style={styles.emptyStateSubtext}>Use the "Report Issue" button to submit maintenance requests</Text>
          </View>
        )}
      </View>
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
  },
  offlineBanner: {
    backgroundColor: '#f39c12',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  header: {
    backgroundColor: '#3498db',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  propertyName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  unitNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  description: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  tenantCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  viewButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  leaseCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaseInfo: {
    flex: 1,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  documentButtonText: {
    color: '#3498db',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: 12,
    color: '#3498db',
    marginRight: 4,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  paymentType: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  paymentAmount: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  paymentStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  ticketStatus: {
    width: 6,
    height: 36,
    borderRadius: 3,
    marginRight: 12,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitle: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },  ticketDate: {
    fontSize: 12,
    color: '#7f8c8d',
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
    marginTop: 16,
    color: '#e74c3c',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default UnitDetailScreen;
