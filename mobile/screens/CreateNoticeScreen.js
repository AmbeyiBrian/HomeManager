import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
// import DateTimePicker from '@react-native-community/datetimepicker'; // Consider adding for date inputs
// import { Picker } from '@react-native-picker/picker'; // Consider adding for type selection

const CreateNoticeScreen = ({ navigation }) => {  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');  const [type, setType] = useState('general'); // Match backend enum value
  const [isImportant, setIsImportant] = useState(false);
  const [sendSMS, setSendSMS] = useState(false); // SMS option
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  
  // Get the API functions from AuthContext
  const { createNotice, fetchProperties, isOffline } = useAuth();
  
  // Fetch properties for selection
  useEffect(() => {
    const loadProperties = async () => {
      // If properties are already loaded, don't fetch again
      if (properties.length > 0) {
        return;
      }
      
      setPropertiesLoading(true);
      try {
        const result = await fetchProperties();
        if (result.success) {
          setProperties(result.data);
          if (result.data.length > 0) {
            setSelectedProperty(result.data[0].id); // Default to first property
          }
        } else {
          console.error('Failed to load properties:', result.error);
        }
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setPropertiesLoading(false);
      }
    };
    
    if (!isOffline) {
      loadProperties();
    }
  // Use an empty dependency array and manually handle the properties check inside
  // This prevents the endless API calls caused by fetchProperties being recreated
  }, []);
  
  const handleCreateNotice = async () => {
    if (isOffline) {
      Alert.alert("Cannot Create Notice While Offline", "Please reconnect to the internet and try again.");
      return;
    }
    
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing Information', 'Please fill in both title and content for the notice.');
      return;
    }
    
    if (!selectedProperty) {
      Alert.alert('Property Required', 'Please select a property for this notice.');
      return;
    }
    
    setIsSubmitting(true);    try {      const noticeData = {
        title: title.trim(),
        content: content.trim(),
        notice_type: type, // Updated field name to match backend model
        is_important: isImportant, // Updated field name to match backend model
        property_id: selectedProperty,
        start_date: new Date().toISOString().split('T')[0], // Today's date
        send_sms: sendSMS, // Include SMS flag
        // Send more fields as needed
      };
      
      const result = await createNotice(noticeData);
      if (result.success) {
        Alert.alert('Notice Created', 'The notice has been successfully created.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Creation Failed', result.error || 'Could not create the notice. Please try again.');
      }
    } catch (error) {
      console.error("Failed to create notice:", error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.header}>Create New Notice</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter notice title"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Content</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          placeholder="Enter notice details"
          multiline
          numberOfLines={6}
        />
      </View>      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type</Text>
        {/* Type selection matching Django model choices */}
        <View style={styles.typeSelector}>
          {[
            { value: 'general', label: 'General Announcement' },
            { value: 'rent', label: 'Rent & Payments' },
            { value: 'maintenance', label: 'Maintenance & Repairs' },
            { value: 'inspection', label: 'Inspection & Access' },
            { value: 'eviction', label: 'Eviction & Legal' },
            { value: 'amenities', label: 'Amenities & Facilities' },
            { value: 'policy', label: 'Policy & Rules Update' },
            { value: 'event', label: 'Community Event' },
            { value: 'emergency', label: 'Emergency Alert' },
            { value: 'utility', label: 'Utility & Service' }
          ].map(noticeType => (
            <TouchableOpacity 
              key={noticeType.value}
              style={[styles.typeButton, type === noticeType.value && styles.typeButtonSelected]}
              onPress={() => setType(noticeType.value)}
            >
              <Text style={[styles.typeButtonText, type === noticeType.value && styles.typeButtonTextSelected]}>
                {noticeType.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View><View style={[styles.inputGroup, styles.switchGroup]}>
        <Text style={styles.label}>Important Notice?</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isImportant ? "#f5dd4b" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={setIsImportant}
          value={isImportant}
        />
      </View>

      <View style={[styles.inputGroup, styles.switchGroup]}>
        <Text style={styles.label}>Send SMS Notification?</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={sendSMS ? "#f5dd4b" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={setSendSMS}
          value={sendSMS}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Property</Text>
        {propertiesLoading ? (
          <ActivityIndicator size="small" color="#3498db" />
        ) : (
          <View style={styles.propertySelector}>
            {properties.length === 0 ? (
              <Text style={styles.noPropertiesText}>No properties found. Please add a property first.</Text>
            ) : (
              properties.map(property => (
                <TouchableOpacity
                  key={property.id}
                  style={[styles.propertyButton, selectedProperty === property.id && styles.propertyButtonSelected]}
                  onPress={() => setSelectedProperty(property.id)}
                >
                  <Text style={[styles.propertyButtonText, selectedProperty === property.id && styles.propertyButtonTextSelected]}>
                    {property.name}
                  </Text>
                </TouchableOpacity>              ))
            )}
          </View>
        )}
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleCreateNotice}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="white" style={{marginRight: 10}} />
          ) : (
            <Ionicons name="paper-plane-outline" size={20} color="white" style={{marginRight: 10}} />
          )}
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Creating...' : 'Create Notice'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingBottom: 30, // Extra padding at the bottom
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top', // For Android
  },  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow wrapping for many types
    justifyContent: 'flex-start', // Changed to flex-start for better alignment with more items
  },
  typeButton: {
    paddingVertical: 8, // Slightly reduced vertical padding
    paddingHorizontal: 12, // Slightly reduced horizontal padding
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3498db',
    marginBottom: 10,
    marginRight: 8, // Added margin between buttons
    minWidth: '47%', // Set to approximately half of container width minus margins
  },
  typeButtonSelected: {
    backgroundColor: '#3498db',
  },  typeButtonText: {
    color: '#3498db',
    fontSize: 12, // Reduced font size for better fit
    fontWeight: '500',
    textAlign: 'center', // Center text in button
  },
  typeButtonTextSelected: {
    color: '#fff',
  },  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10, // Adjusted padding
  },
  submitButton: {
    backgroundColor: '#28a745', // Green color
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40, // Add bottom margin to ensure button is fully visible
    marginHorizontal: 5, // Add horizontal margin for wider appearance
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: { // Added for styling disabled buttons
    backgroundColor: '#aaa',
  },
  buttonContainer: {
    paddingHorizontal: 10,
    width: '100%',
  },
  propertySelector: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  propertyButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
    marginBottom: 10,
  },
  propertyButtonSelected: {
    backgroundColor: '#3498db',
  },
  propertyButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '500',
  },
  propertyButtonTextSelected: {
    color: '#fff',
  },
  noPropertiesText: {
    textAlign: 'center',
    color: '#777',
    fontStyle: 'italic',
  },
});

export default CreateNoticeScreen;
