import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const RoleManagementScreen = ({ navigation }) => {
  const { 
    roles, 
    rolesLoading, 
    rolesError, 
    fetchRoles,
    createOrUpdateRole,
    deleteRole,
    getRolePermissions,
    user,
    isOffline,
    hasPermission
  } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: []
  });
  // Available permissions
  const availablePermissions = [
    { key: 'can_manage_users', label: 'Manage Users' },
    { key: 'can_manage_billing', label: 'Manage Billing' },
    { key: 'can_manage_properties', label: 'Manage Properties' },
    { key: 'can_manage_tenants', label: 'Manage Tenants' },
    { key: 'can_view_reports', label: 'View Reports' },
    { key: 'can_manage_roles', label: 'Manage Roles' },
    { key: 'can_manage_system_settings', label: 'System Settings' },
    { key: 'can_view_dashboard', label: 'View Dashboard' },
    { key: 'can_manage_tickets', label: 'Manage Tickets' },
    { key: 'manage_notices', label: 'Manage Notices' }
  ];
  // Check if user has permission to manage roles
  useEffect(() => {
    if (!hasPermission('can_manage_roles')) {
      Alert.alert(
        'Permission Denied',
        'You do not have permission to manage roles.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    }
  }, [hasPermission, navigation]);

  useEffect(() => {
    if (hasPermission('can_manage_roles')) {
      fetchRoles();
    }
  }, [hasPermission]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRoles(true);
    setRefreshing(false);
  };

  const openRoleModal = (role = null) => {
    if (role) {
      setSelectedRole(role);
      // Extract permissions from backend role format
      const permissions = getRolePermissions(role);
      
      setRoleForm({
        name: role.name || '',
        description: role.description || '',
        permissions: permissions
      });
    } else {
      setSelectedRole(null);
      setRoleForm({ name: '', description: '', permissions: [] });
    }
    setRoleModalVisible(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }

    try {
      let result;
      
      if (selectedRole) {
        // Update existing role
        result = await createOrUpdateRole({
          ...roleForm,
          nameChanged: selectedRole.name !== roleForm.name
        }, selectedRole.id);
      } else {
        // Create new role
        result = await createOrUpdateRole(roleForm);
      }
      
      if (result.success) {
        setRoleModalVisible(false);
        onRefresh();
      } else {
        Alert.alert('Error', result.error || 'Failed to save role');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  };

  const handleDeleteRole = (roleId, roleName) => {
    Alert.alert(
      'Delete Role',
      `Are you sure you want to delete the role "${roleName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteRole(roleId);
              if (result.success) {
                onRefresh();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete role');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'An unexpected error occurred');
            }
          }
        }
      ]
    );
  };

  const togglePermission = (permission) => {
    setRoleForm(prevForm => {
      if (prevForm.permissions.includes(permission)) {
        return {
          ...prevForm,
          permissions: prevForm.permissions.filter(p => p !== permission)
        };
      } else {
        return {
          ...prevForm,
          permissions: [...prevForm.permissions, permission]
        };
      }
    });
  };

  const renderRoleItem = ({ item }) => (
    <View style={styles.roleCard}>
      <View style={styles.roleHeader}>
        <Text style={styles.roleName}>{item.name}</Text>
        <View style={styles.roleActions}>
          <TouchableOpacity onPress={() => openRoleModal(item)} style={styles.actionButton}>
            <Ionicons name="pencil" size={18} color="#007bff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteRole(item.id, item.name)} style={styles.actionButton}>
            <Ionicons name="trash" size={18} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.description ? (
        <Text style={styles.roleDescription}>{item.description}</Text>
      ) : null}
      
      <View style={styles.permissionsContainer}>
        <Text style={styles.sectionTitle}>Permissions:</Text>
        <View style={styles.permissionChips}>
          {getRolePermissions(item).map(permission => (
            <View key={permission} style={styles.permissionChip}>
              <Text style={styles.permissionText}>
                {availablePermissions.find(p => p.key === permission)?.label || permission}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  if (rolesLoading && !refreshing) {
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
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Role Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openRoleModal()}
          disabled={isOffline}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {rolesError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{rolesError}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={roles}
          renderItem={renderRoleItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={48} color="#aaaaaa" />
              <Text style={styles.emptyText}>No roles found</Text>
              <Text style={styles.emptySubText}>
                {isOffline 
                  ? "You're offline. Connect to the internet to manage roles."
                  : "Create roles to manage user permissions."}
              </Text>
              {!isOffline && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => openRoleModal()}
                >
                  <Text style={styles.emptyButtonText}>Create Role</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
      
      {/* Role Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={roleModalVisible}
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedRole ? 'Edit Role' : 'Create Role'}
              </Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Ionicons name="close" size={24} color="#555555" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Role Name *</Text>
              <TextInput
                style={styles.textInput}
                value={roleForm.name}
                onChangeText={(text) => setRoleForm({...roleForm, name: text})}
                placeholder="Enter role name"
              />
              
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={roleForm.description}
                onChangeText={(text) => setRoleForm({...roleForm, description: text})}
                placeholder="Enter role description"
                multiline={true}
                numberOfLines={3}
              />
              
              <Text style={[styles.inputLabel, styles.permissionsLabel]}>Permissions</Text>
              
              {availablePermissions.map(permission => (
                <View key={permission.key} style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>{permission.label}</Text>
                  <Switch
                    value={roleForm.permissions.includes(permission.key)}
                    onValueChange={() => togglePermission(permission.key)}
                    trackColor={{ false: "#d1d1d1", true: "#007bff" }}
                  />
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRoleModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveRole}
              >
                <Text style={styles.buttonText}>Save</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: '#007bff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  listContent: {
    padding: 16,
  },
  roleCard: {
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
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  roleActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  roleDescription: {
    color: '#666666',
    marginBottom: 12,
  },
  permissionsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },
  permissionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionChip: {
    backgroundColor: '#e6f2ff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  permissionText: {
    color: '#007bff',
    fontSize: 12,
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
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
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
    maxHeight: '80%',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
  },
  permissionsLabel: {
    marginTop: 8,
    marginBottom: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  permissionLabel: {
    fontSize: 16,
    color: '#333333',
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
  saveButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    fontWeight: '600',
    color: 'white',
  },
});

export default RoleManagementScreen;
