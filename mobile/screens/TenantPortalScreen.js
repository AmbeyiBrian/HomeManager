import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useApi } from '../hooks/useApi';

const TenantPortalScreen = ({ route, navigation }) => {
  const { endpoints } = useApi();
  const { portalData } = route.params || {};
  const [activeTab, setActiveTab] = useState('info');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { property, unit, notices = [], tenants = [], tickets = [] } = portalData || {};
  
  if (!portalData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading tenant portal data</Text>        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('QRCodeManager')}
        >
          <Text style={styles.buttonText}>Go to QR Code Manager</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const submitTicket = async () => {
    if (!ticketTitle || !ticketDescription) {
      Alert.alert(
        'Missing Information',
        'Please fill in all fields to submit a ticket.'
      );
      return;
    }
      try {
      setIsSubmitting(true);
      await axios.post(endpoints.createTicket(portalData.qr_code), {
        title: ticketTitle,
        description: ticketDescription,
        priority: ticketPriority
      });
      
      Alert.alert(
        'Success',
        'Your maintenance ticket has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setTicketTitle('');
              setTicketDescription('');
              setTicketPriority('medium');
              setActiveTab('tickets');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert(
        'Error',
        'Failed to submit your ticket. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderPropertyInfo = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Property Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{property.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address:</Text>
          <Text style={styles.infoValue}>{property.address}</Text>
        </View>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Unit Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Unit Number:</Text>
          <Text style={styles.infoValue}>{unit.unit_number}</Text>
        </View>
        {unit.floor && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Floor:</Text>
            <Text style={styles.infoValue}>{unit.floor}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bedrooms:</Text>
          <Text style={styles.infoValue}>{unit.bedrooms || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bathrooms:</Text>
          <Text style={styles.infoValue}>{unit.bathrooms || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Monthly Rent:</Text>
          <Text style={styles.infoValue}>${unit.monthly_rent}</Text>
        </View>
      </View>
      
      {tenants.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Tenant Information</Text>
          {tenants.map((tenant, index) => (
            <View key={tenant.id || index}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{tenant.name}</Text>
              </View>
              {tenant.phone_number && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{tenant.phone_number}</Text>
                </View>
              )}
              {tenant.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{tenant.email}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
  
  const renderNotices = () => (
    <View style={styles.tabContent}>
      {notices.length > 0 ? (
        notices.map((notice) => (
          <View key={notice.id} style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              {notice.is_important && (
                <View style={styles.importantBadge}>
                  <Text style={styles.importantText}>Important</Text>
                </View>
              )}
            </View>
            <Text style={styles.noticeDate}>
              {new Date(notice.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.noticeContent}>{notice.content}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={60} color="#bdc3c7" />
          <Text style={styles.emptyText}>No notices at this time</Text>
        </View>
      )}
    </View>
  );
  
  const renderTickets = () => (
    <View style={styles.tabContent}>
      {tickets.length > 0 ? (
        tickets.map((ticket) => (
          <View key={ticket.id} style={styles.ticketCard}>
            <View style={styles.ticketRow}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(ticket.status) }]} />
              <Text style={styles.ticketTitle}>{ticket.title}</Text>
            </View>
            <Text style={styles.ticketDescription}>{ticket.description}</Text>
            <View style={styles.ticketFooter}>
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketInfoItem}>Status: {formatStatus(ticket.status)}</Text>
                <Text style={styles.ticketInfoItem}>Priority: {formatPriority(ticket.priority)}</Text>
              </View>
              <Text style={styles.ticketDate}>
                {new Date(ticket.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={60} color="#bdc3c7" />
          <Text style={styles.emptyText}>No maintenance tickets</Text>
        </View>
      )}
    </View>
  );
  
  const renderSubmitTicket = () => (
    <View style={styles.tabContent}>
      <Text style={styles.formTitle}>Submit a Maintenance Request</Text>
      
      <Text style={styles.label}>Title*</Text>
      <TextInput
        style={styles.input}
        value={ticketTitle}
        onChangeText={setTicketTitle}
        placeholder="Brief description of the issue"
        maxLength={100}
      />
      
      <Text style={styles.label}>Description*</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={ticketDescription}
        onChangeText={setTicketDescription}
        placeholder="Detailed description of the issue"
        multiline={true}
        numberOfLines={5}
      />
      
      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityContainer}>
        {['low', 'medium', 'high', 'urgent'].map((priority) => (
          <TouchableOpacity
            key={priority}
            style={[
              styles.priorityButton,
              ticketPriority === priority && styles.priorityButtonSelected,
              { backgroundColor: getPriorityColor(priority, ticketPriority === priority) }
            ]}
            onPress={() => setTicketPriority(priority)}
          >
            <Text
              style={[
                styles.priorityText,
                ticketPriority === priority && styles.priorityTextSelected
              ]}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <TouchableOpacity
        style={styles.submitButton}
        onPress={submitTicket}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Ticket</Text>
        )}
      </TouchableOpacity>
    </View>
  );
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return '#3498db';
      case 'assigned': return '#f39c12';
      case 'in_progress': return '#9b59b6';
      case 'on_hold': return '#e74c3c';
      case 'resolved': return '#2ecc71';
      case 'closed': return '#95a5a6';
      default: return '#bdc3c7';
    }
  };
  
  const getPriorityColor = (priority, isSelected) => {
    if (!isSelected) return '#f5f5f5';
    
    switch (priority) {
      case 'urgent': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'medium': return '#3498db';
      case 'low': return '#2ecc71';
      default: return '#3498db';
    }
  };
  
  const formatStatus = (status) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const formatPriority = (priority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{property.name}</Text>
        <Text style={styles.headerSubtitle}>Unit {unit.unit_number}</Text>
      </View>
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Ionicons
            name={activeTab === 'info' ? 'information-circle' : 'information-circle-outline'}
            size={24}
            color={activeTab === 'info' ? '#3498db' : '#95a5a6'}
          />
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>Info</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notices' && styles.activeTab]}
          onPress={() => setActiveTab('notices')}
        >
          <Ionicons
            name={activeTab === 'notices' ? 'notifications' : 'notifications-outline'}
            size={24}
            color={activeTab === 'notices' ? '#3498db' : '#95a5a6'}
          />
          <Text style={[styles.tabText, activeTab === 'notices' && styles.activeTabText]}>Notices</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
          onPress={() => setActiveTab('tickets')}
        >
          <Ionicons
            name={activeTab === 'tickets' ? 'list' : 'list-outline'}
            size={24}
            color={activeTab === 'tickets' ? '#3498db' : '#95a5a6'}
          />
          <Text style={[styles.tabText, activeTab === 'tickets' && styles.activeTabText]}>Tickets</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submit' && styles.activeTab]}
          onPress={() => setActiveTab('submit')}
        >
          <Ionicons
            name={activeTab === 'submit' ? 'add-circle' : 'add-circle-outline'}
            size={24}
            color={activeTab === 'submit' ? '#3498db' : '#95a5a6'}
          />
          <Text style={[styles.tabText, activeTab === 'submit' && styles.activeTabText]}>Report</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {activeTab === 'info' && renderPropertyInfo()}
        {activeTab === 'notices' && renderNotices()}
        {activeTab === 'tickets' && renderTickets()}
        {activeTab === 'submit' && renderSubmitTicket()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 4,
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 15,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#7f8c8d',
    width: '35%',
  },
  infoValue: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
    fontWeight: '500',
  },
  noticeCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  importantBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  importantText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noticeDate: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  noticeContent: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 22,
  },
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  ticketDescription: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 22,
    marginBottom: 15,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketInfo: {
    flexDirection: 'row',
  },
  ticketInfoItem: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 15,
  },
  ticketDate: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 10,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 5,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  priorityButtonSelected: {
    borderColor: 'transparent',
  },
  priorityText: {
    color: '#7f8c8d',
    fontWeight: '500',
  },
  priorityTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    textAlign: 'center',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 50,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TenantPortalScreen;
