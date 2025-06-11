import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { organizationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * MpesaSettings component for managing an organization's M-Pesa configuration
 * 
 * @param {Object} props
 * @param {number} props.organizationId - The ID of the organization
 */
function MpesaSettings({ organizationId }) {
  const { currentUser } = useAuth();
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
    timeout_url: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Check if the current user is an admin
  const isAdmin = currentUser?.is_staff || currentUser?.is_superuser;

  // Load the organization's M-Pesa configuration
  useEffect(() => {
    if (organizationId) {
      fetchMpesaConfig();
    }
  }, [organizationId]);  const fetchMpesaConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await organizationsAPI.getMpesaConfig();
      
      if (response.data) {
        setMpesaConfig(response.data);
      }
    } catch (err) {
      console.error('Error fetching M-Pesa configuration:', err);
      setError(err.response?.data?.error || 'Failed to load M-Pesa configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setMpesaConfig({
      ...mpesaConfig,
      [field]: value
    });
  };  const handleSave = async () => {
    try {
      // Check if user is admin
      if (!isAdmin) {
        setError('Permission denied: Only admin users can modify M-PESA configuration');
        return;
      }
      
      setSaving(true);
      setError(null);
      setSuccess(null);

      let response;
      if (mpesaConfig.id) {
        // Update existing configuration
        response = await organizationsAPI.updateMpesaConfig(mpesaConfig);
      } else {
        // Create new configuration
        response = await organizationsAPI.createMpesaConfig(mpesaConfig);
      }

      setMpesaConfig(response.data);
      setSuccess('M-Pesa configuration saved successfully');
    } catch (err) {
      console.error('Error saving M-Pesa configuration:', err);
      setError(err.message || err.response?.data?.error || 'Failed to save M-Pesa configuration');
    } finally {
      setSaving(false);
    }
  };
  const handleTestConnection = async () => {
    try {
      // Check if user is admin
      if (!isAdmin) {
        setError('Permission denied: Only admin users can test M-PESA connection');
        return;
      }
      
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await organizationsAPI.testMpesaConnection();

      setSuccess(response.data.message || 'M-Pesa connection test successful');
    } catch (err) {
      console.error('Error testing M-Pesa connection:', err);
      setError(err.message || err.response?.data?.error || 'Failed to test M-Pesa connection');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !mpesaConfig.id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            M-Pesa Payment Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure M-Pesa integration for this organization. These settings will override the system defaults.
          </Typography>
        </Box>

        {!isAdmin && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You need administrator privileges to modify M-PESA configuration settings. The form below is in read-only mode.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={mpesaConfig.is_active}
                onChange={handleChange('is_active')}
                color="primary"
                disabled={!isAdmin}
              />
            }
            label="Enable M-Pesa Payments"
          />

          <FormControlLabel
            control={
              <Switch
                checked={mpesaConfig.is_sandbox}
                onChange={handleChange('is_sandbox')}
                color="primary"
                disabled={!isAdmin}
              />
            }
            label="Use Sandbox Environment (Testing)"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" gutterBottom>
          API Credentials
        </Typography>        <Box sx={{ mb: 3 }}>
          <TextField
            label="Business Short Code"
            value={mpesaConfig.business_short_code}
            onChange={handleChange('business_short_code')}
            fullWidth
            margin="normal"
            helperText="Your Paybill or Till number"
            disabled={!isAdmin}
          />

          <TextField
            label="Consumer Key"
            value={mpesaConfig.consumer_key}
            onChange={handleChange('consumer_key')}
            fullWidth
            margin="normal"
            disabled={!isAdmin}
          />

          <TextField
            label="Consumer Secret"
            value={mpesaConfig.consumer_secret}
            onChange={handleChange('consumer_secret')}
            fullWidth
            margin="normal"
            type="password"
            disabled={!isAdmin}
          />          <TextField
            label="Passkey"
            value={mpesaConfig.passkey}
            onChange={handleChange('passkey')}
            fullWidth
            margin="normal"
            type="password"
            disabled={!isAdmin}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" gutterBottom>
          Callback URLs (Optional)
        </Typography>

        <Box sx={{ mb: 3 }}>
          <TextField
            label="Callback URL"
            value={mpesaConfig.callback_url}
            onChange={handleChange('callback_url')}
            fullWidth
            margin="normal"
            helperText="Leave blank to use system default"
            disabled={!isAdmin}
          />

          <TextField
            label="Timeout URL"
            value={mpesaConfig.timeout_url}
            onChange={handleChange('timeout_url')}
            fullWidth
            margin="normal"
            helperText="Leave blank to use system default"
            disabled={!isAdmin}
          />
        </Box>        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button 
            variant="outlined"
            onClick={handleTestConnection}
            disabled={!isAdmin || saving || !mpesaConfig.consumer_key || !mpesaConfig.consumer_secret}
          >
            Test Connection
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!isAdmin || saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

export default MpesaSettings;
