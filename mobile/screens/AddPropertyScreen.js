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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';

const AddPropertyScreen = ({ navigation }) => {
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('residential'); // Default to residential
  const [image, setImage] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);  const [errors, setErrors] = useState({});    
  
  // Get auth context values 
  const auth = useAuth();
  const { createProperty } = auth;
    // Handle image picking
  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload an image.');
        return;
      }
      
      console.log('Launching image picker...');
      
      // Launch image picker with lower quality for better upload performance
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5, // Reduce quality to 50% for better upload performance
        exif: false,  // Skip EXIF data to reduce size
        base64: false,
      });
      
      console.log('Image picker result:', result);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // Log image file size for debugging
        console.log('Selected image details:', {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          fileSize: selectedImage.fileSize ? 
            `${(selectedImage.fileSize / 1024).toFixed(2)}KB` : 
            'unknown',
          type: selectedImage.type || 'unknown'
        });
        
        // Check if the image is too large (over 2MB)
        if (selectedImage.fileSize && selectedImage.fileSize > 2 * 1024 * 1024) {
          console.log('Image is large, consider resizing');
          // In a future implementation, we could add more aggressive resizing here
        }
        
        setImage(selectedImage.uri);
        console.log('Image selected:', selectedImage.uri);
      } else {
        console.log('Image picker was canceled or no assets returned');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };
    // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Property name is required';
    }
    
    if (!address.trim()) {
      newErrors.address = 'Property address is required';
    }
    
    if (!propertyType) {
      newErrors.propertyType = 'Property type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      console.log('Creating FormData...');
      console.log('Form field values:', {
        name: JSON.stringify(name),
        address: JSON.stringify(address), 
        propertyType: JSON.stringify(propertyType),
        description: JSON.stringify(description)
      });
      
      // Create form data for image upload
      const formData = new FormData();
      
      // Ensure all string values are properly encoded
      formData.append('name', String(name || '').trim());
      formData.append('address', String(address || '').trim());
      formData.append('property_type', String(propertyType || 'residential'));
      
      console.log('Basic form data added');
      
      if (description && description.trim()) {
        const cleanDescription = String(description).trim();
        formData.append('description', cleanDescription);
        console.log('Description added, length:', cleanDescription.length);
        console.log('Description content:', JSON.stringify(cleanDescription));
      }
        // Only attach image if it exists (for new properties, all images are new)
      if (image) {
        // Create a clean, consistent filename that's safe for upload
        // Extract original filename or create a unique one
        const originalFileName = image.split('/').pop() || 'image.jpg';
        
        // Generate a safer, shorter filename with timestamp to avoid conflicts
        const timestamp = new Date().getTime();
        const randomPart = Math.floor(Math.random() * 10000);
        
        // Get file extension and ensure it's lowercase
        const match = /\.([^.]*)$/.exec(originalFileName);
        const extension = match ? match[1].toLowerCase() : 'jpg';
        
        // Create a clean filename with timestamp
        const sanitizedFileName = `property_${timestamp}_${randomPart}.${extension}`;
        
        // Fix MIME type for common extensions
        let mimeType = 'image/jpeg';
        if (extension === 'png') {
          mimeType = 'image/png';
        } else if (extension === 'jpg' || extension === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (extension === 'gif') {
          mimeType = 'image/gif';
        } else if (extension === 'webp') {
          mimeType = 'image/webp';
        }
        
        console.log('Preparing image for upload');
        console.log('Image details:', {
          uri: image,
          originalFileName: originalFileName,
          sanitizedFileName: sanitizedFileName,
          mimeType: mimeType,
          extension: extension
        });
        
        // Create the image object with simplified properties
        const imageObject = {
          uri: image,
          name: sanitizedFileName,
          type: mimeType,
        };
        
        // Add the image to the FormData
        formData.append('image', imageObject);
        
        console.log('Image added to FormData');
        console.log('Image object:', imageObject);
        
        // Add flags to help process the upload correctly on backend
        formData.append('is_react_native', 'true');
        formData.append('timestamp', timestamp.toString());
        
        // Add device info to help diagnose any platform-specific issues
        formData.append('device_platform', Platform.OS);
        formData.append('device_version', Platform.Version.toString());
      }

      console.log('FormData prepared, calling createProperty...');
      console.log('Has image:', !!image);
      console.log('FormData instanceof FormData:', formData instanceof FormData);
      
      // Log all FormData entries for debugging
      if (formData instanceof FormData) {
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
          if (typeof value === 'object' && value.uri) {
            console.log(`  ${key}: [Image Object] ${JSON.stringify(value)}`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
      }
      
      // Check if we're only creating text fields without an image
      const hasImage = !!image;
      
      let requestData;
      if (!hasImage) {
        // If no image, send as JSON for better compatibility
        console.log('No image - sending as JSON');
        requestData = {
          name: String(name || '').trim(),
          address: String(address || '').trim(),
          property_type: String(propertyType || 'residential'),
        };
        
        if (description && description.trim()) {
          requestData.description = String(description).trim();
        }
        
        console.log('JSON request data:', requestData);
      } else {
        // Use FormData when we have an image
        console.log('Has image - sending as FormData');
        console.log('FormData ready for transmission');
        requestData = formData;
      }
      
      // Add retry logic for network resilience
      let retryCount = 0;
      let response = null;
      
      while (retryCount < 2) {
        try {
          // Use the createProperty function to create the property
          response = await createProperty(requestData);
          
          // If we have a success or partial success, break the retry loop
          if (response.success) {
            break;
          }
          
          // Otherwise retry
          retryCount++;
          if (retryCount < 2) {
            console.log(`Retrying property creation (attempt ${retryCount + 1})...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        } catch (retryError) {
          console.error(`Error during retry ${retryCount}:`, retryError);
          retryCount++;
          if (retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
      }

      console.log('CreateProperty response:', response);
        setLoading(false);
      
      if (response.success) {
        // Check if it's a partial success (text created but image failed)
        if (response.partialUpdate) {
          // Show detailed error for image upload failure
          const errorDetails = response.imageError || response.message || 'Unknown error';
          Alert.alert(
            'Partial Success',
            `Property was created, but the image failed to upload: ${errorDetails}. You can try updating the image later.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          // Full success
          Alert.alert(
            'Success',
            response.fromOfflineQueue 
              ? 'Property will be created when back online' 
              : 'Property added successfully',
            [{
              text: 'OK',
              onPress: () => navigation.goBack()
            }]
          );
        }      } else {
        let errorMessage = '';
        
        if (typeof response.error === 'object') {
          // Check for specific organization error
          if (response.error.detail && response.error.detail.includes('organization')) {
            errorMessage = 'You must belong to an organization to create a property. Please contact your administrator.';
          } else {
            errorMessage = JSON.stringify(response.error);
          }
        } else {
          errorMessage = response.error;
        }
        
        Alert.alert('Error', `Failed to add property: ${errorMessage}`);
      }
      
    } catch (error) {
      console.error('Error creating property:', error);
      
      // More detailed error logging
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200) // First part of the stack trace
      });
      
      // Show a more helpful error message
      let errorMessage = 'An unexpected error occurred';
      
      if (error.message.includes('Network Error')) {
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (error.response && error.response.status) {
        errorMessage = `Server error (${error.response.status}): ${error.response.data?.detail || 'Unknown error'}`;
      }
      
      Alert.alert('Error', errorMessage);
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
          {/* Property Image */}
          <View style={styles.imageSection}>
            {image ? (
              <Image source={{ uri: image }} style={styles.propertyImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="business" size={50} color="#ddd" />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
            >
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.imagePickerText}>
                {image ? 'Change Image' : 'Add Image'}
              </Text>
            </TouchableOpacity>
          </View>
        
          {/* Property Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Property Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Enter property name"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>
            {/* Property Address */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter property address"
              multiline
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>
          
          {/* Property Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Property Type <Text style={styles.required}>*</Text></Text>
            <View style={styles.propertyTypeContainer}>
              <TouchableOpacity 
                style={[
                  styles.propertyTypeOption,
                  propertyType === 'residential' && styles.propertyTypeSelected
                ]}
                onPress={() => setPropertyType('residential')}
              >
                <Ionicons 
                  name="home" 
                  size={24} 
                  color={propertyType === 'residential' ? '#fff' : '#3498db'} 
                />
                <Text 
                  style={[
                    styles.propertyTypeText,
                    propertyType === 'residential' && styles.propertyTypeTextSelected
                  ]}
                >
                  Residential
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.propertyTypeOption,
                  propertyType === 'commercial' && styles.propertyTypeSelected
                ]}
                onPress={() => setPropertyType('commercial')}
              >
                <Ionicons 
                  name="business" 
                  size={24} 
                  color={propertyType === 'commercial' ? '#fff' : '#3498db'} 
                />
                <Text 
                  style={[
                    styles.propertyTypeText,
                    propertyType === 'commercial' && styles.propertyTypeTextSelected
                  ]}
                >
                  Commercial
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.propertyTypeOption,
                  propertyType === 'short_term' && styles.propertyTypeSelected
                ]}
                onPress={() => setPropertyType('short_term')}
              >
                <Ionicons 
                  name="bed" 
                  size={24} 
                  color={propertyType === 'short_term' ? '#fff' : '#3498db'} 
                />
                <Text 
                  style={[
                    styles.propertyTypeText,
                    propertyType === 'short_term' && styles.propertyTypeTextSelected
                  ]}
                >
                  Short-Term
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Property Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter property description (optional)"
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
                <Text style={styles.submitButtonText}>Add Property</Text>
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
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  propertyImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerButton: {
    marginTop: 10,
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  imagePickerText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 16,
  },
  propertyTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  propertyTypeOption: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  propertyTypeSelected: {
    backgroundColor: '#3498db',
  },
  propertyTypeText: {
    fontSize: 12,
    marginTop: 4,
    color: '#3498db',
    textAlign: 'center',
  },
  propertyTypeTextSelected: {
    color: '#fff',
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

export default AddPropertyScreen;
