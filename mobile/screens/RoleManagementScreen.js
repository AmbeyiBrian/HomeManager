import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  });  // Available permissions - memoized to prevent re-renders
  const availablePermissions = useMemo(() => [
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
  ], []);

  // Memoized permission check
  const canManageRoles = useMemo(() => {
    return hasPermission('can_manage_roles');
  }, [hasPermission]);

  // Check if user has permission to manage roles - only run once
  useEffect(() => {
    if (canManageRoles === false) {
      Alert.alert(
        'Permission Denied',
        'You do not have permission to manage roles.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    }
  }, [canManageRoles, navigation]);
  // Fetch roles only once when component mounts and user has permission
  useEffect(() => {
    if (canManageRoles && roles.length === 0 && !rolesLoading) {
      console.log('💥 Roles tab activated but no roles data found, fetching roles...');
      fetchRoles();
    }
  }, [canManageRoles, roles.length, rolesLoading]); // Remove fetchRoles from dependencies to prevent loop

  const onRefresh = useCallback(async () => {
    if (!canManageRoles || isOffline) return;
    
    setRefreshing(true);
    try {
      await fetchRoles(true);
    } finally {
      setRefreshing(false);
    }
  }, [canManageRoles, isOffline, fetchRoles]);
  const openRoleModal = useCallback((role = null) => {
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
  }, [getRolePermissions]);
  const handleSaveRole = useCallback(async () => {
    if (!selectedRole) {
      Alert.alert('Error', 'No role selected');
      return;
    }

    if (isOffline) {
      Alert.alert('Error', 'Cannot save changes while offline');
      return;
    }

    try {
      // Only update permissions for existing predefined roles
      const result = await createOrUpdateRole({
        permissions: roleForm.permissions
      }, selectedRole.id);
      
      if (result.success) {
        setRoleModalVisible(false);
        // Refresh roles after successful save
        await fetchRoles(true);
        Alert.alert('Success', 'Role permissions updated successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to update role permissions');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  }, [roleForm.permissions, selectedRole, isOffline, createOrUpdateRole, fetchRoles]);

  const handleDeleteRole = useCallback((roleId, roleName) => {
    if (isOffline) {
      Alert.alert('Error', 'Cannot delete roles while offline');
      return;
    }

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
                // Refresh roles after successful delete
                await fetchRoles(true);
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
  }, [isOffline, deleteRole, fetchRoles]);

  const togglePermission = useCallback((permission) => {
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
  }, []);
  const renderRoleItem = useCallback(({ item }) => (
    <View style={styles.roleCard}>
      <View style={styles.roleHeader}>
        <Text style={styles.roleName}>{item.name}</Text>        <View style={styles.roleActions}>
          <TouchableOpacity 
            onPress={() => openRoleModal(item)} 
            style={styles.actionButton}
            disabled={isOffline}
          >
            <Ionicons name="settings" size={18} color={isOffline ? "#ccc" : "#007bff"} />
            <Text style={styles.actionButtonText}>Customize</Text>
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
  ), [openRoleModal, handleDeleteRole, getRolePermissions, availablePermissions, isOffline]);
  // Don't show loading if we're just refreshing and already have data
  if (rolesLoading && !refreshing && (!roles || roles.length === 0)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading roles...</Text>
      </View>
    );
  }

  // Don't render if user doesn't have permission
  if (canManageRoles === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noPermissionText}>You don't have permission to manage roles.</Text>
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
        <View style={styles.headerSubtitle}>
          <Text style={styles.subtitleText}>Customize permissions for predefined roles</Text>
        </View>
      </View>
      
      {rolesError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{rolesError}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (        <FlatList
          data={roles || []}
          renderItem={renderRoleItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={48} color="#aaaaaa" />
              <Text style={styles.emptyText}>No roles found</Text>
              <Text style={styles.emptySubText}>
                {isOffline 
                  ? "You're offline. Connect to the internet to view roles."
                  : "Predefined roles will appear here once loaded."}
              </Text>
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
          <View style={styles.modalContent}>            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Customize Role Permissions
              </Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Ionicons name="close" size={24} color="#555555" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.roleInfo}>
                <Text style={styles.roleNameDisplay}>{selectedRole?.name}</Text>
                <Text style={styles.roleDescriptionDisplay}>
                  {selectedRole?.description || 'Predefined role with customizable permissions'}
                </Text>
              </View>
              
              <Text style={[styles.inputLabel, styles.permissionsLabel]}>Permissions</Text>
              
              {availablePermissions.map(permission => (
                <View key={permission.key} style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>{permission.label}</Text>                  <Switch
                    value={roleForm.permissions.includes(permission.key)}
                    onValueChange={() => togglePermission(permission.key)}
                    trackColor={{ false: "#d1d1d1", true: "#007bff" }}
                    disabled={isOffline}
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
              <TouchableOpacity                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveRole}
              >
                <Text style={styles.buttonText}>Save Changes</Text>
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
  },  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noPermissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerSubtitle: {
    marginTop: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
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
  },  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
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
  },  modalBody: {
    padding: 16,
  },
  roleInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  roleNameDisplay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  roleDescriptionDisplay: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
