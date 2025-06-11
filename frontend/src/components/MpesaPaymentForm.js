import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper
} from '@mui/material';
import { Phone as PhoneIcon } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

/**
 * MpesaPaymentForm component for initiating M-Pesa payments
 * 
 * @param {Object} props
 * @param {Object} props.rent - The rent payment object
 * @param {Function} props.onPaymentInitiated - Callback after payment is initiated
 */
function MpesaPaymentForm({ rent, onPaymentInitiated }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // Handle phone number input
  const handlePhoneChange = (e) => {
    setPhoneNumber(e.target.value);
  };

  // Validate the phone number format
  const isValidPhoneNumber = () => {
    // Basic validation for Kenyan phone numbers
    const regex = /^(?:254|\+254|0)?(7[0-9]{8})$/;
    return regex.test(phoneNumber);
  };

  // Format the phone number to the required format (254XXXXXXXXX)
  const formatPhoneNumber = () => {
    if (phoneNumber.startsWith('+254')) {
      return phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('0')) {
      return '254' + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('254')) {
      return phoneNumber;
    } else {
      return '254' + phoneNumber;
    }
  };

  // Initiate M-Pesa payment
  const initiatePayment = async () => {
    if (!isValidPhoneNumber()) {
      setError('Please enter a valid Kenyan phone number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formattedPhone = formatPhoneNumber();
      
      const response = await axios.post(`${API_URL}/payments/mpesa-initiate/`, {
        phone_number: formattedPhone,
        rent_payment_id: rent.id,
        organization_id: rent.unit?.property?.organization_id
      });

      // Extract checkout request ID for status checking
      const checkoutReqId = response.data.mpesa_response?.CheckoutRequestID;
      if (checkoutReqId) {
        setCheckoutRequestId(checkoutReqId);
        setDialogOpen(true);
      }

      // Call the parent's callback function
      if (onPaymentInitiated) {
        onPaymentInitiated(response.data.mpesa_payment);
      }
    } catch (err) {
      console.error('Error initiating M-Pesa payment:', err);
      setError(err.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  // Check the status of the payment
  const checkPaymentStatus = async () => {
    if (!checkoutRequestId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/payments/mpesa-status/${checkoutRequestId}/`);
      setPaymentStatus(response.data.result_code === '0' ? 'completed' : 'pending');

      // If payment is complete, close the dialog after 2 seconds
      if (response.data.result_code === '0') {
        setTimeout(() => {
          setDialogOpen(false);
          if (onPaymentInitiated) {
            onPaymentInitiated(response.data);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      setError('Failed to check payment status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Pay with M-Pesa
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          Enter your M-Pesa phone number to receive a payment prompt.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Phone Number"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="e.g. 0712345678"
          fullWidth
          margin="normal"
          InputProps={{
            startAdornment: <PhoneIcon sx={{ color: 'text.secondary', mr: 1 }} />
          }}
          helperText={
            phoneNumber && !isValidPhoneNumber()
              ? 'Please enter a valid Kenyan phone number'
              : 'Enter the phone number registered with M-Pesa'
          }
          error={phoneNumber !== '' && !isValidPhoneNumber()}
        />

        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight="bold">
            Amount to Pay: KES {rent.amount.toLocaleString()}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          disabled={loading || !isValidPhoneNumber()}
          onClick={initiatePayment}
          sx={{ mt: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Pay Now'}
        </Button>
      </Box>

      {/* Payment Status Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>M-Pesa Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            {paymentStatus === 'completed' ? (
              <Alert severity="success">
                Payment completed successfully!
              </Alert>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  A payment request has been sent to your phone. Please check your phone and enter your M-PESA PIN to complete the payment.
                </Alert>
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <CircularProgress />
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={checkPaymentStatus}
            disabled={loading || paymentStatus === 'completed'}
          >
            Check Status
          </Button>
          <Button onClick={() => setDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default MpesaPaymentForm;
