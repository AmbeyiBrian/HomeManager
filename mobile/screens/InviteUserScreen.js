import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const InviteUserScreen = ({ navigation, route }) => {
  const { organizationId } = route.params;
  const { user, hasPermission } = useAuth();
  const { endpoints } = useApi();

  // Form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [errors, setErrors] = useState({});

  // Check if user has permission to invite users
  useEffect(() => {
    if (!hasPermission('can_manage_users')) {
      Alert.alert(
        'Permission Denied',
        'You do not have permission to invite users to this organization.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    }
  }, [hasPermission, navigation]);

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch(
          `${endpoints.API_BASE_URL}/api/organizations/roles/`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${user.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch roles');
        }

        const data = await response.json();
        const availableRoles = data.results || [];
        
        setRoles(availableRoles);
        
        // Set default role (member or first available)
        const memberRole = availableRoles.find(r => r.role_type === 'member');
        if (memberRole) {
          setRoleId(memberRole.id);
        } else if (availableRoles.length > 0) {
          setRoleId(availableRoles[0].id);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        Alert.alert('Error', 'Failed to load roles. Please try again.');
      }
    };

    fetchRoles();
  }, [endpoints.API_BASE_URL, user.access_token]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Enter a valid email address';
    }
    
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!roleId) {
      newErrors.roleId = 'Please select a role';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInvite = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(
        `${endpoints.API_BASE_URL}/api/organizations/invite-user/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organization: organizationId,
            email: email.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: roleId,
            message: customMessage.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send invitation');
      }

      const result = await response.json();
      
      Alert.alert(
        'Invitation Sent',
        `An invitation has been sent to ${email}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send invitation. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Ionicons name="mail-outline" size={40} color="#3498db" />
          <Text style={styles.headerTitle}>Invite User</Text>
          <Text style={styles.headerSubtitle}>
            Send an invitation to join your organization
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#999"
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role Assignment *</Text>
            <View style={[styles.pickerContainer, errors.roleId && styles.pickerError]}>
              <Picker
                selectedValue={roleId}
                onValueChange={(itemValue) => setRoleId(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select a role..." value="" />
                {roles.map((role) => (
                  <Picker.Item key={role.id} label={role.name} value={role.id} />
                ))}
              </Picker>
            </View>
            {errors.roleId && <Text style={styles.errorText}>{errors.roleId}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Custom Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder="Optional: Add a personal message to the invitation"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleInvite}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Send Invitation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  pickerError: {
    borderColor: '#e74c3c',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 6,
    padding: 15,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default InviteUserScreen;
