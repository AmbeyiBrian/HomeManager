import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

/**
 * PropertyMpesaSettings component for managing property-specific M-Pesa configurations
 * 
 * @param {Object} props
 * @param {Object} props.property - The property object
 * @param {Function} props.onClose - Function to call when closing the settings
 */
const PropertyMpesaSettings = ({ property, onClose }) => {
  const { endpoints } = useApi();
  const { isOffline } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mpesaConfig, setMpesaConfig] = useState({
    is_active: true,
    is_sandbox: true,
    consumer_key: '',
    consumer_secret: '',
    business_short_code: '',
    passkey: '',
    callback_url: '',
    timeout_url: '',
    use_organization_config: true,
  });
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Fetch the property's M-Pesa configuration
  useEffect(() => {
    fetchMpesaConfig();
  }, [property?.id]);
  
  const fetchMpesaConfig = async () => {
    if (!property?.id || isOffline) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
        // Endpoint to get property M-Pesa config
      const response = await axios.get(endpoints.propertyMpesaConfig(property.id));
      
      if (response.data) {
        setMpesaConfig(response.data);
      }
    } catch (error) {
      console.error('Error fetching property M-Pesa configuration:', error);
      
      // If 404, it means the property doesn't have a config yet
      if (error.response && error.response.status === 404) {
        // Just use default values, we'll create on save
        console.log('No existing M-Pesa config found for this property');
      } else {
        setError('Failed to load M-Pesa configuration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (field, value) => {
    setMpesaConfig({
      ...mpesaConfig,
      [field]: value
    });
  };
  
  const handleSave = async () => {
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot save settings while offline');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      let response;      const url = endpoints.propertyMpesaConfig(property.id);
      
      if (mpesaConfig.id) {
        // Update existing configuration
        response = await axios.patch(url, mpesaConfig);
      } else {
        // Create new configuration
        response = await axios.post(url, mpesaConfig);
      }
      
      setMpesaConfig(response.data);
      setSuccess('M-Pesa configuration saved successfully');
      
      // Show success message
      Alert.alert('Success', 'Payment settings saved successfully');
    } catch (error) {
      console.error('Error saving M-Pesa configuration:', error);
      const errorMsg = error.response?.data?.error || 'Failed to save M-Pesa configuration';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading payment settings...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Settings for {property?.name}</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#7f8c8d" />
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {success && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}
      
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={20} color="#fff" />
          <Text style={styles.offlineText}>
            You are offline. Settings can only be viewed but not changed.
          </Text>
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingText}>Use Organization Settings</Text>
            <Text style={styles.settingDescription}>
              Use the organization's M-Pesa configuration instead of property-specific settings
            </Text>
          </View>
          <Switch
            value={mpesaConfig.use_organization_config}
            onValueChange={(value) => handleChange('use_organization_config', value)}
            trackColor={{ false: '#d0d0d0', true: '#bde0fe' }}
            thumbColor={mpesaConfig.use_organization_config ? '#3498db' : '#f4f3f4'}
            disabled={isOffline}
          />
        </View>
        
        {!mpesaConfig.use_organization_config && (
          <>
            <View style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingText}>Enable M-Pesa Payments</Text>
              </View>
              <Switch
                value={mpesaConfig.is_active}
                onValueChange={(value) => handleChange('is_active', value)}
                trackColor={{ false: '#d0d0d0', true: '#bde0fe' }}
                thumbColor={mpesaConfig.is_active ? '#3498db' : '#f4f3f4'}
                disabled={isOffline}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingText}>Use Sandbox Environment</Text>
                <Text style={styles.settingDescription}>
                  Enable for testing payments without actual transactions
                </Text>
              </View>
              <Switch
                value={mpesaConfig.is_sandbox}
                onValueChange={(value) => handleChange('is_sandbox', value)}
                trackColor={{ false: '#d0d0d0', true: '#bde0fe' }}
                thumbColor={mpesaConfig.is_sandbox ? '#3498db' : '#f4f3f4'}
                disabled={isOffline}
              />
            </View>
            
            <Text style={styles.sectionTitle}>API Credentials</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Business Short Code</Text>
              <TextInput
                style={styles.input}
                value={mpesaConfig.business_short_code}
                onChangeText={(text) => handleChange('business_short_code', text)}
                placeholder="Your Paybill or Till number"
                editable={!isOffline}
              />
              <Text style={styles.inputHelp}>Paybill or Till number provided by Safaricom</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Consumer Key</Text>
              <TextInput
                style={styles.input}
                value={mpesaConfig.consumer_key}
                onChangeText={(text) => handleChange('consumer_key', text)}
                placeholder="M-Pesa API consumer key"
                editable={!isOffline}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Consumer Secret</Text>
              <TextInput
                style={styles.input}
                value={mpesaConfig.consumer_secret}
                onChangeText={(text) => handleChange('consumer_secret', text)}
                placeholder="M-Pesa API consumer secret"
                secureTextEntry
                editable={!isOffline}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Passkey</Text>
              <TextInput
                style={styles.input}
                value={mpesaConfig.passkey}
                onChangeText={(text) => handleChange('passkey', text)}
                placeholder="M-Pesa API passkey"
                secureTextEntry
                editable={!isOffline}
              />
            </View>
            
            <Text style={styles.sectionTitle}>Callback URLs (Optional)</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Callback URL</Text>
              <TextInput
                style={styles.input}
                value={mpesaConfig.callback_url}
                onChangeText={(text) => handleChange('callback_url', text)}
                placeholder="https://example.com/callback"
                keyboardType="url"
                editable={!isOffline}
              />
              <Text style={styles.inputHelp}>Leave blank to use system default</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Timeout URL</Text>
              <TextInput
                style={styles.input}
                value={mpesaConfig.timeout_url}
                onChangeText={(text) => handleChange('timeout_url', text)}
                placeholder="https://example.com/timeout"
                keyboardType="url"
                editable={!isOffline}
              />
              <Text style={styles.inputHelp}>Leave blank to use system default</Text>
            </View>
          </>
        )}
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving || isOffline}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  errorContainer: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    marginLeft: 8,
  },
  successContainer: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
  },
  successText: {
    color: '#fff',
    marginLeft: 8,
  },
  offlineBanner: {
    backgroundColor: '#f39c12',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
  },
  offlineText: {
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    marginTop: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  settingLabel: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  settingDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputHelp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PropertyMpesaSettings;
