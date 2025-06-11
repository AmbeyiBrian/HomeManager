import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const NoticeDetailScreen = ({ route, navigation }) => {
  const { noticeId } = route.params;
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get the API functions from AuthContext
  const { fetchNoticeDetails, deleteNotice, isOffline } = useAuth();
  
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {notice.important && <Ionicons name="alert-circle" size={28} color="red" style={styles.icon} />}
        <Text style={styles.title}>{notice.title}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={20} color="#555" style={styles.detailIcon} />
        <Text style={styles.detailLabel}>Date Posted:</Text>
        <Text style={styles.detailText}>{notice.date}</Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons 
          name={notice.type === 'Maintenance' ? 'build-outline' : notice.type === 'Announcement' ? 'megaphone-outline' : 'notifications-outline'} 
          size={20} color="#555" style={styles.detailIcon} 
        />
        <Text style={styles.detailLabel}>Type:</Text>
        <Text style={styles.detailText}>{notice.type}</Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="person-outline" size={20} color="#555" style={styles.detailIcon} />
        <Text style={styles.detailLabel}>Created By:</Text>
        <Text style={styles.detailText}>{notice.createdBy}</Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="locate-outline" size={20} color="#555" style={styles.detailIcon} />
        <Text style={styles.detailLabel}>Target:</Text>
        <Text style={styles.detailText}>{notice.target}</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.contentHeader}>Details:</Text>
        <Text style={styles.content}>{notice.content}</Text>
      </View>

      {/* Placeholder for future "Who has viewed" functionality */}
      {/* <View style={styles.viewedByContainer}>
        <Text style={styles.viewedByHeader}>Viewed By:</Text>
        <Text style={styles.viewedByText}>John Doe, Jane Smith, and 5 others.</Text>
      </View> */}

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
    padding: 20, // Added padding
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
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    flexShrink: 1,
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
  errorText: { // Added error text style
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: { // Added retry button style
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: { // Added retry button text style
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: { // Added for styling disabled buttons
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
