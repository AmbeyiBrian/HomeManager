import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LOCAL_STORAGE_KEYS } from '../hooks/useOfflineData';
import CacheBanner from '../components/CacheBanner';

import { useApi } from '../hooks/useApi';

const PropertiesScreen = ({ navigation }) => {
  const { 
    isOffline,
    properties,
    propertiesLoading,
    propertiesError,
    propertiesFromCache,
    fetchProperties 
  } = useAuth();

  const { endpoints } = useApi();
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [selectedOccupancyFilter, setSelectedOccupancyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  
  // Property type options
  const propertyTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'mixed', label: 'Mixed Use' },
    { value: 'industrial', label: 'Industrial' },
  ];
  
  // Occupancy filter options
  const occupancyFilters = [
    { value: 'all', label: 'All Properties' },
    { value: 'vacant', label: 'Has Vacant Units' },
    { value: 'full', label: 'Fully Occupied' },
    { value: 'partial', label: 'Partially Occupied' },
  ];
  
  // Sort options
  const sortOptions = [
    { value: 'name', label: 'Property Name' },
    { value: 'rent', label: 'Monthly Rent' },
    { value: 'vacancy', label: 'Vacancy Rate' },
    { value: 'units', label: 'Unit Count' },
  ];

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    if (!properties || properties.length === 0) return [];
    
    let filtered = properties.filter(property => {
      // Text search
      const searchMatch = searchText.trim() === '' || 
        property.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        property.address?.toLowerCase().includes(searchText.toLowerCase());
      
      // Property type filter
      const typeMatch = selectedPropertyType === 'all' || 
        property.property_type?.toLowerCase() === selectedPropertyType;
      
      // Occupancy filter
      let occupancyMatch = true;
      if (selectedOccupancyFilter !== 'all') {
        const unitCount = property.unit_count || 0;
        const occupiedUnits = property.occupied_units || 0;
        const vacantUnits = unitCount - occupiedUnits;
        
        switch (selectedOccupancyFilter) {
          case 'vacant':
            occupancyMatch = vacantUnits > 0;
            break;
          case 'full':
            occupancyMatch = vacantUnits === 0 && unitCount > 0;
            break;
          case 'partial':
            occupancyMatch = occupiedUnits > 0 && vacantUnits > 0;
            break;
        }
      }
      
      return searchMatch && typeMatch && occupancyMatch;
    });
    
    // Sort properties
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'rent':
          return (b.total_monthly_rent || 0) - (a.total_monthly_rent || 0);
        case 'vacancy':
          return (b.vacancy_rate || 0) - (a.vacancy_rate || 0);
        case 'units':
          return (b.unit_count || 0) - (a.unit_count || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [properties, searchText, selectedPropertyType, selectedOccupancyFilter, sortBy]);

  
  const onRefresh = async () => {
    setRefreshing(true);
    console.log('Refreshing properties...');
    const result = await fetchProperties(true); // true flag forces refresh from API
    console.log('Refresh result:', result);
    setRefreshing(false);
  };

  useEffect(() => {
    console.log('PropertiesScreen mounted, fetching properties...');
    fetchProperties().then(result => {
      console.log('Initial fetch result:', result);
    });
  }, []);
  const renderProperty = ({ item }) => {
    // Use the actual API data structure
    const unitCount = item.unit_count || 0;
    const occupiedUnits = item.occupied_units || 0;
    const vacantUnits = unitCount - occupiedUnits;
    const vacancyRate = item.vacancy_rate || 0;
    const monthlyRent = item.total_monthly_rent || 0;
    
    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };
    
    return (
      <TouchableOpacity 
        style={styles.propertyCard}
        onPress={() => navigation.navigate('PropertyDetails', { property: item })}
      >
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.propertyImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="business" size={50} color="#cccccc" />
          </View>
        )}
        
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyName}>{item.name}</Text>
          <Text style={styles.propertyAddress}>{item.address}</Text>
          <Text style={styles.propertyType}>{item.property_type?.charAt(0).toUpperCase() + item.property_type?.slice(1) || 'Property'}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="home-outline" size={16} color="#3498db" />
                <Text style={styles.statText}>{unitCount} Units</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={16} color="#27ae60" />
                <Text style={[styles.statText, { color: "#27ae60" }]}>
                  {occupiedUnits} Occupied
                </Text>
              </View>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="key-outline" size={16} color={vacantUnits > 0 ? "#f39c12" : "#95a5a6"} />
                <Text style={[
                  styles.statText, 
                  { color: vacantUnits > 0 ? "#f39c12" : "#95a5a6" }
                ]}>
                  {vacantUnits} Vacant ({vacancyRate.toFixed(1)}%)
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cash-outline" size={16} color="#2ecc71" />
                <Text style={[styles.statText, { color: "#2ecc71", fontWeight: '600' }]}>
                  {formatCurrency(monthlyRent)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={24} color="#aaa" style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const renderSearchHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search properties..."
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
            {/* Property Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Property Type</Text>
              {propertyTypes.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.filterOption,
                    selectedPropertyType === type.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedPropertyType(type.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedPropertyType === type.value && styles.filterOptionTextSelected
                  ]}>
                    {type.label}
                  </Text>
                  {selectedPropertyType === type.value && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Occupancy Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Occupancy Status</Text>
              {occupancyFilters.map(filter => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterOption,
                    selectedOccupancyFilter === filter.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedOccupancyFilter(filter.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedOccupancyFilter === filter.value && styles.filterOptionTextSelected
                  ]}>
                    {filter.label}
                  </Text>
                  {selectedOccupancyFilter === filter.value && (
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
                setSearchText('');
                setSelectedPropertyType('all');
                setSelectedOccupancyFilter('all');
                setSortBy('name');
              }}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
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

  const renderResultsHeader = () => {
    const totalProperties = properties?.length || 0;
    const filteredCount = filteredAndSortedProperties.length;
    
    if (totalProperties === 0) return null;
    
    return (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredCount === totalProperties 
            ? `${totalProperties} ${totalProperties === 1 ? 'property' : 'properties'}`
            : `${filteredCount} of ${totalProperties} ${totalProperties === 1 ? 'property' : 'properties'}`
          }
        </Text>
        {(searchText || selectedPropertyType !== 'all' || selectedOccupancyFilter !== 'all' || sortBy !== 'name') && (
          <Text style={styles.activeFiltersText}>
            {searchText && `"${searchText}" • `}
            {selectedPropertyType !== 'all' && `${propertyTypes.find(t => t.value === selectedPropertyType)?.label} • `}
            {selectedOccupancyFilter !== 'all' && `${occupancyFilters.find(f => f.value === selectedOccupancyFilter)?.label} • `}
            {sortBy !== 'name' && `Sorted by ${sortOptions.find(s => s.value === sortBy)?.label}`}
          </Text>
        )}      
      </View>
    );
  };

  if (propertiesLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }  return (
    <View style={styles.container}>
      <CacheBanner visible={propertiesFromCache} />
      
      {renderSearchHeader()}
      {renderResultsHeader()}
      
      <FlatList
        data={filteredAndSortedProperties}
        renderItem={renderProperty}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business" size={80} color="#dddddd" />
            <Text style={styles.emptyText}>
              {searchText || selectedPropertyType !== 'all' || selectedOccupancyFilter !== 'all'
                ? 'No properties match your search'
                : isOffline 
                  ? 'No cached properties found'
                  : 'No properties added yet'
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {searchText || selectedPropertyType !== 'all' || selectedOccupancyFilter !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : isOffline 
                  ? 'Connect to the internet to fetch your properties'
                  : 'Tap the button above to add your first property'
              }
            </Text>
            {propertiesError && (
              <Text style={styles.errorText}>Error: {propertiesError}</Text>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      {renderFilterModal()}

      {/* Add floating button for adding new property */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddProperty')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',  },
  // Search and Filter Styles
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
  propertyCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    alignItems: 'flex-start',
  },
  propertyImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  propertyType: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statsContainer: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 4,
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },  statText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 10,
  },
  addPropertyButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#3498db',
    borderStyle: 'dashed',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  addPropertyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3498db',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
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
});

export default PropertiesScreen;
