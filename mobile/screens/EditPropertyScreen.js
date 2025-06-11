import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';

const EditPropertyScreen = ({ route, navigation }) => {
  const { property } = route.params;
  
  // Form state
  const [name, setName] = useState(property?.name || '');
  const [address, setAddress] = useState(property?.address || '');
  const [description, setDescription] = useState(property?.description || '');
  const [propertyType, setPropertyType] = useState(property?.property_type || 'residential');
  const [image, setImage] = useState(property?.image || null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});  
  
  // Get auth context values 
  const auth = useAuth();
  const { isOffline, updateProperty, user, currentOrganization } = auth;  // Handle image picking with compression for better network performance
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
  };
  
  // Handle form submission
  const handleUpdate = async () => {
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
        description: JSON.stringify(description),
        organizationId: currentOrganization?.id
      });
      
      // Create form data for image upload
      const formData = new FormData();
      
      // Ensure all string values are properly encoded
      formData.append('name', String(name || '').trim());
      formData.append('address', String(address || '').trim());
      formData.append('property_type', String(propertyType || 'residential'));
      
      console.log('Basic form data added');
      
      // Add organization ID if user has a current organization selected
      if (currentOrganization && currentOrganization.id) {
        formData.append('organization', String(currentOrganization.id));
        console.log('Organization ID added:', currentOrganization.id);
      }
      
      if (description && description.trim()) {
        const cleanDescription = String(description).trim();
        formData.append('description', cleanDescription);
        console.log('Description added, length:', cleanDescription.length);
        console.log('Description content:', JSON.stringify(cleanDescription));
      }      // Only attach image if it's a new one (URI starts with file://)
      if (image && image.startsWith('file://')) {
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
      }console.log('FormData prepared, calling updateProperty...');
      console.log('Property ID:', property.id);
      console.log('Has new image:', !!(image && image.startsWith('file://')));
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
        // Check if we're only updating text fields without a new image
      const hasNewImage = image && image.startsWith('file://');
      
      let requestData;
      if (!hasNewImage) {
        // If no new image, send as JSON for better compatibility
        console.log('No new image - sending as JSON');
        requestData = {
          name: String(name || '').trim(),
          address: String(address || '').trim(),
          property_type: String(propertyType || 'residential'),
        };
        
        if (currentOrganization && currentOrganization.id) {
          requestData.organization = currentOrganization.id;
        }
        
        if (description && description.trim()) {
          requestData.description = String(description).trim();
        }
        
        console.log('JSON request data:', requestData);
      } else {
        // Use FormData when we have an image
        console.log('Has new image - sending as FormData');
        console.log('FormData ready for transmission');
        requestData = formData;
      }
      
      // Add retry logic for network resilience
      let retryCount = 0;
      let response = null;
      
      while (retryCount < 2) {
        try {
          // Use the updateProperty function to update the property
          response = await updateProperty(property.id, requestData);
          
          // If we have a success or partial success, break the retry loop
          if (response.success) {
            break;
          }
          
          // Otherwise retry
          retryCount++;
          if (retryCount < 2) {
            console.log(`Retrying property update (attempt ${retryCount + 1})...`);
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
      console.log('UpdateProperty response:', response);
      setLoading(false);
      
      if (response.success) {
        // Check if it's a partial success (text updated but image failed)
        if (response.partialUpdate) {
          // Show detailed error for image upload failure
          const errorDetails = response.imageError || response.message || 'Unknown error';
          Alert.alert(
            'Partial Update',
            `Property information was updated, but the image failed to upload: ${errorDetails}. You can try updating the image again later.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          // Full success
          Alert.alert(
            'Success',
            response.fromOfflineQueue 
              ? 'Property will be updated when back online' 
              : 'Property updated successfully',
            [{
              text: 'OK',
              onPress: () => navigation.goBack()
            }]
          );
        }
      } else {
        const errorMessage = typeof response.error === 'object'
          ? JSON.stringify(response.error)
          : response.error;
        Alert.alert('Error', `Failed to update property: ${errorMessage}`);
      }
        } catch (error) {
      console.error('Error updating property:', error);
      
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
                <Ionicons name="home-outline" size={64} color="#ccc" />
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonText}>
                {image ? "Change Image" : "Add Image"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Property Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Property Name*</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Enter property name"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>
          
          {/* Property Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Property Type*</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  propertyType === 'residential' && styles.typeButtonActive,
                ]}
                onPress={() => setPropertyType('residential')}
              >
                <Text style={[
                  styles.typeButtonText,
                  propertyType === 'residential' && styles.typeButtonTextActive,
                ]}>
                  Residential
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  propertyType === 'commercial' && styles.typeButtonActive,
                ]}
                onPress={() => setPropertyType('commercial')}
              >
                <Text style={[
                  styles.typeButtonText,
                  propertyType === 'commercial' && styles.typeButtonTextActive,
                ]}>
                  Commercial
                </Text>
              </TouchableOpacity>
            </View>
            {errors.propertyType && <Text style={styles.errorText}>{errors.propertyType}</Text>}
          </View>
          
          {/* Property Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address*</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter property address"
              multiline
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>
          
          {/* Property Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter property description (optional)"
              multiline
              numberOfLines={4}
            />
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Update Property</Text>
            )}
          </TouchableOpacity>

          {/* Warning message for offline mode */}
          {isOffline && (
            <View style={styles.offlineWarning}>
              <Ionicons name="cloud-offline-outline" size={18} color="#f39c12" />
              <Text style={styles.offlineText}>
                You are offline. Your changes will be saved and synced when you're back online.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  formContainer: {
    padding: 20,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  propertyImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  placeholderText: {
    color: '#888',
    marginTop: 10,
  },
  imageButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    marginTop: 5,
    fontSize: 14,
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeButtonText: {
    fontWeight: '600',
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fef9e7',
    borderRadius: 8,
    marginTop: 20,
  },
  offlineText: {
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
});

export default EditPropertyScreen;
