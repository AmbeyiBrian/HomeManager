// filepath: c:\Users\brian.ambeyi\PycharmProjects\HomeManager\frontend\src\pages\TenantAccess.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Box, Typography, TextField, Button, Paper,
  Divider, Grid, Alert, CircularProgress, InputAdornment, IconButton
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Login as LoginIcon,
  Help as HelpIcon,
  QuestionAnswer as QuestionAnswerIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function TenantAccess() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleAccessCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      setError('Please enter your access code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Validate access code first before redirecting
      const response = await axios.get(`${API_URL}/tenant-portal/validate/${accessCode.trim()}/`);
      
      if (response.data.valid) {
        navigate(`/tenant-portal?access_code=${accessCode.trim()}`);
      } else {
        setError('Invalid access code. Please check and try again.');
      }
    } catch (err) {
      console.error('Error validating access code:', err);
      setError('Invalid access code or connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleScanQrCode = () => {
    // This could be implemented with a QR code scanner library
    // For now, just show a message about the mobile app
    setError('QR code scanning is available in our mobile app. Please download it or enter your access code.');
  };
    return (
    <Container maxWidth="sm">        <Box 
          sx={{ 
            mt: 4, 
            mb: 8, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              color: '#1976d2',
              fontWeight: 'bold' 
            }}
          >
            Tenant Portal Access
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4, maxWidth: '450px' }}>
            Welcome to our tenant portal. Enter your access code to view your unit information, make payments, and report maintenance issues.
          </Typography>
          
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              width: '100%', 
              borderRadius: 2,
              border: '1px solid #1976d210'
            }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <form onSubmit={handleAccessCodeSubmit}>
              <TextField
                fullWidth
                label="Enter Access Code"
                variant="outlined"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Example: ABC123"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />
              
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                type="submit"
                disabled={loading}
                endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                sx={{ py: 1.5 }}
              >
                {loading ? 'Validating...' : 'Access My Unit'}
              </Button>
            </form>
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button 
                onClick={handleScanQrCode}
                startIcon={<QrCodeIcon />}
                color="secondary"
              >
                Scan QR Code Instead
              </Button>
            </Box>
            
            <Divider sx={{ my: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Need Help?
              </Typography>
            </Divider>
            
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<QuestionAnswerIcon />}
                    component="a"
                    href="mailto:support@homemanager.com"
                    sx={{ 
                      textTransform: 'none',
                      justifyContent: 'flex-start',
                      py: 1
                    }}
                  >
                    Contact Support
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<HelpIcon />}
                    color="secondary"
                    sx={{ 
                      textTransform: 'none',
                      justifyContent: 'flex-start',
                      py: 1
                    }}
                  >
                    Find My Access Code
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Box>      </Container>
  );
}

export default TenantAccess;
