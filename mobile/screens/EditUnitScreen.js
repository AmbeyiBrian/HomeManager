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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const EditUnitScreen = ({ route, navigation }) => {
  const { unit, propertyName } = route.params;
  const { isOffline, updateUnit } = useAuth();
  
  // Form state
  const [unitNumber, setUnitNumber] = useState(unit?.unit_number || '');
  const [unitType, setUnitType] = useState(unit?.unit_type || '');
  const [size, setSize] = useState(unit?.size ? String(unit.size) : '');
  const [bedrooms, setBedrooms] = useState(unit?.bedrooms ? String(unit.bedrooms) : '');
  const [bathrooms, setBathrooms] = useState(unit?.bathrooms ? String(unit.bathrooms) : '');
  const [monthlyRent, setMonthlyRent] = useState(unit?.monthly_rent ? String(unit.monthly_rent) : '');
  const [isOccupied, setIsOccupied] = useState(unit?.is_occupied || false);
  const [description, setDescription] = useState(unit?.description || '');
  
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot update units while offline.');
      return;
    }
    
    setLoading(true);
    
    try {
      const unitData = {
        property: unit.property,
        unit_number: unitNumber,
        unit_type: unitType,
        size: size ? parseFloat(size) : null,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        monthly_rent: parseFloat(monthlyRent),
        is_occupied: isOccupied,
        description: description || null,
      };
      
      // Call the updateUnit function from AuthContext
      const response = await updateUnit(unit.id, unitData);
      
      setLoading(false);
      
      if (response && response.success) {
        Alert.alert(
          'Success',
          'Unit updated successfully',
          [{
            text: 'OK',
            onPress: () => navigation.goBack()
          }]
        );
      } else {
        const errorMessage = response && typeof response.error === 'object'
          ? JSON.stringify(response.error)
          : (response?.error || 'Unknown error');
        Alert.alert('Error', `Failed to update unit: ${errorMessage}`);
      }
      
    } catch (error) {
      console.error('Error updating unit:', error);
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
          {/* Property Name (read-only) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Property</Text>
            <Text style={styles.propertyName}>{propertyName || 'Unknown Property'}</Text>
          </View>
        
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
                <Text style={styles.submitButtonText}>Update Unit</Text>
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
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  propertyName: {
    fontSize: 16,
    color: '#666',
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 5,
  },
  required: {
    color: '#e74c3c',
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
    marginTop: 5,
    fontSize: 14,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default EditUnitScreen;
