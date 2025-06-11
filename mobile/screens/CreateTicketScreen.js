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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';

const CreateTicketScreen = ({ route, navigation }) => {
  const { propertyId, unitId } = route.params || {};
  const { isOffline } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedProperty, setSelectedProperty] = useState(propertyId || '');
  const [selectedUnit, setSelectedUnit] = useState(unitId || '');
  const [images, setImages] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  
  // Load properties and units on mount
  useEffect(() => {
    fetchProperties();
  }, []);
  
  // When property selection changes, fetch units for that property
  useEffect(() => {
    if (selectedProperty) {
      fetchUnits(selectedProperty);
    } else {
      setUnits([]);
      setSelectedUnit('');
    }
  }, [selectedProperty]);
  
  // Fetch available properties
  const fetchProperties = async () => {
    setLoadingProperties(true);
    
    try {
      // TODO: Replace with actual API call
      // Mock data for demonstration
      setTimeout(() => {
        const mockProperties = [
          { id: '1', name: 'Green Apartments' },
          { id: '2', name: 'Sunset Heights' },
          { id: '3', name: 'Park View Residences' },
        ];
        
        setProperties(mockProperties);
        
        // If propertyId was provided, make sure it exists in the fetched properties
        if (propertyId && mockProperties.find(p => p.id === propertyId)) {
          setSelectedProperty(propertyId);
        } else if (mockProperties.length > 0) {
          setSelectedProperty(mockProperties[0].id);
        }
        
        setLoadingProperties(false);
      }, 1000);
      
      // Example of how the actual API call would look:
      /*
      const { fetchProperties } = useAuth();
      const response = await fetchProperties();
      
      if (response.success) {
        setProperties(response.data);
        
        // If propertyId was provided, make sure it exists in the fetched properties
        if (propertyId && response.data.find(p => p.id === propertyId)) {
          setSelectedProperty(propertyId);
        } else if (response.data.length > 0) {
          setSelectedProperty(response.data[0].id);
        }
      } else {
        console.error('Failed to fetch properties:', response.error);
      }
      
      setLoadingProperties(false);
      */
      
    } catch (error) {
      console.error('Error fetching properties:', error);
      setLoadingProperties(false);
    }
  };
  
  // Fetch units for a specific property
  const fetchUnits = async (propertyId) => {
    setLoadingUnits(true);
    
    try {
      // TODO: Replace with actual API call
      // Mock data for demonstration
      setTimeout(() => {
        let mockUnits = [];
        
        if (propertyId === '1') { // Green Apartments
          mockUnits = [
            { id: '101', unit_number: '101' },
            { id: '102', unit_number: '102' },
            { id: '201', unit_number: '201' },
          ];
        } else if (propertyId === '2') { // Sunset Heights
          mockUnits = [
            { id: '301', unit_number: '301' },
            { id: '302', unit_number: '302' },
          ];
        } else if (propertyId === '3') { // Park View Residences
          mockUnits = [
            { id: '401', unit_number: '401' },
            { id: '402', unit_number: '402' },
            { id: '403', unit_number: '403' },
          ];
        }
        
        setUnits(mockUnits);
        
        // If unitId was provided, make sure it exists in the fetched units
        if (unitId && mockUnits.find(u => u.id === unitId)) {
          setSelectedUnit(unitId);
        } else if (mockUnits.length > 0) {
          setSelectedUnit(mockUnits[0].id);
        } else {
          setSelectedUnit('');
        }
        
        setLoadingUnits(false);
      }, 500);
      
      // Example of how the actual API call would look:
      /*
      const { fetchUnitsByProperty } = useAuth();
      const response = await fetchUnitsByProperty(propertyId);
      
      if (response.success) {
        setUnits(response.data);
        
        // If unitId was provided, make sure it exists in the fetched units
        if (unitId && response.data.find(u => u.id === unitId)) {
          setSelectedUnit(unitId);
        } else if (response.data.length > 0) {
          setSelectedUnit(response.data[0].id);
        } else {
          setSelectedUnit('');
        }
      } else {
        console.error('Failed to fetch units:', response.error);
      }
      
      setLoadingUnits(false);
      */
      
    } catch (error) {
      console.error('Error fetching units:', error);
      setLoadingUnits(false);
    }
  };
  
  // Handle image picking
  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert('Image Limit', 'You can only upload up to 3 images per ticket.');
      return;
    }
    
    try {      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = result.assets[0];
        setImages([...images, newImage.uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  // Remove an image
  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };
  
  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!selectedProperty) {
      newErrors.property = 'Please select a property';
    }
    
    if (!selectedUnit) {
      newErrors.unit = 'Please select a unit';
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
      Alert.alert('Offline Mode', 'Cannot create tickets while offline.');
      return;
    }
    
    setLoading(true);
    
    try {
      const ticketData = {
        title,
        description,
        priority,
        property_id: selectedProperty,
        unit_id: selectedUnit,
        images,
      };
      
      // TODO: Replace this with your actual API call
      // For now, we'll just mock a successful response
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Success',
          'Maintenance ticket created successfully',
          [{
            text: 'OK',
            onPress: () => navigation.goBack()
          }]
        );
      }, 1500);
      
      // Example of how the actual API call would look:
      /*
      const { createTicket } = useAuth();
      const response = await createTicket(ticketData);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Maintenance ticket created successfully',
          [{
            text: 'OK',
            onPress: () => navigation.goBack()
          }]
        );
      } else {
        const errorMessage = typeof response.error === 'object'
          ? JSON.stringify(response.error)
          : response.error;
        Alert.alert('Error', `Failed to create ticket: ${errorMessage}`);
      }
      setLoading(false);
      */
      
    } catch (error) {
      console.error('Error submitting ticket:', error);
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
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ticket Title <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter a title for the maintenance issue"
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>
          
          {/* Property Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Property <Text style={styles.required}>*</Text></Text>
            {loadingProperties ? (
              <ActivityIndicator size="small" color="#3498db" />
            ) : properties.length > 0 ? (
              <View style={[styles.pickerContainer, errors.property && styles.inputError]}>
                <Picker
                  selectedValue={selectedProperty}
                  onValueChange={(itemValue) => setSelectedProperty(itemValue)}
                  style={styles.picker}
                  enabled={!loading}
                >
                  <Picker.Item label="Select a property" value="" />
                  {properties.map((property) => (
                    <Picker.Item key={property.id} label={property.name} value={property.id} />
                  ))}
                </Picker>
              </View>
            ) : (
              <Text style={styles.noDataText}>No properties available</Text>
            )}
            {errors.property && <Text style={styles.errorText}>{errors.property}</Text>}
          </View>
          
          {/* Unit Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Unit <Text style={styles.required}>*</Text></Text>
            {loadingUnits ? (
              <ActivityIndicator size="small" color="#3498db" />
            ) : selectedProperty ? (
              units.length > 0 ? (
                <View style={[styles.pickerContainer, errors.unit && styles.inputError]}>
                  <Picker
                    selectedValue={selectedUnit}
                    onValueChange={(itemValue) => setSelectedUnit(itemValue)}
                    style={styles.picker}
                    enabled={!loading}
                  >
                    <Picker.Item label="Select a unit" value="" />
                    {units.map((unit) => (
                      <Picker.Item key={unit.id} label={`Unit ${unit.unit_number}`} value={unit.id} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Text style={styles.noDataText}>No units available for this property</Text>
              )
            ) : (
              <Text style={styles.noDataText}>Select a property first</Text>
            )}
            {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
          </View>
          
          {/* Priority Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={priority}
                onValueChange={(itemValue) => setPriority(itemValue)}
                style={styles.picker}
                enabled={!loading}
              >
                <Picker.Item label="Low" value="low" />
                <Picker.Item label="Medium" value="medium" />
                <Picker.Item label="High" value="high" />
                <Picker.Item label="Urgent" value="urgent" />
              </Picker>
            </View>
          </View>
          
          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the maintenance issue in detail"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>
          
          {/* Image Upload */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Photos (Optional)</Text>
            <Text style={styles.helperText}>Upload up to 3 images of the issue</Text>
            
            <View style={styles.imagesContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imagePreviewContainer}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {images.length < 3 && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={pickImage}
                  disabled={loading}
                >
                  <Ionicons name="camera" size={30} color="#3498db" />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
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
                <Text style={styles.submitButtonText}>Submit Ticket</Text>
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
  pickerContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  textArea: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    padding: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  imagePreviewContainer: {
    width: 100,
    height: 100,
    marginRight: 10,
    marginBottom: 10,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: '#3498db',
    borderStyle: 'dashed',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    color: '#3498db',
    marginTop: 4,
    fontSize: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 40,
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

export default CreateTicketScreen;
