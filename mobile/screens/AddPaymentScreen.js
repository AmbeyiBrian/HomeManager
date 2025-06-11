import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddPaymentScreen = ({ navigation }) => {
  // Form fields
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [periodStart, setPeriodStart] = useState(new Date());
  const [periodEnd, setPeriodEnd] = useState(new Date(new Date().setMonth(new Date().getMonth() + 1)));
  const [notes, setNotes] = useState('');
  
  // Selection lists
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [unitLoading, setUnitLoading] = useState(false);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Auth and API context
  const { authState, isOffline } = useAuth();
  const { endpoints } = useApi();
  
  // Load properties when component mounts
  useEffect(() => {
    loadProperties();
  }, []);
  
  // Load units when a property is selected
  useEffect(() => {
    if (selectedProperty) {
      loadUnits(selectedProperty);
    } else {
      setUnits([]);
      setSelectedUnit(null);
    }
  }, [selectedProperty]);
  
  // Load tenants when a unit is selected
  useEffect(() => {
    if (selectedUnit) {
      loadTenants(selectedUnit);
    } else {
      setTenants([]);
      setSelectedTenant(null);
    }
  }, [selectedUnit]);
  
  const loadProperties = async () => {
    setPropertyLoading(true);
    
    try {
      // Check offline cache first
      if (isOffline) {
        const cachedProperties = await AsyncStorage.getItem('cached_properties');
        if (cachedProperties) {
          setProperties(JSON.parse(cachedProperties));
        }
        setPropertyLoading(false);
        return;
      }
      
      // Fetch properties from API
      const response = await axios.get(endpoints.properties, {
        headers: { 'Authorization': `Token ${authState.token}` }
      });
      
      if (response.data && response.data.results) {
        const propertiesData = response.data.results;
        setProperties(propertiesData);
        // Cache properties for offline use
        await AsyncStorage.setItem('cached_properties', JSON.stringify(propertiesData));
      }
      
      setPropertyLoading(false);
    } catch (error) {
      console.error('Error loading properties:', error);
      
      // Try to use cached data
      try {
        const cachedProperties = await AsyncStorage.getItem('cached_properties');
        if (cachedProperties) {
          setProperties(JSON.parse(cachedProperties));
        }
      } catch (cacheError) {
        console.error('Error loading cached properties:', cacheError);
      }
      
      setPropertyLoading(false);
    }
  };
  
  const loadUnits = async (propertyId) => {
    setUnitLoading(true);
    setUnits([]);
    
    try {
      // Check offline cache first
      if (isOffline) {
        const cachedUnits = await AsyncStorage.getItem(`cached_units_${propertyId}`);
        if (cachedUnits) {
          setUnits(JSON.parse(cachedUnits));
        }
        setUnitLoading(false);
        return;
      }
      
      // Fetch units for the selected property
      const response = await axios.get(endpoints.propertyUnits(propertyId), {
        headers: { 'Authorization': `Token ${authState.token}` }
      });
      
      if (response.data && response.data.results) {
        const unitsData = response.data.results;
        setUnits(unitsData);
        // Cache units for this property
        await AsyncStorage.setItem(`cached_units_${propertyId}`, JSON.stringify(unitsData));
      }
      
      setUnitLoading(false);
    } catch (error) {
      console.error('Error loading units:', error);
      
      // Try to use cached data
      try {
        const cachedUnits = await AsyncStorage.getItem(`cached_units_${propertyId}`);
        if (cachedUnits) {
          setUnits(JSON.parse(cachedUnits));
        }
      } catch (cacheError) {
        console.error('Error loading cached units:', cacheError);
      }
      
      setUnitLoading(false);
    }
  };
  
  const loadTenants = async (unitId) => {
    setTenantLoading(true);
    setTenants([]);
    
    try {
      // Check offline cache first
      if (isOffline) {
        const cachedTenants = await AsyncStorage.getItem(`cached_unit_tenants_${unitId}`);
        if (cachedTenants) {
          setTenants(JSON.parse(cachedTenants));
        }
        setTenantLoading(false);
        return;
      }
      
      // Fetch tenants for the selected unit
      const response = await axios.get(endpoints.unitTenants(unitId), {
        headers: { 'Authorization': `Token ${authState.token}` }
      });
      
      if (response.data && response.data.results) {
        const tenantsData = response.data.results;
        setTenants(tenantsData);
        // Cache tenants for this unit
        await AsyncStorage.setItem(`cached_unit_tenants_${unitId}`, JSON.stringify(tenantsData));
        
        // If there's only one tenant, auto-select them
        if (tenantsData.length === 1) {
          setSelectedTenant(tenantsData[0].id);
        }
      }
      
      setTenantLoading(false);
    } catch (error) {
      console.error('Error loading tenants:', error);
      
      // Try to use cached data
      try {
        const cachedTenants = await AsyncStorage.getItem(`cached_unit_tenants_${unitId}`);
        if (cachedTenants) {
          setTenants(JSON.parse(cachedTenants));
        }
      } catch (cacheError) {
        console.error('Error loading cached tenants:', cacheError);
      }
      
      setTenantLoading(false);
    }
  };
  
  const handlePropertySelect = (propertyId) => {
    setSelectedProperty(propertyId);
    setSelectedUnit(null); // Reset unit selection
  };
  
  const handleUnitSelect = (unitId) => {
    setSelectedUnit(unitId);
  };
  
  const handleTenantSelect = (tenantId) => {
    setSelectedTenant(tenantId);
  };
  
  const handleDueDateChange = (event, selectedDate) => {
    setShowDueDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };
  
  const handlePeriodStartChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setPeriodStart(selectedDate);
    }
  };
  
  const handlePeriodEndChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setPeriodEnd(selectedDate);
    }
  };
  
  const formatDate = (date) => {
    return date.toLocaleDateString();
  };
  
  const validateForm = () => {
    if (!selectedUnit) {
      Alert.alert('Error', 'Please select a property and unit');
      return false;
    }
    
    if (!selectedTenant) {
      Alert.alert('Error', 'Please select a tenant');
      return false;
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }
    
    if (new Date(periodEnd) <= new Date(periodStart)) {
      Alert.alert('Error', 'Period end date must be after period start date');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot create payments while offline');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const paymentData = {
        unit: selectedUnit,
        tenant: selectedTenant,
        amount: parseFloat(amount),
        due_date: dueDate.toISOString().split('T')[0],
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        description: notes || ''
      };
      
      const response = await axios.post(
        endpoints.payments,
        paymentData,
        { headers: { 'Authorization': `Token ${authState.token}` } }
      );
      
      if (response.data && response.data.id) {
        // Update the cached payments list
        try {
          const cachedPayments = await AsyncStorage.getItem('cached_payments');
          
          if (cachedPayments) {
            const currentPayments = JSON.parse(cachedPayments);
            
            // Find the unit and tenant names for the response data
            const unit = units.find(u => u.id === selectedUnit);
            const tenant = tenants.find(t => t.id === selectedTenant);
            const property = properties.find(p => p.id === selectedProperty);
            
            // Create a UI-ready payment object
            const newPayment = {
              id: response.data.id.toString(),
              tenant_name: tenant ? tenant.name : 'Unknown Tenant',
              tenant_id: selectedTenant,
              property_name: property ? property.name : 'Unknown Property',
              property_id: selectedProperty,
              unit_number: unit ? unit.unit_number : 'Unknown Unit',
              unit_id: selectedUnit,
              amount: parseFloat(amount),
              due_date: dueDate.toISOString().split('T')[0],
              status: 'pending',
              payment_method: null,
              payment_date: null,
              notes: notes || '',
              period_start: periodStart.toISOString().split('T')[0],
              period_end: periodEnd.toISOString().split('T')[0],
            };
            
            // Add to cache
            await AsyncStorage.setItem('cached_payments', JSON.stringify([...currentPayments, newPayment]));
          }
        } catch (cacheError) {
          console.error('Error updating cached payments:', cacheError);
        }
        
        Alert.alert(
          'Success',
          'Payment created successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error creating payment:', error);
      Alert.alert('Error', 'Failed to create payment. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create New Payment</Text>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Property Information</Text>
          
          <Text style={styles.inputLabel}>Property</Text>
          <View style={styles.pickerContainer}>
            {propertyLoading ? (
              <ActivityIndicator size="small" color="#3498db" />
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pickerScrollContainer}
              >
                {properties.length > 0 ? (
                  properties.map(property => (
                    <TouchableOpacity
                      key={`property-${property.id}`}
                      style={[
                        styles.pickerItem,
                        selectedProperty === property.id && styles.pickerItemSelected
                      ]}
                      onPress={() => handlePropertySelect(property.id)}
                    >
                      <Text 
                        style={[
                          styles.pickerItemText,
                          selectedProperty === property.id && styles.pickerItemTextSelected
                        ]}
                      >
                        {property.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No properties found</Text>
                )}
              </ScrollView>
            )}
          </View>
          
          <Text style={styles.inputLabel}>Unit</Text>
          <View style={styles.pickerContainer}>
            {unitLoading ? (
              <ActivityIndicator size="small" color="#3498db" />
            ) : selectedProperty ? (
              units.length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pickerScrollContainer}
                >
                  {units.map(unit => (
                    <TouchableOpacity
                      key={`unit-${unit.id}`}
                      style={[
                        styles.pickerItem,
                        selectedUnit === unit.id && styles.pickerItemSelected
                      ]}
                      onPress={() => handleUnitSelect(unit.id)}
                    >
                      <Text 
                        style={[
                          styles.pickerItemText,
                          selectedUnit === unit.id && styles.pickerItemTextSelected
                        ]}
                      >
                        Unit {unit.unit_number}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noDataText}>No units found for this property</Text>
              )
            ) : (
              <Text style={styles.noSelectionText}>Select a property first</Text>
            )}
          </View>
          
          <Text style={styles.inputLabel}>Tenant</Text>
          <View style={styles.pickerContainer}>
            {tenantLoading ? (
              <ActivityIndicator size="small" color="#3498db" />
            ) : selectedUnit ? (
              tenants.length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pickerScrollContainer}
                >
                  {tenants.map(tenant => (
                    <TouchableOpacity
                      key={`tenant-${tenant.id}`}
                      style={[
                        styles.pickerItem,
                        selectedTenant === tenant.id && styles.pickerItemSelected
                      ]}
                      onPress={() => handleTenantSelect(tenant.id)}
                    >
                      <Text 
                        style={[
                          styles.pickerItemText,
                          selectedTenant === tenant.id && styles.pickerItemTextSelected
                        ]}
                      >
                        {tenant.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noDataText}>No tenants found for this unit</Text>
              )
            ) : (
              <Text style={styles.noSelectionText}>Select a unit first</Text>
            )}
          </View>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <Text style={styles.inputLabel}>Amount (KES)</Text>
          <TextInput
            style={styles.textInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
          
          <Text style={styles.inputLabel}>Due Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDueDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDate(dueDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color="#3498db" />
          </TouchableOpacity>
          {showDueDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={handleDueDateChange}
            />
          )}
          
          <Text style={styles.inputLabel}>Period Start</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDate(periodStart)}</Text>
            <Ionicons name="calendar-outline" size={20} color="#3498db" />
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={periodStart}
              mode="date"
              display="default"
              onChange={handlePeriodStartChange}
            />
          )}
          
          <Text style={styles.inputLabel}>Period End</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDate(periodEnd)}</Text>
            <Ionicons name="calendar-outline" size={20} color="#3498db" />
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={periodEnd}
              mode="date"
              display="default"
              onChange={handlePeriodEndChange}
            />
          )}
          
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Enter any additional notes"
            multiline={true}
            numberOfLines={4}
          />
        </View>
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Payment</Text>
          )}
        </TouchableOpacity>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
  },
  inputLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  pickerContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 50,
    justifyContent: 'center',
  },
  pickerScrollContainer: {
    alignItems: 'center',
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerItemSelected: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  pickerItemTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  noDataText: {
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  noSelectionText: {
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddPaymentScreen;
