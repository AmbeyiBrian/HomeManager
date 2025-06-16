import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const TicketDetailScreen = ({ route, navigation }) => {
  const { ticketId } = route.params;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [addingComment, setAddingComment] = useState(false);  const { isOffline, addTicketComment, fetchTicketById } = useAuth();
  
  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);
  
  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch ticket details from the API
      const response = await fetchTicketById(ticketId);
      
      if (response.success) {
        setTicket(response.data);
      } else {
        console.error('Failed to fetch ticket details:', response.error);
        Alert.alert('Error', 'Failed to load ticket details');
      }
        } catch (error) {
      console.error('Error fetching ticket details:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTicketDetails();
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#e74c3c';
      case 'in_progress': return '#f39c12';
      case 'pending': return '#3498db';
      case 'resolved': return '#2ecc71';
      default: return '#95a5a6';
    }
  };
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'resolved': return 'Resolved';
      default: return 'Unknown';
    }
  };
  
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'low': return 'arrow-down';
      case 'medium': return 'remove';
      case 'high': return 'arrow-up';
      case 'urgent': return 'alert-circle';
      default: return 'help-circle';
    }
  };
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#3498db';
      case 'medium': return '#f39c12';
      case 'high': return '#e74c3c';
      case 'urgent': return '#8e44ad';
      default: return '#95a5a6';
    }
  };
  
  const handleUpdateStatus = (newStatus) => {
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot update ticket status while offline.');
      return;
    }
    
    Alert.alert(
      'Update Status',
      `Are you sure you want to mark this ticket as ${getStatusLabel(newStatus)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: async () => {
            try {
              // TODO: Replace with actual API call
              // For demo, we'll just update the local state
              setTicket(prev => ({
                ...prev,
                status: newStatus,
                updated_at: new Date().toISOString()
              }));
              
              // Example of how the actual API call would look:
              /*
              const { updateTicketStatus } = useAuth();
              const response = await updateTicketStatus(ticketId, newStatus);
              
              if (response.success) {
                setTicket(prev => ({
                  ...prev,
                  status: newStatus,
                  updated_at: response.data.updated_at
                }));
              } else {
                Alert.alert('Error', 'Failed to update ticket status');
                console.error('Failed to update status:', response.error);
              }
              */
              
            } catch (error) {
              console.error('Error updating ticket status:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            }
          },
        },
      ]
    );
  };
    const handleAddComment = () => {
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot add comments while offline.');
      return;
    }
    
    // Open the comment modal
    setCommentText('');
    setCommentModalVisible(true);
  };
    const submitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }
    
    try {
      setAddingComment(true);
      
      // Call the updated API endpoint to add the comment
      const response = await addTicketComment(ticket.id, commentText.trim());
      
      if (response.success) {
        // Add the new comment to the ticket state
        const newComment = response.data;
        setTicket(prev => ({
          ...prev,
          comments: [
            ...prev.comments,
            {
              id: newComment.id || Date.now().toString(),
              // Map comment field from TicketComment to text field for the UI
              text: newComment.comment || commentText.trim(),
              created_at: newComment.created_at || new Date().toISOString(),
              user: {
                id: 'current_user',
                name: newComment.author_name || 'You'
              }
            }
          ]
        }));
        
        // Close the modal
        setCommentModalVisible(false);
        setCommentText('');
        
        // Refresh ticket details to ensure we have the latest data
        setTimeout(() => {
          fetchTicketDetails();
        }, 500);      } else {
        // Log the detailed error information
        console.error('Error details:', response.error);
        Alert.alert('Error', 
          typeof response.error === 'object' 
            ? JSON.stringify(response.error) 
            : (response.error || 'Failed to add comment')
        );
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Log more details about the error
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        Alert.alert('Error', JSON.stringify(error.response.data) || 'An unexpected error occurred');
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setAddingComment(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }
  
  if (!ticket) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>Could not load ticket</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTicketDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const formattedDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={["#3498db"]}
        />
      }
    >
      {/* Ticket Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.ticketTitle}>{ticket.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(ticket.status)}</Text>
          </View>
        </View>
        
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color="#7f8c8d" />
            <Text style={styles.metaText}>
              Reported: {formattedDate(ticket.created_at)}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name={getPriorityIcon(ticket.priority)} size={16} color={getPriorityColor(ticket.priority)} />
            <Text style={[styles.metaText, { color: getPriorityColor(ticket.priority) }]}>
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
            </Text>
          </View>
        </View>
      </View>
      
      {/* Location Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationInfo}>
          <Ionicons name="business-outline" size={18} color="#2c3e50" />
          <Text style={styles.locationText}>
            {ticket.property.name}, Unit {ticket.unit.unit_number}
          </Text>
        </View>
      </View>
      
      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{ticket.description}</Text>
      </View>
      
      {/* Images */}
      {ticket.images && ticket.images.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
            {ticket.images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image 
                  source={{ uri }} 
                  style={styles.ticketImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contacts</Text>
        
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <Ionicons name="person-outline" size={18} color="#2c3e50" />
            <Text style={styles.contactTitle}>Tenant</Text>
          </View>
          <Text style={styles.contactName}>{ticket.tenant.name}</Text>
          <TouchableOpacity style={styles.contactAction}>
            <Ionicons name="call-outline" size={16} color="#3498db" />
            <Text style={styles.contactActionText}>
              {ticket.tenant.phone_number}
            </Text>
          </TouchableOpacity>
        </View>
        
        {ticket.assignee && (
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Ionicons name="construct-outline" size={18} color="#2c3e50" />
              <Text style={styles.contactTitle}>Assigned To</Text>
            </View>
            <Text style={styles.contactName}>{ticket.assignee.name}</Text>
            <TouchableOpacity style={styles.contactAction}>
              <Ionicons name="call-outline" size={16} color="#3498db" />
              <Text style={styles.contactActionText}>
                {ticket.assignee.phone_number}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Comments */}
      <View style={styles.section}>
        <View style={styles.commentHeader}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment}>
            <Ionicons name="add-outline" size={18} color="#fff" />
            <Text style={styles.addCommentText}>Add Comment</Text>
          </TouchableOpacity>
        </View>
        
        {ticket.comments && ticket.comments.length > 0 ? (
          ticket.comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentUser}>{comment.user.name}</Text>
                <Text style={styles.commentDate}>{formattedDate(comment.created_at)}</Text>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noComments}>No comments yet</Text>
        )}
      </View>
        {/* Action Buttons */}
      {ticket.status !== 'resolved' && (
        <View style={styles.actionButtons}>
          <Text style={styles.actionLabel}>Update Status:</Text>
          <View style={styles.buttonRow}>
            {ticket.status !== 'in_progress' && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#f39c12' }]}
                onPress={() => handleUpdateStatus('in_progress')}
              >
                <Text style={styles.actionButtonText}>In Progress</Text>
              </TouchableOpacity>
            )}
            {ticket.status !== 'pending' && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#3498db' }]}
                onPress={() => handleUpdateStatus('pending')}
              >
                <Text style={styles.actionButtonText}>Pending</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#2ecc71' }]}
              onPress={() => handleUpdateStatus('resolved')}
            >
              <Text style={styles.actionButtonText}>Resolved</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Comment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={commentModalVisible}
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Comment</Text>
              <TouchableOpacity 
                onPress={() => setCommentModalVisible(false)}
                disabled={addingComment}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write your comment here..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                autoFocus
              />
              
              <TouchableOpacity 
                style={styles.submitCommentButton}
                onPress={submitComment}
                disabled={addingComment || !commentText.trim()}
              >
                {addingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.submitCommentText}>Submit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaInfo: {
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: '#34495e',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#34495e',
  },
  imageScrollView: {
    flexDirection: 'row',
  },
  imageContainer: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  ticketImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  contactCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 6,
  },
  contactName: {
    fontSize: 16,
    marginLeft: 24,
    color: '#2c3e50',
    marginBottom: 8,
  },
  contactAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 24,
  },
  contactActionText: {
    color: '#3498db',
    marginLeft: 6,
    fontSize: 14,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  addCommentText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
  },
  commentItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentUser: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#2c3e50',
  },
  commentDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#34495e',
  },
  noComments: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  actionButtons: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Comment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 25,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalBody: {
    padding: 20,
  },
  commentInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    paddingTop: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  submitCommentButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitCommentText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default TicketDetailScreen;
