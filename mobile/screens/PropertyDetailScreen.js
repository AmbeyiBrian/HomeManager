import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Modal,
  Animated,
  Platform,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import EnhancedUnitsSection from '../components/EnhancedUnitsSection';
import CacheBanner from '../components/CacheBanner';
import PropertyMpesaSettings from '../components/PropertyMpesaSettings';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const PropertyDetailScreen = ({ route, navigation }) => {  
  const { property } = route?.params || {};
  
  // Debug logging to help identify issues
  console.log('PropertyDetailScreen - route.params:', route?.params);
  console.log('PropertyDetailScreen - property:', property);
  const { 
    fetchPropertyDetails,
    clearPropertyDetails,
    currentPropertyUnits,
    currentPropertyStats,
    propertyDetailsLoading = false,
    propertyDetailsError = null,
    propertyDetailsFromCache = false,
    isOffline = false
  } = useAuth();
  
  // Create a stable ref for fetchPropertyDetails to prevent dependency loops
  const fetchPropertyDetailsRef = useRef(fetchPropertyDetails);
  fetchPropertyDetailsRef.current = fetchPropertyDetails;
  // Create local references with guaranteed values and proper fallbacks
  const units = currentPropertyUnits || [];
  const stats = currentPropertyStats || {
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    rentCollected: 0,
    pendingRent: 0,
    openTickets: 0,
  };
  const loading = propertyDetailsLoading;
  const { endpoints } = useApi();
  
  // ALL STATE HOOKS - Must be at the top before any early returns
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [quickActionsAnim] = useState(new Animated.Value(0));
  const [unitViewType, setUnitViewType] = useState('compact');
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [floatingActionsVisible, setFloatingActionsVisible] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showSectionNav, setShowSectionNav] = useState(false);
  const [sectionNavAnim] = useState(new Animated.Value(0));
  const [currentPage, setCurrentPage] = useState(1);
  
  // ALL REFS - Must be at the top before any early returns
  const lastScrollOffset = useRef(0);
  const scrollViewRef = useRef(null);
  const overviewSectionRef = useRef(null);
  const unitsSectionRef = useRef(null);
  const actionsSectionRef = useRef(null);

  // ALL MEMOIZED VALUES - Must be at the top before any early returns
  const filteredUnits = React.useMemo(() => units.filter(unit => (
    searchText.trim() === '' ||
    unit.unit_number?.toLowerCase().includes(searchText.toLowerCase()) ||
    unit.tenant_name?.toLowerCase().includes(searchText.toLowerCase())
  )), [units, searchText]);

  const UNITS_PER_PAGE = 30;
  const paginatedUnits = React.useMemo(() => {
    const totalPages = Math.ceil(filteredUnits.length / UNITS_PER_PAGE);
    const startIndex = (currentPage - 1) * UNITS_PER_PAGE;
    const endIndex = startIndex + UNITS_PER_PAGE;
    return {
      currentPageUnits: filteredUnits.slice(startIndex, endIndex),
      totalPages,
      totalUnits: filteredUnits.length,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, filteredUnits.length)
    };
    }, [filteredUnits, currentPage]);
  // ALL CALLBACKS - Must be at the top before any early returns
  const loadPropertyDetails = useCallback(async (forceRefresh = false) => {
    try {
      console.log('loadPropertyDetails called with:', { propertyId: property?.id, forceRefresh });
      
      if (!property?.id) {
        console.error('PropertyDetailScreen - Invalid property:', property);
        Alert.alert('Error', 'Invalid property data. Please try navigating to this property again.');
        return;
      }
      
      const result = await fetchPropertyDetailsRef.current(property.id, forceRefresh);
      console.log('fetchPropertyDetails result:', result);
      
      if (!result?.success) {
        console.warn('fetchPropertyDetails returned unsuccessful result:', result);
      }
    } catch (error) {
      console.error('Error in loadPropertyDetails:', error);
      Alert.alert('Error', `Failed to load property details: ${error.message || 'Unknown error'}`);
    }
  }, [property?.id]); // Keep only property?.id dependency

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPropertyDetails(true);
    setRefreshing(false);
  }, []); // Remove dependency to prevent re-renders

  const toggleQuickActions = useCallback(() => {
    setShowQuickActions(!showQuickActions);
  }, [showQuickActions]);
  
  const toggleSectionNav = useCallback(() => {
    setShowSectionNav(!showSectionNav);
  }, [showSectionNav]);
  
  const toggleUnitViewType = useCallback(() => {
    setUnitViewType(prev => prev === 'detailed' ? 'compact' : 'detailed');
  }, []);

  const handleScroll = useCallback((event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    setScrollOffset(currentOffset);
    
    setIsHeaderSticky(currentOffset > 250);
    
    const isScrollingDown = currentOffset > lastScrollOffset.current;
    if (isScrollingDown !== !floatingActionsVisible) {
      setFloatingActionsVisible(!isScrollingDown);
    }
    lastScrollOffset.current = currentOffset;
  }, [floatingActionsVisible]);
  
  const scrollToSection = useCallback((sectionName) => {
    if (!scrollViewRef.current) return;
    
    const scrollPositions = {
      overview: 0,
      units: 400,
      actions: 800,
    };
    
    scrollViewRef.current.scrollTo({
      y: scrollPositions[sectionName],
      animated: true,
    });
    
    setActiveTab(sectionName);
    setShowSectionNav(false);
  }, []);
  
  const handleEditProperty = useCallback(() => {
    if (!property?.id) {
      Alert.alert('Error', 'Cannot edit property - invalid property data');
      return;
    }
    navigation.navigate('EditProperty', { property });
  }, [property?.id, navigation]);
  
  const handleAddUnit = useCallback(() => {
    if (!property?.id) {
      Alert.alert('Error', 'Cannot add unit - invalid property data');
      return;
    }
    navigation.navigate('AddUnit', { propertyId: property.id });
  }, [property?.id, navigation]);
  
  const handleUnitPress = useCallback((unit) => {
    if (!unit?.id || !property?.name) {
      Alert.alert('Error', 'Cannot view unit details - invalid data');
      return;
    }
    navigation.navigate('UnitDetail', { unit, propertyName: property.name });
  }, [property?.name, navigation]);

  const goToNextPage = useCallback(() => {
    if (currentPage < paginatedUnits.totalPages) {
      setCurrentPage(currentPage + 1);
      if (unitsSectionRef.current) {
        scrollViewRef.current?.scrollTo({
          y: 400,
          animated: true,
        });
      }
    }
  }, [currentPage, paginatedUnits.totalPages]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      if (unitsSectionRef.current) {
        scrollViewRef.current?.scrollTo({
          y: 400,
          animated: true,
        });
      }
    }
  }, [currentPage]);
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= paginatedUnits.totalPages) {
      setCurrentPage(page);
      if (unitsSectionRef.current) {
        scrollViewRef.current?.scrollTo({
          y: 400,
          animated: true,
        });
      }
    }
  }, [paginatedUnits.totalPages]);

  // Optimized unit renderer with memo to prevent unnecessary re-renders
    const renderUnitCompact = useCallback(({ item }) => {
      if (!item) return null;
      
      return (
        <TouchableOpacity 
          style={styles.unitCardCompact}
          onPress={() => handleUnitPress(item)}
        >
          <View style={[
            styles.statusIndicatorCompact,
            { backgroundColor: item?.is_occupied ? '#e74c3c' : '#2ecc71' }
          ]} />
          
          <View style={styles.unitContentCompact}>
            <Text style={styles.unitNumberCompact}>Unit {item?.unit_number || 'N/A'}</Text>
            {item?.is_occupied ? (
              <Text style={styles.tenantNameCompact} numberOfLines={1}>
                {item?.tenant_name || 'No name available'}
              </Text>
            ) : (
              <Text style={styles.vacantTextCompact}>Available</Text>
            )}
          </View>
          
          <View style={styles.unitDetailsCompact}>
            <Text style={styles.detailTextCompact}>
              {item?.bedrooms || 0}b/{item?.bathrooms || 0}b
            </Text>
            <Text style={styles.rentCompact}>
              KES {(item?.monthly_rent || 0).toLocaleString()}
            </Text>
          </View>
          
          <Ionicons name="chevron-forward" size={16} color="#bdc3c7" />
        </TouchableOpacity>
      );
    }, [handleUnitPress]);

  // Render sticky header when scrolled
  const renderStickyHeader = useCallback(() => {
    if (!isHeaderSticky) return null;
    
    return (
      <Animated.View style={styles.stickyHeader}>
        <View style={styles.stickyHeaderContent}>
          <Text style={styles.stickyHeaderTitle}>{property?.name || 'Unknown Property'}</Text>
          
          <View style={styles.stickyHeaderActions}>
            <TouchableOpacity 
              style={styles.stickyHeaderButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons name="search" size={20} color="#3498db" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.stickyHeaderButton}
              onPress={toggleUnitViewType}
            >
              <Ionicons 
                name={unitViewType === 'detailed' ? 'list' : 'grid'} 
                size={20} 
                color="#3498db" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.stickyHeaderButton}
              onPress={handleAddUnit}
            >
              <Ionicons name="add" size={20} color="#3498db" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }, [isHeaderSticky, property?.name, showSearch, unitViewType, toggleUnitViewType, handleAddUnit]);

  // Render section navigator floating button
  const renderSectionNavigator = useCallback(() => {
    return (
      <>
        {/* Floating Section Navigator Button */}
        <TouchableOpacity 
          style={[
            styles.sectionNavButton,
            { opacity: floatingActionsVisible ? 1 : 0.6 }
          ]}
          onPress={toggleSectionNav}
        >
          <Ionicons name="menu-outline" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Section Navigation Menu */}
        {showSectionNav && (
          <Animated.View 
            style={[
              styles.sectionNavContainer,
              { opacity: sectionNavAnim }
            ]}
          >
            <TouchableOpacity 
              style={[
                styles.sectionNavItem,
                activeTab === 'overview' && styles.sectionNavItemActive
              ]}
              onPress={() => scrollToSection('overview')}
            >
              <Ionicons 
                name="home-outline" 
                size={22} 
                color={activeTab === 'overview' ? '#3498db' : '#7f8c8d'} 
              />
              <Text 
                style={[
                  styles.sectionNavText,
                  activeTab === 'overview' && styles.sectionNavTextActive
                ]}
              >
                Overview
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.sectionNavItem,
                activeTab === 'units' && styles.sectionNavItemActive
              ]}
              onPress={() => scrollToSection('units')}
            >
              <Ionicons 
                name="business-outline" 
                size={22} 
                color={activeTab === 'units' ? '#3498db' : '#7f8c8d'} 
              />
              <Text 
                style={[
                  styles.sectionNavText,
                  activeTab === 'units' && styles.sectionNavTextActive
                ]}
              >
                Units {paginatedUnits.totalUnits > 0 ? `(${paginatedUnits.totalUnits})` : ''}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.sectionNavItem,
                activeTab === 'actions' && styles.sectionNavItemActive
              ]}
              onPress={() => scrollToSection('actions')}
            >
              <Ionicons 
                name="flash-outline" 
                size={22} 
                color={activeTab === 'actions' ? '#3498db' : '#7f8c8d'} 
              />
              <Text 
                style={[
                  styles.sectionNavText,
                  activeTab === 'actions' && styles.sectionNavTextActive
                ]}
              >
                Actions
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </>
    );
  }, [floatingActionsVisible, toggleSectionNav, showSectionNav, sectionNavAnim, activeTab, scrollToSection, paginatedUnits.totalUnits]);

  // Pagination controls component
  const renderPaginationControls = useCallback(() => {
    if (paginatedUnits.totalPages <= 1) return null;
    
    // Create page number buttons array
    const pageButtons = [];
    
    // For small number of pages, show all page buttons
    if (paginatedUnits.totalPages <= 5) {
      for (let i = 1; i <= paginatedUnits.totalPages; i++) {
        pageButtons.push(
          <TouchableOpacity 
            key={`page-${i}`}
            style={[
              styles.pageButton,
              currentPage === i && styles.pageButtonActive
            ]}
            onPress={() => goToPage(i)}
          >
            <Text 
              style={[
                styles.pageButtonText,
                currentPage === i && styles.pageButtonTextActive
              ]}
            >
              {i}
            </Text>
          </TouchableOpacity>
        );
      }
    } 
    // For large number of pages, show limited buttons with ellipsis
    else {
      // Always show first page
      pageButtons.push(
        <TouchableOpacity 
          key="page-1"
          style={[
            styles.pageButton,
            currentPage === 1 && styles.pageButtonActive
          ]}
          onPress={() => goToPage(1)}
        >
          <Text 
            style={[
              styles.pageButtonText,
              currentPage === 1 && styles.pageButtonTextActive
            ]}
          >
            1
          </Text>
        </TouchableOpacity>
      );
      
      // Calculate range of pages to display
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(paginatedUnits.totalPages - 1, currentPage + 1);
      
      // Add ellipsis if needed
      if (startPage > 2) {
        pageButtons.push(
          <Text key="ellipsis-1" style={styles.ellipsis}>…</Text>
        );
      }
      
      // Add middle page buttons
      for (let i = startPage; i <= endPage; i++) {
        pageButtons.push(
          <TouchableOpacity 
            key={`page-${i}`}
            style={[
              styles.pageButton,
              currentPage === i && styles.pageButtonActive
            ]}
            onPress={() => goToPage(i)}
          >
            <Text 
              style={[
                styles.pageButtonText,
                currentPage === i && styles.pageButtonTextActive
              ]}
            >
              {i}
            </Text>
          </TouchableOpacity>
        );
      }
      
      // Add ellipsis if needed
      if (endPage < paginatedUnits.totalPages - 1) {
        pageButtons.push(
          <Text key="ellipsis-2" style={styles.ellipsis}>…</Text>
        );
      }
      
      // Always show last page
      pageButtons.push(
        <TouchableOpacity 
          key={`page-${paginatedUnits.totalPages}`}
          style={[
            styles.pageButton,
            currentPage === paginatedUnits.totalPages && styles.pageButtonActive
          ]}
          onPress={() => goToPage(paginatedUnits.totalPages)}
        >
          <Text 
            style={[
              styles.pageButtonText,
              currentPage === paginatedUnits.totalPages && styles.pageButtonTextActive
            ]}
          >
            {paginatedUnits.totalPages}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationInfoText}>
            Showing {paginatedUnits.startIndex}-{paginatedUnits.endIndex} of {paginatedUnits.totalUnits} units
          </Text>
        </View>
        
        <View style={styles.paginationControls}>
          <TouchableOpacity 
            style={[
              styles.paginationButton,
              currentPage === 1 && styles.paginationButtonDisabled
            ]}
            onPress={goToPrevPage}
            disabled={currentPage === 1}
          >
            <Ionicons 
              name="chevron-back" 
              size={18} 
              color={currentPage === 1 ? '#bdc3c7' : '#3498db'} 
            />
          </TouchableOpacity>
          
          {pageButtons}
          
          <TouchableOpacity 
            style={[
              styles.paginationButton,
              currentPage === paginatedUnits.totalPages && styles.paginationButtonDisabled
            ]}
            onPress={goToNextPage}
            disabled={currentPage === paginatedUnits.totalPages}
          >
            <Ionicons 
              name="chevron-forward" 
              size={18} 
              color={currentPage === paginatedUnits.totalPages ? '#bdc3c7' : '#3498db'} 
            />
          </TouchableOpacity>
        </View>      </View>
    );
  }, [paginatedUnits, currentPage, goToPage, goToPrevPage, goToNextPage]);

  // ALL EFFECTS - Must be at the top before any early returns
  useEffect(() => {
    if (property?.id) {
      loadPropertyDetails();
    } else {
      console.warn('No valid property found in route params:', property);
    }
    
    // Don't clear property details on unmount to avoid flashing
    // Only clear when navigating to a different property
  }, [property?.id]); // Only depend on property ID to prevent loops

    useEffect(() => {
      setCurrentPage(1);
    }, [searchText]);

    useEffect(() => {
      Animated.timing(quickActionsAnim, {
        toValue: showQuickActions ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [showQuickActions, quickActionsAnim]);

    useEffect(() => {
      Animated.timing(sectionNavAnim, {
        toValue: showSectionNav ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [showSectionNav, sectionNavAnim]);
  
  // EARLY RETURNS - Only after ALL hooks have been declared
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading property details...</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={50} color="#e74c3c" />
        <Text style={styles.errorTitle}>No Property Data</Text>
        <Text style={styles.errorMessage}>
          Unable to load property information. Please try navigating to this property again.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );  }
  return (
    <View style={styles.container}>
      {renderStickyHeader()}
      
      <ScrollView 
        style={styles.scrollContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
          />
        }
        ref={scrollViewRef} // Attach ref to ScrollView
      >
        <CacheBanner visible={propertyDetailsFromCache} />
      
        {propertyDetailsError && !loading && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={14} color="#fff" />
            <Text style={styles.errorText}>Error: {propertyDetailsError}</Text>
          </View>
        )}
        
        <View style={styles.headerSection}>
          {property?.image ? (
            <Image 
              source={{ uri: property.image }} 
              style={styles.propertyImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="business" size={60} color="#bdc3c7" />
            </View>
          )}
          
          <View style={styles.headerOverlay}>
            <Text style={styles.propertyName}>{property?.name || 'Unknown Property'}</Text>
            <Text style={styles.propertyAddress}>{property?.address || 'No address available'}</Text>
            
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditProperty}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.totalUnits || 0}</Text>
              <Text style={styles.statLabel}>Units</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.occupiedUnits || 0}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: (stats?.vacantUnits || 0) > 0 ? '#27ae60' : '#7f8c8d'}]}>
                {stats?.vacantUnits || 0}
              </Text>
              <Text style={styles.statLabel}>Vacant</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>KES {(stats?.rentCollected || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: (stats?.pendingRent || 0) > 0 ? '#e74c3c' : '#7f8c8d'}]}>
                KES {(stats?.pendingRent || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: (stats?.openTickets || 0) > 0 ? '#f39c12' : '#7f8c8d'}]}>
                {stats?.openTickets || 0}
              </Text>
              <Text style={styles.statLabel}>Tickets</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'units' && styles.activeTab]}
            onPress={() => setActiveTab('units')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'units' && styles.activeTabText]}>Units</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'actions' && styles.activeTab]}
            onPress={() => setActiveTab('actions')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'actions' && styles.activeTabText]}>Actions</Text>
          </TouchableOpacity>
        </View>
        
        {activeTab === 'overview' && (
          <View style={styles.overviewContainer} ref={overviewSectionRef}>
            <Text style={styles.overviewTitle}>Property Overview</Text>
            <Text style={styles.overviewText}>
              {property?.description || 'No description available'}
            </Text>
          </View>
        )}
        
        {activeTab === 'units' && (
          <View ref={unitsSectionRef}>
            {/* Units Search Bar */}
            <View style={styles.unitsSearchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={18} color="#7f8c8d" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search units by number or tenant..."
                  value={searchText}
                  onChangeText={setSearchText}
                  clearButtonMode="while-editing"
                />
                {searchText.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => setSearchText('')}
                  >
                    <Ionicons name="close-circle" size={18} color="#7f8c8d" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.unitsControlBar}>
                <View style={styles.unitsCount}>
                  <Text style={styles.unitsCountText}>
                    {paginatedUnits.totalUnits} {paginatedUnits.totalUnits === 1 ? 'unit' : 'units'}
                    {searchText.length > 0 ? ' matched' : ''}
                  </Text>
                </View>
                
                <View style={styles.unitsViewToggle}>
                  <TouchableOpacity 
                    style={[
                      styles.viewTypeButton,
                      unitViewType === 'detailed' && styles.viewTypeButtonActive
                    ]}
                    onPress={() => setUnitViewType('detailed')}
                  >
                    <Ionicons 
                      name="grid" 
                      size={18} 
                      color={unitViewType === 'detailed' ? '#3498db' : '#95a5a6'} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.viewTypeButton,
                      unitViewType === 'compact' && styles.viewTypeButtonActive
                    ]}
                    onPress={() => setUnitViewType('compact')}
                  >
                    <Ionicons 
                      name="list" 
                      size={18} 
                      color={unitViewType === 'compact' ? '#3498db' : '#95a5a6'} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Units List with Pagination */}
            {paginatedUnits.totalUnits > 0 ? (
              <>
                {unitViewType === 'compact' ? (
                  <FlatList
                    data={paginatedUnits.currentPageUnits}
                    renderItem={renderUnitCompact}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.unitsList}
                    initialNumToRender={20}
                    maxToRenderPerBatch={20}
                    windowSize={10}
                    removeClippedSubviews={true}
                    ListFooterComponent={<View style={{ height: 20 }} />}
                    nestedScrollEnabled={true}
                    scrollEnabled={false} // Disable scrolling within FlatList, let parent ScrollView handle it
                  />
                ) : (
                  <EnhancedUnitsSection
                    units={paginatedUnits.currentPageUnits}
                    onUnitPress={handleUnitPress}
                    onAddUnit={handleAddUnit}
                    isOffline={isOffline}
                    loading={loading}
                    viewType="detailed"
                  />
                )}
                
                {/* Pagination Controls */}
                {renderPaginationControls()}
              </>
            ) : (
              <View style={styles.noUnitsContainer}>
                <Ionicons name="home-outline" size={60} color="#ddd" />
                <Text style={styles.noUnitsText}>
                  {searchText.length > 0 ? 'No units match your search' : 'No units available'}
                </Text>
                {searchText.length > 0 ? (
                  <TouchableOpacity 
                    style={styles.clearSearchButton}
                    onPress={() => setSearchText('')}
                  >
                    <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                  </TouchableOpacity>
                ) : !isOffline && (
                  <TouchableOpacity 
                    style={styles.addFirstUnitButton}
                    onPress={handleAddUnit}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.addFirstUnitButtonText}>Add First Unit</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        
        {activeTab === 'actions' && (
          <View style={styles.actionsContainer} ref={actionsSectionRef}>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            
            <View style={styles.actionGrid}>              <TouchableOpacity 
                style={[styles.actionGridItem, { backgroundColor: '#3498db' }]}
                onPress={() => navigation.navigate('Main', { 
                  screen: 'Tickets',
                  params: { propertyFilter: property?.id }
                })}
                disabled={!property?.id}
              >
                <Ionicons name="construct-outline" size={32} color="#fff" />
                <Text style={styles.actionGridText}>Maintenance</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionGridItem, { backgroundColor: '#2ecc71' }]}
                onPress={() => navigation.navigate('Main', { 
                  screen: 'Payments',
                  params: { selectedProperty: property?.id }
                })}
                disabled={!property?.id}
              >
                <Ionicons name="cash-outline" size={32} color="#fff" />
                <Text style={styles.actionGridText}>Payments</Text>
              </TouchableOpacity>
                <TouchableOpacity 
                style={[styles.actionGridItem, { backgroundColor: '#9b59b6' }]}
                onPress={() => Alert.alert(
                  'Notices Available on Web',
                  'The notices feature is currently only available in the web application. Would you like to know more about this feature?',
                  [
                    {
                      text: 'No, Thanks',
                      style: 'cancel'
                    },
                    {
                      text: 'Tell Me More',
                      onPress: () => Alert.alert(
                        'Property Notices',
                        'Property notices allow you to create and manage announcements for your tenants. You can create notices for maintenance schedules, payment reminders, building updates, and more. Please access this feature through the web app at homemanager.app.',
                        [{ text: 'OK' }]
                      )
                    }
                  ]
                )}
                disabled={!property?.id}
              >
                <Ionicons name="megaphone-outline" size={32} color="#fff" />
                <Text style={styles.actionGridText}>Notices</Text>
              </TouchableOpacity><TouchableOpacity 
                style={[styles.actionGridItem, { backgroundColor: '#f1c40f' }]}
                onPress={() => navigation.navigate('QRCodeManager', { propertyId: property?.id })}
                disabled={!property?.id}
              >
                <Ionicons name="qr-code-outline" size={32} color="#fff" />
                <Text style={styles.actionGridText}>QR Manager</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionGridItem, { backgroundColor: '#e67e22' }]}
                onPress={() => setShowPaymentSettings(true)}
                disabled={!property?.id}
              >
                <Ionicons name="card-outline" size={32} color="#fff" />
                <Text style={styles.actionGridText}>Payment Settings</Text>
              </TouchableOpacity>
            </View>          </View>
        )}
      </ScrollView>
      
      {/* Floating Add Unit Button */}
      {activeTab === 'units' && filteredUnits.length > 0 && (
        <Animated.View 
          style={[
            styles.floatingAddButton,
            { opacity: floatingActionsVisible ? 1 : 0 }
          ]}
        >
          <TouchableOpacity
            style={styles.floatingAddButtonContent}
            onPress={handleAddUnit}
            disabled={isOffline}
          >
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
      
      {/* Quick Actions Floating Button */}
      <TouchableOpacity 
        style={[
          styles.quickActionsButton,
          { opacity: floatingActionsVisible ? 1 : 0.6 }
        ]}
        onPress={toggleQuickActions}
      >
        <Ionicons name={showQuickActions ? "close" : "apps"} size={28} color="#fff" />
      </TouchableOpacity>
      
      {/* Section Navigator */}
      {renderSectionNavigator()}
      
      {showQuickActions && (
        <Animated.View style={[styles.quickActionsContainer, { opacity: quickActionsAnim }]}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleAddUnit}>
            <Ionicons name="home-outline" size={24} color="#fff" />
            <Text style={styles.quickActionText}>Add Unit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('Main', { 
              screen: 'Tickets',
              params: { propertyFilter: property?.id }
            })}>
            <Ionicons name="construct-outline" size={24} color="#fff" />
            <Text style={styles.quickActionText}>Tickets</Text>
          </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('Main', { 
              screen: 'Notices',
              params: { 
                propertyFilter: property?.id,
                propertyName: property?.name 
              }
            })}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <Text style={styles.quickActionText}>Notices</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('Main', { 
              screen: 'Payments',
              params: { selectedProperty: property?.id }
            })}>
            <Ionicons name="cash-outline" size={24} color="#fff" />
            <Text style={styles.quickActionText}>Payments</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      
      {/* Payment Settings Modal */}
      <Modal
        visible={showPaymentSettings}
        animationType="slide"
        onRequestClose={() => setShowPaymentSettings(false)}
      >
        <PropertyMpesaSettings 
          property={property} 
          onClose={() => setShowPaymentSettings(false)} 
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#e74c3c',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  headerSection: {
    position: 'relative',
    height: 200,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
  },
  propertyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  propertyAddress: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  editButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.8)',
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
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34495e',
  },
  activeTab: {
    backgroundColor: '#3498db',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  overviewContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 16,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  overviewText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  actionsContainer: {
    padding: 16,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionGridItem: {
    width: (windowWidth - 48) / 2,
    height: 100,
    borderRadius: 10,
    marginBottom: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionGridText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  quickActionsContainer: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3498db',
    marginBottom: 8,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  unitsSearchContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    padding: 4,
  },
  unitsControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  unitsCount: {
    flex: 1,
  },
  unitsCountText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  unitsViewToggle: {
    flexDirection: 'row',
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  viewTypeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  viewTypeButtonActive: {
    backgroundColor: '#e6f7ff',
  },
  unitsList: {
    paddingHorizontal: 16,
  },
  unitCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusIndicatorCompact: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  unitContentCompact: {
    flex: 1,
  },
  unitNumberCompact: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tenantNameCompact: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  vacantTextCompact: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
    marginTop: 2,
  },
  unitDetailsCompact: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  detailTextCompact: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  rentCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 2,
  },
  noUnitsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 10,
  },
  noUnitsText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  clearSearchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addFirstUnitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addFirstUnitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 84,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#27ae60',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  floatingAddButtonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    elevation: 4,
    zIndex: 1000,
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stickyHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  stickyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickyHeaderButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  
  /* Pagination Styles */
  paginationContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  paginationInfo: {
    marginBottom: 12,
  },
  paginationInfoText: {
    color: '#7f8c8d',
    fontSize: 14,
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  pageButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginHorizontal: 4,
  },
  pageButtonActive: {
    backgroundColor: '#3498db',
  },
  pageButtonText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  pageButtonTextActive: {
    color: '#fff',
  },
  ellipsis: {
    fontSize: 14,
    color: '#7f8c8d',
    marginHorizontal: 4,
  },
  
  /* Section Navigator Styles */
  sectionNavButton: {
    position: 'absolute',
    bottom: 148,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  sectionNavContainer: {
    position: 'absolute',
    bottom: 220,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: 180,
    paddingVertical: 8,
    zIndex: 999,
  },
  sectionNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionNavItemActive: {
    backgroundColor: '#ecf0f1',
  },
  sectionNavText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  sectionNavTextActive: {
    color: '#3498db',
    fontWeight: '500',
  },
});

export default PropertyDetailScreen;
