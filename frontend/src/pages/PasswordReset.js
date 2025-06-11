import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Paper, 
  CircularProgress,
  Alert,
  Link as MuiLink
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { authAPI } from '../services/api';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError('');
      try {
      await authAPI.resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.email || 
        err.response?.data?.detail ||
        'Failed to send password reset email. Please try again.'
      );
      console.error('Password reset error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (success) {
    return (
      <Container component="main" maxWidth="xs">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            mt: 8
          }}
        >
          <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
            Password reset email sent. Please check your inbox for instructions.
          </Alert>
          
          <MuiLink component={RouterLink} to="/login" variant="body2">
            Return to login
          </MuiLink>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container component="main" maxWidth="xs">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          mt: 8
        }}
      >
        <Typography component="h1" variant="h5" gutterBottom>
          Reset Password
        </Typography>
        
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3, textAlign: 'center' }}>
          Enter your email address and we'll send you instructions to reset your password.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
          </Button>
          
          <Box textAlign="center">
            <MuiLink component={RouterLink} to="/login" variant="body2">
              Back to login
            </MuiLink>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default PasswordReset;
