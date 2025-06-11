import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  Button,
  TextField,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Switch,
  IconButton,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Sms as SmsIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Contacts as ContactsIcon,
  Message as MessageIcon,
  Campaign as CampaignIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { smsAPI, tenantsAPI, propertiesAPI, organizationsAPI } from '../services/api';

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sms-tabpanel-${index}`}
      aria-labelledby={`sms-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Statistics Card Component
const StatCard = ({ title, value, icon, color = 'primary', subtitle, change }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="h2" color={`${color}.main`}>
            {value}
          </Typography>
          {change && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
              {change}
            </Typography>
          )}
          {subtitle && (
            <Typography color="textSecondary" variant="body2" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// Message Template Component
const MessageTemplate = ({ template, onEdit, onDelete, onUse }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="between" alignItems="start" mb={2}>
        <Box flex={1}>
          <Typography variant="h6" gutterBottom>
            {template.name}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {template.description}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            {template.content}
          </Typography>
        </Box>
        <IconButton onClick={(e) => e.currentTarget}>
          <MoreVertIcon />
        </IconButton>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Chip
          label={template.category}
          size="small"
          color="primary"
          variant="outlined"
        />
        <Box display="flex" gap={1}>
          <Button size="small" onClick={() => onUse(template)}>
            Use Template
          </Button>
          <Button size="small" onClick={() => onEdit(template)} startIcon={<EditIcon />}>
            Edit
          </Button>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const EnhancedSMS = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [statistics, setStatistics] = useState({
    totalSent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    templates: 0,
    campaigns: 0
  });
  
  // Dialog states
  const [composeDialog, setComposeDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  
  // Form states
  const [messageForm, setMessageForm] = useState({
    recipients: [],
    message: '',
    scheduled: false,
    scheduleDate: '',
    template: null
  });
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    content: '',
    category: '',
    variables: []
  });
  
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    message: '',
    recipients: [],
    scheduled: false,
    scheduleDate: ''
  });
  
  // Settings state
  const [smsSettings, setSmsSettings] = useState({
    provider: 'twilio',
    apiKey: '',
    senderId: '',
    allowScheduled: true,
    maxRecipients: 100,
    rateLimiting: true
  });
  
  // Notification states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch SMS data and related information
      const [
        messagesResponse,
        tenantsResponse,
        propertiesResponse
      ] = await Promise.all([
        smsAPI.getMessages().catch(() => ({ data: [] })),
        tenantsAPI.getTenants().catch(() => ({ data: [] })),
        propertiesAPI.getProperties().catch(() => ({ data: [] }))
      ]);

      const messagesData = messagesResponse.data || [];
      const tenantsData = tenantsResponse.data || [];
      const propertiesData = propertiesResponse.data || [];

      setMessages(messagesData);
      setContacts([...tenantsData, ...propertiesData]);
      
      // Mock templates data
      setTemplates([
        {
          id: 1,
          name: 'Payment Reminder',
          description: 'Monthly rent payment reminder',
          content: 'Dear {tenant_name}, your rent payment of {amount} is due on {due_date}.',
          category: 'Billing',
          variables: ['tenant_name', 'amount', 'due_date']
        },
        {
          id: 2,
          name: 'Maintenance Update',
          description: 'Maintenance ticket status update',
          content: 'Hi {tenant_name}, your maintenance request #{ticket_id} has been {status}.',
          category: 'Maintenance',
          variables: ['tenant_name', 'ticket_id', 'status']
        },
        {
          id: 3,
          name: 'Welcome Message',
          description: 'New tenant welcome message',
          content: 'Welcome to {property_name}! We\'re excited to have you as our tenant.',
          category: 'General',
          variables: ['property_name']
        }
      ]);

      // Calculate statistics
      const totalSent = messagesData.length;
      const delivered = messagesData.filter(msg => msg.status === 'delivered').length;
      const failed = messagesData.filter(msg => msg.status === 'failed').length;
      const pending = messagesData.filter(msg => msg.status === 'pending').length;

      setStatistics({
        totalSent,
        delivered,
        failed,
        pending,
        templates: 3,
        campaigns: 0
      });

    } catch (error) {
      console.error('Error fetching SMS data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading SMS data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSendMessage = async () => {
    try {
      const messageData = {
        recipients: messageForm.recipients,
        message: messageForm.message,
        scheduled: messageForm.scheduled,
        scheduleDate: messageForm.scheduleDate
      };

      await smsAPI.sendMessage(messageData);
      
      setSnackbar({
        open: true,
        message: 'Message sent successfully',
        severity: 'success'
      });
      
      setComposeDialog(false);
      setMessageForm({
        recipients: [],
        message: '',
        scheduled: false,
        scheduleDate: '',
        template: null
      });
      
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error sending message:', error);
      setSnackbar({
        open: true,
        message: 'Error sending message',
        severity: 'error'
      });
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const newTemplate = {
        ...templateForm,
        id: Date.now() // Mock ID
      };
      
      setTemplates([...templates, newTemplate]);
      setTemplateDialog(false);
      setTemplateForm({
        name: '',
        description: '',
        content: '',
        category: '',
        variables: []
      });
      
      setSnackbar({
        open: true,
        message: 'Template created successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating template:', error);
      setSnackbar({
        open: true,
        message: 'Error creating template',
        severity: 'error'
      });
    }
  };

  const handleUseTemplate = (template) => {
    setMessageForm({
      ...messageForm,
      message: template.content,
      template: template
    });
    setComposeDialog(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'delivered': 'success',
      'pending': 'warning',
      'failed': 'error',
      'scheduled': 'info'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'delivered': <CheckCircleIcon />,
      'pending': <PendingIcon />,
      'failed': <ErrorIcon />,
      'scheduled': <ScheduleIcon />
    };
    return icons[status] || <MessageIcon />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Enhanced SMS Management
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Comprehensive SMS communication platform for tenant and property management
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setSettingsDialog(true)}
            >
              Settings
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => setComposeDialog(true)}
            >
              Compose Message
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Total Sent"
            value={statistics.totalSent}
            icon={<SmsIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Delivered"
            value={statistics.delivered}
            icon={<CheckCircleIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Failed"
            value={statistics.failed}
            icon={<ErrorIcon />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Pending"
            value={statistics.pending}
            icon={<PendingIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Templates"
            value={statistics.templates}
            icon={<MessageIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Campaigns"
            value={statistics.campaigns}
            icon={<CampaignIcon />}
            color="secondary"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2, pt: 2 }}>
            <Tab icon={<MessageIcon />} label="Messages" iconPosition="start" />
            <Tab icon={<MessageIcon />} label="Templates" iconPosition="start" />
            <Tab icon={<CampaignIcon />} label="Campaigns" iconPosition="start" />
            <Tab icon={<ContactsIcon />} label="Contacts" iconPosition="start" />
            <Tab icon={<AnalyticsIcon />} label="Analytics" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Messages Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Message History</Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => console.log('Export messages')}
            >
              Export
            </Button>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sent Date</TableCell>
                  <TableCell>Delivery Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No messages found. Start by composing your first message.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {message.recipient_name || message.phone_number}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {message.phone_number}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {message.content?.substring(0, 50)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(message.status)}
                          label={message.status?.toUpperCase()}
                          color={getStatusColor(message.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {message.sent_at ? new Date(message.sent_at).toLocaleString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {message.delivered_at ? new Date(message.delivered_at).toLocaleString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Templates Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Message Templates</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setTemplateDialog(true)}
            >
              Create Template
            </Button>
          </Box>

          <Grid container spacing={3}>
            {templates.map((template) => (
              <Grid item xs={12} md={6} lg={4} key={template.id}>
                <MessageTemplate
                  template={template}
                  onEdit={(template) => {
                    setTemplateForm(template);
                    setTemplateDialog(true);
                  }}
                  onDelete={(id) => {
                    setTemplates(templates.filter(t => t.id !== id));
                  }}
                  onUse={handleUseTemplate}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Campaigns Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">SMS Campaigns</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCampaignDialog(true)}
            >
              Create Campaign
            </Button>
          </Box>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            SMS campaigns allow you to send bulk messages to multiple recipients. Perfect for announcements, reminders, and marketing.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    No campaigns found
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Create your first SMS campaign to reach multiple tenants at once.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<CampaignIcon />}
                    onClick={() => setCampaignDialog(true)}
                  >
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Contacts Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Contact Management</Typography>
            <Box display="flex" gap={2}>
              <Button variant="outlined" startIcon={<UploadIcon />}>
                Import Contacts
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />}>
                Export Contacts
              </Button>
            </Box>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone Number</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Property</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.slice(0, 10).map((contact, index) => (
                  <TableRow key={contact.id || index}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {contact.name?.[0] || contact.first_name?.[0] || 'C'}
                        </Avatar>
                        <Typography variant="body2">
                          {contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {contact.phone_number || contact.phone || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={contact.type || (contact.first_name ? 'Tenant' : 'Property')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {contact.property_name || contact.address || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={contact.is_active !== false ? 'Active' : 'Inactive'}
                        color={contact.is_active !== false ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            SMS Analytics & Reports
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Delivery Rate
                  </Typography>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h4" color="success.main">
                      {statistics.totalSent > 0 
                        ? ((statistics.delivered / statistics.totalSent) * 100).toFixed(1)
                        : 0}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={statistics.totalSent > 0 ? (statistics.delivered / statistics.totalSent) * 100 : 0}
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {statistics.delivered} of {statistics.totalSent} messages delivered
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Failed Messages
                  </Typography>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h4" color="error.main">
                      {statistics.failed}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {statistics.totalSent > 0 
                      ? ((statistics.failed / statistics.totalSent) * 100).toFixed(1)
                      : 0}% failure rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Compose Message Dialog */}
      <Dialog open={composeDialog} onClose={() => setComposeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Compose SMS Message</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Recipients</InputLabel>
              <Select
                multiple
                value={messageForm.recipients}
                onChange={(e) => setMessageForm({ ...messageForm, recipients: e.target.value })}
                label="Recipients"
              >
                {contacts.slice(0, 20).map((contact) => (
                  <MenuItem key={contact.id} value={contact.phone_number || contact.phone}>
                    {contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'} 
                    ({contact.phone_number || contact.phone || 'No phone'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={4}
              value={messageForm.message}
              onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
              sx={{ mb: 2 }}
              helperText={`${messageForm.message.length}/160 characters`}
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={messageForm.scheduled}
                  onChange={(e) => setMessageForm({ ...messageForm, scheduled: e.target.checked })}
                />
              }
              label="Schedule message"
            />
            
            {messageForm.scheduled && (
              <TextField
                fullWidth
                label="Schedule Date & Time"
                type="datetime-local"
                value={messageForm.scheduleDate}
                onChange={(e) => setMessageForm({ ...messageForm, scheduleDate: e.target.value })}
                sx={{ mt: 2 }}
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeDialog(false)}>Cancel</Button>
          <Button onClick={handleSendMessage} variant="contained" startIcon={<SendIcon />}>
            {messageForm.scheduled ? 'Schedule' : 'Send'} Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Message Template</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Description"
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={templateForm.category}
                onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                label="Category"
              >
                <MenuItem value="Billing">Billing</MenuItem>
                <MenuItem value="Maintenance">Maintenance</MenuItem>
                <MenuItem value="General">General</MenuItem>
                <MenuItem value="Emergency">Emergency</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Template Content"
              multiline
              rows={4}
              value={templateForm.content}
              onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
              helperText="Use {variable_name} for dynamic content"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained">
            Create Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EnhancedSMS;
