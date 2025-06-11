import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and filter states (new PropertiesScreen pattern)
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'completed', 'failed', 'overdue'
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
    const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  
  // Legacy state - keeping for backward compatibility
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  
  // Pagination state for infinite scroll
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);  const [currentPaymentId, setCurrentPaymentId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState(null);const spinAnim = new Animated.Value(0);
  const { authState, isOffline, fetchProperties, fetchAllTenants, fetchAllPayments } = useAuth();
  const { endpoints } = useApi();

  // Filter options (following PropertiesScreen pattern)
  const statusFilters = [
    { value: 'all', label: 'All Payments' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'overdue', label: 'Overdue' },
  ];

  const sortOptions = [
    { value: 'date', label: 'Due Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'status', label: 'Status' },
    { value: 'tenant', label: 'Tenant Name' },
    { value: 'property', label: 'Property' },
  ];
  // Filter and sort payments (following PropertiesScreen pattern)
  const filteredAndSortedPayments = useMemo(() => {
    if (!payments || payments.length === 0) return [];
    
    let filtered = payments.filter(payment => {
      // Text search
      const searchMatch = searchText.trim() === '' || 
        payment.tenant_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        payment.property_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        payment.unit_number?.toLowerCase().includes(searchText.toLowerCase()) ||
        payment.amount?.toString().includes(searchText) ||
        payment.notes?.toLowerCase().includes(searchText.toLowerCase());
      
      // Status filter
      const statusMatch = filterStatus === 'all' || payment.status === filterStatus;
      
      // Property filter
      const propertyMatch = propertyFilter === 'all' || payment.property_id === propertyFilter;
      
      // Tenant filter
      const tenantMatch = tenantFilter === 'all' || payment.tenant_id === tenantFilter;
      
      return searchMatch && statusMatch && propertyMatch && tenantMatch;
    });
    
    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'tenant':
          return (a.tenant_name || '').localeCompare(b.tenant_name || '');
        case 'property':
          return (a.property_name || '').localeCompare(b.property_name || '');
        case 'date':
        default:
          return new Date(b.due_date || b.created_at) - new Date(a.due_date || a.created_at);
      }
    });
    
    return filtered;
  }, [payments, searchText, filterStatus, propertyFilter, tenantFilter, sortBy]);  // New render functions following PropertiesScreen pattern
  const renderSearchHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search payments..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(true)}
      >
        <Ionicons name="filter" size={20} color="#3498db" />
        <Text style={styles.filterButtonText}>Filter</Text>
      </TouchableOpacity>
    </View>
  );
  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
            <ScrollView style={styles.modalBody}>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Payment Status</Text>
              {statusFilters.map(status => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.filterOption,
                    filterStatus === status.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilterStatus(status.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filterStatus === status.value && styles.filterOptionTextSelected
                  ]}>
                    {status.label}
                  </Text>
                  {filterStatus === status.value && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </View>            {/* Property Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Property</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  propertyFilter === 'all' && styles.filterOptionSelected
                ]}
                onPress={() => setPropertyFilter('all')}              >
                <Text style={[
                  styles.filterOptionText,
                  propertyFilter === 'all' && styles.filterOptionTextSelected
                ]}>
                  All Properties
                </Text>
                {propertyFilter === 'all' && (
                  <Ionicons name="checkmark" size={20} color="#3498db" />
                )}
              </TouchableOpacity>              {properties.map(property => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.filterOption,
                    propertyFilter === property.id && styles.filterOptionSelected
                  ]}
                  onPress={() => setPropertyFilter(property.id)}                >
                  <Text style={[
                    styles.filterOptionText,
                    propertyFilter === property.id && styles.filterOptionTextSelected
                  ]}>
                    {property.name}
                  </Text>
                  {propertyFilter === property.id && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </View>            {/* Tenant Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Tenant</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  tenantFilter === 'all' && styles.filterOptionSelected
                ]}
                onPress={() => setTenantFilter('all')}              >
                <Text style={[
                  styles.filterOptionText,
                  tenantFilter === 'all' && styles.filterOptionTextSelected
                ]}>
                  All Tenants
                </Text>
                {tenantFilter === 'all' && (
                  <Ionicons name="checkmark" size={20} color="#3498db" />
                )}
              </TouchableOpacity>
              {tenants.map(tenant => (
                <TouchableOpacity
                  key={tenant.id}
                  style={[
                    styles.filterOption,
                    tenantFilter === tenant.id && styles.filterOptionSelected
                  ]}
                  onPress={() => setTenantFilter(tenant.id)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    tenantFilter === tenant.id && styles.filterOptionTextSelected
                  ]}>
                    {tenant.name}
                  </Text>
                  {tenantFilter === tenant.id && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              {sortOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    sortBy === option.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    sortBy === option.value && styles.filterOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={() => {
                setFilterStatus('all');
                setPropertyFilter('all');
                setTenantFilter('all');
                setSortBy('date');
              }}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>            <TouchableOpacity 
              style={styles.applyFiltersButton}
              onPress={() => {
                setShowFilters(false);
                // Reset pagination and reload data with new filters
                setNextPageUrl(null);
                fetchPayments();
              }}
            >
              <Text style={styles.applyFiltersText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  const renderResultsHeader = () => {
    const totalPayments = payments?.length || 0;
    const filteredCount = filteredAndSortedPayments.length;
    
    if (totalPayments === 0) return null;
    
    return (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredCount === totalPayments 
            ? `${totalPayments} ${totalPayments === 1 ? 'payment' : 'payments'}`
            : `${filteredCount} of ${totalPayments} ${totalPayments === 1 ? 'payment' : 'payments'}`
          }
        </Text>
        {(searchText || filterStatus !== 'all' || propertyFilter !== 'all' || tenantFilter !== 'all' || sortBy !== 'date') && (
          <Text style={styles.activeFiltersText}>
            {searchText && `"${searchText}" • `}
            {filterStatus !== 'all' && `${statusFilters.find(s => s.value === filterStatus)?.label} • `}
            {propertyFilter !== 'all' && `${properties.find(p => p.id === propertyFilter)?.name} • `}
            {tenantFilter !== 'all' && `${tenants.find(t => t.id === tenantFilter)?.name} • `}
            {sortBy !== 'date' && `Sorted by ${sortOptions.find(s => s.value === sortBy)?.label}`}
          </Text>        )}      
      </View>
    );
  };
    // Load properties, tenants and payments when component mounts
  useEffect(() => {
    const initializeData = async () => {
      await loadPropertiesAndTenants();
      await fetchPayments();
    };
    initializeData();
  }, []); // Empty dependency array - only run on mount
    // Load properties and tenants for filtering// Load properties and tenants for filtering
  const loadPropertiesAndTenants = async () => {
    try {
      // First check offline cache
      if (isOffline) {        try {
          const cachedProperties = await AsyncStorage.getItem('cached_properties');
          const cachedTenants = await AsyncStorage.getItem('cached_tenants');
          
          if (cachedProperties && cachedProperties.trim() !== '') {
            try {
              const parsedProperties = JSON.parse(cachedProperties);
              setProperties(Array.isArray(parsedProperties) ? parsedProperties : []);
            } catch (parseError) {
              console.error('Error parsing cached properties:', parseError);
              setProperties([]);
              // Clear invalid cache
              await AsyncStorage.removeItem('cached_properties');
            }
          } else {
            setProperties([]);
          }
          
          if (cachedTenants && cachedTenants.trim() !== '') {
            try {
              const parsedTenants = JSON.parse(cachedTenants);
              setTenants(Array.isArray(parsedTenants) ? parsedTenants : []);
            } catch (parseError) {
              console.error('Error parsing cached tenants:', parseError);
              setTenants([]);
              // Clear invalid cache
              await AsyncStorage.removeItem('cached_tenants');
            }
          } else {
            setTenants([]);
          }
          
          if (!cachedProperties && !cachedTenants) {
            setError('No property or tenant data available offline');
          }
        } catch (cacheError) {
          console.error('Error reading cached data:', cacheError);
          setProperties([]);
          setTenants([]);
          setError('Failed to load properties and tenants from cache');
        }        
        return;
      }
      
      // Use AuthContext functions instead of direct API calls
      try {
        // Fetch properties using AuthContext
        const propertiesResult = await fetchProperties(true); // Force refresh
        if (propertiesResult && propertiesResult.success && propertiesResult.data) {
          setProperties(propertiesResult.data);
          // Cache the properties data locally for this screen's filters
          await AsyncStorage.setItem('cached_properties', JSON.stringify(propertiesResult.data));
        } else if (authState.properties && authState.properties.length > 0) {
          // Fallback to authState.properties if the function call doesn't return data directly
          setProperties(authState.properties);
          await AsyncStorage.setItem('cached_properties', JSON.stringify(authState.properties));
        } else {
          // Ensure properties is always an array
          setProperties([]);
        }
        
        // Fetch tenants using AuthContext
        const tenantsResult = await fetchAllTenants(true); // Force refresh
        if (tenantsResult && tenantsResult.success && tenantsResult.data) {
          setTenants(tenantsResult.data);
          // Cache the tenants data locally for this screen's filters
          await AsyncStorage.setItem('cached_tenants', JSON.stringify(tenantsResult.data));
        } else {
          // Ensure tenants is always an array
          setTenants([]);
        }
      } catch (authContextError) {
        console.error('Error using AuthContext functions:', authContextError);
        // Ensure arrays are initialized even on error
        setProperties([]);
        setTenants([]);
        throw authContextError; // Re-throw to be caught by outer catch block
      }
        } catch (error) {
      console.error('Error loading properties and tenants:', error);
        // Try to use cached data as fallback
      try {
        const cachedProperties = await AsyncStorage.getItem('cached_properties');
        const cachedTenants = await AsyncStorage.getItem('cached_tenants');
        
        if (cachedProperties && cachedProperties.trim() !== '') {
          try {
            const parsedProperties = JSON.parse(cachedProperties);
            setProperties(Array.isArray(parsedProperties) ? parsedProperties : []);
          } catch (parseError) {
            console.error('Error parsing cached properties in fallback:', parseError);
            setProperties([]);
            await AsyncStorage.removeItem('cached_properties');
          }
        } else {
          setProperties([]);
        }
        
        if (cachedTenants && cachedTenants.trim() !== '') {
          try {
            const parsedTenants = JSON.parse(cachedTenants);
            setTenants(Array.isArray(parsedTenants) ? parsedTenants : []);
          } catch (parseError) {
            console.error('Error parsing cached tenants in fallback:', parseError);
            setTenants([]);
            await AsyncStorage.removeItem('cached_tenants');
          }
        } else {
          setTenants([]);
        }
        
        if (cachedProperties || cachedTenants) {
          setError('Using cached property and tenant data. Pull down to try refreshing.');
        } else {
          setError('Failed to load properties and tenants. Check your connection and try again.');
        }
      } catch (cacheError) {
        console.error('Error loading cached data:', cacheError);
        // Ensure arrays are always initialized
        setProperties([]);
        setTenants([]);
        setError('Failed to load property and tenant data');
      }
    }
  };
  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    // Reset pagination when fetching fresh data
    setNextPageUrl(null);

    try {
      if (isOffline) {
        const cachedPayments = await AsyncStorage.getItem('cached_payments');        if (cachedPayments) {
          const paymentsData = JSON.parse(cachedPayments);
          setPayments(paymentsData);
        } else {
          setPayments([]);
          setError('No payment data available while offline.');
        }        setLoading(false);
        return;
      }      const paymentsResult = await fetchAllPayments({
        property: propertyFilter !== 'all' ? propertyFilter : null,
        tenant: tenantFilter !== 'all' ? tenantFilter : null,
        status: filterStatus !== 'all' ? filterStatus : null,
      });

      if (paymentsResult && paymentsResult.success && paymentsResult.data) {
        const processedPayments = paymentsResult.data.map(payment => ({
          id: payment.id.toString(),
          tenant_name: payment.tenant_name || 'Unknown Tenant',
          tenant_id: payment.tenant,
          property_name: payment.property_name || 'Unknown Property',
          unit_number: payment.unit_number || 'Unknown Unit',
          amount: parseFloat(payment.amount) || 0,
          due_date: payment.due_date,
          payment_date: payment.payment_date,
          status: payment.status,
          payment_method: payment.payment_method,
          notes: payment.description,
        }));        setPayments(processedPayments);
        
        // Save the nextPageUrl from the API response
        console.log('[fetchPayments] Setting nextPageUrl from initial fetch:', paymentsResult.nextPageUrl);
        setNextPageUrl(paymentsResult.nextPageUrl || null);
        
        await AsyncStorage.setItem('cached_payments', JSON.stringify(processedPayments));
      } else {
        setPayments([]);
        setError('Failed to fetch payments.');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to fetch payments.');
      setLoading(false);
    }
  };  // Comprehensive refresh function that reloads all data
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      // Reset pagination state
      setNextPageUrl(null);
      setIsLoadingMore(false);
      
      // Load properties and tenants first
      try {
        // First check offline cache
        if (isOffline) {
          try {
            const cachedProperties = await AsyncStorage.getItem('cached_properties');
            const cachedTenants = await AsyncStorage.getItem('cached_tenants');
            
            if (cachedProperties && cachedProperties.trim() !== '') {
              setProperties(JSON.parse(cachedProperties));
            } else {
              setProperties([]);
            }
            
            if (cachedTenants && cachedTenants.trim() !== '') {
              setTenants(JSON.parse(cachedTenants));
            } else {
              setTenants([]);
            }
          } catch (cacheError) {
            console.error('Error loading cached data:', cacheError);
            setProperties([]);
            setTenants([]);
          }
        } else {
          // Use AuthContext functions for fresh data
          try {
            const propertiesResult = await fetchProperties(true);
            if (propertiesResult && propertiesResult.success && propertiesResult.data) {
              setProperties(propertiesResult.data);
              await AsyncStorage.setItem('cached_properties', JSON.stringify(propertiesResult.data));
            } else {
              setProperties([]);
            }
            
            const tenantsResult = await fetchAllTenants(true);
            if (tenantsResult && tenantsResult.success && tenantsResult.data) {
              setTenants(tenantsResult.data);
              await AsyncStorage.setItem('cached_tenants', JSON.stringify(tenantsResult.data));
            } else {
              setTenants([]);
            }
          } catch (authContextError) {
            console.error('Error using AuthContext functions:', authContextError);
            setProperties([]);
            setTenants([]);
          }
        }
      } catch (error) {
        console.error('Error loading properties and tenants:', error);
        setProperties([]);
        setTenants([]);
      }
      
      // Then load payments with fresh data
      try {
        if (isOffline) {
          const cachedPayments = await AsyncStorage.getItem('cached_payments');
          if (cachedPayments) {
            const paymentsData = JSON.parse(cachedPayments);
            setPayments(paymentsData);
          } else {
            setPayments([]);
          }        } else {
          const paymentsResult = await fetchAllPayments({
            property: propertyFilter !== 'all' ? propertyFilter : null,
            tenant: tenantFilter !== 'all' ? tenantFilter : null,
            status: filterStatus !== 'all' ? filterStatus : null,
          });console.log('[loadData] Initial payments fetch result:', {
            success: paymentsResult?.success,
            dataLength: paymentsResult?.data?.length,
            nextPageUrl: paymentsResult?.nextPageUrl,
            fromCache: paymentsResult?.fromCache,
            pagination: paymentsResult?.pagination,
            rootLevelKeys: Object.keys(paymentsResult || {})
          });

          if (paymentsResult && paymentsResult.success && paymentsResult.data) {
            const processedPayments = paymentsResult.data.map(payment => ({
              id: payment.id.toString(),
              tenant_name: payment.tenant_name || 'Unknown Tenant',
              tenant_id: payment.tenant,
              property_name: payment.property_name || 'Unknown Property',
              unit_number: payment.unit_number || 'Unknown Unit',
              amount: parseFloat(payment.amount) || 0,
              due_date: payment.due_date,
              payment_date: payment.payment_date,
              status: payment.status,
              payment_method: payment.payment_method,
              notes: payment.description,
            }));
              setPayments(processedPayments);
            await AsyncStorage.setItem('cached_payments', JSON.stringify(processedPayments));
              console.log('[loadData] Setting nextPageUrl:', {
              rawNextPageUrl: paymentsResult.nextPageUrl,
              paginationNextPageUrl: paymentsResult.pagination?.nextPageUrl,
              finalValue: paymentsResult.nextPageUrl || null
            });
            setNextPageUrl(paymentsResult.nextPageUrl || null);
          } else {
            setPayments([]);
          }
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
        setPayments([]);
      }
      
      // Show success feedback briefly
      if (!isOffline) {
        setError('Data refreshed successfully');
        setTimeout(() => setError(null), 2000);
      }
    } catch (err) {
      console.error('Error during refresh:', err);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [isOffline, fetchProperties, fetchAllTenants, fetchAllPayments, propertyFilter, tenantFilter, filterStatus]);
  
  // Update the handleRefresh function to use the comprehensive refresh
  const handleRefresh = useCallback(async () => {
    await refreshAllData();
  }, [refreshAllData]);
  // Infinite scroll: load more payments when reaching end
  const handleLoadMore = useCallback(async () => {
    console.log('[handleLoadMore] Called with state:', {
      nextPageUrl,
      isLoadingMore,
      loading,
      currentPaymentsCount: payments.length,
      hasNextPageUrl: !!nextPageUrl
    });
    
    if (!nextPageUrl || isLoadingMore || loading) {
      console.log('[handleLoadMore] Early return - conditions not met:', {
        hasNextPageUrl: !!nextPageUrl,
        isLoadingMore,
        loading
      });
      return;
    }
    
    console.log('[handleLoadMore] Starting to load more payments with URL:', nextPageUrl);
    setIsLoadingMore(true);
    try {
      // Pass both nextPageUrl AND current filter parameters to ensure consistent filtering
      const paymentsResult = await fetchAllPayments({
        nextPageUrl,
        // Include current filter parameters to ensure consistency with initial request
        property: propertyFilter !== 'all' ? propertyFilter : null,
        tenant: tenantFilter !== 'all' ? tenantFilter : null,
        status: filterStatus !== 'all' ? filterStatus : null,
      });
      
      console.log('[handleLoadMore] API result:', {
        success: paymentsResult?.success,
        dataLength: paymentsResult?.data?.length,
        newNextPageUrl: paymentsResult?.nextPageUrl,
        fromCache: paymentsResult?.fromCache
      });
      
      if (paymentsResult && paymentsResult.success && paymentsResult.data) {
        const newProcessed = paymentsResult.data.map(payment => {
          const propertyName = payment?.property_name || 'Unknown Property';
          const unitNumber = payment?.unit_number || 'Unknown Unit';
          let status = payment.status;
          const today = new Date();
          const dueDate = new Date(payment.due_date);
          if (status === 'pending' && dueDate < today) status = 'overdue';
          return {
            id: payment.id.toString(),
            tenant_name: payment?.tenant_name || 'Unknown Tenant',
            tenant_id: payment.tenant_id || payment.tenant,
            property_name: propertyName,
            property_id: payment.property_id || payment.property,
            unit_number: unitNumber,
            unit_id: payment.unit_id || payment.unit,
            amount: payment.amount,
            due_date: payment.due_date,
            status,
            payment_method: payment.payment_method,
            payment_date: payment.payment_date,
            notes: payment.description,
          };        });

        console.log('[handleLoadMore] Processed new payments:', {
          newPaymentsCount: newProcessed.length,
          totalPaymentsAfterUpdate: payments.length + newProcessed.length,
          updatedNextPageUrl: paymentsResult.nextPageUrl
        });

        setPayments(prev => [...prev, ...newProcessed]);
        setNextPageUrl(paymentsResult.nextPageUrl || null);      }
    } catch (err) {
      console.error('[handleLoadMore] Error loading more payments:', err);
      console.error('[handleLoadMore] Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
    } finally {
      console.log('[handleLoadMore] Setting isLoadingMore to false');
      setIsLoadingMore(false);
    }
  }, [nextPageUrl, isLoadingMore, loading, payments, filterStatus, propertyFilter, tenantFilter, fetchAllPayments]);
  // Wrapper function to add debug logging for FlatList onEndReached
  const handleFlatListEndReached = useCallback(() => {
    console.log('[FlatList onEndReached] Triggered with state:', {
      filteredPaymentsLength: filteredAndSortedPayments.length,
      nextPageUrl,
      isLoadingMore,
      loading,
      hasData: filteredAndSortedPayments.length > 0,
      filters: {
        status: filterStatus,
        property: propertyFilter,
        tenant: tenantFilter
      }
    });
    handleLoadMore();
  }, [filteredAndSortedPayments.length, nextPageUrl, isLoadingMore, loading, handleLoadMore, filterStatus, propertyFilter, tenantFilter]);
    // Utility functions

  // Utility functions
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }, []);
  const handlePaymentPress = useCallback((payment) => {
    setCurrentPaymentId(payment.id);
    // Navigate to payment details screen
    navigation.navigate('PaymentDetails', { paymentId: payment.id, payment });
  }, [navigation]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return '#27ae60';
      case 'pending':
        return '#f39c12';
      case 'overdue':
        return '#e74c3c';
      case 'failed':
        return '#c0392b';
      default:
        return '#95a5a6';
    }
  }, []);

  const getStatusLabel = useCallback((status) => {
    switch (status) {
      case 'completed':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  }, []);

  const viewPaymentDetails = useCallback((payment) => {
    // Navigate to payment details screen or show detailed modal
    navigation.navigate('PaymentDetails', { paymentId: payment.id, payment });
  }, [navigation]);

  const renderPaymentItem = useCallback(({ item }) => {
    const dueDate = new Date(item.due_date);
    const formattedDueDate = dueDate.toLocaleDateString();
    
    // Calculate days overdue for better user information
    let overdueText = '';
    if (item.status === 'overdue') {
      const today = new Date();
      const diffTime = Math.abs(today - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      overdueText = ` (${diffDays} day${diffDays !== 1 ? 's' : ''} overdue)`;
    }
      return (
      <TouchableOpacity 
        style={styles.paymentCard}
        onPress={() => handlePaymentPress(item)}
      >
        <View style={styles.paymentHeader}>
          <Text style={styles.tenantName}>{item.tenant_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        
        <View style={styles.paymentDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Property</Text>
              <Text style={styles.detailValue}>{item.property_name}, Unit {item.unit_number}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={[
                styles.detailValue, 
                item.status === 'overdue' && styles.overdueText
              ]}>{formattedDueDate}{overdueText}</Text>
            </View>
          </View>
          
          {item.payment_date && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Payment Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(item.payment_date).toLocaleDateString()}
                </Text>
              </View>
              
              {item.payment_method && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Method</Text>
                  <Text style={styles.detailValue}>
                    {item.payment_method === 'mpesa' ? 'M-Pesa' : 
                     item.payment_method === 'bank_transfer' ? 'Bank Transfer' : 
                     item.payment_method === 'cash' ? 'Cash' : 
                     item.payment_method}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}
        </View>
          <View style={styles.actionIndicator}>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </View>
      </TouchableOpacity>
    );  }, [formatCurrency, getStatusColor, getStatusLabel, handlePaymentPress]);

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={14} color="#fff" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={14} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorDismissButton}
            onPress={() => setError(null)}
          >
            <Ionicons name="close-circle" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      
      {renderSearchHeader()}
      {renderResultsHeader()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading payments...</Text>
        </View>      
      ) : filteredAndSortedPayments.length > 0 ? (        <FlatList
          data={filteredAndSortedPayments}
          keyExtractor={(item) => item.id}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContainer}          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#3498db", "#2ecc71"]}
              tintColor="#3498db"
              title="Pull to refresh payments..."
              titleColor="#3498db"
              progressBackgroundColor="#f8f9fa"
            />
          }
          ListFooterComponent={() => {
            if (isLoadingMore) {
              return (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#3498db" />
                  <Text style={styles.footerText}>Loading more payments...</Text>
                </View>
              );
            }
            if (nextPageUrl === null && payments.length > 0) {
              return (
                <View style={styles.footerLoader}>
                  <Text style={styles.footerText}>No more payments to load</Text>
                </View>
              );
            }
            return null;
          }}
          initialNumToRender={8}          maxToRenderPerBatch={10}
          windowSize={8}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 180, // Approximate height of each payment card
            offset: 180 * index + (16 * (index + 1)), // Height + margins
            index,
          })}
          onEndReachedThreshold={0.2} // Lower threshold to trigger pagination more reliably
          onEndReached={handleFlatListEndReached}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
        />
      ) : (        <View style={styles.emptyContainer}>
          <Ionicons name="cash-outline" size={60} color="#ddd" />
          <Text style={styles.emptyText}>
            {searchText.length > 0 || filterStatus !== 'all' || propertyFilter !== 'all' || tenantFilter !== 'all'
              ? 'No matching payments found'
              : 'No payments found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchText.length > 0 || filterStatus !== 'all' || propertyFilter !== 'all' || tenantFilter !== 'all'
              ? 'Try a different search term or filter'
              : 'Pull down to refresh or add tenants to your properties to start tracking rent payments'}
          </Text>
          
          {!isOffline && (
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#3498db" />
              ) : (
                <Ionicons name="refresh" size={20} color="#3498db" />
              )}
              <Text style={styles.refreshButtonText}>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          if (isOffline) {
            Alert.alert('Offline Mode', 'Cannot create payments while offline');
            return;
          }
          navigation.navigate('AddPayment');
        }}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
        {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  offlineBanner: {
    backgroundColor: '#e74c3c',
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
  errorBanner: {
    backgroundColor: '#e67e22',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
  },
  errorDismissButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 250,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  filterButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  filterOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333',
  },
  filterOptionTextSelected: {
    color: '#3498db',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#3498db',
    marginLeft: 8,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },  listHeaderContainer: {
    marginBottom: 12,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  resultsText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  paymentCard: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tenantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentDetails: {
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#34495e',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  overdueText: {
    color: '#e74c3c',
  },
  notesContainer: {
    backgroundColor: '#f7f9fa',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  actionIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#7f8c8d',
  },  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#3498db',
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#3498db',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  // New styles for PropertiesScreen pattern
  searchHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  searchHeaderIcon: {
    marginRight: 8,
  },
  searchHeaderInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },  filterHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  filterHeaderButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  resultsHeaderContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  activeFiltersHeaderText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },  filterModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    minHeight: '70%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  filterModalBody: {
    flex: 1,
    padding: 16,
  },
  filterModalSection: {
    marginBottom: 24,
  },
  filterModalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  filterModalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  filterModalOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#3498db',
  },
  filterModalOptionText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  filterModalOptionTextSelected: {
    color: '#3498db',
    fontWeight: '500',
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },  clearFiltersModalButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  clearFiltersModalButtonText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  applyFiltersModalButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFiltersModalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PaymentsScreen;
