import React, { useState } from 'react';
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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import axios from 'axios';
import { API_PROPERTIES, API_TENANTS } from '../config/apiConfig';

const AddUnitScreen = ({ route, navigation }) => {
  const { propertyId } = route.params;
  const { isOffline, createUnit, createTenant } = useAuth();
  
  // Form state
  const [unitNumber, setUnitNumber] = useState('');
  const [unitType, setUnitType] = useState('');
  const [size, setSize] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [isOccupied, setIsOccupied] = useState(false);
  const [description, setDescription] = useState('');
  
  // Tenant form state
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [moveInDate, setMoveInDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
    // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!unitNumber.trim()) {
      newErrors.unitNumber = 'Unit number is required';
    }
    
    if (!unitType.trim()) {
      newErrors.unitType = 'Unit type is required';
    }
    
    if (size && isNaN(size)) {
      newErrors.size = 'Size must be a number';
    }
    
    if (bedrooms && isNaN(bedrooms)) {
      newErrors.bedrooms = 'Bedrooms must be a number';
    }
    
    if (bathrooms && isNaN(bathrooms)) {
      newErrors.bathrooms = 'Bathrooms must be a number';
    }
    
    if (!monthlyRent.trim()) {
      newErrors.monthlyRent = 'Monthly rent is required';
    } else if (isNaN(monthlyRent)) {
      newErrors.monthlyRent = 'Monthly rent must be a number';
    }
    
    // Validate tenant information if unit is marked as occupied
    if (isOccupied) {
      if (!tenantName.trim()) {
        newErrors.tenantName = 'Tenant name is required';
      }
      
      if (!tenantPhone.trim()) {
        newErrors.tenantPhone = 'Tenant phone number is required';
      } else if (!/^\+?\d{10,15}$/.test(tenantPhone.replace(/[-()\s]/g, ''))) {
        newErrors.tenantPhone = 'Please enter a valid phone number';
      }
      
      if (tenantEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
        newErrors.tenantEmail = 'Please enter a valid email address';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot add units while offline.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create the unit
      const unitData = {
        property: propertyId,
        unit_number: unitNumber,
        unit_type: unitType,
        size: size ? parseFloat(size) : null,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        monthly_rent: parseFloat(monthlyRent),
        is_occupied: isOccupied,
        description: description || null,
      };
        
      // Use the createUnit function from the auth context
      console.log('Creating unit with data:', unitData);
      const unitResponse = await createUnit(propertyId, unitData);
      
      if (unitResponse && unitResponse.success) {
        // If the unit is occupied, create a tenant
        if (isOccupied) {
          const tenantData = {
            name: tenantName,
            phone_number: tenantPhone,
            email: tenantEmail || null,
            unit: unitResponse.data.id, // Use the ID of the newly created unit
            move_in_date: moment(moveInDate).format('YYYY-MM-DD'),
          };
          
          const tenantResponse = await createTenant(tenantData);
          
          if (!tenantResponse.success) {
            setLoading(false);
            
            // Extract and format tenant creation error
            let errorMessage = '';
            if (typeof tenantResponse?.error === 'object') {
              errorMessage = JSON.stringify(tenantResponse.error);
            } else {
              errorMessage = tenantResponse?.error || 'Unknown error';
            }
            
            // Show partial success message and options
            Alert.alert(
              'Partial Success',
              `Unit was created successfully, but tenant could not be added: ${errorMessage}`,
              [
                { 
                  text: 'Go Back',
                  onPress: () => navigation.goBack() 
                },
                {
                  text: 'Fix Unit', 
                  onPress: async () => {
                    // Update unit to set is_occupied to false since tenant creation failed
                    try {
                      await axios.patch(`${API_PROPERTIES}/units/${unitResponse.data.id}/`, {
                        is_occupied: false
                      });
                      console.log('Updated unit to set is_occupied=false');
                    } catch (updateError) {
                      console.error('Error updating unit occupied status:', updateError);
                    }
                    navigation.goBack();
                  }
                }
              ]
            );
            return;
          }
        }
        
        setLoading(false);
        Alert.alert(
          'Success',
          isOccupied 
            ? 'Unit and tenant added successfully' 
            : 'Unit added successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        setLoading(false);
        
        // Enhanced error handling for unit creation
        let errorMessage = '';
        if (typeof unitResponse?.error === 'object') {
          // Check for specific field errors
          if (unitResponse?.error?.unit_number) {
            errorMessage = `Unit Number: ${unitResponse.error.unit_number}`;
          } else if (unitResponse?.error?.monthly_rent) {
            errorMessage = `Monthly Rent: ${unitResponse.error.monthly_rent}`;
          } else {
            errorMessage = JSON.stringify(unitResponse.error);
          }
        } else {
          errorMessage = unitResponse?.error || 'Unknown error';
        }
        
        Alert.alert('Error', `Failed to add unit: ${errorMessage}`);
      }
      
    } catch (error) {
      console.error('Error submitting unit:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          {/* Unit Number */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Unit Number <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.unitNumber && styles.inputError]}
              value={unitNumber}
              onChangeText={setUnitNumber}
              placeholder="Enter unit number (e.g. 101)"
            />
            {errors.unitNumber && <Text style={styles.errorText}>{errors.unitNumber}</Text>}
          </View>
          
          {/* Unit Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Unit Type <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.unitType && styles.inputError]}
              value={unitType}
              onChangeText={setUnitType}
              placeholder="Enter unit type (e.g. Studio, 1BR, 2BR)"
            />
            {errors.unitType && <Text style={styles.errorText}>{errors.unitType}</Text>}
          </View>
          
          {/* Size */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Size (sqft)</Text>
            <TextInput
              style={[styles.input, errors.size && styles.inputError]}
              value={size}
              onChangeText={setSize}
              placeholder="Enter unit size in square feet"
              keyboardType="numeric"
            />
            {errors.size && <Text style={styles.errorText}>{errors.size}</Text>}
          </View>
          
          {/* Bedrooms & Bathrooms */}
          <View style={styles.rowContainer}>
            <View style={[styles.formGroup, {flex: 1, marginRight: 8}]}>
              <Text style={styles.label}>Bedrooms</Text>
              <TextInput
                style={[styles.input, errors.bedrooms && styles.inputError]}
                value={bedrooms}
                onChangeText={setBedrooms}
                placeholder="Number"
                keyboardType="numeric"
              />
              {errors.bedrooms && <Text style={styles.errorText}>{errors.bedrooms}</Text>}
            </View>
            
            <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
              <Text style={styles.label}>Bathrooms</Text>
              <TextInput
                style={[styles.input, errors.bathrooms && styles.inputError]}
                value={bathrooms}
                onChangeText={setBathrooms}
                placeholder="Number"
                keyboardType="numeric"
              />
              {errors.bathrooms && <Text style={styles.errorText}>{errors.bathrooms}</Text>}
            </View>
          </View>
          
          {/* Monthly Rent */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Monthly Rent <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.monthlyRent && styles.inputError]}
              value={monthlyRent}
              onChangeText={setMonthlyRent}
              placeholder="Enter monthly rent amount"
              keyboardType="numeric"
            />
            {errors.monthlyRent && <Text style={styles.errorText}>{errors.monthlyRent}</Text>}
          </View>
            {/* Is Occupied */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Unit is currently occupied</Text>
            <Switch
              value={isOccupied}
              onValueChange={setIsOccupied}
              trackColor={{ false: '#e0e0e0', true: '#3498db' }}
              thumbColor={isOccupied ? '#2980b9' : '#f0f0f0'}
            />
          </View>
          
          {/* Tenant Information - Only shown when unit is occupied */}
          {isOccupied && (
            <View style={styles.tenantSection}>
              <Text style={styles.sectionTitle}>Tenant Information</Text>
              
              {/* Tenant Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.tenantName && styles.inputError]}
                  value={tenantName}
                  onChangeText={setTenantName}
                  placeholder="Enter tenant name"
                />
                {errors.tenantName && <Text style={styles.errorText}>{errors.tenantName}</Text>}
              </View>
              
              {/* Tenant Phone */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.tenantPhone && styles.inputError]}
                  value={tenantPhone}
                  onChangeText={setTenantPhone}
                  placeholder="Enter tenant phone number"
                  keyboardType="phone-pad"
                />
                {errors.tenantPhone && <Text style={styles.errorText}>{errors.tenantPhone}</Text>}
              </View>
              
              {/* Tenant Email */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.tenantEmail && styles.inputError]}
                  value={tenantEmail}
                  onChangeText={setTenantEmail}
                  placeholder="Enter tenant email (optional)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.tenantEmail && <Text style={styles.errorText}>{errors.tenantEmail}</Text>}
              </View>
              
              {/* Move-in Date Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Move-in Date</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton} 
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>{moment(moveInDate).format('MMM DD, YYYY')}</Text>
                  <Ionicons name="calendar-outline" size={24} color="#3498db" />
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={moveInDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setMoveInDate(selectedDate);
                      }
                    }}
                  />
                )}
              </View>
            </View>
          )}
          
          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter unit description (optional)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
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
                <Text style={styles.submitButtonText}>Add Unit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#2c3e50',
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    marginTop: 4,
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    marginTop: 8,
  },
  tenantSection: {
    backgroundColor: '#ecf0f1',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  textArea: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontWeight: 'bold',
    fontSize: 16,
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
});

export default AddUnitScreen;
