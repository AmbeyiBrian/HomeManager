import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

/**
 * Component for quick actions on notice items (archive and mark as important)
 * @param {Object} notice - The notice object
 * @param {Function} onActionComplete - Callback when action is complete
 * @param {Boolean} large - Whether to use larger buttons (for detail screen)
 */
const NoticeQuickActions = ({ notice, onActionComplete, large = false }) => {
  const [loading, setLoading] = useState(false);
  const { updateNotice, isOffline } = useAuth();

  const handleToggleArchive = async () => {
    if (isOffline) {
      Alert.alert('Offline Mode', 'This action is not available while offline.');
      return;
    }

    setLoading(true);
    try {
      const result = await updateNotice(notice.id, {
        is_archived: !notice.is_archived
      });

      if (result.success) {
        // Show feedback to user
        Alert.alert(
          notice.is_archived ? 'Notice Unarchived' : 'Notice Archived',
          notice.is_archived ? 'The notice has been unarchived.' : 'The notice has been archived.',
          [{ text: 'OK' }],
          { cancelable: true }
        );
        
        if (onActionComplete) {
          onActionComplete({
            ...notice,
            is_archived: !notice.is_archived
          });
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to update notice');
      }
    } catch (error) {
      console.error('Error toggling archive status:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleImportant = async () => {
    if (isOffline) {
      Alert.alert('Offline Mode', 'This action is not available while offline.');
      return;
    }

    setLoading(true);
    try {
      const result = await updateNotice(notice.id, {
        is_important: !notice.is_important
      });

      if (result.success) {
        // Show feedback to user
        Alert.alert(
          notice.is_important ? 'Importance Removed' : 'Marked as Important',
          notice.is_important 
            ? 'The notice is no longer marked as important.' 
            : 'The notice has been marked as important.',
          [{ text: 'OK' }],
          { cancelable: true }
        );
        
        if (onActionComplete) {
          onActionComplete({
            ...notice,
            is_important: !notice.is_important
          });
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to update notice');
      }
    } catch (error) {
      console.error('Error toggling importance status:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.actionsContainer}>
        <ActivityIndicator size="small" color="#3498db" />
      </View>
    );
  }
  return (
    <View style={[styles.actionsContainer, large && styles.largeContainer]}>
      <TouchableOpacity
        style={[styles.actionButton, large && styles.largeButton]}
        onPress={handleToggleImportant}
      >
        <Ionicons
          name={notice.is_important ? "star" : "star-outline"}
          size={large ? 26 : 22}
          color={notice.is_important ? "#f39c12" : "#7f8c8d"}
        />
        {large && (
          <Text style={[styles.buttonText, notice.is_important && styles.activeText]}>
            {notice.is_important ? 'Important' : 'Mark Important'}
          </Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, large && styles.largeButton]}
        onPress={handleToggleArchive}
      >
        <Ionicons
          name={notice.is_archived ? "archive" : "archive-outline"}
          size={large ? 26 : 22}
          color={notice.is_archived ? "#3498db" : "#7f8c8d"}
        />
        {large && (
          <Text style={[styles.buttonText, notice.is_archived && styles.archivedText]}>
            {notice.is_archived ? 'Archived' : 'Archive'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionButton: {
    padding: 5,
    marginHorizontal: 2,
  },
  largeContainer: {
    marginLeft: 0,
    justifyContent: 'center',
    marginVertical: 5,
  },
  largeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    color: '#495057',
  },
  activeText: {
    color: '#f39c12',
  },
  archivedText: {
    color: '#3498db',
  }
});

export default NoticeQuickActions;
