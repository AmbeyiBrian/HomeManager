import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const EditNoticeScreen = ({ route, navigation }) => {
  const { noticeId } = route.params;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [isImportant, setIsImportant] = useState(false);
  const [sendSMS, setSendSMS] = useState(false); // Add state for SMS option
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Get the API functions from AuthContext
  const { fetchNoticeDetails, updateNotice, isOffline } = useAuth();
  
  // Fetch notice details
  const loadNotice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchNoticeDetails(noticeId);
      if (result.success) {
        const notice = result.data;
        setTitle(notice.title);
        setContent(notice.content);
        setType(notice.notice_type || notice.type || 'general');
        setIsImportant(notice.is_important !== undefined ? notice.is_important : notice.important || false);
        setSendSMS(notice.send_sms || false); // Set SMS toggle based on notice data
        navigation.setOptions({ title: `Edit: ${notice.title.substring(0, 20)}...` || 'Edit Notice' });
      } else {
        setError(result.error || 'Could not load notice details.');
        Alert.alert("Error", "Could not load notice details.", [{ text: "OK", onPress: () => navigation.goBack() }]);
      }
    } catch (e) {
      console.error("Failed to load notice details:", e);
      setError('An error occurred while loading the notice details.');
      Alert.alert("Error", "An error occurred while loading the notice details.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } finally {
      setIsLoading(false);
    }
  }, [noticeId, navigation, fetchNoticeDetails]);
  
  useEffect(() => {
    loadNotice();
  }, [loadNotice]);
  
  const handleUpdateNotice = async () => {
    if (isOffline) {
      Alert.alert("Cannot Update While Offline", "Please reconnect to the internet and try again.");
      return;
    }
    
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing Information', 'Please fill in both title and content for the notice.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const noticeData = {
        title: title.trim(),
        content: content.trim(),
        type: type,
        important: isImportant,
        send_sms: sendSMS, // Include the SMS flag in update payload
      };
      
      const result = await updateNotice(noticeId, noticeData);
      if (result.success) {
        Alert.alert('Notice Updated', 'The notice has been successfully updated.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Update Failed', result.error || 'Could not update the notice. Please try again.');
      }
    } catch (error) {
      console.error("Failed to update notice:", error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text>Loading notice for editing...</Text>
      </View>
    );
  }
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.header}>Edit Notice</Text>

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
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeSelector}>
          {['Announcement', 'Maintenance', 'Reminder', 'Urgent'].map(noticeType => (
            <TouchableOpacity 
              key={noticeType}
              style={[styles.typeButton, type === noticeType && styles.typeButtonSelected]}
              onPress={() => setType(noticeType)}
            >
              <Text style={[styles.typeButtonText, type === noticeType && styles.typeButtonTextSelected]}>
                {noticeType}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={[styles.inputGroup, styles.switchGroup]}>
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
      </View>      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleUpdateNotice} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="white" style={{marginRight: 10}} />
              <Text style={styles.submitButtonText}>Save Changes</Text>
            </>
          )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3498db',
    marginBottom: 10,
  },
  typeButtonSelected: {
    backgroundColor: '#3498db',
  },
  typeButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },  submitButton: {
    backgroundColor: '#007bff', // Primary blue color
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
  buttonContainer: {
    paddingHorizontal: 10,
    width: '100%',
  },
});

export default EditNoticeScreen;
