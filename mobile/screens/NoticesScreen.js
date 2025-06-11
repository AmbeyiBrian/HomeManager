import React, { useState, useEffect, useCallback, useMemo, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const NoticesScreen = ({ navigation, route }) => {
  // Extract propertyFilter from route params if available
  const propertyFilter = route?.params?.propertyFilter;
  
  // State for notices data, loading, error, and filtering
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Advanced search and filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNoticeType, setSelectedNoticeType] = useState('all');
  const [selectedImportanceFilter, setSelectedImportanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  
  // Notice type options
  const noticeTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'Announcement', label: 'Announcements' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Event', label: 'Events' },
    { value: 'Other', label: 'Other' },
  ];
  
  // Importance filter options
  const importanceFilters = [
    { value: 'all', label: 'All Notices' },
    { value: 'important', label: 'Important Only' },
    { value: 'standard', label: 'Standard Only' },
  ];
  
  // Sort options
  const sortOptions = [
    { value: 'date', label: 'Date (Newest First)' },
    { value: 'date_asc', label: 'Date (Oldest First)' },
    { value: 'importance', label: 'Importance' },
    { value: 'title', label: 'Title' },
  ];
  
  // Get the API functions from AuthContext
  const { fetchAllNotices, isOffline } = useAuth();

  // Function to load notices from API
  const loadNotices = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      // Call the API function from context
      const result = await fetchAllNotices({ 
        forceRefresh: isRefresh,
        archived: false, // Only show non-archived notices by default
        propertyId: propertyFilter // Add property filter if it exists
      });
      
      if (result.success) {
        setNotices(result.data);
        setNextPageUrl(result.nextPageUrl);
        
        if (result.fromCache && !isOffline) {
          setError('Using cached data. Pull down to refresh.');
        }
      } else {
        setError(result.error || 'Failed to fetch notices');
      }
    } catch (e) {
      console.error("Failed to fetch notices:", e);
      setError('Failed to fetch notices. Please try again.');    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [fetchAllNotices, isOffline, propertyFilter]);

  // Load more notices when scrolling to bottom (pagination)
  const loadMoreNotices = useCallback(async () => {
    if (nextPageUrl && !isLoadingMore) {
      setIsLoadingMore(true);
      try {
        const result = await fetchAllNotices({ 
          nextPageUrl,
          propertyId: propertyFilter // Add property filter if it exists
        });
        if (result.success) {
          setNotices(prevNotices => [...prevNotices, ...result.data]);
          setNextPageUrl(result.nextPageUrl);
        }
      } catch (error) {
        console.error("Failed to load more notices:", error);      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [nextPageUrl, isLoadingMore, fetchAllNotices, propertyFilter]);

  // Fetch notices when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNotices();
    }, [loadNotices])
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotices(true);
    setRefreshing(false);
  }, [loadNotices]);

  // Filter notices based on search text and advanced filters
  const filteredNotices = useMemo(() => {
    if (!notices || notices.length === 0) return [];
    
    let filtered = notices.filter(notice => {
      // Text search
      const searchMatch = !searchText.trim() || 
        notice.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        notice.content?.toLowerCase().includes(searchText.toLowerCase()) ||
        notice.type?.toLowerCase().includes(searchText.toLowerCase());
      
      // Notice type filter
      const typeMatch = selectedNoticeType === 'all' || 
        notice.type === selectedNoticeType;
      
      // Importance filter
      let importanceMatch = true;
      if (selectedImportanceFilter !== 'all') {
        importanceMatch = (selectedImportanceFilter === 'important' && notice.important) || 
                         (selectedImportanceFilter === 'standard' && !notice.important);
      }
      
      return searchMatch && typeMatch && importanceMatch;
    });
    
    // Sort notices
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date) - new Date(a.date);
        case 'date_asc':
          return new Date(a.date) - new Date(b.date);
        case 'importance':
          return (b.important ? 1 : 0) - (a.important ? 1 : 0);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [notices, searchText, selectedNoticeType, selectedImportanceFilter, sortBy]);

  const renderNoticeItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.noticeItem} 
      onPress={() => navigation.navigate('NoticeDetail', { noticeId: item.id, noticeTitle: item.title })}
    >
      <View style={styles.noticeIconContainer}>
        {item.important && <Ionicons name="alert-circle" size={24} color="red" style={styles.icon} />}
        <Ionicons 
          name={item.type === 'Maintenance' ? 'build' : item.type === 'Announcement' ? 'megaphone' : 'notifications'} 
          size={24} 
          color="#3498db" 
        />
      </View>
      <View style={styles.noticeTextContainer}>
        <Text style={styles.noticeTitle}>{item.title}</Text>
        <Text style={styles.noticeDate}>{item.date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );
  
  // Render search header
  const renderSearchHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notices..."
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

  // Render filter modal
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
            {/* Notice Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Notice Type</Text>
              {noticeTypes.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.filterOption,
                    selectedNoticeType === type.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedNoticeType(type.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedNoticeType === type.value && styles.filterOptionTextSelected
                  ]}>
                    {type.label}
                  </Text>
                  {selectedNoticeType === type.value && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Importance Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Importance</Text>
              {importanceFilters.map(filter => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterOption,
                    selectedImportanceFilter === filter.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedImportanceFilter(filter.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedImportanceFilter === filter.value && styles.filterOptionTextSelected
                  ]}>
                    {filter.label}
                  </Text>
                  {selectedImportanceFilter === filter.value && (
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
                setSelectedNoticeType('all');
                setSelectedImportanceFilter('all');
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
    const totalNotices = notices?.length || 0;
    const filteredCount = filteredNotices.length;
    
    if (totalNotices === 0) return null;
    
    return (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredCount === totalNotices 
            ? `${totalNotices} ${totalNotices === 1 ? 'notice' : 'notices'}`
            : `${filteredCount} of ${totalNotices} ${totalNotices === 1 ? 'notice' : 'notices'}`
          }
        </Text>
        {(searchText || selectedNoticeType !== 'all' || selectedImportanceFilter !== 'all' || sortBy !== 'date') && (
          <Text style={styles.activeFiltersText}>
            {searchText && `"${searchText}" • `}
            {selectedNoticeType !== 'all' && `${noticeTypes.find(t => t.value === selectedNoticeType)?.label} • `}
            {selectedImportanceFilter !== 'all' && `${importanceFilters.find(f => f.value === selectedImportanceFilter)?.label} • `}
            {sortBy !== 'date' && `Sorted by ${sortOptions.find(s => s.value === sortBy)?.label}`}
          </Text>
        )}      
      </View>
    );
  };  // Create a ref to avoid dependency loops
  const loadNoticesRef = useRef(loadNotices);
  loadNoticesRef.current = loadNotices;

  // Set the header title if we're filtering by a property
  useLayoutEffect(() => {
    if (propertyFilter) {
      // If we have a property filter, try to get the property name from the route params
      const propertyName = route?.params?.propertyName || 'Property';
      navigation.setOptions({
        title: `Notices - ${propertyName}`,
      });
    } else {
      // Reset to default title when filter is cleared
      navigation.setOptions({
        title: 'Notices',
      });
    }
  }, [navigation, propertyFilter, route]);

  // Update notices when propertyFilter changes
  useEffect(() => {
    loadNotices();
  }, [propertyFilter]);

  // Show loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text>Loading notices...</Text>
      </View>
    );
  }

  // Show error state
  if (error && notices.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => loadNotices()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSearchHeader()}
      {renderResultsHeader()}
      
      {/* Property filter indicator */}
      {propertyFilter && (
        <View style={styles.propertyFilterBanner}>
          <Ionicons name="business-outline" size={20} color="#3498db" />
          <Text style={styles.propertyFilterText}>
            Showing notices for {route?.params?.propertyName || 'this property'}
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.setParams({ propertyFilter: null, propertyName: null })}
            style={styles.clearPropertyFilter}
          >
            <Ionicons name="close-circle" size={20} color="#3498db" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Error banner */}
      {error && notices.length > 0 && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
      
      {/* Offline indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color="#fff" style={styles.offlineIcon} />
          <Text style={styles.offlineBannerText}>Offline Mode - Limited functionality</Text>
        </View>
      )}

      <FlatList
        data={filteredNotices}
        renderItem={renderNoticeItem}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No notices found.</Text>
              <Text style={styles.emptySubText}>
                {searchText.length > 0 || selectedNoticeType !== 'all' || selectedImportanceFilter !== 'all'
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Pull down to refresh or create a new notice.'}
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={["#3498db"]} 
          />
        }
        contentContainerStyle={filteredNotices.length === 0 ? styles.emptyListContainer : null}
        onEndReached={loadMoreNotices}
        onEndReachedThreshold={0.1}
        ListFooterComponent={isLoadingMore ? (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color="#3498db" />
            <Text style={styles.loadingMoreText}>Loading more...</Text>
          </View>
        ) : null}
      />

      {renderFilterModal()}
        {/* FAB to create new notice */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateNotice', {
          propertyId: propertyFilter, 
          propertyName: route?.params?.propertyName
        })}
        disabled={isOffline} // Disable when offline
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
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
  propertyFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cce5ff',
  },
  propertyFilterText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  clearPropertyFilter: {
    padding: 4,
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
  noticeItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  noticeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  icon: {
    marginRight: 5,
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  noticeDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: '#666',
  },
  emptySubText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: '#FFD2D2',
    padding: 10,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#D8000C',
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3498db',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  offlineBanner: {
    backgroundColor: '#34495e',
    padding: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  offlineIcon: {
    marginRight: 8,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 14,
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default NoticesScreen;
