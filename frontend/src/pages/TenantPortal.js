import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { 
  Container, Box, Typography, Card, CardContent, Grid, Button, 
  CircularProgress, Tabs, Tab, TextField, Dialog, DialogActions, 
  DialogContent, DialogContentText, DialogTitle, Alert, Paper,
  List, ListItem, ListItemText, Divider, Chip, Link, IconButton,
  InputAdornment, MenuItem, FormControl, InputLabel, Select,
  Stepper, Step, StepLabel, StepContent, FormGroup, FormControlLabel,
  Switch, Snackbar
} from '@mui/material';
import {
  Home as HomeIcon,
  Payment as PaymentIcon,
  Create as CreateIcon,
  Announcement as AnnouncementIcon,
  ContactPhone as ContactPhoneIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Send as SendIcon,
  AttachMoney as AttachMoneyIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import MpesaPaymentForm from '../components/MpesaPaymentForm';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper to extract query parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function TenantPortal() {
  const { qrCode } = useParams(); // Get QR code from URL path if present
  const query = useQuery();
  const accessCode = query.get('access_code'); // Get access code from query string
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portalData, setPortalData] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const fileInput = useRef();
    
  // State for maintenance ticket form
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketCategory, setTicketCategory] = useState('plumbing');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [ticketImage, setTicketImage] = useState(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [ticketError, setTicketError] = useState(null);

  // State for payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  
  // State for contact form
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // State for refreshing data
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
    setSnackbarMessage('Refreshing data...');
    setSnackbarOpen(true);
  };
  
  // Determine which access method to use
  useEffect(() => {
    const fetchPortalData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let response;
        
        if (qrCode) {
          // Access via QR code in URL path
          response = await axios.get(`${API_URL}/tenant-portal/qr/${qrCode}/`);
        } else if (accessCode) {
          // Access via access code in query string
          response = await axios.get(`${API_URL}/tenant-portal/access/${accessCode}/`);
        } else {
          // No access method provided
          setError('No valid access method provided. Please scan a QR code or enter an access code.');
          setLoading(false);
          return;
        }
        
        // Update portal data
        setPortalData(response.data);
        
        // Pre-fill payment amount if there's a pending payment
        if (response.data.pending_payment) {
          setPaymentAmount(response.data.pending_payment.amount.toString());
          setPaymentRef(response.data.pending_payment.reference);
        }
        
        // Pre-fill contact info if available
        if (response.data.tenant) {
          setContactName(response.data.tenant.name || '');
          setContactEmail(response.data.tenant.email || '');
          setContactPhone(response.data.tenant.phone || '');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch tenant portal data:', err);
        setError('Unable to load tenant portal. The access code may be invalid or expired.');
        setLoading(false);
      }
    };
    
    fetchPortalData();
  }, [qrCode, accessCode, refreshTrigger]);
  
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setTicketError(null);
    
    if (!ticketTitle.trim() || !ticketDescription.trim()) {
      setTicketError('Please fill in all required fields');
      return;
    }
    
    try {
      const accessIdentifier = qrCode || accessCode;
      
      // Create form data to handle file upload
      const formData = new FormData();
      formData.append('title', ticketTitle);
      formData.append('description', ticketDescription);
      formData.append('category', ticketCategory);
      formData.append('priority', ticketPriority);
      formData.append('access_code', accessIdentifier);
      
      if (ticketImage) {
        formData.append('image', ticketImage);
      }
      
      await axios.post(`${API_URL}/tenant-portal/tickets/`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setTicketTitle('');
      setTicketDescription('');
      setTicketPriority('medium');
      setTicketCategory('plumbing');
      setTicketImage(null);
      setShowTicketForm(false);
      setTicketSuccess(true);
      
      // Refresh data after ticket submission
      setTimeout(() => {
        refreshData();
      }, 1500);
      
    } catch (err) {
      console.error('Error submitting maintenance ticket:', err);
      setTicketError('Failed to submit ticket. Please try again later.');
    }
  };
  
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentError(null);
    
    if (!phoneNumber.trim() || !paymentAmount) {
      setPaymentError('Please enter a valid phone number and payment amount');
      return;
    }
    
    try {
      const accessIdentifier = qrCode || accessCode;
      
      const response = await axios.post(`${API_URL}/tenant-portal/payments/initiate/`, {
        phone_number: phoneNumber,
        amount: parseFloat(paymentAmount),
        reference: paymentRef || 'Rent Payment',
        access_code: accessIdentifier
      });
      
      setShowPaymentForm(false);
      setPaymentSuccess(true);
      
      // Refresh data after payment initiation
      setTimeout(() => {
        refreshData();
      }, 3000);
      
    } catch (err) {
      console.error('Error initiating payment:', err);
      setPaymentError('Failed to process payment. Please try again later.');
    }
  };
  
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const accessIdentifier = qrCode || accessCode;
      
      await axios.post(`${API_URL}/tenant-portal/contact-info/`, {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        receive_notifications: receiveNotifications,
        access_code: accessIdentifier
      });
      
      setShowContactForm(false);
      setContactSuccess(true);
      
      // Refresh data after contact info update
      setTimeout(() => {
        refreshData();
      }, 1500);
      
    } catch (err) {
      console.error('Error saving contact information:', err);
    }
  };
  
  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setTicketImage(e.target.files[0]);
    }
  };
  
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };
    if (loading) {
    return (
      <Container maxWidth="md">
        <Box 
          display="flex" 
          flexDirection="column" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="80vh"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Loading tenant portal...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Access Error
            </Typography>
            <Typography paragraph>
              Please try scanning your QR code again or contact your property manager for assistance.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              href="/tenant-access"
            >
              Enter Access Code
            </Button>
          </Paper>
        </Container>
    );
  }
  
  if (!portalData) {
    return <Navigate to="/tenant-access" />;
  }
  
  const { unit, property, tenant, pending_payment, payment_history, tickets, notices } = portalData;
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };
    // Create portal content 
  const portalTheme = {
    palette: {
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#2196f3',
      },
    },
  };
    return (
    <>
      <Box sx={{ bgcolor: 'background.paper', pt: 2, pb: 6 }}>
        <Container maxWidth="md">
          {/* Header section with unit and property info */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Unit {unit.unit_number}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {property.name} • {property.address}
              </Typography>
            </Box>
            <IconButton color="primary" onClick={refreshData}>
              <RefreshIcon />
            </IconButton>
          </Box>
          
          {/* Success messages */}
          {ticketSuccess && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setTicketSuccess(false)}>
              Your maintenance request has been submitted successfully.
            </Alert>
          )}
          
          {paymentSuccess && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setPaymentSuccess(false)}>
              Payment initiated successfully. Please check your phone to complete the transaction.
            </Alert>
          )}
          
          {contactSuccess && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setContactSuccess(false)}>
              Your contact information has been updated successfully.
            </Alert>
          )}
          
          {/* Navigation tabs */}
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab icon={<HomeIcon />} label="Home" />
            <Tab icon={<PaymentIcon />} label="Payments" />
            <Tab icon={<CreateIcon />} label="Issues" />
            <Tab icon={<AnnouncementIcon />} label="Notices" />
          </Tabs>
          
          {/* Tab Content */}
          
          {/* Home tab */}
          {currentTab === 0 && (
            <Box>
              {/* Alert for pending payments */}
              {pending_payment && (
                <Alert 
                  severity="warning" 
                  sx={{ mb: 3 }}
                  action={
                    <Button color="inherit" size="small" onClick={() => setShowPaymentForm(true)}>
                      PAY NOW
                    </Button>
                  }
                >
                  Rent payment of {formatCurrency(pending_payment.amount)} is due by {new Date(pending_payment.due_date).toLocaleDateString()}
                </Alert>
              )}
              
              {/* Unit Details Card */}
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Unit Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Unit Type
                    </Typography>
                    <Typography variant="body1">
                      {unit.unit_type || 'Residential'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Monthly Rent
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(unit.monthly_rent || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Size
                    </Typography>
                    <Typography variant="body1">
                      {unit.square_footage || 'N/A'} sq ft
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Bedrooms
                    </Typography>
                    <Typography variant="body1">
                      {unit.bedrooms || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
              
              {/* Quick Actions */}
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<PaymentIcon />}
                    onClick={() => setShowPaymentForm(true)}
                    sx={{ height: '100%' }}
                  >
                    Pay Rent
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<CreateIcon />}
                    onClick={() => setShowTicketForm(true)}
                    sx={{ height: '100%' }}
                  >
                    Report Issue
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<ContactPhoneIcon />}
                    onClick={() => setShowContactForm(true)}
                    sx={{ height: '100%' }}
                  >
                    Contact Info
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    component="a"
                    href={`tel:${property.manager_phone || property.owner_phone}`}
                    startIcon={<PhoneIcon />}
                    sx={{ height: '100%' }}
                  >
                    Call Manager
                  </Button>
                </Grid>
              </Grid>
              
              {/* Recent notices */}
              <Typography variant="h6" gutterBottom>
                Recent Notices
              </Typography>
              {notices && notices.length > 0 ? (
                <Paper elevation={1} sx={{ mb: 3 }}>
                  <List>
                    {notices.slice(0, 3).map((notice) => (
                      <React.Fragment key={notice.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemText
                            primary={notice.title}
                            secondary={
                              <React.Fragment>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                >
                                  {new Date(notice.date_created).toLocaleDateString()}
                                </Typography>
                                {` — ${notice.content.substring(0, 120)}${notice.content.length > 120 ? '...' : ''}`}
                              </React.Fragment>
                            }
                          />
                        </ListItem>
                        <Divider variant="inset" component="li" />
                      </React.Fragment>
                    ))}
                    {notices.length > 3 && (
                      <ListItem 
                        button
                        onClick={() => setCurrentTab(3)}
                      >
                        <ListItemText primary="View all notices" />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent notices.
                </Typography>
              )}
            </Box>
          )}
          
          {/* Payments tab */}
          {currentTab === 1 && (
            <Box>
              {/* Current Payment Status */}
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Payment Status
                </Typography>
                
                {pending_payment ? (
                  <Box>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      You have a pending payment
                    </Alert>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Amount Due
                        </Typography>
                        <Typography variant="h5">
                          {formatCurrency(pending_payment.amount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Due Date
                        </Typography>
                        <Typography variant="h5">
                          {new Date(pending_payment.due_date).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Reference
                        </Typography>
                        <Typography variant="body1">
                          {pending_payment.reference || 'Rent Payment'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sx={{ mt: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          startIcon={<PaymentIcon />}
                          onClick={() => setShowPaymentForm(true)}
                        >
                          Pay Now
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                ) : (
                  <Alert severity="success">
                    You have no pending payments at this time
                  </Alert>
                )}
              </Paper>
              
              {/* Payment History */}
              <Typography variant="h6" gutterBottom>
                Payment History
              </Typography>
              {payment_history && payment_history.length > 0 ? (
                <Paper elevation={1}>
                  <List>
                    {payment_history.map((payment) => (
                      <React.Fragment key={payment.id}>
                        <ListItem>
                          <ListItemText
                            primary={`${formatCurrency(payment.amount)} - ${payment.reference}`}
                            secondary={new Date(payment.payment_date).toLocaleDateString()}
                          />
                          <Chip 
                            label={payment.status} 
                            color={payment.status === 'paid' ? 'success' : 'warning'} 
                            variant="outlined" 
                            size="small" 
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No payment history found.
                </Typography>
              )}
            </Box>
          )}
          
          {/* Issues/Tickets tab */}
          {currentTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Maintenance Issues
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CreateIcon />}
                  onClick={() => setShowTicketForm(true)}
                >
                  Report New Issue
                </Button>
              </Box>
              
              {tickets && tickets.length > 0 ? (
                <Paper elevation={1}>
                  <List>
                    {tickets.map((ticket) => (
                      <React.Fragment key={ticket.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography fontWeight="medium">
                                  {ticket.title}
                                </Typography>
                                <Chip 
                                  label={ticket.status} 
                                  color={
                                    ticket.status === 'resolved' ? 'success' : 
                                    ticket.status === 'in_progress' ? 'info' : 
                                    ticket.status === 'assigned' ? 'primary' : 
                                    'warning'
                                  } 
                                  size="small" 
                                />
                              </Box>
                            }
                            secondary={
                              <React.Fragment>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                >
                                  {new Date(ticket.date_created).toLocaleDateString()}
                                </Typography>
                                {` — ${ticket.description.substring(0, 120)}${ticket.description.length > 120 ? '...' : ''}`}
                                {ticket.response && (
                                  <Box sx={{ mt: 1, ml: 2, p: 1, bgcolor: 'grey.100', borderLeft: '3px solid #999' }}>
                                    <Typography variant="body2" fontWeight="medium">
                                      Response:
                                    </Typography>
                                    <Typography variant="body2">
                                      {ticket.response}
                                    </Typography>
                                  </Box>
                                )}
                              </React.Fragment>
                            }
                          />
                        </ListItem>
                        <Divider variant="inset" component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No maintenance issues reported.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    sx={{ mt: 2 }}
                    startIcon={<CreateIcon />}
                    onClick={() => setShowTicketForm(true)}
                  >
                    Report an Issue
                  </Button>
                </Box>
              )}
            </Box>
          )}
          
          {/* Notices tab */}
          {currentTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Announcements & Notices
              </Typography>
              
              {notices && notices.length > 0 ? (
                <Paper elevation={1}>
                  <List>
                    {notices.map((notice) => (
                      <React.Fragment key={notice.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography fontWeight="medium">
                                  {notice.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(notice.date_created).toLocaleDateString()}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography
                                component="span"
                                variant="body1"
                                sx={{ display: 'inline', whiteSpace: 'pre-wrap' }}
                              >
                                {notice.content}
                              </Typography>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No announcements or notices at this time.
                </Typography>
              )}
            </Box>
          )}        </Container>
      </Box>
      
      {/* Maintenance Ticket Dialog */}
      <Dialog open={showTicketForm} onClose={() => setShowTicketForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Report a Maintenance Issue</DialogTitle>
        <form onSubmit={handleTicketSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="ticket-title"
              label="Issue Title"
              type="text"
              fullWidth
              required
              variant="outlined"
              value={ticketTitle}
              onChange={(e) => setTicketTitle(e.target.value)}
            />
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Category</InputLabel>
              <Select
                value={ticketCategory}
                label="Category"
                onChange={(e) => setTicketCategory(e.target.value)}
              >
                <MenuItem value="plumbing">Plumbing</MenuItem>
                <MenuItem value="electrical">Electrical</MenuItem>
                <MenuItem value="appliance">Appliance</MenuItem>
                <MenuItem value="structural">Structural</MenuItem>
                <MenuItem value="hvac">Heating/Cooling</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              margin="dense"
              id="ticket-description"
              label="Detailed Description"
              multiline
              rows={4}
              fullWidth
              required
              variant="outlined"
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value)}
            />
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Priority</InputLabel>
              <Select
                value={ticketPriority}
                label="Priority"
                onChange={(e) => setTicketPriority(e.target.value)}
              >
                <MenuItem value="low">Low - Not urgent</MenuItem>
                <MenuItem value="medium">Medium - Needs attention soon</MenuItem>
                <MenuItem value="high">High - Urgent issue</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              component="label"
              variant="outlined"
              startIcon={<ImageIcon />}
              sx={{ mt: 2 }}
            >
              {ticketImage ? 'Change Image' : 'Attach Image'}
              <input
                type="file"
                hidden
                accept="image/*"
                ref={fileInput}
                onChange={handleImageUpload}
              />
            </Button>
            
            {ticketImage && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Image selected: {ticketImage.name}
              </Typography>
            )}
            
            {ticketError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {ticketError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTicketForm(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" startIcon={<SendIcon />}>
              Submit
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Payment Dialog */}
      <Dialog open={showPaymentForm} onClose={() => setShowPaymentForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Make a Payment</DialogTitle>
        <form onSubmit={handlePaymentSubmit}>
          <DialogContent>
            <TextField
              margin="dense"
              id="payment-amount"
              label="Amount (KES)"
              type="number"
              fullWidth
              required
              variant="outlined"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">KES</InputAdornment>,
              }}
            />
            
            <TextField
              margin="dense"
              id="payment-reference"
              label="Payment Reference"
              type="text"
              fullWidth
              variant="outlined"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
            />
            
            <TextField
              margin="dense"
              id="phone-number"
              label="M-Pesa Phone Number"
              type="tel"
              fullWidth
              required
              variant="outlined"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 254712345678"
              helperText="Enter your M-Pesa phone number starting with country code (254)"
            />
            
            {paymentError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {paymentError}
              </Alert>
            )}
            
            <DialogContentText sx={{ mt: 2 }}>
              You will receive an M-Pesa prompt on your phone to complete this payment.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPaymentForm(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" startIcon={<AttachMoneyIcon />}>
              Pay Now
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Contact Info Dialog */}
      <Dialog open={showContactForm} onClose={() => setShowContactForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Your Contact Information</DialogTitle>
        <form onSubmit={handleContactSubmit}>
          <DialogContent>
            <DialogContentText>
              Provide your contact details to receive updates about payments, maintenance requests, and important notices.
            </DialogContentText>
            
            <TextField
              margin="dense"
              id="contact-name"
              label="Your Name"
              type="text"
              fullWidth
              variant="outlined"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            
            <TextField
              margin="dense"
              id="contact-email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            
            <TextField
              margin="dense"
              id="contact-phone"
              label="Phone Number"
              type="tel"
              fullWidth
              variant="outlined"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
            
            <FormGroup sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={receiveNotifications} 
                    onChange={(e) => setReceiveNotifications(e.target.checked)} 
                  />
                }
                label="I want to receive notifications about my unit"
              />
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowContactForm(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save Information
            </Button>
          </DialogActions>
        </form>
      </Dialog>
        <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </>
  );
}

export default TenantPortal;
