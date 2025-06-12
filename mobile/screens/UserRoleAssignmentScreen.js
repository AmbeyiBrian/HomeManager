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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import axios from 'axios';

const UserRoleAssignmentScreen = ({ navigation, route }) => {
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
  const [usersLoading, setUsersLoading] = useState(false); // Initialize to false, will be set to true during actual loading
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // Debug modal visibility changes
  useEffect(() => {
    console.log('📱 Modal visibility changed:', assignModalVisible);
  }, [assignModalVisible]);// Store permission check result to avoid infinite loops
  const [hasManageUsersPermission, setHasManageUsersPermission] = useState(null);

  // Extract route parameters
  const routeParams = route?.params || {};
  const { selectedUser: routeSelectedUser, organizationId } = routeParams;

  // Check permissions once when component mounts
  useEffect(() => {
    const checkPermissions = () => {
      const canManageUsers = hasPermission('can_manage_users');
      setHasManageUsersPermission(canManageUsers);
      
      if (!canManageUsers) {
        Alert.alert(
          'Permission Denied',
          'You do not have permission to manage user roles.',
          [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]
        );
      }
    };

    // Only check permissions when roles are loaded
    if (roles && roles.length > 0) {
      checkPermissions();
    }
  }, [roles, navigation]); // Depend on roles array instead of hasPermission function

  // Load initial data when permission is confirmed
  useEffect(() => {
    if (hasManageUsersPermission === true) {
      loadData();
    }  }, [hasManageUsersPermission]);  const loadData = async () => {
    // Prevent multiple simultaneous loads
    if (refreshing || rolesLoading || membershipsLoading) {
      console.log('🔄 Skipping loadData - already loading');
      return;
    }

    try {
      setRefreshing(true);
      console.log('🔄 Starting data load...');
      
      // Load roles first
      console.log('🔄 Loading roles...');
      await fetchRoles(true);
      
      // Load memberships (which contain user data)
      console.log('🔄 Loading memberships...');
      await fetchMemberships(true);
      
      // Wait a bit for memberships to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Load users (this will now use membership data)
      console.log('🔄 Loading users...');
      await fetchUsers();
      
      console.log('🔄 Data load completed successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };const fetchUsers = async () => {
    try {
      // Prevent multiple simultaneous fetches
      if (usersLoading) {
        return;
      }
      
      setUsersLoading(true);
      
      // Skip if offline
      if (isOffline) {
        console.log('Skipping user fetch - offline mode');
        setUsersLoading(false);
        return;
      }
        // Instead of fetching all users, we should get organization members
      // The memberships data already contains user information
      if (memberships && memberships.length > 0) {
        console.log('🔍 Using membership data for users, memberships:', memberships.length);
        
        // Extract unique users from memberships, including their role information
        const uniqueUsers = [];
        const seenUserIds = new Set();
          memberships.forEach(membership => {
          const user = membership.user_details || membership.user;
          if (user && user.id && !seenUserIds.has(user.id)) {
            seenUserIds.add(user.id);
            
            // Debug: Log membership structure to understand role data
            console.log('🔍 Processing membership for user:', user.email, {
              membership_id: membership.id,
              role: membership.role,
              role_details: membership.role_details,
              membership_full: membership
            });
            
            uniqueUsers.push({
              id: user.id,
              first_name: user.first_name || user.firstName || '',
              last_name: user.last_name || user.lastName || '', 
              email: user.email || '',
              username: user.username || user.email || '',
              // Include role information from the membership
              membership_id: membership.id,
              role: membership.role,
              role_details: membership.role_details,
              // Include any other user properties we might need
              ...user
            });
          }
        });
        
        console.log('🔍 Extracted users from memberships:', uniqueUsers.length);
        setUsers(uniqueUsers);
      } else {
        console.log('🔍 No memberships available, fetching from users endpoint');
        // Fallback to fetching all users if no memberships are available
        const { endpoints } = useApi();
        const response = await axios.get(endpoints.users, {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        const usersData = response.data.results || response.data || [];
        console.log('🔍 Fetched users from API:', usersData.length);
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Don't show alert here as it's called from loadData which handles errors
    } finally {
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
  };  const handleAssignRole = async () => {
    if (!selectedRoleId) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    try {
      console.log('🎯 Starting role assignment:', {
        userId: selectedUser.id,
        userEmail: selectedUser.email,
        roleId: selectedRoleId,
        selectedRoleName: roles.find(r => r.id.toString() === selectedRoleId)?.name
      });
      
      const result = await assignRole(selectedUser.id, selectedRoleId);
      
      console.log('🎯 Role assignment result:', result);
        if (result.success) {
        // Close modal and clear state first
        closeModal();
        
        // Refresh memberships to see the change
        await fetchMemberships(true);
        Alert.alert('Success', `Role successfully assigned to ${selectedUser.first_name || selectedUser.email}`);
      } else {
        console.log('🎯 Role assignment failed:', result.error);
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
      console.log('🎯 Role assignment exception:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  };const getUserRole = (userId) => {
    console.log('🔍 Getting role for user ID:', userId);
    
    // First, try to find the user in our users array (which includes role info)
    const userWithRole = users.find(u => u.id === userId);
    if (userWithRole) {
      console.log('🔍 Found user with role info:', {
        userId,
        email: userWithRole.email,
        role: userWithRole.role,
        role_details: userWithRole.role_details
      });
      
      // Check if we have role information directly on the user object
      if (userWithRole.role_details) {
        console.log('🔍 Using role_details:', userWithRole.role_details);
        return userWithRole.role_details;
      } else if (userWithRole.role) {
        if (typeof userWithRole.role === 'object') {
          console.log('🔍 Using role object:', userWithRole.role);
          return userWithRole.role;
        } else {
          // If it's just an ID, find the role object from roles array
          const roleId = userWithRole.role.toString();
          const foundRole = roles.find(r => r.id.toString() === roleId);
          console.log('🔍 Looking for role ID:', roleId, 'found:', foundRole);
          return foundRole;
        }
      }
    }
    
    console.log('🔍 No role found in users array, checking memberships...');
    
    // Fallback: search in memberships array
    const userMembership = memberships.find(m => 
      (m.user && m.user.id === userId) || 
      (m.user_details && m.user_details.id === userId) ||
      (typeof m.user === 'string' && m.user === userId.toString())
    );
    
    if (!userMembership) {
      console.log('🔍 No membership found for user:', userId);
      return null;
    }
    
    console.log('🔍 Found membership:', {
      userId,
      membership_id: userMembership.id,
      role: userMembership.role,
      role_details: userMembership.role_details
    });
    
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
        const foundRole = roles.find(r => r.id.toString() === roleId);
        console.log('🔍 Looking for role ID in memberships:', roleId, 'found:', foundRole);
        return foundRole;
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
          <View style={styles.userInfo}>            <View style={styles.avatarContainer}>
              <View style={[
                styles.avatar, 
                styles.avatarPlaceholder,
                { backgroundColor: `hsl(${(item.id * 137.5) % 360}, 70%, 50%)` }
              ]}>
                <Text style={styles.avatarText}>
                  {(item.first_name && item.first_name.charAt(0)) || 
                   (item.email && item.email.charAt(0)) || 
                   (item.username && item.username.charAt(0)) || 
                   'U'}
                </Text>
              </View>
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
  // Handle route parameters - automatically open assignment modal if selectedUser is passed
  useEffect(() => {
    if (routeSelectedUser && routeSelectedUser.id && hasManageUsersPermission === true && !assignModalVisible) {
      console.log('🎯 Opening modal for route selected user:', routeSelectedUser.email);
      // Set the selected user and open the modal
      setSelectedUser(routeSelectedUser);
      setAssignModalVisible(true);
      
      // Find user's current role if any
      const userMembership = memberships.find(m => 
        m.user && m.user.id === routeSelectedUser.id
      );
      
      if (userMembership && userMembership.role) {
        setSelectedRoleId(userMembership.role.toString());
      } else {
        setSelectedRoleId('');
      }
    }
  }, [routeSelectedUser?.id, hasManageUsersPermission]); // More specific dependencies

  // Handle case where memberships are loaded after initial render
  useEffect(() => {
    if (memberships && memberships.length > 0 && hasManageUsersPermission === true) {
      console.log('🔄 Memberships loaded, refreshing users from membership data');
      fetchUsers();
    }
  }, [memberships]); // Depend on memberships array to trigger when it changes

  // Function to safely close the modal and reset all related state
  const closeModal = () => {
    console.log('🔒 Closing modal and resetting state');
    setAssignModalVisible(false);
    setSelectedUser(null);
    setSelectedRoleId('');
  };

  // Improved loading condition - handle case where initial loading is stuck
  if ((usersLoading || rolesLoading || membershipsLoading) && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop: 10, color: '#666', textAlign: 'center' }}>
          Loading user role assignments...
        </Text>
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
      
      {/* Role Assignment Modal */}      <Modal
        animationType="slide"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => {
          console.log('📱 Modal onRequestClose called');
          closeModal();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Role</Text>
              <TouchableOpacity onPress={() => {
                console.log('❌ Close button pressed');
                closeModal();
                console.log('❌ Modal should be closed now');
              }}>
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
            </View>            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  console.log('🚫 Cancel button pressed');
                  closeModal();
                  console.log('🚫 Modal should be closed now');
                }}
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
  },  avatarPlaceholder: {
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
