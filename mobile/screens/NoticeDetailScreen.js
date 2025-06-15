import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import NoticeQuickActions from '../components/NoticeQuickActions';

const NoticeDetailScreen = ({ route, navigation }) => {
  const { noticeId } = route.params;
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get the API functions from AuthContext
  const { fetchNoticeDetails, deleteNotice, updateNotice, isOffline } = useAuth();
  
  // Helper function to get icon name based on notice type
  const getIconNameByNoticeType = (noticeType) => {
    switch (noticeType) {
      case 'maintenance':
        return 'build-outline';
      case 'rent':
        return 'cash-outline';
      case 'inspection':
        return 'clipboard-outline';
      case 'event':
        return 'calendar-outline';
      case 'emergency':
        return 'alert-circle-outline';
      case 'policy':
        return 'document-text-outline';
      case 'eviction':
        return 'exit-outline';
      case 'amenities':
        return 'fitness-outline';
      case 'utility':
        return 'flash-outline';
      case 'general':
      default:
        return 'megaphone-outline';
    }
  };
  
  const loadNoticeDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNoticeDetails(noticeId);
      if (result.success) {
        setNotice(result.data);
        navigation.setOptions({ title: result.data.title || 'Notice Details' });
        
        if (result.fromCache && !isOffline) {
          setError('Using cached data. Some information may be outdated.');
        }
      } else {
        setError(result.error || 'Notice not found.');
      }
    } catch (e) {
      console.error("Failed to fetch notice details:", e);
      setError('Failed to load notice details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [noticeId, navigation, fetchNoticeDetails, isOffline]);
  
  useFocusEffect(
    useCallback(() => {
      loadNoticeDetails();
    }, [loadNoticeDetails])
  );
  
  const handleDeleteNotice = async () => {
    if (isOffline) {
      Alert.alert("Cannot Delete While Offline", "Please reconnect to the internet and try again.");
      return;
    }
    
    Alert.alert(
      "Delete Notice",
      "Are you sure you want to delete this notice? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: async () => {
            setIsDeleting(true);
            try {
              const result = await deleteNotice(noticeId);
              if (result.success) {
                Alert.alert("Success", "Notice deleted successfully.");
                navigation.goBack();
              } else {
                Alert.alert("Error", result.error || "Failed to delete notice. Please try again.");
              }
            } catch (e) {
              console.error("Failed to delete notice:", e);
              Alert.alert("Error", "An unexpected error occurred. Please try again.");
            } finally {
              setIsDeleting(false);
            }
          }, 
          style: "destructive" 
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text>Loading notice details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadNoticeDetails} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!notice) {
    // This case should ideally be handled by the error state if notice not found
    return (
      <View style={styles.centered}>
        <Text>Notice not found.</Text>
      </View>
    );
  }
  // Handle notice update from quick actions
  const handleNoticeUpdate = (updatedNotice) => {
    setNotice(updatedNotice);
  };
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format date with time for timestamps
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {notice.is_important && <Ionicons name="alert-circle" size={28} color="red" style={styles.icon} />}
        <Text style={styles.title}>{notice.title}</Text>
      </View>
      
      <View style={styles.quickActionsContainer}>
        <NoticeQuickActions 
          notice={notice} 
          onActionComplete={handleNoticeUpdate} 
          large
        />
      </View>
        <View style={styles.detailSection}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color="#555" style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Date Posted:</Text>
          <Text style={styles.detailText}>{formatDateTime(notice.created_at)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons 
            name={getIconNameByNoticeType(notice.notice_type)} 
            size={20} color="#555" style={styles.detailIcon} 
          />
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailText}>
            {notice.notice_type_display || 
             notice.notice_type.charAt(0).toUpperCase() + notice.notice_type.slice(1)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={20} color="#555" style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Created By:</Text>
          <Text style={styles.detailText}>{notice.creator_name || 'Unknown'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={20} color="#555" style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Property:</Text>
          <Text style={styles.detailText}>{notice.property_name || 'Unknown'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color="#555" style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Start Date:</Text>
          <Text style={styles.detailText}>{formatDate(notice.start_date)}</Text>
        </View>

        {notice.end_date && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#555" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>End Date:</Text>
            <Text style={styles.detailText}>{formatDate(notice.end_date)}</Text>
          </View>
        )}

        {notice.is_archived && (
          <View style={styles.archiveBadge}>
            <Ionicons name="archive" size={16} color="#777" style={{marginRight: 5}} />
            <Text style={styles.archiveText}>Archived</Text>
          </View>
        )}
      </View>
      
    <View style={styles.contentContainer}>
        <Text style={styles.contentHeader}>Details:</Text>
        <Text style={styles.content}>{notice.content}</Text>
      </View>
      
      {notice.views && notice.views.length > 0 && (
        <View style={styles.viewedByContainer}>
          <View style={styles.viewHeaderRow}>
            <Ionicons name="eye-outline" size={20} color="#555" style={{marginRight: 10}} />
            <Text style={styles.viewedByHeader}>Viewed By ({notice.views.length}):</Text>
          </View>
          
          {notice.views.map(view => (
            <View key={view.id} style={styles.viewItem}>
              <Ionicons name="checkmark-circle" size={16} color="#28a745" style={{marginRight: 8}} />
              <Text style={styles.viewedByText}>{view.tenant_name || 'Unnamed User'}</Text>
              <Text style={styles.viewedAtText}>
                {formatDateTime(view.viewed_at)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => navigation.navigate('EditNotice', { noticeId: notice.id })}
          disabled={isDeleting} // Disable if deleting
        >
          <Ionicons name="pencil-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton, isDeleting && styles.disabledButton]}
          onPress={handleDeleteNotice}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" style={{marginRight: 8}}/>
          ) : (
            <Ionicons name="trash-outline" size={20} color="white" />
          )}
          <Text style={styles.actionButtonText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  icon: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1, // Allows text to wrap if too long
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  detailSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginRight: 5,
    width: 100, // Fixed width for alignment
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    flexShrink: 1,
    flex: 1,
  },
  contentContainer: {
    marginTop: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  contentHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  archiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  archiveText: {
    fontSize: 14,
    color: '#777',
  },  viewedByContainer: {
    marginTop: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },  
  viewedByHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  viewedByText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
  },
  viewedAtText: {
    fontSize: 13,
    color: '#888',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: '#3498db', // Blue
  },
  deleteButton: {
    backgroundColor: '#e74c3c', // Red
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  // Styles for future "Viewed By" section
  // viewedByContainer: {
  //   marginTop: 20,
  //   paddingVertical: 15,
  //   borderTopWidth: 1,
  //   borderTopColor: '#eee',
  // },
  // viewedByHeader: {
  //   fontSize: 18,
  //   fontWeight: 'bold',
  //   marginBottom: 8,
  //   color: '#333',
  // },
  // viewedByText: {
  //   fontSize: 16,
  //   color: '#555',
  // },
});

export default NoticeDetailScreen;
