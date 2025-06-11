import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const AddTenantScreen = ({ route, navigation }) => {  const { 
    unitId: initialUnitId, 
    propertyName,
    propertyId,
    unitNumber: initialUnitNumber,
    fromTenantsScreen,
    onTenantAdded 
  } = route.params || {};
  
  const auth = useAuth();
  // Verify that auth context is properly loaded
  const createTenant = auth?.createTenant;
  const fetchUnitsByProperty = auth?.fetchUnitsByProperty;
  const isOffline = auth?.isOffline || false;
  const { endpoints } = useApi();
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [moveInDate, setMoveInDate] = useState(new Date());
  const [emergencyContact, setEmergencyContact] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Unit selection state (for when coming from TenantsScreen)
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnitId);
  const [selectedUnitNumber, setSelectedUnitNumber] = useState(initialUnitNumber);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [filteredUnits, setFilteredUnits] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
    useEffect(() => {
    // Set the navigation title dynamically
    const unitDisplay = selectedUnitNumber || initialUnitNumber || '';
    navigation.setOptions({
      title: `Add Tenant${unitDisplay ? ` to Unit ${unitDisplay}` : ''}`
    });
    
    // If coming from TenantsScreen without specific unit, fetch available units
    if (fromTenantsScreen && !initialUnitId && propertyName) {
      fetchUnitsForProperty();
    }
  }, [selectedUnitNumber, initialUnitNumber, fromTenantsScreen, propertyName]);

  // Filter units based on search query
  useEffect(() => {
    if (availableUnits.length > 0) {
      if (!unitSearchQuery.trim()) {
        // If no search query, show all units
        setFilteredUnits(availableUnits);
      } else {
        // Filter units by unit number, bedrooms, bathrooms, or rent
        const query = unitSearchQuery.toLowerCase().trim();
        const filtered = availableUnits.filter(unit => 
          // Filter by unit number
          unit.unit_number.toString().toLowerCase().includes(query) ||
          // Filter by bedrooms (e.g., "1 bed", "2 bedroom")
          `${unit.bedrooms || 0} bed`.includes(query) ||
          `${unit.bedrooms || 0} bedroom`.includes(query) ||
          // Filter by bathrooms (e.g., "1 bath", "2 bathroom")
          `${unit.bathrooms || 0} bath`.includes(query) ||
          `${unit.bathrooms || 0} bathroom`.includes(query) ||
          // Filter by rent (e.g., "10000")
          (unit.monthly_rent && unit.monthly_rent.toString().includes(query))
        );
        setFilteredUnits(filtered);
      }
    } else {
      setFilteredUnits([]);
    }
  }, [unitSearchQuery, availableUnits]);
  
  // Fetch units for the property when coming from TenantsScreen
  const fetchUnitsForProperty = async () => {
    if (!fetchUnitsByProperty) {
      Alert.alert('Error', 'Unable to fetch units. Please try again.');
      return;
    }
    
    setLoadingUnits(true);
    try {
      // Use the propertyId if available, otherwise fall back to finding by name
      let targetPropertyId = propertyId;
      
      if (!targetPropertyId) {
        // Fallback: find property ID by name (for backward compatibility)
        const properties = auth?.properties || [];
        const property = properties.find(p => p.name === propertyName);
        
        if (!property) {
          Alert.alert('Error', 'Property not found. Please try again.');
          setLoadingUnits(false);
          return;
        }
        
        targetPropertyId = property.id;
      }
      
      const response = await fetchUnitsByProperty(targetPropertyId);
        if (response.success) {
        // Filter to only show vacant units (units without tenants)
        const vacantUnits = response.data.filter(unit => !unit.is_occupied);
        setAvailableUnits(vacantUnits);
        setFilteredUnits(vacantUnits);
        setUnitSearchQuery('');
        
        if (vacantUnits.length === 0) {
          Alert.alert(
            'No Vacant Units',
            'All units in this property are currently occupied. Please select a different property or free up a unit first.',
            [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]
          );
        } else if (vacantUnits.length === 1) {
          // If only one vacant unit, auto-select it
          setSelectedUnitId(vacantUnits[0].id);
          setSelectedUnitNumber(vacantUnits[0].unit_number);
        } else {
          // Multiple units available, show selector
          setShowUnitSelector(true);
        }
      } else {
        Alert.alert('Error', `Failed to fetch units: ${response.error}`);
      }
    } catch (error) {
      console.error('Error fetching units for property:', error);
      Alert.alert('Error', 'Failed to fetch units. Please try again.');
    } finally {
      setLoadingUnits(false);
    }
  };
  
  // Handle unit selection
  const handleUnitSelection = (unit) => {
    setSelectedUnitId(unit.id);
    setSelectedUnitNumber(unit.unit_number);
    setShowUnitSelector(false);
    
    // Update the navigation title
    navigation.setOptions({
      title: `Add Tenant to Unit ${unit.unit_number}`
    });
  };
  
  // Handle date change
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setMoveInDate(selectedDate);
    }
  };
  
  // Format date for display
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
    // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Tenant name is required';
    }
    
    if (email && !email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (phone && !phone.match(/^\d{10,15}$/)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Validate unit selection
    const finalUnitId = selectedUnitId || initialUnitId;
    if (!finalUnitId) {
      newErrors.unit = 'Please select a unit for the tenant';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot add tenants while offline.');
      return;
    }
    
    setLoading(true);
    
    try {
      const finalUnitId = selectedUnitId || initialUnitId;
      
      const tenantData = {
        name: name.trim(),
        phone_number: phone.trim() || null,
        email: email.trim() || null,
        unit: finalUnitId,
        move_in_date: formatDate(moveInDate),
        emergency_contact: emergencyContact.trim() || null
      };
      
      console.log('Submitting tenant data:', tenantData);
      const response = await createTenant(tenantData);
      console.log('Tenant creation response:', response);
      
      if (response.success) {
        // Call the callback function if provided (for refreshing tenant list)
        if (onTenantAdded && typeof onTenantAdded === 'function') {
          onTenantAdded();
        }
        
        Alert.alert(
          'Success',
          'Tenant added successfully',
          [{
            text: 'OK',
            onPress: () => navigation.goBack()
          }]
        );
      } else {
        // Improved error handling with better messages
        let errorMessage = '';
        if (typeof response.error === 'object') {
          // Format object errors nicely
          errorMessage = Object.entries(response.error)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        } else {
          errorMessage = response.error || 'Unknown error occurred';
        }
        Alert.alert('Error', `Failed to add tenant: ${errorMessage}`);
      }    } catch (error) {
      console.error('Error submitting tenant:', error);
      // More detailed error message
      const errorMsg = error.message || 'An unexpected error occurred';
      Alert.alert('Error', `Error creating tenant: [${errorMsg}]`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>          {/* Tenant Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Enter tenant's full name"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>
          
          {/* Unit Selection (when coming from TenantsScreen) */}
          {fromTenantsScreen && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Unit <Text style={styles.required}>*</Text></Text>
              {loadingUnits ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3498db" />
                  <Text style={styles.loadingText}>Loading units...</Text>
                </View>
              ) : selectedUnitId ? (
                <View style={styles.selectedUnitContainer}>
                  <View style={styles.selectedUnit}>
                    <Text style={styles.selectedUnitText}>
                      Unit {selectedUnitNumber} - {propertyName}
                    </Text>
                    {availableUnits.length > 1 && (
                      <TouchableOpacity 
                        style={styles.changeUnitButton}
                        onPress={() => setShowUnitSelector(true)}
                      >
                        <Text style={styles.changeUnitText}>Change</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.input, styles.unitSelector, errors.unit && styles.inputError]}
                  onPress={() => setShowUnitSelector(true)}
                >
                  <Text style={styles.placeholderText}>Select a unit</Text>
                  <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
                </TouchableOpacity>
              )}
              {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
            </View>
          )}
          
          {/* Show property and unit info for direct navigation */}
          {!fromTenantsScreen && propertyName && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Unit Information</Text>
              <View style={styles.unitInfoContainer}>
                <Text style={styles.unitInfoText}>
                  Unit {initialUnitNumber} - {propertyName}
                </Text>
              </View>
            </View>
          )}
          
          {/* Phone Number */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>
          
          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
            {/* Move-in Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Move-in Date <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>{formatDate(moveInDate)}</Text>
              <Ionicons name="calendar" size={20} color="#3498db" />
            </TouchableOpacity>
            
            {showDatePicker && (
              Platform.OS === 'ios' ? (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={moveInDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    style={{width: '100%'}}
                  />
                  <TouchableOpacity 
                    style={styles.datePickerDoneButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <DateTimePicker
                  value={moveInDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )
            )}
          </View>
          
          {/* Emergency Contact */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Emergency Contact</Text>
            <TextInput
              style={styles.input}
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              placeholder="Enter emergency contact name & number"
            />
          </View>
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Tenant</Text>
              )}
            </TouchableOpacity>
          </View>        </View>
      </ScrollView>
      
      {/* Unit Selector Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showUnitSelector}
        onRequestClose={() => setShowUnitSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowUnitSelector(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Search input for units */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by unit number, bedrooms, or rent"
                placeholderTextColor="#999"
                value={unitSearchQuery}
                onChangeText={setUnitSearchQuery}
                clearButtonMode="always"
                autoCapitalize="none"
              />
              {unitSearchQuery ? (
                <TouchableOpacity 
                  style={styles.clearSearchButton} 
                  onPress={() => setUnitSearchQuery('')}
                >
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <ScrollView style={styles.unitList}>
              {filteredUnits.length > 0 ? (
                filteredUnits.map((unit) => (
                  <TouchableOpacity
                    key={unit.id}
                    style={[
                      styles.unitOption,
                      selectedUnitId === unit.id && styles.unitOptionSelected
                    ]}
                    onPress={() => handleUnitSelection(unit)}
                  >
                    <View style={styles.unitOptionContent}>
                      <Text style={[
                        styles.unitOptionText,
                        selectedUnitId === unit.id && styles.unitOptionTextSelected
                      ]}>
                        Unit {unit.unit_number}
                      </Text>
                      <View style={styles.unitDetails}>
                        <Text style={styles.unitDetailText}>
                          {unit.bedrooms || 0} bed • {unit.bathrooms || 0} bath
                        </Text>
                        <Text style={styles.unitDetailText}>
                          KES {(unit.monthly_rent || 0).toLocaleString()}/month
                        </Text>
                      </View>
                    </View>
                    {selectedUnitId === unit.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
                    )}
                  </TouchableOpacity>
                ))
              ) : unitSearchQuery ? (
                <View style={styles.emptySearchContainer}>
                  <Ionicons name="search" size={48} color="#ddd" />
                  <Text style={styles.emptySearchText}>No units matching "{unitSearchQuery}"</Text>
                  <Text style={styles.emptySearchSubText}>Try a different search term</Text>
                </View>
              ) : (
                <View style={styles.emptySearchContainer}>
                  <Ionicons name="home" size={48} color="#ddd" />
                  <Text style={styles.emptySearchText}>No available units</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
  required: {
    color: '#e74c3c',
  },
  dateInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  datePickerDoneButton: {
    alignItems: 'center', 
    padding: 10, 
    backgroundColor: '#f8f8f8', 
    borderTopWidth: 1, 
    borderColor: '#ddd'
  },
  datePickerDoneText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },  cancelButtonText: {
    color: '#7f8c8d',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Unit selection styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  selectedUnitContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  selectedUnit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  selectedUnitText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  changeUnitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  changeUnitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  unitSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  unitInfoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  unitInfoText: {
    fontSize: 16,
    color: '#495057',
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySearchSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  unitList: {
    padding: 20,
  },
  unitOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  unitOptionSelected: {
    borderColor: '#27ae60',
    backgroundColor: '#f8fff8',
  },
  unitOptionContent: {
    flex: 1,
  },
  unitOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unitOptionTextSelected: {
    color: '#27ae60',
  },
  unitDetails: {
    flexDirection: 'column',
  },
  unitDetailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  noUnitsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noUnitsText: {
    color: '#999',
    fontSize: 16,
  },
});

export default AddTenantScreen;
