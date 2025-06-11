import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const windowWidth = Dimensions.get('window').width;
const ITEMS_PER_PAGE = 30; // A reasonable number to display at once

const EnhancedUnitsSection = ({ 
  units, 
  onUnitPress, 
  onAddUnit, 
  isOffline, 
  loading,
  viewType = 'detailed' // 'detailed' or 'compact'
}) => {
  const [searchText, setSearchText] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState('unit_number'); // unit_number, rent_amount, status, tenant_name
  const [filterStatus, setFilterStatus] = useState('all'); // all, occupied, vacant
  const [filterBedrooms, setFilterBedrooms] = useState('all'); // all, 1, 2, 3, 4+
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtering and sorting logic
  const filteredAndSortedUnits = useMemo(() => {
    if (!units || units.length === 0) return [];

    let filtered = units.filter(unit => {
      // Text search - search in unit number, tenant name, unit type
      const searchMatch = searchText.trim() === '' || 
        unit.unit_number?.toLowerCase().includes(searchText.toLowerCase()) ||
        unit.tenant_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        unit.unit_type?.toLowerCase().includes(searchText.toLowerCase());

      // Status filter
      const statusMatch = filterStatus === 'all' || 
        (filterStatus === 'occupied' && unit.is_occupied) ||
        (filterStatus === 'vacant' && !unit.is_occupied);

      // Bedrooms filter
      let bedroomsMatch = true;
      if (filterBedrooms !== 'all') {
        if (filterBedrooms === '4+') {
          bedroomsMatch = (unit.bedrooms || 0) >= 4;
        } else {
          bedroomsMatch = (unit.bedrooms || 0) === parseInt(filterBedrooms);
        }
      }

      return searchMatch && statusMatch && bedroomsMatch;
    });

    // Sort units
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'unit_number':
          // Natural sort for unit numbers (101, 102, 201, etc.)
          return a.unit_number?.localeCompare(b.unit_number, undefined, { numeric: true }) || 0;
        case 'rent_amount':
          return (b.rent_amount || 0) - (a.rent_amount || 0);
        case 'status':
          // Occupied first, then vacant
          if (a.is_occupied === b.is_occupied) return 0;
          return a.is_occupied ? -1 : 1;
        case 'tenant_name':
          return (a.tenant_name || '').localeCompare(b.tenant_name || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [units, searchText, filterStatus, filterBedrooms, sortBy]);
  
  // Create pagination with memoized pages
  const paginatedUnits = useMemo(() => {
    const totalPages = Math.ceil(filteredAndSortedUnits.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    return {
      currentPageUnits: filteredAndSortedUnits.slice(startIndex, endIndex),
      totalPages,
      totalUnits: filteredAndSortedUnits.length
    };
  }, [filteredAndSortedUnits, currentPage]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterStatus, filterBedrooms, sortBy]);

  // Item renderer based on view type
  const renderUnitCard = useCallback(({ item }) => {
    if (viewType === 'compact') {
      return (
        <TouchableOpacity 
          style={styles.unitCardCompact}
          onPress={() => onUnitPress(item)}
        >
          <View style={[
            styles.statusIndicatorCompact,
            { backgroundColor: item.is_occupied ? '#e74c3c' : '#2ecc71' }
          ]} />
          
          <View style={styles.unitContentCompact}>
            <Text style={styles.unitNumberCompact}>Unit {item.unit_number}</Text>
            {item.is_occupied ? (
              <Text style={styles.tenantNameCompact} numberOfLines={1}>
                {item.tenant_name || 'No name available'}
              </Text>
            ) : (
              <Text style={styles.vacantTextCompact}>Available</Text>
            )}
          </View>
          
          <View style={styles.unitDetailsCompact}>
            <Text style={styles.detailTextCompact}>
              {item.bedrooms}b/{item.bathrooms}b
            </Text>
            <Text style={styles.rentCompact}>
              KES {(item.rent_amount || 0).toLocaleString()}
            </Text>
          </View>
          
          <Ionicons name="chevron-forward" size={16} color="#bdc3c7" />
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity 
        style={styles.unitCard}
        onPress={() => onUnitPress(item)}
      >
        <View style={[
          styles.statusIndicator,
          { backgroundColor: item.is_occupied ? '#e74c3c' : '#2ecc71' }
        ]} />
        
        <View style={styles.unitContent}>
          <View style={styles.unitHeader}>
            <Text style={styles.unitNumber}>Unit {item.unit_number}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.is_occupied ? '#e74c3c' : '#2ecc71' }
            ]}>
              <Text style={styles.statusText}>
                {item.is_occupied ? 'Occupied' : 'Vacant'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.unitType}>{item.unit_type}</Text>
          
          <View style={styles.unitDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="bed-outline" size={14} color="#7f8c8d" />
                <Text style={styles.detailText}>{item.bedrooms || 0} bed</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="water-outline" size={14} color="#7f8c8d" />
                <Text style={styles.detailText}>{item.bathrooms || 0} bath</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="resize-outline" size={14} color="#7f8c8d" />
                <Text style={styles.detailText}>{item.size || 0} sqft</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={14} color="#7f8c8d" />
                <Text style={styles.detailText}>KES {(item.rent_amount || 0).toLocaleString()}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.tenantSection}>
            {item.is_occupied ? (
              <>
                <Text style={styles.tenantLabel}>Tenant</Text>
                <Text style={styles.tenantName}>
                  {item.tenant_name || 'No name available'}
                </Text>
                {item.tenant_phone && (
                  <Text style={styles.tenantContact}>{item.tenant_phone}</Text>
                )}
              </>
            ) : (
              <Text style={styles.vacantText}>Available for rent</Text>
            )}
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
      </TouchableOpacity>
    );
  }, [viewType, onUnitPress]);

  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort Units</Text>
            <TouchableOpacity 
              onPress={() => setFilterModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            {[
              { value: 'unit_number', label: 'Unit Number' },
              { value: 'rent_amount', label: 'Rent Amount' },
              { value: 'status', label: 'Status' },
              { value: 'tenant_name', label: 'Tenant Name' }
            ].map(option => (
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

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            {[
              { value: 'all', label: 'All Units' },
              { value: 'occupied', label: 'Occupied' },
              { value: 'vacant', label: 'Vacant' }
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  filterStatus === option.value && styles.filterOptionSelected
                ]}
                onPress={() => setFilterStatus(option.value)}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === option.value && styles.filterOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {filterStatus === option.value && (
                  <Ionicons name="checkmark" size={20} color="#3498db" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Bedrooms Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Bedrooms</Text>
            {[
              { value: 'all', label: 'All' },
              { value: '1', label: '1 Bedroom' },
              { value: '2', label: '2 Bedrooms' },
              { value: '3', label: '3 Bedrooms' },
              { value: '4+', label: '4+ Bedrooms' }
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  filterBedrooms === option.value && styles.filterOptionSelected
                ]}
                onPress={() => setFilterBedrooms(option.value)}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterBedrooms === option.value && styles.filterOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {filterBedrooms === option.value && (
                  <Ionicons name="checkmark" size={20} color="#3498db" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Reset and Apply Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => {
                setSortBy('unit_number');
                setFilterStatus('all');
                setFilterBedrooms('all');
                setSearchText('');
              }}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const getActiveFilterCount = () => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterBedrooms !== 'all') count++;
    if (sortBy !== 'unit_number') count++;
    return count;
  };

  return (
    <View style={styles.container}>
      {/* Control Bar with search, filter, sort and view type controls */}
      <View style={styles.controlBar}>
        <View style={styles.controlButtons}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name="search" size={20} color="#34495e" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options" size={20} color="#34495e" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setSortBy(sortBy === 'unit_number' ? 'status' : 'unit_number')}
          >
            <Ionicons name="swap-vertical" size={20} color="#34495e" />
          </TouchableOpacity>
          
          {/* Toggle between detailed and compact view */}
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setViewType(viewType === 'detailed' ? 'compact' : 'detailed')}
          >
            <Ionicons 
              name={viewType === 'detailed' ? 'list' : 'grid'} 
              size={20} 
              color="#34495e" 
            />
          </TouchableOpacity>
        </View>
        
        {!isOffline && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={onAddUnit}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search units, tenants..."
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchText('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#7f8c8d" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Active filters display and statistics */}
      <View style={styles.activeFiltersContainer}>
        {/* Show total filtered count */}
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            {paginatedUnits.totalUnits} {paginatedUnits.totalUnits === 1 ? 'unit' : 'units'}
            {paginatedUnits.totalUnits !== units.length && 
              ` (filtered from ${units.length})`
            }
          </Text>
        </View>
        
        {searchText.length > 0 && (
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>"{searchText}"</Text>
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close" size={16} color="#7f8c8d" />
            </TouchableOpacity>
          </View>
        )}
        
        {filterStatus !== 'all' && (
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>
              {filterStatus === 'occupied' ? 'Occupied' : 'Vacant'}
            </Text>
            <TouchableOpacity onPress={() => setFilterStatus('all')}>
              <Ionicons name="close" size={16} color="#7f8c8d" />
            </TouchableOpacity>
          </View>
        )}
        
        {filterBedrooms !== 'all' && (
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>
              {filterBedrooms}
              {filterBedrooms !== '4+' ? ` bedroom${filterBedrooms !== '1' ? 's' : ''}` : '+ bedrooms'}
            </Text>
            <TouchableOpacity onPress={() => setFilterBedrooms('all')}>
              <Ionicons name="close" size={16} color="#7f8c8d" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Loading state */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading units...</Text>
        </View>
      ) : paginatedUnits.currentPageUnits.length > 0 ? (
        <>
          {/* Units List */}
          <FlatList
            data={paginatedUnits.currentPageUnits}
            renderItem={renderUnitCard}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false} // Since it's inside ScrollView
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={20}
            windowSize={21}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: viewType === 'detailed' ? 140 : 60, // Approximate height of each unit card
              offset: (viewType === 'detailed' ? 140 : 60) * index,
              index,
            })}
          />
          
          {/* Pagination Controls */}
          {paginatedUnits.totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity 
                style={[
                  styles.paginationButton, 
                  currentPage === 1 && styles.paginationButtonDisabled
                ]}
                onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? "#bdc3c7" : "#34495e"} />
              </TouchableOpacity>
              
              <View style={styles.paginationInfo}>
                <Text style={styles.paginationText}>
                  Page {currentPage} of {paginatedUnits.totalPages}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.paginationButton, 
                  currentPage === paginatedUnits.totalPages && styles.paginationButtonDisabled
                ]}
                onPress={() => setCurrentPage(Math.min(paginatedUnits.totalPages, currentPage + 1))}
                disabled={currentPage === paginatedUnits.totalPages}
              >
                <Ionicons name="chevron-forward" size={18} color={currentPage === paginatedUnits.totalPages ? "#bdc3c7" : "#34495e"} />
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : searchText.length > 0 || filterStatus !== 'all' || filterBedrooms !== 'all' ? (
        /* No results found */
        <View style={styles.emptyState}>
          <Ionicons name="search" size={50} color="#ddd" />
          <Text style={styles.emptyText}>No units match your filters</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your search or filters
          </Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchText('');
              setFilterStatus('all');
              setFilterBedrooms('all');
            }}
          >
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* No units at all */
        <View style={styles.emptyState}>
          <Ionicons name="home-outline" size={50} color="#ddd" />
          <Text style={styles.emptyText}>No units found</Text>
          <Text style={styles.emptySubtext}>
            This property doesn't have any units yet
          </Text>
          {!isOffline && (
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={onAddUnit}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add First Unit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  filteredCount: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  headerButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  clearButton: {
    marginLeft: 8,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    gap: 8,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unitCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  statusIndicatorCompact: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 8,
  },
  unitContent: {
    flex: 1,
  },
  unitContentCompact: {
    flex: 1,
    marginRight: 8,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  unitNumberCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  unitType: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  unitDetails: {
    marginBottom: 8,
  },
  unitDetailsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  detailTextCompact: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  rentCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  tenantSection: {
    marginTop: 4,
  },
  tenantLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  tenantNameCompact: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2c3e50',
  },
  tenantContact: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  vacantText: {
    fontSize: 12,
    color: '#27ae60',
    fontStyle: 'italic',
  },
  vacantTextCompact: {
    fontSize: 12,
    color: '#27ae60',
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7f8c8d',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#7f8c8d',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3498db',
    borderRadius: 6,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Account for safe area
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  modalCloseButton: {
    padding: 4,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  filterOptionTextSelected: {
    color: '#1976d2',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  paginationButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 4,
  },
  paginationButtonDisabled: {
    backgroundColor: '#e9ecef',
  },
  paginationInfo: {
    paddingHorizontal: 12,
  },
  paginationText: {
    fontSize: 14,
    color: '#34495e',
  },
});

export default EnhancedUnitsSection;
