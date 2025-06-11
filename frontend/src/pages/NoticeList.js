import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Grid,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  FormControlLabel,
  Checkbox,
  Pagination,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Send as SendIcon,
  Sort as SortIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { noticesAPI, propertiesAPI, unitsAPI } from '../services/api';

function NoticeList() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at', 'start_date', 'title'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [properties, setProperties] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10); // Fixed page size matching backend
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);  const [noticeFormData, setNoticeFormData] = useState({
    title: '',
    content: '',
    notice_type: 'general',
    properties: [],
    units: [],
    recipients: 'all', // 'all', 'property', 'unit'
    send_sms: true,
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_important: false
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    notice_type: 'general',
    properties: [],
    units: [],
    recipients: 'all',
    send_sms: true,
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_important: false
  });
  // Load notices with pagination
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine status filter based on selected tab
        let statusFilter = null;
        if (selectedTab === 1) statusFilter = 'active';
        else if (selectedTab === 2) statusFilter = 'upcoming';
        else if (selectedTab === 3) statusFilter = 'archived';
        
        const response = await noticesAPI.getAll(currentPage, pageSize, statusFilter, searchTerm);
        
        // Handle paginated response
        if (response.data && typeof response.data === 'object' && response.data.results) {
          // This is a paginated response
          setNotices(response.data.results || []);
          setTotalCount(response.data.count || 0);
          setTotalPages(Math.ceil((response.data.count || 0) / pageSize));
        } else {
          // This is a direct array response (fallback)
          const data = Array.isArray(response.data) ? response.data : [];
          setNotices(data);
          setTotalCount(data.length);
          setTotalPages(1);
        }
      } catch (err) {
        console.error('Error fetching notices:', err);
        setError('Failed to load notices. Please try again later.');
        setNotices([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotices();
  }, [currentPage, pageSize, selectedTab, searchTerm]); // Re-fetch when page, tab, or search changes

    // Load properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await propertiesAPI.getAll();
        
        // Make sure properties is always an array
        const props = Array.isArray(response.data) ? response.data : 
                      Array.isArray(response.data.results) ? response.data.results : [];
        setProperties(props);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setProperties([]); // Ensure properties is always an array even on error
      }
    };
    
    fetchProperties();
  }, []);
    const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setCurrentPage(1); // Reset to first page when changing tabs
  };
  
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };
    const handleDeleteClick = (notice) => {
    setSelectedNotice(notice);
    setConfirmDeleteOpen(true);
  };  const handleEditClick = (notice) => {
    setSelectedNotice(notice);
    setEditFormData({
      title: notice.title || '',
      content: notice.content || '',
      notice_type: notice.notice_type || 'general',
      properties: notice.property ? [notice.property] : [],
      units: [],
      recipients: notice.property ? 'property' : 'all',
      send_sms: true,
      effective_date: notice.start_date ? notice.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
      end_date: notice.end_date ? notice.end_date.split('T')[0] : '',
      is_important: notice.is_important || false
    });
    setEditDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!selectedNotice) return;
    
    try {
      await noticesAPI.delete(selectedNotice.id);
      
      // Update the notices list
      setNotices(notices.filter(notice => notice.id !== selectedNotice.id));
      
    } catch (err) {
      console.error('Error deleting notice:', err);
      setError('Failed to delete notice. Please try again.');
    } finally {
      setConfirmDeleteOpen(false);
      setSelectedNotice(null);
    }
  };
  const handleArchiveToggle = async (notice) => {
    try {
      setError(null);
      
      // Toggle the archive status
      const updatedData = {
        ...notice,
        is_archived: !notice.is_archived
      };
      
      // Remove computed fields that shouldn't be sent to the API
      delete updatedData.status;
      delete updatedData.recipients_count;
      
      const response = await noticesAPI.update(notice.id, updatedData);
      
      // Update the notice in the list
      setNotices(notices.map(n => 
        n.id === notice.id ? response.data : n
      ));
      
      // If we're on the archived tab and unarchiving, or on another tab and archiving,
      // the notice will disappear from the current view due to server-side filtering
      // So we may want to refresh the data
      if ((selectedTab === 3 && !notice.is_archived) || (selectedTab !== 3 && notice.is_archived)) {
        // Refresh the notices to update the view
        setTimeout(() => {
          setCurrentPage(1); // This will trigger a refresh
        }, 100);
      }
      
    } catch (err) {
      console.error('Error toggling archive status:', err);
      setError(`Failed to ${notice.is_archived ? 'unarchive' : 'archive'} notice. Please try again.`);
    }
  };

  const handleResendSms = async (notice) => {
    try {
      setError(null);
      
      await noticesAPI.resendSms(notice.id);
      
      // Show success message (you might want to add a success state)
      console.log('SMS notifications sent successfully');
      
    } catch (err) {
      console.error('Error resending SMS:', err);
      setError('Failed to resend SMS notifications. Please try again.');
    }
  };
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNoticeFormData({
      ...noticeFormData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: type === 'checkbox' ? checked : value
    });
  };  const handleCreateNotice = async () => {
    try {      // Prepare data for API - convert form data to match the API model
      const apiData = {
        title: noticeFormData.title,
        content: noticeFormData.content,
        start_date: noticeFormData.effective_date, // Map effective_date to start_date
        end_date: noticeFormData.end_date || null, // Include end_date if provided
        is_important: noticeFormData.is_important, // Use the checkbox value
        notice_type: noticeFormData.notice_type, // Include notice_type field
        send_sms: noticeFormData.send_sms, // Include SMS notification flag
      };
      
      // Handle property selection based on recipients
      if (noticeFormData.recipients === 'property' && noticeFormData.properties.length > 0) {
        apiData.property = noticeFormData.properties[0]; // Set the first selected property
      } else if (noticeFormData.recipients === 'unit' && noticeFormData.units.length > 0) {
        // For unit selection, we need to find the property that contains this unit
        // This is a simple implementation - ideally we'd have unit->property mapping in the state
        const propertyId = properties[0]?.id;
        if (propertyId) {
          apiData.property = propertyId;
        } else {
          throw new Error('No property available for this notice');
        }
      } else {
        // Default to first property if no specific selection
        const propertyId = properties[0]?.id;
        if (propertyId) {
          apiData.property = propertyId;
        } else {
          throw new Error('No property available for this notice');
        }
      }
      
      console.log('Sending notice data to API:', apiData);
      const response = await noticesAPI.create(apiData);
      
      // Add new notice to the list
      setNotices([...notices, response.data]);
        // Close dialog and reset form
      setAddDialogOpen(false);      setNoticeFormData({
        title: '',
        content: '',
        notice_type: 'general',
        properties: [],
        units: [],
        recipients: 'all',
        send_sms: true,
        effective_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_important: false
      });
      
    } catch (err) {
      console.error('Error creating notice:', err);
      setError('Failed to create notice. Please try again.');
    }
  };

  const handleUpdateNotice = async () => {
    if (!selectedNotice) return;
    
    try {      // Prepare data for API - convert form data to match the API model
      const apiData = {
        title: editFormData.title,
        content: editFormData.content,
        start_date: editFormData.effective_date, // Map effective_date to start_date
        end_date: editFormData.end_date || null, // Include end_date if provided
        is_important: editFormData.is_important, // Use the checkbox value
        notice_type: editFormData.notice_type,
      };
      
      // Handle property selection based on recipients
      if (editFormData.recipients === 'property' && editFormData.properties.length > 0) {
        apiData.property = editFormData.properties[0]; // Set the first selected property
      } else if (editFormData.recipients === 'unit' && editFormData.units.length > 0) {
        // For unit selection, we need to find the property that contains this unit
        const propertyId = properties[0]?.id;
        if (propertyId) {
          apiData.property = propertyId;
        } else {
          throw new Error('No property available for this notice');
        }
      } else {
        // Default to first property if no specific selection
        const propertyId = properties[0]?.id;
        if (propertyId) {
          apiData.property = propertyId;
        } else {
          throw new Error('No property available for this notice');
        }
      }
      
      console.log('Updating notice data:', apiData);
      const response = await noticesAPI.update(selectedNotice.id, apiData);
      
      // Update the notice in the list
      setNotices(notices.map(notice => 
        notice.id === selectedNotice.id ? response.data : notice
      ));
        // Close dialog and reset form
      setEditDialogOpen(false);
      setSelectedNotice(null);      setEditFormData({
        title: '',
        content: '',
        notice_type: 'general',
        properties: [],
        units: [],
        recipients: 'all',
        send_sms: true,
        effective_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_important: false
      });
      
    } catch (err) {
      console.error('Error updating notice:', err);
      setError('Failed to update notice. Please try again.');
    }
  };
    // Helper function to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Helper function to get notice type from backend
  const getNoticeType = (notice) => {
    // If notice_type exists, use it; otherwise determine from is_important
    if (notice.notice_type) return notice.notice_type;
    return notice.is_important ? 'important' : 'general';
  };

  // Filter and sort notices  // Since we're using server-side filtering and pagination, just apply sorting to the current page results
  const getSortedNotices = () => {
    const sorted = [...notices];
    
    // Apply client-side sorting to current page results
    sorted.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'start_date':
          aValue = new Date(a.start_date || 0);
          bValue = new Date(b.start_date || 0);
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
      }
      
      let comparison = 0;
      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }
      
      return sortOrder === 'desc' ? comparison * -1 : comparison;
    });
    
    return sorted;
  };
  
  const sortedNotices = getSortedNotices();
    // Format notice type for display
  const formatNoticeType = (notice) => {
    const type = getNoticeType(notice);
    switch(type) {
      case 'general':
        return 'General';
      case 'rent':
        return 'Rent';
      case 'maintenance':
        return 'Maintenance';
      case 'eviction':
        return 'Eviction';
      case 'inspection':
        return 'Inspection';
      case 'important':
        return 'Important';
      default:
        return type || 'General';
    }
  };
  
  // Get color for notice type chip
  const getNoticeTypeColor = (notice) => {
    const type = getNoticeType(notice);
    switch(type) {
      case 'general':
        return 'default';
      case 'rent':
        return 'primary';
      case 'maintenance':
        return 'info';
      case 'eviction':
        return 'error';
      case 'inspection':
        return 'warning';
      case 'important':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Notices & Announcements
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Notices</Typography>
        </Breadcrumbs>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          aria-label="notice tabs"
        >
          <Tab label="All" />
          <Tab label="Active" />
          <Tab label="Upcoming" />
          <Tab label="Archived" />
        </Tabs>
      </Box>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search notices..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort by"
            >
              <MenuItem value="created_at">Created Date</MenuItem>
              <MenuItem value="start_date">Effective Date</MenuItem>
              <MenuItem value="title">Title</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              label="Order"
            >
              <MenuItem value="desc">Newest</MenuItem>
              <MenuItem value="asc">Oldest</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Create Notice
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : !Array.isArray(sortedNotices) || sortedNotices.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Notices Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {searchTerm || selectedTab !== 0
              ? 'No notices match your current filters. Try changing your search or filters.'
              : 'No notices have been created yet.'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Create First Notice
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {sortedNotices.map(notice => (
            <Grid item xs={12} sm={6} md={4} key={notice.id || Math.random()}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column' 
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={formatNoticeType(notice)}
                        color={getNoticeTypeColor(notice)}
                        size="small"
                      />
                      {notice.is_archived && (
                        <Chip
                          label="Archived"
                          color="default"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Box>
                    <Box>
                      <IconButton 
                        size="small" 
                        onClick={() => handleArchiveToggle(notice)}
                        title={notice.is_archived ? 'Unarchive notice' : 'Archive notice'}
                      >
                        {notice.is_archived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteClick(notice)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEditClick(notice)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography variant="h6" component="h2" gutterBottom>
                    {notice.title || 'Untitled Notice'}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {notice.content || 'No content'}
                  </Typography>                  <Box sx={{ mt: 'auto', pt: 2 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Effective Date: {formatDate(notice.start_date)}
                    </Typography>
                    
                    {notice.end_date && (
                      <Typography variant="caption" display="block" gutterBottom>
                        End Date: {formatDate(notice.end_date)}
                      </Typography>
                    )}
                    
                    <Typography variant="caption" display="block" color="text.secondary">
                      Created: {formatDate(notice.created_at)}
                    </Typography>
                    
                    {notice.recipients_count !== undefined && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Sent to {notice.recipients_count} tenants
                      </Typography>
                    )}
                  </Box>
                </CardContent>                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    sx={{ mr: 1 }}
                  >
                    View
                  </Button>
                  
                  <Button
                    size="small"
                    startIcon={<SendIcon />}
                    color="primary"
                    onClick={() => handleResendSms(notice)}
                  >
                    Resend SMS
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}        </Grid>
      )}
      
      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Stack spacing={2} alignItems="center" sx={{ mt: 4, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} notices
          </Typography>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Stack>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the notice "{selectedNotice?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Create Notice Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Notice</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Notice Title"
                fullWidth
                value={noticeFormData.title}
                onChange={handleFormChange}
                required
              />
            </Grid>
              <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Notice Type</InputLabel>
                <Select
                  name="notice_type"
                  value={noticeFormData.notice_type}
                  onChange={handleFormChange}
                  label="Notice Type"
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="rent">Rent</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="inspection">Inspection</MenuItem>
                  <MenuItem value="eviction">Eviction</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="is_important"
                    checked={noticeFormData.is_important}
                    onChange={handleFormChange}
                    color="primary"
                  />
                }
                label="Mark as Important"
                sx={{ mt: 2 }}
              />
            </Grid>
              <Grid item xs={12} sm={6}>
              <TextField
                name="effective_date"
                label="Effective Date"
                type="date"
                fullWidth
                value={noticeFormData.effective_date}
                onChange={handleFormChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="end_date"
                label="End Date (Optional)"
                type="date"
                fullWidth
                value={noticeFormData.end_date}
                onChange={handleFormChange}
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="Leave blank if notice has no end date"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Recipients</InputLabel>
                <Select
                  name="recipients"
                  value={noticeFormData.recipients}
                  onChange={handleFormChange}
                  label="Recipients"
                >
                  <MenuItem value="all">All Tenants</MenuItem>
                  <MenuItem value="property">Select Properties</MenuItem>
                  <MenuItem value="unit">Select Units</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {noticeFormData.recipients === 'property' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Properties</InputLabel>
                  <Select
                    multiple
                    name="properties"
                    value={noticeFormData.properties}
                    onChange={handleFormChange}
                    label="Select Properties"
                    renderValue={(selected) => selected
                      .map(id => properties.find(p => p.id === id)?.name || id)
                      .join(', ')
                    }
                  >
                    {properties.map(property => (
                      <MenuItem key={property.id} value={property.id}>
                        {property.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                name="content"
                label="Notice Content"
                multiline
                rows={5}
                fullWidth
                value={noticeFormData.content}
                onChange={handleFormChange}
                required
              />
            </Grid>
              <Grid item xs={12}>
              <FormControl>
                <Typography variant="body2" gutterBottom>
                  Send SMS notification to tenants:
                </Typography>
                <Select
                  name="send_sms"
                  value={noticeFormData.send_sms}
                  onChange={handleFormChange}
                  size="small"
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </Grid></Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateNotice}
            variant="contained"
            disabled={!noticeFormData.title || !noticeFormData.content}
          >
            Create Notice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Notice Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Notice</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Notice Title"
                fullWidth
                value={editFormData.title}
                onChange={handleEditFormChange}
                required
              />
            </Grid>
              <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Notice Type</InputLabel>
                <Select
                  name="notice_type"
                  value={editFormData.notice_type}
                  onChange={handleEditFormChange}
                  label="Notice Type"
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="rent">Rent</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="inspection">Inspection</MenuItem>
                  <MenuItem value="eviction">Eviction</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="is_important"
                    checked={editFormData.is_important}
                    onChange={handleEditFormChange}
                    color="primary"
                  />
                }
                label="Mark as Important"
                sx={{ mt: 2 }}
              />
            </Grid>
              <Grid item xs={12} sm={6}>
              <TextField
                name="effective_date"
                label="Effective Date"
                type="date"
                fullWidth
                value={editFormData.effective_date}
                onChange={handleEditFormChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="end_date"
                label="End Date (Optional)"
                type="date"
                fullWidth
                value={editFormData.end_date}
                onChange={handleEditFormChange}
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="Leave blank if notice has no end date"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Recipients</InputLabel>
                <Select
                  name="recipients"
                  value={editFormData.recipients}
                  onChange={handleEditFormChange}
                  label="Recipients"
                >
                  <MenuItem value="all">All Tenants</MenuItem>
                  <MenuItem value="property">Select Properties</MenuItem>
                  <MenuItem value="unit">Select Units</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {editFormData.recipients === 'property' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Properties</InputLabel>
                  <Select
                    multiple
                    name="properties"
                    value={editFormData.properties}
                    onChange={handleEditFormChange}
                    label="Select Properties"
                    renderValue={(selected) => selected
                      .map(id => properties.find(p => p.id === id)?.name || id)
                      .join(', ')
                    }
                  >
                    {properties.map(property => (
                      <MenuItem key={property.id} value={property.id}>
                        {property.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                name="content"
                label="Notice Content"
                multiline
                rows={5}
                fullWidth
                value={editFormData.content}
                onChange={handleEditFormChange}
                required
              />
            </Grid>
              <Grid item xs={12}>
              <FormControl>
                <Typography variant="body2" gutterBottom>
                  Send SMS notification to tenants:
                </Typography>
                <Select
                  name="send_sms"
                  value={editFormData.send_sms}
                  onChange={handleEditFormChange}
                  size="small"
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateNotice}
            variant="contained"
            disabled={!editFormData.title || !editFormData.content}
          >
            Update Notice
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default NoticeList;
