import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
  Stack,
  Fab,
  Badge,
  LinearProgress,
  CardActions,
  Divider,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Notifications as NoticeIcon,
  Campaign as AnnouncementIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as UrgentIcon,
  CheckCircle as ReadIcon,  Schedule as ScheduledIcon,
  Send as SentIcon,
  Edit as DraftIcon,
  Archive as ArchivedIcon,
  Home as PropertyIcon,
  Room as UnitIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  DateRange as DateIcon,
  Timer as TimerIcon,
  FilterList as FilterIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Refresh as RefreshIcon,
  Download as ExportIcon,
  Send as SendIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Share as ShareIcon,
  Category as CategoryIcon,
  PriorityHigh as PriorityIcon,
  Publish as PublishIcon,
  Unarchive as UnarchiveIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { 
  noticesAPI, 
  propertiesAPI, 
  tenantsAPI, 
  unitsAPI,
  smsAPI,
  organizationsAPI 
} from '../services/api';
import EnhancedTable from '../components/EnhancedTable';

function EnhancedNoticeList() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [filteredNotices, setFilteredNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [recipientFilter, setRecipientFilter] = useState('all');
  
  // Reference data
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  
  // UI states
  const [viewMode, setViewMode] = useState('cards');
  const [selectedNotices, setSelectedNotices] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [activeTab, setActiveTab] = useState(0);
  
  // Statistics
  const [stats, setStats] = useState({
    totalNotices: 0,
    draftNotices: 0,
    sentNotices: 0,
    scheduledNotices: 0,
    readNotices: 0,
    urgentNotices: 0,
    todayNotices: 0,
    deliveryRate: 0
  });

  // Load all data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        noticesResponse,
        propertiesResponse,
        tenantsResponse,
        unitsResponse
      ] = await Promise.all([
        noticesAPI.getAll(),
        propertiesAPI.getAll(),
        tenantsAPI.getAll(),
        unitsAPI.getAll()
      ]);

      const noticesData = Array.isArray(noticesResponse.data) 
        ? noticesResponse.data 
        : noticesResponse.data?.results || [];
      
      const propertiesData = Array.isArray(propertiesResponse.data) 
        ? propertiesResponse.data 
        : propertiesResponse.data?.results || [];
      
      const tenantsData = Array.isArray(tenantsResponse.data) 
        ? tenantsResponse.data 
        : tenantsResponse.data?.results || [];
      
      const unitsData = Array.isArray(unitsResponse.data) 
        ? unitsResponse.data 
        : unitsResponse.data?.results || [];

      // Create lookup maps
      const tenantsMap = tenantsData.reduce((acc, tenant) => {
        acc[tenant.id] = tenant;
        return acc;
      }, {});

      const unitsMap = unitsData.reduce((acc, unit) => {
        acc[unit.id] = unit;
        return acc;
      }, {});

      const propertiesMap = propertiesData.reduce((acc, property) => {
        acc[property.id] = property;
        return acc;
      }, {});

      // Enhance notice data
      const enhancedNotices = noticesData.map(notice => {
        const recipients = [];
        
        // Process recipients based on notice target
        if (notice.target_tenants && Array.isArray(notice.target_tenants)) {
          notice.target_tenants.forEach(tenantId => {
            const tenant = tenantsMap[tenantId];
            if (tenant) {
              recipients.push({
                type: 'tenant',
                id: tenantId,
                name: `${tenant.first_name} ${tenant.last_name}`,
                email: tenant.email,
                phone: tenant.phone_number
              });
            }
          });
        }

        if (notice.target_properties && Array.isArray(notice.target_properties)) {
          notice.target_properties.forEach(propertyId => {
            const property = propertiesMap[propertyId];
            if (property) {
              // Add all tenants in this property
              const propertyTenants = tenantsData.filter(tenant => 
                unitsData.some(unit => 
                  unit.property === propertyId && 
                  unit.tenant === tenant.id
                )
              );
              propertyTenants.forEach(tenant => {
                if (!recipients.some(r => r.id === tenant.id && r.type === 'tenant')) {
                  recipients.push({
                    type: 'tenant',
                    id: tenant.id,
                    name: `${tenant.first_name} ${tenant.last_name}`,
                    email: tenant.email,
                    phone: tenant.phone_number,
                    property: property.name
                  });
                }
              });
            }
          });
        }

        return {
          ...notice,
          recipients,
          recipient_count: recipients.length,
          property_names: notice.target_properties?.map(id => propertiesMap[id]?.name).filter(Boolean) || [],
          tenant_names: notice.target_tenants?.map(id => {
            const tenant = tenantsMap[id];
            return tenant ? `${tenant.first_name} ${tenant.last_name}` : null;
          }).filter(Boolean) || []
        };
      });

      setNotices(enhancedNotices);
      setProperties(propertiesData);
      setTenants(tenantsData);
      setUnits(unitsData);
      
      // Calculate statistics
      calculateStats(enhancedNotices);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load notice data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (noticesData) => {
    const totalNotices = noticesData.length;
    const draftNotices = noticesData.filter(n => n.status === 'draft').length;
    const sentNotices = noticesData.filter(n => n.status === 'sent').length;
    const scheduledNotices = noticesData.filter(n => n.status === 'scheduled').length;
    const urgentNotices = noticesData.filter(n => n.priority === 'high' || n.priority === 'urgent').length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayNotices = noticesData.filter(n => 
      n.created_at && n.created_at.startsWith(today)
    ).length;

    const deliveryRate = sentNotices > 0 ? (sentNotices / totalNotices) * 100 : 0;

    setStats({
      totalNotices,
      draftNotices,
      sentNotices,
      scheduledNotices,
      urgentNotices,
      todayNotices,
      deliveryRate,
      readNotices: Math.floor(sentNotices * 0.75) // Estimate, would come from analytics
    });
  };

  // Apply filters
  useEffect(() => {
    let filtered = notices;

    // Tab filter
    switch (activeTab) {
      case 1: // Drafts
        filtered = filtered.filter(notice => notice.status === 'draft');
        break;
      case 2: // Sent
        filtered = filtered.filter(notice => notice.status === 'sent');
        break;
      case 3: // Scheduled
        filtered = filtered.filter(notice => notice.status === 'scheduled');
        break;
      case 4: // Archived
        filtered = filtered.filter(notice => notice.is_archived);
        break;
      default: // All
        break;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(notice =>
        notice.title?.toLowerCase().includes(searchLower) ||
        notice.content?.toLowerCase().includes(searchLower) ||
        notice.tenant_names?.some(name => name.toLowerCase().includes(searchLower)) ||
        notice.property_names?.some(name => name.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(notice => notice.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(notice => notice.notice_type === typeFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(notice => notice.priority === priorityFilter);
    }

    // Property filter
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(notice => 
        notice.target_properties?.includes(parseInt(propertyFilter))
      );
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(notice => 
        notice.created_at >= dateRange.from
      );
    }
    if (dateRange.to) {
      filtered = filtered.filter(notice => 
        notice.created_at <= dateRange.to
      );
    }

    setFilteredNotices(filtered);
    setCurrentPage(1);
  }, [notices, searchTerm, statusFilter, typeFilter, priorityFilter, propertyFilter, dateRange, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDeleteClick = (notice) => {
    setNoticeToDelete(notice);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!noticeToDelete) return;
    
    try {
      await noticesAPI.delete(noticeToDelete.id);
      setNotices(notices.filter(n => n.id !== noticeToDelete.id));
      setDeleteDialogOpen(false);
      setNoticeToDelete(null);
    } catch (err) {
      console.error('Error deleting notice:', err);
      setError('Failed to delete notice. Please try again.');
    }
  };

  const handleSendNotice = async (notice) => {
    try {
      await noticesAPI.send(notice.id);
      // Refresh data to get updated status
      await fetchData();
    } catch (err) {
      console.error('Error sending notice:', err);
      setError('Failed to send notice. Please try again.');
    }
  };

  const handleArchiveNotice = async (notice) => {
    try {
      await noticesAPI.archive(notice.id);
      await fetchData();
    } catch (err) {
      console.error('Error archiving notice:', err);
      setError('Failed to archive notice. Please try again.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <SentIcon color="success" />;
      case 'draft': return <DraftIcon color="warning" />;
      case 'scheduled': return <ScheduledIcon color="info" />;
      case 'archived': return <ArchivedIcon color="action" />;
      default: return <NoticeIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'success';
      case 'draft': return 'warning';
      case 'scheduled': return 'info';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'announcement': return <AnnouncementIcon />;
      case 'warning': return <WarningIcon />;
      case 'information': return <InfoIcon />;
      case 'urgent': return <UrgentIcon />;
      default: return <NoticeIcon />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
      case 'urgent': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination
  const paginatedNotices = filteredNotices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredNotices.length / itemsPerPage);

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <NoticeIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{stats.totalNotices}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Notices
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <SentIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{stats.sentNotices}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sent Notices
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <DraftIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{stats.draftNotices}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Draft Notices
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                <UrgentIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{stats.urgentNotices}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Urgent Notices
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTabs = () => (
    <Paper sx={{ mb: 3 }}>
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label={`All (${notices.length})`} />
        <Tab label={`Drafts (${stats.draftNotices})`} />
        <Tab label={`Sent (${stats.sentNotices})`} />
        <Tab label={`Scheduled (${stats.scheduledNotices})`} />
        <Tab label="Archived" />
      </Tabs>
    </Paper>
  );

  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search notices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="announcement">Announcement</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="information">Information</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={priorityFilter}
              label="Priority"
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <MenuItem value="all">All Priorities</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Property</InputLabel>
            <Select
              value={propertyFilter}
              label="Property"
              onChange={(e) => setPropertyFilter(e.target.value)}
            >
              <MenuItem value="all">All Properties</MenuItem>
              {properties.map((property) => (
                <MenuItem key={property.id} value={property.id.toString()}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
              color="primary"
            >
              {viewMode === 'cards' ? <ViewListIcon /> : <ViewModuleIcon />}
            </IconButton>
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
            <IconButton color="primary">
              <ExportIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>
      
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="From Date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="To Date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>
    </Paper>
  );

  const renderNoticeCards = () => (
    <Grid container spacing={2}>
      {paginatedNotices.map((notice) => (
        <Grid item xs={12} sm={6} md={4} key={notice.id}>
          <Card sx={{ height: '100%', position: 'relative' }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: getStatusColor(notice.status) + '.main' }}>
                  {getStatusIcon(notice.status)}
                </Avatar>
              }
              action={
                <Box>
                  <IconButton size="small" onClick={() => navigate(`/notices/${notice.id}`)}>
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => navigate(`/notices/${notice.id}/edit`)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteClick(notice)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
              title={
                <Typography variant="h6" noWrap>
                  {notice.title}
                </Typography>
              }
              subheader={
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    label={notice.status}
                    color={getStatusColor(notice.status)}
                    size="small"
                  />
                  <Chip
                    label={notice.priority}
                    color={getPriorityColor(notice.priority)}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              }
            />
            
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {notice.content?.substring(0, 150)}
                {notice.content?.length > 150 && '...'}
              </Typography>
              
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getTypeIcon(notice.notice_type)}
                  <Typography variant="body2">
                    {notice.notice_type?.replace('_', ' ')?.toUpperCase() || 'GENERAL'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {notice.recipient_count} recipients
                  </Typography>
                </Box>
                
                {notice.property_names.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PropertyIcon fontSize="small" color="action" />
                    <Typography variant="body2" noWrap>
                      {notice.property_names.slice(0, 2).join(', ')}
                      {notice.property_names.length > 2 && ` +${notice.property_names.length - 2}`}
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DateIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {formatDate(notice.created_at)}
                  </Typography>
                </Box>
                
                {notice.scheduled_at && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimerIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Scheduled: {formatDate(notice.scheduled_at)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
            
            <CardActions>
              {notice.status === 'draft' && (
                <Button 
                  size="small" 
                  startIcon={<SendIcon />}
                  onClick={() => handleSendNotice(notice)}
                >
                  Send
                </Button>
              )}
              <Button size="small" startIcon={<ShareIcon />}>
                Share
              </Button>
              {!notice.is_archived && (
                <Button 
                  size="small" 
                  startIcon={<ArchivedIcon />}
                  onClick={() => handleArchiveNotice(notice)}
                >
                  Archive
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const tableColumns = [
    {
      id: 'title',
      label: 'Title',
      minWidth: 200
    },
    {
      id: 'notice_type',
      label: 'Type',
      minWidth: 120,
      format: (value) => value?.replace('_', ' ')?.toUpperCase() || 'GENERAL'
    },
    {
      id: 'priority',
      label: 'Priority',
      minWidth: 100,
      format: (value) => (
        <Chip label={value} color={getPriorityColor(value)} size="small" />
      )
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      format: (value) => (
        <Chip label={value} color={getStatusColor(value)} size="small" />
      )
    },
    {
      id: 'recipient_count',
      label: 'Recipients',
      minWidth: 100
    },
    {
      id: 'created_at',
      label: 'Created',
      minWidth: 150,
      format: formatDate
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 200,
      format: (value, row) => (
        <Box>
          <IconButton size="small" onClick={() => navigate(`/notices/${row.id}`)}>
            <VisibilityIcon />
          </IconButton>
          <IconButton size="small" onClick={() => navigate(`/notices/${row.id}/edit`)}>
            <EditIcon />
          </IconButton>
          {row.status === 'draft' && (
            <IconButton size="small" onClick={() => handleSendNotice(row)}>
              <SendIcon />
            </IconButton>
          )}
          <IconButton size="small" onClick={() => handleDeleteClick(row)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Notices</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Notice Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/notices/new')}
          >
            Create Notice
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {renderStatsCards()}

      {/* Tabs */}
      {renderTabs()}

      {/* Filters */}
      {renderFilters()}

      {/* Results Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {paginatedNotices.length} of {filteredNotices.length} notices
        {searchTerm && ` matching "${searchTerm}"`}
      </Typography>

      {/* Notice List */}
      {viewMode === 'cards' ? (
        renderNoticeCards()
      ) : (
        <EnhancedTable
          data={paginatedNotices}
          columns={tableColumns}
          onRowClick={(notice) => navigate(`/notices/${notice.id}`)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Page {currentPage} of {totalPages}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="create notice"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/notices/new')}
      >
        <AddIcon />
      </Fab>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Notice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this notice? This action cannot be undone.
          </Typography>
          {noticeToDelete && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Title: {noticeToDelete.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recipients: {noticeToDelete.recipient_count}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default EnhancedNoticeList;
