import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import axios from 'axios';

const UserRoleAssignmentScreen = ({ navigation }) => {
  const { 
    roles, 
    rolesLoading, 
    fetchRoles,
    memberships,
    membershipsLoading,
    fetchMemberships,
    assignRole,
    user,
    isOffline,
    currentOrganization,
    hasPermission,
  } = useAuth();
  
  const { API_URL } = useApi();
  
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  // Check if user has permission to manage users
  useEffect(() => {
    if (!hasPermission('can_manage_users')) {
      Alert.alert(
        'Permission Denied',
        'You do not have permission to manage user roles.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    }
  }, [hasPermission, navigation]);

  // Load initial data
  useEffect(() => {
    if (hasPermission('can_manage_users')) {
      loadData();
    }
  }, [hasPermission]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      
      // Load roles
      await fetchRoles(true);
      
      // Load memberships
      await fetchMemberships(true);
      
      // Load users
      await fetchUsers();
      
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setRefreshing(false);
    }
  };
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      
      // Skip if offline
      if (isOffline) {
        setUsersLoading(false);
        return;
      }
      
      const { endpoints } = useApi();
      const response = await axios.get(endpoints.users);
      const usersData = response.data.results || response.data || [];
      
      setUsers(usersData);
      setUsersLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsersLoading(false);
    }
  };

  const onRefresh = () => {
    loadData();
  };

  const openAssignModal = (user) => {
    setSelectedUser(user);
    
    // Find user's current role if any
    const userMembership = memberships.find(m => 
      m.user && m.user.id === user.id
    );
    
    if (userMembership && userMembership.role) {
      setSelectedRoleId(userMembership.role.toString());
    } else {
      setSelectedRoleId('');
    }
    
    setAssignModalVisible(true);
  };
  const handleAssignRole = async () => {
    if (!selectedRoleId) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    try {
      const result = await assignRole(selectedUser.id, selectedRoleId);
      
      if (result.success) {
        setAssignModalVisible(false);
        // Refresh memberships to see the change
        await fetchMemberships(true);
        Alert.alert('Success', `Role successfully assigned to ${selectedUser.first_name || selectedUser.email}`);
      } else {
        // Provide more specific error messages
        if (result.error && typeof result.error === 'object') {
          if (result.error.detail) {
            Alert.alert('Error', result.error.detail);
          } else if (result.error.non_field_errors) {
            Alert.alert('Error', result.error.non_field_errors.join(', '));
          } else {
            // Convert error object to string
            const errorMessages = Object.entries(result.error)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join('\n');
            Alert.alert('Error', errorMessages || 'Failed to assign role');
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to assign role');
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  };
  const getUserRole = (userId) => {
    const userMembership = memberships.find(m => 
      (m.user && m.user.id === userId) || 
      (typeof m.user === 'string' && m.user === userId.toString())
    );
    
    if (!userMembership) return null;
    
    // Try to get role details from different possible structures
    if (userMembership.role_details) {
      return userMembership.role_details;
    } else if (userMembership.role) {
      // Check if role is an object or just an ID
      if (typeof userMembership.role === 'object') {
        return userMembership.role;
      } else {
        // If it's just an ID, find the role object from roles array
        const roleId = userMembership.role.toString();
        return roles.find(r => r.id.toString() === roleId);
      }
    }
    
    return null;
  };

  const renderUserItem = ({ item }) => {
    const userRole = getUserRole(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.userCard}
        onPress={() => openAssignModal(item)}
        disabled={isOffline}
      >
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {item.profile_image ? (
                <Image 
                  source={{ uri: item.profile_image }} 
                  style={styles.avatar}
                />
              ) : (                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {(item.first_name && item.first_name.charAt(0)) || 
                     (item.email && item.email.charAt(0)) || 
                     (item.username && item.username.charAt(0)) || 
                     'U'}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.userName}>
                {`${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email || item.username}
              </Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cccccc" />
        </View>
          <View style={styles.userRole}>
          <Text style={styles.roleLabel}>Role:</Text>
          {userRole ? (
            <View style={styles.roleChip}>
              <Text style={styles.roleText}>
                {userRole.name || userRole.role_type || 'Member'}
              </Text>
            </View>
          ) : (
            <Text style={styles.noRoleText}>No role assigned</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if ((usersLoading || rolesLoading || membershipsLoading) && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="white" />
          <Text style={styles.offlineText}>Offline Mode - View Only</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Role Assignments</Text>
      </View>
      
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#aaaaaa" />
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubText}>
              {isOffline 
                ? "You're offline. Connect to the internet to manage user roles."
                : "Add users to your organization to assign roles."}
            </Text>
          </View>
        }
      />
      
      {/* Role Assignment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Role</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color="#555555" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {selectedUser && (
                <View style={styles.selectedUser}>
                  <Text style={styles.userLabel}>User:</Text>
                  <Text style={styles.selectedUserText}>
                    {`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || 
                      selectedUser.email || selectedUser.username}
                  </Text>
                </View>
              )}
              
              <Text style={styles.inputLabel}>Select Role</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedRoleId}
                  onValueChange={(itemValue) => setSelectedRoleId(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Select a role --" value="" />
                  {roles.map(role => (
                    <Picker.Item 
                      key={role.id.toString()} 
                      label={role.name} 
                      value={role.id.toString()} 
                    />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAssignModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAssignRole}
              >
                <Text style={styles.saveButtonText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
  },
  userRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  roleLabel: {
    fontSize: 14,
    color: '#555555',
    marginRight: 8,
  },
  roleChip: {
    backgroundColor: '#e6f2ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: {
    color: '#007bff',
    fontSize: 14,
  },
  noRoleText: {
    color: '#999999',
    fontStyle: 'italic',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555555',
    marginTop: 16,
  },
  emptySubText: {
    textAlign: 'center',
    color: '#888888',
    marginTop: 8,
  },
  offlineBanner: {
    backgroundColor: '#ff9800',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '100%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  modalBody: {
    padding: 16,
  },
  selectedUser: {
    marginBottom: 16,
  },
  userLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },
  selectedUserText: {
    fontSize: 16,
    color: '#333333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  cancelButtonText: {
    color: '#555555',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default UserRoleAssignmentScreen;
