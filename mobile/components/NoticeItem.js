import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoticeQuickActions from './NoticeQuickActions';

/**
 * NoticeItem component for displaying notices with quick actions
 */
const NoticeItem = ({ notice, onPress, onActionComplete, getIconNameByNoticeType }) => {  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity 
      style={[styles.noticeItem, notice.is_archived && styles.archivedItem]} 
      onPress={onPress}
    >
      <View style={styles.noticeIconContainer}>
        {notice.is_important && <Ionicons name="alert-circle" size={24} color="red" style={styles.icon} />}
        <Ionicons 
          name={getIconNameByNoticeType(notice.notice_type)} 
          size={24} 
          color={notice.is_important ? "#e74c3c" : "#3498db"} 
        />
      </View>
      <View style={styles.noticeTextContainer}>
        <Text style={styles.noticeTitle}>{notice.title}</Text>
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={12} color="#777" style={styles.metaIcon} />
            <Text style={styles.metaText}>{notice.creator_name || 'Unknown'}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color="#777" style={styles.metaIcon} />
            <Text style={styles.metaText}>{formatDate(notice.created_at)}</Text>
          </View>
          
          {notice.property_name && (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={12} color="#777" style={styles.metaIcon} />
              <Text style={styles.metaText}>{notice.property_name}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.badgeContainer}>
          {notice.is_archived && (
            <View style={styles.archivedBadge}>
              <Ionicons name="archive" size={10} color="#777" style={{marginRight: 3}} />
              <Text style={styles.archivedText}>Archived</Text>
            </View>
          )}
          
          {notice.views && notice.views.length > 0 && (
            <View style={styles.viewsBadge}>
              <Ionicons name="eye" size={10} color="#3498db" style={{marginRight: 3}} />
              <Text style={styles.viewsText}>{notice.views.length}</Text>
            </View>
          )}
        </View>
      </View>
      <NoticeQuickActions 
        notice={notice} 
        onActionComplete={onActionComplete}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  noticeItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  archivedItem: {
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 3,
    borderLeftColor: '#bbb',
  },
  noticeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  icon: {
    marginRight: 5,
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  metaContainer: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 2,
  },
  metaIcon: {
    marginRight: 2,
  },
  metaText: {
    fontSize: 11,
    color: '#666',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  archivedBadge: {
    backgroundColor: '#f1f1f1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  archivedText: {
    fontSize: 10,
    color: '#777',
    fontWeight: '500',
  },
  viewsBadge: {
    backgroundColor: '#e8f4fd',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  viewsText: {
    fontSize: 10,
    color: '#3498db',
    fontWeight: '500',
  },
});

export default NoticeItem;
