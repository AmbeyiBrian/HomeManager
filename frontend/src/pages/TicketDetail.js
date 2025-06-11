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
  Grid,
  Paper,
  Divider,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Comment as CommentIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { maintenanceAPI } from '../services/api';

function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  
  // Load ticket details
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await maintenanceAPI.getTicketById(id);
        setTicket(response.data);
      } catch (err) {
        console.error('Error fetching ticket details:', err);
        setError('Failed to load ticket details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchTicket();
    }
  }, [id]);
  
  // Load ticket comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setCommentsLoading(true);
        
        const response = await maintenanceAPI.getTicketComments(id);
        
        // Make sure comments is always an array
        const data = Array.isArray(response.data) ? response.data : 
                    Array.isArray(response.data.results) ? response.data.results : [];
        setComments(data);
      } catch (err) {
        console.error('Error fetching comments:', err);
        // Don't show an error for comments, just set empty array
        setComments([]); 
      } finally {
        setCommentsLoading(false);
      }
    };
    
    if (id) {
      fetchComments();
    }
  }, [id]);
  
  const handleStatusChange = async (event) => {
    const newStatus = event.target.value;
    
    if (!ticket || ticket.status === newStatus) return;
    
    try {
      setStatusUpdateLoading(true);
      
      const response = await maintenanceAPI.updateTicket(id, {
        status: newStatus
      });
      
      setTicket(response.data);
    } catch (err) {
      console.error('Error updating ticket status:', err);
      setError('Failed to update ticket status. Please try again.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const response = await maintenanceAPI.addTicketComment({
        content: newComment,
        ticket: id
      });
      
      // Add new comment to the list
      setComments([...comments, response.data]);
      
      // Clear input
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    }
  };
  
  // Get color for status chip
  const getStatusColor = (status) => {
    switch(status) {
      case 'new':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Format status for display
  const formatStatus = (status) => {
    switch(status) {
      case 'new':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status || 'Unknown';
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          component={RouterLink}
          to="/tickets"
        >
          Back to Tickets
        </Button>
      </Container>
    );
  }
  
  if (!ticket) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Ticket not found.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          component={RouterLink}
          to="/tickets"
        >
          Back to Tickets
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Ticket #{ticket.id}
          </Typography>
          
          <Box>
            <Button
              startIcon={<ArrowBackIcon />}
              component={RouterLink}
              to="/tickets"
              variant="outlined"
            >
              Back to Tickets
            </Button>
          </Box>
        </Box>
        
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/tickets" underline="hover" color="inherit">
            Maintenance
          </Link>
          <Typography color="text.primary">Ticket #{ticket.id}</Typography>
        </Breadcrumbs>
      </Box>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {ticket.issue || 'No issue specified'}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                  label={formatStatus(ticket.status)}
                  color={getStatusColor(ticket.status)}
                  size="small"
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  {ticket.created_at
                    ? `Reported on ${new Date(ticket.created_at).toLocaleString()}`
                    : 'Date unknown'
                  }
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                {ticket.description || 'No description provided.'}
              </Typography>
              
              {ticket.photos && ticket.photos.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Photos
                  </Typography>
                  <Grid container spacing={2}>
                    {ticket.photos.map((photo, index) => (
                      <Grid item xs={6} sm={4} key={index}>
                        <img
                          src={photo.image || photo}
                          alt={`Ticket photo ${index + 1}`}
                          style={{ width: '100%', height: 'auto', borderRadius: 4 }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Comments
                </Typography>
                
                {commentsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : !Array.isArray(comments) || comments.length === 0 ? (
                  <Typography color="text.secondary">
                    No comments yet. Be the first to add a comment.
                  </Typography>
                ) : (
                  <List>
                    {comments.map((comment) => (
                      <ListItem
                        key={comment.id || Math.random()}
                        alignItems="flex-start"
                        divider
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary">
                                {comment.user_details?.name || comment.user_details?.username || 'Unknown User'}
                              </Typography>
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                              </Typography>
                            </>
                          }
                          secondary={comment.content}
                          secondaryTypographyProps={{ sx: { whiteSpace: 'pre-wrap' } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                
                <Box sx={{ display: 'flex', mt: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Add a comment..."
                    variant="outlined"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <IconButton 
                    color="primary"
                    onClick={handleAddComment} 
                    disabled={!newComment.trim()}
                    sx={{ ml: 1, alignSelf: 'flex-end' }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          {/* Ticket Information Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ticket Information
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={ticket.status || ''}
                    onChange={handleStatusChange}
                    label="Status"
                    disabled={statusUpdateLoading}
                  >
                    <MenuItem value="new">New</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Priority
                </Typography>
                <Typography variant="body1">
                  {ticket.priority ? (
                    <Chip 
                      label={ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} 
                      color={
                        ticket.priority === 'high' ? 'error' :
                        ticket.priority === 'medium' ? 'warning' : 'default'
                      }
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    'Normal'
                  )}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1">
                  {ticket.unit_details ? (
                    <>
                      Unit {ticket.unit_details.unit_number || 'Unknown'}
                      {ticket.unit_details.property_details && (
                        <Box component="span" display="block" mt={0.5} color="text.secondary">
                          {ticket.unit_details.property_details.name || 'Unknown Property'}
                        </Box>
                      )}
                    </>
                  ) : (
                    'Unknown'
                  )}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Reported By
                </Typography>
                <Typography variant="body1">
                  {ticket.tenant_details ? (
                    <>
                      {`${ticket.tenant_details.first_name || ''} ${ticket.tenant_details.last_name || ''}`.trim() || 'Unnamed Tenant'}
                      {ticket.tenant_details.email && (
                        <Box component="span" display="block" mt={0.5} color="text.secondary">
                          {ticket.tenant_details.email}
                        </Box>
                      )}
                    </>
                  ) : (
                    'Unknown'
                  )}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Dates
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  <strong>Created:</strong> {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'Unknown'}
                </Typography>
                {ticket.updated_at && (
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    <strong>Last Updated:</strong> {new Date(ticket.updated_at).toLocaleString()}
                  </Typography>
                )}
                {ticket.completed_at && (
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    <strong>Completed:</strong> {new Date(ticket.completed_at).toLocaleString()}
                  </Typography>
                )}
              </Box>
              
              {ticket.maintenance_staff && (
                <>
                  <Divider sx={{ my: 2 }} />
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Assigned To
                    </Typography>
                    <Typography variant="body1">
                      {ticket.maintenance_staff.name || 'Unnamed Staff'}
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<CommentIcon />}
              sx={{ mb: 1 }}
            >
              Contact Tenant
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<EditIcon />}
              sx={{ mb: 1 }}
            >
              Edit Ticket
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default TicketDetail;
