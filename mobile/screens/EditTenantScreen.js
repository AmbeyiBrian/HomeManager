import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import UnitFilterModal from '../components/UnitFilterModal';

const EditTenantScreen = ({ route, navigation }) => {
  const { tenant } = route.params;  const { 
    updateTenant, 
    fetchUnitById, 
    fetchProperties, 
    fetchPropertyById, 
    fetchAvailableUnits, 
    allocateTenantToUnit, 
    deallocateTenantFromUnit, 
    transferTenant,
    getCachedData,
    cacheDataForOffline
  } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    phone_number: tenant?.phone_number || '',
    status: tenant?.status || 'active',
    move_in_date: tenant?.move_in_date ? new Date(tenant.move_in_date) : new Date(),
    lease_start_date: tenant?.lease_start_date ? new Date(tenant.lease_start_date) : new Date(),
    lease_end_date: tenant?.lease_end_date ? new Date(tenant.lease_end_date) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    security_deposit: tenant?.security_deposit?.toString() || '',
    notes: tenant?.notes || '',
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showMoveInPicker, setShowMoveInPicker] = useState(false);
  const [showLeaseStartPicker, setShowLeaseStartPicker] = useState(false);
  const [showLeaseEndPicker, setShowLeaseEndPicker] = useState(false);
  const [unitDetails, setUnitDetails] = useState(null);
  const [isActive, setIsActive] = useState(tenant?.status === 'active');
  
  // Unit allocation state
  const [properties, setProperties] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(tenant?.property_id || null);
  const [selectedUnit, setSelectedUnit] = useState(tenant?.unit_id || null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedPropertyObj, setSelectedPropertyObj] = useState(null);
  const [selectedUnitObj, setSelectedUnitObj] = useState(null);
  const [unitAllocationChanged, setUnitAllocationChanged] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    if (tenant?.unit_id) {
      fetchUnitDetails();
    }
    
    // Load properties and available units
    loadProperties();

    // Set the navigation options
    navigation.setOptions({
      title: 'Edit Tenant',
      headerRight: () => (
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, []);
  // Fetch unit details
  const fetchUnitDetails = async (unitId = null, forceRefresh = false) => {
    try {
      // Use provided unitId or fallback to tenant's unit_id
      const targetUnitId = unitId || tenant.unit_id;
      console.log(`Fetching unit details for unit ${targetUnitId}, forceRefresh=${forceRefresh}`);
      
      const response = await fetchUnitById(targetUnitId, forceRefresh);
      if (response.success) {
        console.log(`Successfully fetched unit details: is_occupied=${response.data.is_occupied}`);
        setUnitDetails(response.data);
        setSelectedUnitObj(response.data);
        
        // If security deposit is not provided but unit has default, use unit's value
        if (!formData.security_deposit && response.data.security_deposit) {
          setFormData(prev => ({
            ...prev,
            security_deposit: response.data.security_deposit.toString(),
          }));
        }
        
        // Also fetch property details
        if (tenant.property_id) {
          const propertyResponse = await fetchPropertyById(tenant.property_id, forceRefresh);
          if (propertyResponse.success) {
            setSelectedPropertyObj(propertyResponse.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching unit details:', error);
    }
  };  // Load all properties - with improved caching and error handling
  const loadProperties = async () => {
    setPropertyLoading(true);
    try {
      // React Native doesn't have localStorage, but we can use the offline cache 
      // that's already implemented in the app's auth context
      const cachedResponse = await getCachedData && typeof getCachedData === 'function' 
        ? await getCachedData('properties_cache')
        : null;
      
      // If we have cached properties, use them immediately for faster UI
      if (cachedResponse && Array.isArray(cachedResponse)) {
        console.log(`Using ${cachedResponse.length} cached properties`);
        setProperties(cachedResponse);
      }
      
      // Always fetch fresh data from API
      const response = await fetchProperties();
      if (response.success) {
        setProperties(response.data);
          // Cache the properties using the app's existing caching mechanism if available
        if (cacheDataForOffline && typeof cacheDataForOffline === 'function') {
          try {
            await cacheDataForOffline('properties_cache', response.data);
            console.log('Properties cached successfully');
          } catch (e) {
            console.warn('Failed to cache properties:', e);
          }
        }
        
        // If tenant has a property, fetch available units for that property
        if (tenant?.property_id) {
          // Apply initial filters if already set, otherwise use default filters
          const filters = Object.keys(activeFilters).length > 0 
            ? activeFilters 
            : {
                // Only include essential filters to improve performance
                ...(selectedUnitObj?.bedrooms ? { bedrooms: selectedUnitObj.bedrooms } : {}),
              };
          
          loadAvailableUnits(tenant.property_id, filters);
        }
      } else {
        // Only show error if we don't have data loaded already
        if (!properties || properties.length === 0) {
          Alert.alert('Error', 'Failed to load properties');
        } else {
          // Just log a warning if we already have properties displayed
          console.warn('Using previously loaded properties due to API error:', response.error);
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      // Only show error if we don't have any properties already loaded
      if (!properties || properties.length === 0) {
        Alert.alert('Error', 'An unexpected error occurred while loading properties');
      }
    } finally {
      setPropertyLoading(false);
    }
  };// Load available units for a property with optional filters
  const loadAvailableUnits = async (propertyId, filters = {}) => {
    setUnitsLoading(true);
    try {
      console.log(`Loading available units for property ${propertyId} with filters:`, filters);
      
      // Use enhanced fetchAvailableUnits API with filters
      const response = await fetchAvailableUnits(propertyId, filters);
      if (response.success) {
        console.log(`Fetched ${response.data.length} available units`);
        
        // Add the current tenant's unit to the list if not included
        if (tenant?.unit_id && tenant?.property_id === propertyId) {
          const unitExists = response.data.some(unit => unit.id === tenant.unit_id);
          
          if (!unitExists && selectedUnitObj) {
            console.log(`Adding current tenant's unit ${selectedUnitObj.unit_number} to available units list`);
            setAvailableUnits([selectedUnitObj, ...response.data]);
          } else {
            setAvailableUnits(response.data);
          }
        } else {
          setAvailableUnits(response.data);
        }
      } else {
        Alert.alert('Error', 'Failed to load available units');
      }
    } catch (error) {
      console.error('Error loading available units:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading units');
    } finally {
      setUnitsLoading(false);
    }
  };
  // Optimized input handler with debouncing for better performance
  const [lastUpdateTime, setLastUpdateTime] = useState({});
  
  const handleInputChange = (field, value) => {
    const now = Date.now();
    const lastUpdate = lastUpdateTime[field] || 0;
    
    // Update immediately for user experience
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Track update time for potential debouncing
    setLastUpdateTime(prev => ({
      ...prev,
      [field]: now
    }));
    
    // For future optimization: Add debounce to heavy operations if needed
  };

  const handleDateChange = (event, selectedDate, dateField, showStateSetter) => {
    showStateSetter(false);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        [dateField]: selectedDate,
      }));
    }
  };

  const formatDate = (date) => {
    return moment(date).format('MMM DD, YYYY');
  };
  // Handle property selection
  const handlePropertySelect = (property) => {
    setSelectedProperty(property.id);
    setSelectedPropertyObj(property);
    setShowPropertyModal(false);
    
    // Reset unit selection if property changes
    if (property.id !== tenant?.property_id) {
      setSelectedUnit(null);
      setSelectedUnitObj(null);
      setUnitAllocationChanged(true);
    }
      // Load available units for the selected property
    // Apply active filters if any, otherwise default to unit similarity filters
    const filters = Object.keys(activeFilters).length > 0 
      ? activeFilters 
      : {
          // If we have a selected unit, we can recommend similar ones
          // by matching bedrooms/bathrooms/etc.
          ...(selectedUnitObj?.bedrooms ? { bedrooms: selectedUnitObj.bedrooms } : {}),
          ...(selectedUnitObj?.bathrooms ? { bathrooms: selectedUnitObj.bathrooms } : {})
        };
    
    loadAvailableUnits(property.id, filters);
  };
  // Handle unit selection
  const handleUnitSelect = (unit) => {
    // If unit is occupied and it's not the tenant's current unit, show warning
    if (unit.is_occupied && unit.id !== tenant?.unit_id) {
      Alert.alert(
        "Occupied Unit",
        "This unit is currently occupied by another tenant. Are you sure you want to select it?",
        [
          { 
            text: "Cancel", 
            style: "cancel" 
          },
          {
            text: "Select Anyway",
            style: "destructive",
            onPress: () => {
              confirmUnitSelection(unit);
            }
          }
        ]
      );
    } else {
      confirmUnitSelection(unit);
    }
  };  // Confirm unit selection after validation
  const confirmUnitSelection = (unit) => {
    setSelectedUnit(unit.id);
    setSelectedUnitObj(unit);
    setShowUnitModal(false);
    
    // Always mark as changed to ensure the unit allocation logic runs
    // This ensures reallocation with PATCH happens if the tenant is already assigned to this unit
    setUnitAllocationChanged(true);
    
    // Log whether this is a reallocation (same unit) or a new allocation
    if (tenant?.unit_id && tenant.unit_id === unit.id) {
      console.log(`Selected same unit (ID: ${unit.id}, Number: ${unit.unit_number}) - this will be a PATCH reallocation`);
      console.log(`Current tenant unit ID: ${tenant.unit_id}, Selected unit ID: ${unit.id}`);
    } else {
      console.log(`Selected different unit (ID: ${unit.id}, Number: ${unit.unit_number}) - this will be a POST allocation or transfer`);
      if (tenant?.unit_id) {
        console.log(`This is a transfer from unit ID: ${tenant.unit_id} to unit ID: ${unit.id}`);
      } else {
        console.log(`This is a new allocation to unit ID: ${unit.id}`);
      }
    }
    
    // Set security deposit from unit if empty
    if (!formData.security_deposit && unit.security_deposit) {
      setFormData(prev => ({
        ...prev,
        security_deposit: unit.security_deposit.toString(),
      }));
    }
  };

  // Handle deallocation
  const handleDeallocate = () => {
    Alert.alert(
      "Deallocate Unit",
      "Are you sure you want to remove this tenant from their current unit?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Deallocate", 
          style: "destructive",
          onPress: async () => {
            setSelectedUnit(null);
            setSelectedUnitObj(null);
            
            if (tenant?.unit_id) {
              setUnitAllocationChanged(true);
            }
          }
        }
      ]
    );
  };  
  
  const handleSubmit = async () => {
    if (!formData.name || !formData.phone_number) {
      Alert.alert('Missing Information', 'Please provide tenant name and phone number.');
      return;
    }

    setLoading(true);
    let response; // Define response variable outside the try block for broader scope
    
    try {
      // Only include fields that have changed to optimize the update
      const changedFields = {};
      
      // Check which fields have changed and only include those
      if (formData.name !== tenant?.name) changedFields.name = formData.name;
      if (formData.email !== tenant?.email) changedFields.email = formData.email;
      if (formData.phone_number !== tenant?.phone_number) changedFields.phone_number = formData.phone_number;
      
      const newStatus = isActive ? 'active' : 'inactive';
      if (newStatus !== tenant?.status) changedFields.status = newStatus;
      
      // Format dates and check if they've changed
      const formattedMoveInDate = formData.move_in_date.toISOString().split('T')[0];
      if (formattedMoveInDate !== tenant?.move_in_date) changedFields.move_in_date = formattedMoveInDate;
      
      const formattedLeaseStartDate = formData.lease_start_date.toISOString().split('T')[0];
      if (formattedLeaseStartDate !== tenant?.lease_start_date) changedFields.lease_start_date = formattedLeaseStartDate;
      
      const formattedLeaseEndDate = formData.lease_end_date.toISOString().split('T')[0];
      if (formattedLeaseEndDate !== tenant?.lease_end_date) changedFields.lease_end_date = formattedLeaseEndDate;
      
      // Check if security deposit has changed
      const parsedSecurityDeposit = formData.security_deposit ? parseFloat(formData.security_deposit) : undefined;
      if (parsedSecurityDeposit !== tenant?.security_deposit) changedFields.security_deposit = parsedSecurityDeposit;
      
      if (formData.notes !== tenant?.notes) changedFields.notes = formData.notes;
      
      // Create the tenant update object with only changed fields and the ID
      const updatedTenant = {
        id: tenant.id,
        ...changedFields
      };      // Only update tenant info if there are actual changes

      let tenantUpdateSuccessful = true;
      
      // Only make API call if there are changes to tenant basic info
      if (Object.keys(updatedTenant).length > 1) { // More than just the ID field
        console.log("Sending updated tenant data with changed fields:", Object.keys(updatedTenant));
        response = await updateTenant(updatedTenant);
        tenantUpdateSuccessful = response.success;
        
        if (!response.success) {
          Alert.alert('Error', response.error || 'Failed to update tenant information');
          setLoading(false);
          return;
        }
      } else {
        console.log("No basic tenant info changes detected, skipping tenant update API call");
      }
        if (tenantUpdateSuccessful) {
        // Handle unit allocation changes if needed
        if (unitAllocationChanged) {
          console.log("Unit allocation changed, handling unit changes...");
          
          // Case 1: Deallocate tenant from unit
          if (tenant?.unit_id && !selectedUnit) {
            console.log(`Deallocating tenant ${tenant.id} from unit ${tenant.unit_id}`);
            const deallocateResponse = await deallocateTenantFromUnit(tenant.id, tenant.unit_id);
            if (!deallocateResponse.success) {
              Alert.alert('Error', deallocateResponse.error || 'Failed to deallocate tenant from unit');
              setLoading(false);
              return;
            }
            console.log("Tenant successfully deallocated from unit");
          }          
          // Case 2: Allocate tenant to new unit (or transfer/reallocate existing unit)
          else if (selectedUnit) {
            // Prepare lease details for allocation or transfer
            // Only include changed fields in lease details to optimize the API call
            const leaseDetails = {};
            
            const formattedLeaseStartDate = formData.lease_start_date.toISOString().split('T')[0];
            if (formattedLeaseStartDate !== tenant?.lease_start_date) {
              leaseDetails.lease_start_date = formattedLeaseStartDate;
            }
            
            const formattedLeaseEndDate = formData.lease_end_date.toISOString().split('T')[0];
            if (formattedLeaseEndDate !== tenant?.lease_end_date) {
              leaseDetails.lease_end_date = formattedLeaseEndDate;
            }
            
            const parsedSecurityDeposit = formData.security_deposit ? parseFloat(formData.security_deposit) : undefined;
            if (parsedSecurityDeposit !== tenant?.security_deposit) {
              leaseDetails.security_deposit = parsedSecurityDeposit;
            }
              // Check if tenant already has a unit assigned
            if (tenant?.unit_id) {              
              // If selecting a different unit, use transfer
              if (tenant.unit_id !== selectedUnit) {
                console.log(`Transferring tenant ${tenant.id} from unit ${tenant.unit_id} to unit ${selectedUnit}`);
                const transferResponse = await transferTenant(tenant.id, tenant.unit_id, selectedUnit, leaseDetails);
                
                if (!transferResponse.success) {
                  Alert.alert('Error', transferResponse.error || 'Failed to transfer tenant to new unit');
                  setLoading(false);
                  return;
                }
                console.log("Tenant successfully transferred to new unit");
              }              
              // If same unit, always use PATCH (reallocate) - regardless of lease detail changes
              else {
                // Always use PATCH/reallocate when updating the same unit
                // This ensures is_occupied is properly set to false as per backend logic
                console.log(`Updating lease details for tenant ${tenant.id} in the same unit ${selectedUnit}`);
                console.log('Using PATCH method for reallocation (same unit)');
                
                // Always use isReallocation=true for the same unit to ensure PATCH is used
                const reallocateResponse = await allocateTenantToUnit(
                  tenant.id, 
                  selectedUnit, 
                  selectedProperty, 
                  leaseDetails, 
                  true // Always set isReallocation=true when dealing with the same unit
                );
                
                if (!reallocateResponse.success) {
                  Alert.alert('Error', reallocateResponse.error || 'Failed to update tenant lease details');
                  setLoading(false);
                  return;
                }
                console.log("Tenant lease details successfully updated");
                
                // Refresh unit details to get updated is_occupied status (now false after reallocation)
                await fetchUnitDetails(selectedUnit, true);
              }
            }            // New allocation (tenant doesn't have a unit yet)
            else {
              console.log(`Allocating tenant ${tenant.id} to unit ${selectedUnit} in property ${selectedProperty}`);
              console.log('Using PATCH method for all allocations in EditTenantScreen');
              
              // Force PATCH for all allocations in EditTenantScreen by setting isReallocation=true
              const allocateResponse = await allocateTenantToUnit(
                tenant.id, 
                selectedUnit, 
                selectedProperty, 
                leaseDetails,
                true // Set isReallocation=true to force PATCH method
              );
              
              if (!allocateResponse.success) {
                Alert.alert('Error', allocateResponse.error || 'Failed to allocate tenant to unit');
                setLoading(false);
                return;
              }
              console.log("Tenant successfully allocated to unit");
            }
          }
        }

        // Show success message and navigate back
        Alert.alert(
          'Success', 
          'Tenant information updated successfully.',
          [{ 
            text: 'OK', 
            onPress: () => navigation.navigate('TenantDetails', {
              tenantId: tenant.id,
              tenantData: null, // Force a refresh by not providing tenant data
            })
          }]
        );
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
      Alert.alert('Error', 'An unexpected error occurred while updating tenant information');
    } finally {
      setLoading(false);
    }
  };
  // Optimize modal rendering with memo to prevent unnecessary re-renders
  const renderPropertyItem = React.useCallback(({ item }) => (
    <TouchableOpacity
      style={[
        styles.modalItem,
        item.id === selectedProperty ? styles.selectedModalItem : null
      ]}
      onPress={() => handlePropertySelect(item)}
    >
      <Text style={styles.modalItemTitle}>{item.name}</Text>
      <Text style={styles.modalItemSubtitle}>
        {item.address || 'No address'} • {item.units_count || 0} units
      </Text>
      {item.id === selectedProperty && (
        <Ionicons name="checkmark-circle" size={24} color="#3498db" style={styles.selectedIcon} />
      )}
    </TouchableOpacity>
  ), [selectedProperty, handlePropertySelect]);  // Optimized unit item rendering with memoization to improve list performance
  const renderUnitItem = React.useCallback(({ item }) => {
    // Determine if this is the tenant's current unit
    const isCurrentUnit = item.id === tenant?.unit_id;
    
    // Determine availability status and badge color/text
    let badgeColor = '#2ecc71'; // Default: green for available
    let badgeText = 'Available';
    
    if (item.is_occupied) {
      if (isCurrentUnit) {
        badgeColor = '#f39c12'; // Orange for current unit
        badgeText = 'Current';
      } else {
        badgeColor = '#e74c3c'; // Red for occupied
        badgeText = 'Occupied';
      }
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.modalItem,
          item.id === selectedUnit ? styles.selectedModalItem : null
        ]}
        onPress={() => handleUnitSelect(item)}
      >
        <View style={styles.unitItemHeader}>
          <Text style={styles.modalItemTitle}>Unit {item.unit_number}</Text>
          <View style={[
            styles.unitItemBadge,
            { backgroundColor: badgeColor }
          ]}>
            <Text style={styles.unitItemBadgeText}>
              {badgeText}
            </Text>
          </View>
        </View>
        <Text style={styles.modalItemSubtitle}>
          {item.bedrooms || 0} bed • {item.bathrooms || 0} bath • ${item.monthly_rent || item.rent_amount || 'N/A'}/month
        </Text>
        {item.id === selectedUnit && (
          <Ionicons name="checkmark-circle" size={24} color="#3498db" style={styles.selectedIcon} />
        )}
      </TouchableOpacity>
    );
  }, [tenant?.unit_id, selectedUnit, handleUnitSelect]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Updating tenant information...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container}>
        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <Text style={styles.inputLabel}>Tenant Name*</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
            placeholder="Full Name"
          />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            placeholder="Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Phone Number*</Text>
          <TextInput
            style={styles.input}
            value={formData.phone_number}
            onChangeText={(text) => handleInputChange('phone_number', text)}
            placeholder="Phone Number"
            keyboardType="phone-pad"
          />

          <View style={styles.switchRow}>
            <Text style={styles.inputLabel}>Active Status</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isActive ? "#3498db" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setIsActive}
              value={isActive}
            />
          </View>
        </View>

        {/* Unit Allocation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unit Allocation</Text>
          
          <Text style={styles.inputLabel}>Property</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowPropertyModal(true)}
          >
            <Text>{selectedPropertyObj ? selectedPropertyObj.name : 'Select a property'}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          
          <Text style={styles.inputLabel}>Unit</Text>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              !selectedProperty && styles.disabledButton
            ]}
            disabled={!selectedProperty}
            onPress={() => selectedProperty && setShowUnitModal(true)}
          >
            <Text>{selectedUnitObj ? `Unit ${selectedUnitObj.unit_number}` : selectedProperty ? 'Select a unit' : 'Select a property first'}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          
          {selectedUnitObj && tenant?.unit_id && (
            <TouchableOpacity
              style={styles.deallocateButton}
              onPress={handleDeallocate}
            >
              <Ionicons name="close-circle-outline" size={20} color="#e74c3c" />
              <Text style={styles.deallocateButtonText}>Remove from this unit</Text>
            </TouchableOpacity>
          )}
          
          {selectedUnitObj && (
            <View style={styles.selectedUnitDetails}>
              <Text style={styles.selectedUnitTitle}>Selected Unit Details</Text>
              
              <View style={styles.selectedUnitRow}>
                <Text style={styles.selectedUnitLabel}>Unit Number:</Text>
                <Text style={styles.selectedUnitValue}>{selectedUnitObj.unit_number}</Text>
              </View>
              
              <View style={styles.selectedUnitRow}>
                <Text style={styles.selectedUnitLabel}>Rent Amount:</Text>
                <Text style={styles.selectedUnitValue}>${selectedUnitObj.monthly_rent || 'N/A'}</Text>
              </View>
              
              <View style={styles.selectedUnitRow}>
                <Text style={styles.selectedUnitLabel}>Bedrooms:</Text>
                <Text style={styles.selectedUnitValue}>{selectedUnitObj.bedrooms || 'N/A'}</Text>
              </View>
              
              <View style={styles.selectedUnitRow}>
                <Text style={styles.selectedUnitLabel}>Bathrooms:</Text>
                <Text style={styles.selectedUnitValue}>{selectedUnitObj.bathrooms || 'N/A'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Lease Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lease Information</Text>
          
          <Text style={styles.inputLabel}>Move-in Date</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowMoveInPicker(true)}
          >
            <Text>{formatDate(formData.move_in_date)}</Text>
            <Ionicons name="calendar-outline" size={24} color="#666" />
          </TouchableOpacity>
          {showMoveInPicker && (
            <DateTimePicker
              value={formData.move_in_date}
              mode="date"
              display="default"
              onChange={(e, date) => handleDateChange(e, date, 'move_in_date', setShowMoveInPicker)}
            />
          )}

          <Text style={styles.inputLabel}>Lease Start Date</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowLeaseStartPicker(true)}
          >
            <Text>{formatDate(formData.lease_start_date)}</Text>
            <Ionicons name="calendar-outline" size={24} color="#666" />
          </TouchableOpacity>
          {showLeaseStartPicker && (
            <DateTimePicker
              value={formData.lease_start_date}
              mode="date"
              display="default"
              onChange={(e, date) => handleDateChange(e, date, 'lease_start_date', setShowLeaseStartPicker)}
            />
          )}

          <Text style={styles.inputLabel}>Lease End Date</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowLeaseEndPicker(true)}
          >
            <Text>{formatDate(formData.lease_end_date)}</Text>
            <Ionicons name="calendar-outline" size={24} color="#666" />
          </TouchableOpacity>
          {showLeaseEndPicker && (
            <DateTimePicker
              value={formData.lease_end_date}
              mode="date"
              display="default"
              onChange={(e, date) => handleDateChange(e, date, 'lease_end_date', setShowLeaseEndPicker)}
            />
          )}

          <Text style={styles.inputLabel}>Security Deposit ($)</Text>
          <TextInput
            style={styles.input}
            value={formData.security_deposit}
            onChangeText={(text) => handleInputChange('security_deposit', text)}
            placeholder="Security Deposit Amount"
            keyboardType="numeric"
          />
          {unitDetails?.security_deposit && !formData.security_deposit && (
            <Text style={styles.helperText}>
              Default: ${unitDetails.security_deposit}
            </Text>
          )}
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={formData.notes}
            onChangeText={(text) => handleInputChange('notes', text)}
            placeholder="Additional notes about tenant"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit Button for bottom of form */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>Update Tenant Information</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Property Selection Modal */}
      <Modal
        visible={showPropertyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPropertyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Property</Text>
              <TouchableOpacity onPress={() => setShowPropertyModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {propertyLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.modalLoadingText}>Loading properties...</Text>
              </View>
            ) : (              <FlatList
                data={properties}
                renderItem={renderPropertyItem}
                keyExtractor={item => item.id.toString()}
                ItemSeparatorComponent={() => <View style={styles.modalItemSeparator} />}
                initialNumToRender={10} 
                maxToRenderPerBatch={20}
                windowSize={10}
                removeClippedSubviews={true}
                ListEmptyComponent={
                  <View style={styles.modalEmptyContainer}>
                    <Text style={styles.modalEmptyText}>No properties available</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
        {/* Unit Selection Modal */}
      <Modal
        visible={showUnitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUnitModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setShowUnitModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {unitsLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.modalLoadingText}>Loading units...</Text>
              </View>
            ) : (
              <>              <View style={styles.modalFilterContainer}>
                  <Text style={styles.modalFilterText}>
                    {availableUnits.length} {availableUnits.length === 1 ? 'unit' : 'units'} available
                  </Text>                  <TouchableOpacity 
                    style={styles.filterButton}
                    onPress={() => setShowFilterModal(true)}
                  >
                    <Ionicons name="filter" size={20} color="#3498db" />
                    <Text style={styles.filterButtonText}>
                      Filter {Object.keys(activeFilters).length > 0 ? `(${Object.keys(activeFilters).length})` : ""}
                    </Text>
                  </TouchableOpacity>
                </View>                <FlatList
                  data={availableUnits}
                  renderItem={renderUnitItem}
                  keyExtractor={item => item.id.toString()}
                  ItemSeparatorComponent={() => <View style={styles.modalItemSeparator} />}
                  initialNumToRender={10}
                  maxToRenderPerBatch={20}
                  windowSize={10}
                  removeClippedSubviews={true}
                  getItemLayout={(data, index) => (
                    {length: 80, offset: 81 * index, index} // Approximate height of each item + separator
                  )}
                  ListEmptyComponent={
                    <View style={styles.modalEmptyContainer}>
                      <Text style={styles.modalEmptyText}>No units available for this property</Text>
                    </View>
                  }
                />
              </>
            )}
          </View>
        </View>      </Modal>
      
      {/* Filter Modal */}
      <UnitFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        initialFilters={activeFilters}
        onApply={(filters) => {
          setActiveFilters(filters);
          loadAvailableUnits(selectedProperty, filters);
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: -10,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  // New styles for unit allocation
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  disabledButton: {
    backgroundColor: '#f9f9f9',
    borderColor: '#e0e0e0',
  },
  deallocateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -5,
    marginBottom: 15,
    paddingVertical: 8,
  },
  deallocateButtonText: {
    color: '#e74c3c',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  selectedUnitDetails: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 5,
  },
  selectedUnitTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  selectedUnitRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  selectedUnitLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
  },
  selectedUnitValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalItem: {
    padding: 15,
    backgroundColor: 'white',
  },
  selectedModalItem: {
    backgroundColor: '#f0f8ff',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  modalItemSeparator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  selectedIcon: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  modalLoadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    color: '#666',
  },
  modalEmptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  modalEmptyText: {
    color: '#666',
    fontSize: 16,
  },
  unitItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitItemBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },  unitItemBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },  modalFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  filterButtonText: {
    color: '#3498db',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EditTenantScreen;
