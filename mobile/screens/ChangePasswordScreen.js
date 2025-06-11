import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const ChangePasswordScreen = ({ navigation }) => {
  const { isOffline } = useAuth();
  
  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot change password while offline.');
      return;
    }
    
    setLoading(true);
    
    try {
      // TODO: Replace with actual API call
      // For now, we'll just mock a successful response
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Success',
          'Password changed successfully. Please login with your new password.',
          [{
            text: 'OK',
            onPress: () => {
              // In a real app, we might want to sign the user out here
              navigation.goBack();
            }
          }]
        );
      }, 1500);
      
      // Example of how the actual API call would look:
      /*
      const { changePassword } = useAuth();
      const response = await changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Password changed successfully. Please login with your new password.',
          [{
            text: 'OK',
            onPress: () => {
              // You might want to sign the user out here
              navigation.goBack();
            }
          }]
        );
      } else {
        if (response.error === 'invalid_current_password') {
          setErrors({
            ...errors,
            currentPassword: 'Current password is incorrect'
          });
        } else {
          Alert.alert('Error', `Failed to change password: ${response.error}`);
        }
      }
      setLoading(false);
      */
      
    } catch (error) {
      console.error('Error changing password:', error);
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
          <View style={styles.securityIcon}>
            <Ionicons name="shield-checkmark" size={60} color="#3498db" />
          </View>
          
          <Text style={styles.instructions}>
            Enter your current password and choose a new password to update your account security.
          </Text>
          
          {/* Current Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Current Password <Text style={styles.required}>*</Text></Text>
            <View style={[styles.passwordContainer, errors.currentPassword && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#7f8c8d"
                />
              </TouchableOpacity>
            </View>
            {errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
          </View>
          
          {/* New Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>New Password <Text style={styles.required}>*</Text></Text>
            <View style={[styles.passwordContainer, errors.newPassword && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter your new password"
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#7f8c8d"
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword ? (
              <Text style={styles.errorText}>{errors.newPassword}</Text>
            ) : (
              <Text style={styles.helperText}>
                Password must be at least 8 characters long
              </Text>
            )}
          </View>
          
          {/* Confirm New Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm New Password <Text style={styles.required}>*</Text></Text>
            <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#7f8c8d"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
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
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>
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
  securityIcon: {
    alignItems: 'center',
    marginVertical: 24,
  },
  instructions: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    marginTop: 4,
    fontSize: 12,
  },
  helperText: {
    color: '#7f8c8d',
    marginTop: 4,
    fontSize: 12,
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
  saveButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 24,
    padding: 8,
  },
  forgotPasswordText: {
    color: '#3498db',
    fontSize: 14,
  },
});

export default ChangePasswordScreen;
