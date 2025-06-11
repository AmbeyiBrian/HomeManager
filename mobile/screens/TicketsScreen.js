import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Helper functions
const getStatusColor = (status) => {
  switch (status) {
    case 'new': return '#e74c3c';
    case 'assigned': return '#f39c12';
    case 'in_progress': return '#3498db';
    case 'resolved': return '#27ae60';
    default: return '#95a5a6';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'new': return 'alert-circle';
    case 'assigned': return 'person';
    case 'in_progress': return 'construct';
    case 'resolved': return 'checkmark-circle';
    default: return 'help-circle';
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const TicketsScreen = ({ navigation }) => {
  const { fetchAllTickets, fetchProperties } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [filter, setFilter] = useState('all'); // all, new, assigned, in_progress, resolved
  const [propertyFilter, setPropertyFilter] = useState('all'); // 'all' or property ID
  const PAGE_SIZE = 10;

  // Search and filter states (new PropertiesScreen pattern)
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  // Filter options (following PropertiesScreen pattern)
  const statusFilters = [
    { value: 'all', label: 'All Tickets' },
    { value: 'new', label: 'New' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ];

  const priorityFilters = [
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const sortOptions = [
    { value: 'date', label: 'Date Created' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'property', label: 'Property' },
  ];

  // Filter and sort tickets (following PropertiesScreen pattern)
  const filteredAndSortedTickets = useMemo(() => {
    if (!tickets || tickets.length === 0) return [];
    
    let filtered = tickets.filter(ticket => {
      // Text search
      const searchMatch = searchText.trim() === '' || 
        ticket.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        ticket.property_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        ticket.unit_number?.toLowerCase().includes(searchText.toLowerCase());
      
      // Status filter
      const statusMatch = filter === 'all' || ticket.status === filter;
      
      // Property filter
      const propertyMatch = propertyFilter === 'all' || ticket.property_id === propertyFilter;
      
      // Priority filter
      let priorityMatch = true;
      if (selectedPriority !== 'all') {
        priorityMatch = ticket.priority?.toLowerCase() === selectedPriority;
      }
      
      return searchMatch && statusMatch && propertyMatch && priorityMatch;
    });
    
    // Sort tickets
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        case 'property':
          return (a.property_name || '').localeCompare(b.property_name || '');
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [tickets, searchText, filter, propertyFilter, selectedPriority, sortBy]);

  const fetchTickets = async (resetPage = true) => {
    try {
      if (resetPage) {
        setLoading(true);
        setPage(1);
      }
      
      // Use centralized API method from AuthContext
      const statusFilter = filter !== 'all' ? filter : null;
      const propertyId = propertyFilter !== 'all' ? propertyFilter : null;
      
      // Pass both filters to the API
      const response = await fetchAllTickets(true, resetPage ? 1 : page, PAGE_SIZE, statusFilter, propertyId);
      
      if (response.success) {
        if (resetPage) {
          setTickets(response.data);
        } else {
          // Append new tickets to the existing list for pagination
          setTickets(prevTickets => [...prevTickets, ...response.data]);
        }
        
        // Update pagination state
        setHasNextPage(response.pagination?.hasNext || false);
        if (!resetPage) {
          setPage(prevPage => prevPage + 1);
        }
      } else {
        console.error('Failed to fetch tickets:', response.error);
        if (resetPage) {
          setTickets([]);
        }
      }
      
      setLoading(false);
      setLoadingMore(false);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      if (resetPage) {
        setTickets([]);
      }
      setLoading(false);
      setLoadingMore(false);
    }
  };
  // Fetch properties for filtering
  const loadProperties = async () => {
    try {
      setPropertiesLoading(true);
      const response = await fetchProperties(true);
      
      if (response && response.success) {
        // Fix: Use response.data instead of response.results
        if (response.data) {
          setProperties(response.data);
        } else {
          console.warn('Properties data is empty or undefined');
          setProperties([]);
        }
      } else {
        console.error('Failed to fetch properties:', response?.error || 'Unknown error');
        setProperties([]);
      }
      
      setPropertiesLoading(false);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
      setPropertiesLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets(true); // true to reset the page
    setRefreshing(false);
  };
  
  const loadMoreTickets = async () => {
    if (hasNextPage && !loadingMore && !refreshing) {
      setLoadingMore(true);
      await fetchTickets(false); // false to keep current page and append data
    }
  };
  const renderSearchHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tickets..."
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
      <View style={styles.modalOverlay}>        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Tickets</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              {statusFilters.map(statusOption => (
                <TouchableOpacity
                  key={statusOption.value}
                  style={[
                    styles.filterOption,
                    filter === statusOption.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilter(statusOption.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filter === statusOption.value && styles.filterOptionTextSelected
                  ]}>
                    {statusOption.label}
                  </Text>
                  {filter === statusOption.value && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Property Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Property</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  propertyFilter === 'all' && styles.filterOptionSelected
                ]}
                onPress={() => setPropertyFilter('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  propertyFilter === 'all' && styles.filterOptionTextSelected
                ]}>
                  All Properties
                </Text>
                {propertyFilter === 'all' && (
                  <Ionicons name="checkmark" size={20} color="#3498db" />
                )}
              </TouchableOpacity>
              {properties.map(property => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.filterOption,
                    propertyFilter === property.id && styles.filterOptionSelected
                  ]}
                  onPress={() => setPropertyFilter(property.id)}
                >
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
            </View>

            {/* Priority Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Priority</Text>
              {priorityFilters.map(priorityOption => (
                <TouchableOpacity
                  key={priorityOption.value}
                  style={[
                    styles.filterOption,
                    selectedPriority === priorityOption.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedPriority(priorityOption.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedPriority === priorityOption.value && styles.filterOptionTextSelected
                  ]}>
                    {priorityOption.label}
                  </Text>
                  {selectedPriority === priorityOption.value && (
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
                setFilter('all');
                setPropertyFilter('all');
                setSelectedPriority('all');
                setSortBy('date');
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
    const totalTickets = tickets?.length || 0;
    const filteredCount = filteredAndSortedTickets.length;
    
    if (totalTickets === 0) return null;
    
    return (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredCount === totalTickets 
            ? `${totalTickets} ${totalTickets === 1 ? 'ticket' : 'tickets'}`
            : `${filteredCount} of ${totalTickets} ${totalTickets === 1 ? 'ticket' : 'tickets'}`
          }
        </Text>
        {(searchText || filter !== 'all' || propertyFilter !== 'all' || selectedPriority !== 'all' || sortBy !== 'date') && (
          <Text style={styles.activeFiltersText}>
            {searchText && `"${searchText}" • `}
            {filter !== 'all' && `${statusFilters.find(s => s.value === filter)?.label} • `}
            {propertyFilter !== 'all' && `${properties.find(p => p.id === propertyFilter)?.name} • `}
            {selectedPriority !== 'all' && `${priorityFilters.find(p => p.value === selectedPriority)?.label} • `}
            {sortBy !== 'date' && `Sorted by ${sortOptions.find(s => s.value === sortBy)?.label}`}
          </Text>
        )}      
      </View>
    );
  };  useEffect(() => {
    // Load properties once when component mounts
    loadProperties();
  }, []);
  
  useEffect(() => {
    // Reset the UI state when filter or property filter changes
    setLoading(true);
    setTickets([]);
    fetchTickets(true);
  }, [filter, propertyFilter]);
  const renderTicket = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.ticketCard}
        onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
      >
        <View style={[
          styles.statusIndicator, 
          { backgroundColor: getStatusColor(item.status) }
        ]} />
        
        <View style={styles.ticketContent}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketTitle}>{item.title}</Text>
            <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>
          </View>
          
          <Text style={styles.ticketDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.ticketFooter}>
            <View style={styles.ticketLocation}>
              <Ionicons name="location-outline" size={14} color="#7f8c8d" />
              <Text style={styles.ticketLocationText}>
                {item.property_name}, Unit {item.unit_number}
              </Text>
            </View>
            
            <View style={styles.statusBadge}>
              <Ionicons 
                name={getStatusIcon(item.status)} 
                size={14} 
                color={getStatusColor(item.status)} 
              />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(item.status) }
              ]}>
                {item.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }  return (
    <View style={styles.container}>
      {renderSearchHeader()}
      {renderFilterModal()}
      {renderResultsHeader()}
      
      <FlatList
        data={filteredAndSortedTickets}
        renderItem={renderTicket}
        keyExtractor={(item, index) => item.id ? item.id.toString() : `ticket-${index}`}
        contentContainerStyle={styles.ticketsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={80} color="#dddddd" />
            <Text style={styles.emptyText}>No tickets found</Text>
            <Text style={styles.emptySubtext}>
              {searchText || filter !== 'all' || propertyFilter !== 'all' || selectedPriority !== 'all'
                ? 'Try adjusting your search or filters'
                : 'You don\'t have any maintenance tickets yet'
              }
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#3498db" />
              <Text style={styles.footerLoaderText}>Loading more tickets...</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreTickets}
        onEndReachedThreshold={0.3}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTicket')}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },  modalContent: {
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
  },  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },  resultsText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ticketsList: {
    padding: 12,
  },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusIndicator: {
    width: 6,
    height: '100%',
  },
  ticketContent: {
    flex: 1,
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    flex: 1,
    marginRight: 8,
  },
  ticketDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  ticketDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    lineHeight: 20,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketLocationText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f8f8f8',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
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
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerLoaderText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#3498db',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default TicketsScreen;
