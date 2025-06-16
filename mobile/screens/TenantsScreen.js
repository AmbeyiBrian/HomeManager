import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const TenantsScreen = ({ navigation }) => {
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allTenantsLoaded, setAllTenantsLoaded] = useState([]);
  
  const [showFilters, setShowFilters] = useState(false);
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    property: null,
    status: null, // active, inactive, etc.
    moveInDate: null, // recent, older than 6 months, etc.
  });  const [availableProperties, setAvailableProperties] = useState([]);
  const { isOffline, fetchAllTenants, properties, fetchProperties } = useAuth();
    useEffect(() => {
    fetchTenants();
    fetchPropertiesForSelection();
  }, []);

  // Fetch properties for the selection modal
  const fetchPropertiesForSelection = async () => {
    try {
      const response = await fetchProperties();
      if (response.success) {
        setAvailableProperties(response.data);
      }
    } catch (error) {
      console.error('Error fetching properties for selection:', error);
    }
  }; // <-- Add this closing brace to end fetchPropertiesForSelection
  const fetchTenants = async (forceRefresh = false, page = 1, append = false) => {
    if (page === 1) {
      setLoading(true);
      setCurrentPage(1);
      setHasNextPage(false);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      // Extract any active filters to pass to the API
      let filterParam = null;
      let propertyIdParam = null;
      
      if (activeFilters.property) {
        const selectedProperty = availableProperties.find(p => p.name === activeFilters.property);
        if (selectedProperty) {
          propertyIdParam = selectedProperty.id;
        }
      }
      
      const response = await fetchAllTenants(forceRefresh, page, 20, filterParam, propertyIdParam);

      console.log('Fetch Tenants Response:', response);
      
      if (response.success) {
        // Process and format tenant data if needed
        const formattedTenants = response.data.map(tenant => ({
          id: tenant.id || tenant._id || '',
          name: tenant.name || `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim(),
          phone_number: tenant.phone_number || tenant.phone || '',
          email: tenant.email || '',
          move_in_date: tenant.move_in_date || tenant.lease_start_date || '',
          property_name: tenant.property_name || tenant.property?.name || '',
          unit_number: tenant.unit_number || tenant.unit?.number || '',
          status: tenant.status || 'active', // Default to active if not provided
          unit_id: tenant.unit || tenant.unit?.id || '',
          property_id: tenant.property_id || tenant.property?._id || '',
        }));
        
        if (append && page > 1) {
          // Append new data for pagination
          const updatedTenants = [...allTenantsLoaded, ...formattedTenants];
          setAllTenantsLoaded(updatedTenants);
          setTenants(updatedTenants);
          setFilteredTenants(updatedTenants);
        } else {
          // Replace data for first page or refresh
          setAllTenantsLoaded(formattedTenants);
          setTenants(formattedTenants);
          setFilteredTenants(formattedTenants);
        }
        
        // Update pagination state
        if (response.pagination) {
          setHasNextPage(response.pagination.hasNext);
          setCurrentPage(response.pagination.currentPage);
        }
        
      } else {
        console.error('Failed to fetch tenants:', response.error);
        setError(response.error || 'Failed to fetch tenants');
        
        // If in offline mode and no data, show fallback
        if (isOffline) {
          Alert.alert(
            'Offline Mode',
            'Unable to fetch latest tenant data. Showing cached data if available.'
          );
        }
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };
    const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasNextPage(false);
    await fetchTenants(true, 1, false);
  };
    const loadMoreTenants = async () => {
    if (!loadingMore && hasNextPage && !isOffline) {
      console.log('Loading more tenants, page:', currentPage + 1);
      const nextPage = currentPage + 1;
      await fetchTenants(false, nextPage, true);
    }
  };
  const handleSearch = (query) => {
    setSearchQuery(query);
    // When searching, filter from the loaded tenants
    // Note: For better UX with large datasets, consider implementing server-side search
    applyFiltersAndSearch(query, activeFilters);
  };
    const applyFiltersAndSearch = (query = searchQuery, filters = activeFilters) => {
    // Use allTenantsLoaded instead of tenants to include all paginated data
    let filtered = [...allTenantsLoaded];
    
    // Apply search query
    if (query.trim() !== '') {
      filtered = filtered.filter(tenant => 
        tenant.name.toLowerCase().includes(query.toLowerCase()) ||
        tenant.email?.toLowerCase().includes(query.toLowerCase()) ||
        tenant.phone_number?.includes(query) ||
        tenant.unit_number?.includes(query) ||
        tenant.property_name?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Apply property filter
    if (filters.property) {
      filtered = filtered.filter(tenant => 
        tenant.property_name === filters.property
      );
    }
    
    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(tenant => 
        tenant.status === filters.status
      );
    }
    
    // Apply move-in date filter
    if (filters.moveInDate) {
      const now = new Date();
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
      
      if (filters.moveInDate === 'recent') {
        filtered = filtered.filter(tenant => 
          tenant.move_in_date && new Date(tenant.move_in_date) > sixMonthsAgo
        );
      } else if (filters.moveInDate === 'older') {
        filtered = filtered.filter(tenant => 
          tenant.move_in_date && new Date(tenant.move_in_date) <= sixMonthsAgo
        );
      }
    }
    
    setFilteredTenants(filtered);
  };
  
  const handleFilterChange = (filterType, value) => {
    const newFilters = {
      ...activeFilters,
      [filterType]: activeFilters[filterType] === value ? null : value // Toggle filter if already selected
    };
    setActiveFilters(newFilters);
    applyFiltersAndSearch(searchQuery, newFilters);
  };
  
  const clearFilters = () => {
    setActiveFilters({
      property: null,
      status: null,
      moveInDate: null,
    });
    applyFiltersAndSearch(searchQuery, {
      property: null,
      status: null,
      moveInDate: null,
    });
  };  const handleTenantPress = (tenant) => {
    // Navigate to unit detail screen with focus on the tenant tab
    console.log('Tenant pressed:', tenant);
    if (tenant && tenant.property_name && tenant.unit_number) {
      // Create a proper unit object with all necessary properties
      const unitObject = {
        id: tenant.unit_id,
        unit_number: tenant.unit_number,
        property_name: tenant.property_name,
      };
      
      console.log('Navigating to UnitDetail with:', { 
        unit: unitObject, 
        propertyName: tenant.property_name 
      });
      
      navigation.navigate('UnitDetail', {
        unit: unitObject,
        propertyName: tenant.property_name,
        initialTab: 'tenants',
        selectedTenantId: tenant.id
      });
    } else {
      // Navigate to the dedicated TenantDetails screen
      navigation.navigate('TenantDetails', {
        tenantId: tenant.id,
        tenantData: tenant
      });
    }
  };
  const handleAddTenant = () => {
    // Navigate directly to AddTenant screen or show property selection modal
    // Check if we have properties available to add a tenant to
    if (availableProperties.length === 0) {
      Alert.alert(
        "No Properties Available", 
        "You need to add a property with units before you can add tenants.",
        [
          { text: "OK", style: "default" },
          { 
            text: "Add Property", 
            style: "default",
            onPress: () => navigation.navigate("AddProperty")
          }
        ]
      );
      return;
    }
    
    // Show property selection modal
    setShowPropertySelector(true);
  };
    const handlePropertySelection = async (property) => {
    setSelectedProperty(property.name);
    
    // Navigate to AddTenant with property info including property ID
    // Pass the property ID so AddTenantScreen can fetch units for this property
    navigation.navigate("AddTenant", {
      unitId: null, // Let AddTenantScreen fetch and select units
      propertyName: property.name,
      propertyId: property.id, // Pass property ID for unit fetching
      unitNumber: null, // Will be selected in AddTenantScreen
      fromTenantsScreen: true, // Flag to indicate navigation source
      onTenantAdded: () => {
        // Refresh tenant list after adding a new tenant
        fetchTenants(true);
      }
    });
    
    setShowPropertySelector(false);
  };
    const renderFilterModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilters}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Tenants</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Property Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Properties</Text>
                <View style={styles.filterOptions}>
                {availableProperties.map((property) => (
                  <TouchableOpacity
                    key={property.id}
                    style={[
                      styles.filterChip,
                      activeFilters.property === property.name && styles.filterChipActive
                    ]}
                    onPress={() => handleFilterChange('property', property.name)}
                  >
                    <Text 
                      style={[
                        styles.filterChipText,
                        activeFilters.property === property.name && styles.filterChipTextActive
                      ]}
                    >
                      {property.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              </View>
                {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    activeFilters.status === 'active' && styles.filterChipActive
                  ]}
                  onPress={() => handleFilterChange('status', 'active')}
                >
                  <Text 
                    style={[
                      styles.filterChipText,
                      activeFilters.status === 'active' && styles.filterChipTextActive
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    activeFilters.status === 'inactive' && styles.filterChipActive
                  ]}
                  onPress={() => handleFilterChange('status', 'inactive')}
                >
                  <Text 
                    style={[
                      styles.filterChipText,
                      activeFilters.status === 'inactive' && styles.filterChipTextActive
                    ]}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
              </View>
                {/* Move-in Date Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Move-in Date</Text>
                <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    activeFilters.moveInDate === 'recent' && styles.filterChipActive
                  ]}
                  onPress={() => handleFilterChange('moveInDate', 'recent')}
                >
                  <Text 
                    style={[
                      styles.filterChipText,
                      activeFilters.moveInDate === 'recent' && styles.filterChipTextActive
                    ]}
                  >
                    Last 6 months
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    activeFilters.moveInDate === 'older' && styles.filterChipActive
                  ]}
                  onPress={() => handleFilterChange('moveInDate', 'older')}
                >
                  <Text 
                    style={[
                      styles.filterChipText,
                      activeFilters.moveInDate === 'older' && styles.filterChipTextActive
                    ]}
                  >
                    Older than 6 months
                  </Text>
                </TouchableOpacity>
              </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearFiltersButton} 
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyFiltersButton} 
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderPropertySelectorModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPropertySelector}
        onRequestClose={() => setShowPropertySelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Property</Text>
              <TouchableOpacity onPress={() => setShowPropertySelector(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
              <ScrollView style={styles.modalBody}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Choose a property to add tenant to:</Text>
                  {availableProperties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={styles.propertySelectionItem}
                  onPress={() => handlePropertySelection(property)}
                >
                  <View style={styles.propertySelectionContent}>
                    <Ionicons name="business" size={22} color="#3498db" />
                    <Text style={styles.propertySelectionText}>{property.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };
    const renderTenantItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.tenantCard}
        onPress={() => handleTenantPress(item)}
      >
        <View style={styles.tenantInfo}>
          <Text style={styles.tenantName}>{item?.name || 'Unnamed Tenant'}</Text>
          
          {item?.property_name && item?.unit_number ? (
            <View style={styles.propertyInfo}>
              <Ionicons name="business-outline" size={14} color="#7f8c8d" />
              <Text style={styles.infoText}>
                {item.property_name}, Unit {item.unit_number}
              </Text>
            </View>
          ) : null}
          
          {item?.phone_number && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={14} color="#7f8c8d" />
              <Text style={styles.infoText}>{item.phone_number}</Text>
            </View>
          )}
          
          {item?.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={14} color="#7f8c8d" />
              <Text style={styles.infoText}>{item.email}</Text>
            </View>
          )}
          
          {item?.move_in_date ? (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color="#7f8c8d" />
              <Text style={styles.infoText}>
                Moved in: {new Date(item.move_in_date).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#bbb" />
      </TouchableOpacity>
    );
  };
    return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={14} color="#fff" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}      {/* Search and Filter Row */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tenants..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
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
        {/* Results Header - shows count and active filters */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredTenants.length === tenants.length 
            ? `${tenants.length} ${tenants.length === 1 ? 'tenant' : 'tenants'}`
            : `${filteredTenants.length} of ${tenants.length} ${tenants.length === 1 ? 'tenant' : 'tenants'}`
          }
        </Text>
        {(searchQuery || Object.values(activeFilters).some(filter => filter !== null)) && (
          <Text style={styles.activeFiltersText}>
            {searchQuery && `"${searchQuery}" • `}
            {activeFilters.property && `Property: ${activeFilters.property} • `}
            {activeFilters.status && `Status: ${activeFilters.status} • `}
            {activeFilters.moveInDate && `Move-in: ${activeFilters.moveInDate === 'recent' ? 'Last 6 months' : 'Older than 6 months'}`}
          </Text>
        )}
      </View>
      
      {/* Filter Chips Row - show if any filters are active */}
      {Object.values(activeFilters).some(filter => filter !== null) && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersRow}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {activeFilters.property && (
            <TouchableOpacity 
              style={styles.activeFilterChip}
              onPress={() => handleFilterChange('property', activeFilters.property)}
            >
              <Text style={styles.activeFilterText}>
                {activeFilters.property}
              </Text>
              <Ionicons name="close-circle" size={16} color="#3498db" />
            </TouchableOpacity>
          )}
          
          {activeFilters.status && (
            <TouchableOpacity 
              style={styles.activeFilterChip}
              onPress={() => handleFilterChange('status', activeFilters.status)}
            >
              <Text style={styles.activeFilterText}>
                {activeFilters.status === 'active' ? 'Active' : 'Inactive'}
              </Text>
              <Ionicons name="close-circle" size={16} color="#3498db" />
            </TouchableOpacity>
          )}
          
          {activeFilters.moveInDate && (
            <TouchableOpacity 
              style={styles.activeFilterChip}
              onPress={() => handleFilterChange('moveInDate', activeFilters.moveInDate)}
            >
              <Text style={styles.activeFilterText}>
                {activeFilters.moveInDate === 'recent' ? 'Recent Move-in' : 'Older Move-in'}
              </Text>
              <Ionicons name="close-circle" size={16} color="#3498db" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.clearAllFiltersButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearAllFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      
      {/* Add Tenant Button - Fixed position */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddTenant}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
      
      {/* Render the filter modal */}
      {renderFilterModal()}
      {/* Render the property selector modal */}
      {renderPropertySelectorModal()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#e74c3c" />
          <Text style={styles.errorText}>Something went wrong</Text>
          <Text style={styles.errorSubtext}>
            {typeof error === 'string' ? error : (error.detail || JSON.stringify(error))}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchTenants(true)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredTenants.length > 0 ? (          <FlatList
          data={filteredTenants}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderTenantItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#3498db"]}
            />
          }
          onEndReached={loadMoreTenants}
          onEndReachedThreshold={0.2}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          ListFooterComponent={() => {
            if (loadingMore) {
              return (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#3498db" />
                  <Text style={styles.loadingMoreText}>Loading more tenants...</Text>
                </View>
              );
            }
            if (hasNextPage && !isOffline) {
              return (
                <View style={styles.loadMoreContainer}>
                  <Text style={styles.loadMoreText}>Scroll down for more tenants</Text>
                </View>
              );
            }
            if (!hasNextPage && allTenantsLoaded.length > 0) {
              return (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>You've reached the end</Text>
                </View>
              );
            }
            return null;
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={60} color="#ddd" />
          <Text style={styles.emptyText}>
            {searchQuery.length > 0
              ? 'No tenants match your search'
              : 'No tenants found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery.length > 0
              ? 'Try a different search term'
              : 'Add tenants to your properties to see them here'}
          </Text>
        </View>
      )}
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
  },  searchContainer: {
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
    borderRadius: 25,
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
  },  resultsHeader: {
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
  activeFiltersRow: {
    maxHeight: 50,
    paddingLeft: 16,
    marginBottom: 8,
  },
  activeFiltersContent: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1f0fa',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  activeFilterText: {
    color: '#3498db',
    fontSize: 14,
    marginRight: 4,
  },
  clearAllFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllFiltersText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#3498db',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  tenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#2c3e50',
  },
  propertyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 6,
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
  },  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },  // Filter Modal Styles
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
  },  modalBody: {
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
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  filterChipActive: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  filterChipText: {
    fontSize: 14,
    color: '#333',
  },
  filterChipTextActive: {
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
  // Pagination styles
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  loadMoreText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endOfListText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  // Property selection styles
  propertySelectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  propertySelectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertySelectionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
});

export default TenantsScreen;
