import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ImageBackground,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const OrganizationManagementScreen = ({ navigation, route }) => {
  // Auth context for organization data and user permissions
  const { 
    user, 
    isOffline, 
    getCachedData,
    cacheDataForOffline,
    fetchMyOrganization,
    currentOrganization,
    fetchRoles,
    fetchMemberships,
    deleteRole,
    assignRole,
    inviteToOrganization,
    fetchSubscription,
    isValidSubscription,
    rolesLoading
  } = useAuth();
  
  const { endpoints } = useApi();

  // State variables
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [localRolesLoading, setLocalRolesLoading] = useState(false);
  
  // Helper function to ensure organization object has the required role information
  const ensureOrganizationRole = (org) => {
    if (!org) return org;
    
    // Check if user_role is missing or undefined
    if (org.user_role === undefined || org.user_role === null) {
      // Try to find role information from membership data if available
      if (org.memberships && Array.isArray(org.memberships)) {
        const userMembership = org.memberships.find(m => {
          // Check different possible structures of user ID in membership objects
          const membershipUserId = typeof m.user === 'object' ? m.user.id : m.user;
          return membershipUserId === user?.id || membershipUserId === user?.id?.toString();
        });
        
        if (userMembership && userMembership.role) {
          if (typeof userMembership.role === 'object') {
            // If role is an object with properties
            org.user_role = userMembership.role.name || userMembership.role.role_type || 'member';
          } else {
            // If role is a string or id
            org.user_role = userMembership.role;
          }
        }
      }
      
      // If we still don't have a role, try checking user_membership field
      if (!org.user_role && org.user_membership) {
        if (typeof org.user_membership === 'object' && org.user_membership.role) {
          if (typeof org.user_membership.role === 'object') {
            org.user_role = org.user_membership.role.name || org.user_membership.role.role_type || 'member';
          } else {
            org.user_role = org.user_membership.role;
          }
        }
      }
      
      // If user is primary_owner, set role as owner
      if (!org.user_role && org.primary_owner) {
        const primaryOwnerId = typeof org.primary_owner === 'object' ? org.primary_owner.id : org.primary_owner;
        if (primaryOwnerId === user?.id || primaryOwnerId === user?.id?.toString()) {
          org.user_role = 'owner';
        }
      }
      
      // Default to 'member' if nothing else is available
      if (!org.user_role) {
        org.user_role = 'member';
      }
    }
    
    return org;
  };

  // Fetch organization data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadOrganizationData();
      return () => {};
    }, [])
  );
  
  // Function to load organization data
  const loadOrganizationData = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    
    try {
      // First, make sure we have organization data
      let orgData = null;
      
      // If we have currentOrganization from AuthContext, use it
      if (currentOrganization) {
        console.log('Using currentOrganization from AuthContext:', currentOrganization);
        const orgWithRole = ensureOrganizationRole(currentOrganization);
        setOrganization(orgWithRole);
        orgData = orgWithRole;
      } else {
        if (isOffline) {
          // If offline, try to load cached organization
          const cachedOrg = await getCachedData('user_organization');
          if (cachedOrg) {
            const orgWithRole = ensureOrganizationRole(cachedOrg);
            setOrganization(orgWithRole);
            orgData = orgWithRole;
          } else {
            setError('No cached organization data found. Please connect to the internet.');
          }
        } else {
          // Use the AuthContext method to fetch the user's organization
          const orgResult = await fetchMyOrganization(isRefreshing);
          
          if (orgResult.success) {
            const orgWithRole = ensureOrganizationRole(orgResult.data);
            setOrganization(orgWithRole);
            orgData = orgWithRole;
            // Cache the fetched organization data
            await cacheDataForOffline('user_organization', orgResult.data);
          } else {
            setError(orgResult.error?.detail || orgResult.error?.message || 'Failed to fetch organization data.');
          }
        }
      }
      
      // Now orgData should have the organization we'll use for all subsequent operations
      console.log('💥 Organization data loaded:', orgData);
      
      if (orgData && orgData.id) {
        try {
          console.log('💥 Calling fetchSubscription with ID:', orgData.id);
          // Use forceRefresh parameter if this is a refresh operation
          const subscriptionResult = await fetchSubscription(orgData.id, isRefreshing);
          console.log('💥 fetchSubscription result:', subscriptionResult);
          
          if (subscriptionResult.success) {
            console.log('💥 Subscription found:', subscriptionResult.data);
            setSubscription(subscriptionResult.data);
            
            if (subscriptionResult.fromCache && !isOffline) {
              console.log('Using cached subscription data, background refresh in progress');
            }
          } else {
            console.log('💥 No subscription found, error:', subscriptionResult.error);
            setSubscription(null);
            
            if (subscriptionResult.error) {
              console.error('Error during subscription fetch:', subscriptionResult.error);
            }
          }
        } catch (subscriptionError) {
          console.error('💥 CRITICAL ERROR in subscription fetch flow:', subscriptionError);
          // Optionally set an error state for subscription fetching
          setError(subscriptionError?.message || 'An error occurred while fetching subscription details.');
        }
      } else {
        console.log('💥 ERROR: Cannot fetch subscription - no organization ID available');
      }
      
      // Fetch organization members using AuthContext
      const membersResult = await fetchMemberships(isRefreshing);
      
      if (membersResult.success) {
        // Filter memberships for current organization (if we have the organization)
        if (orgData && orgData.id) {
          const currentOrgMembers = membersResult.data.filter(
            (membership) => (membership.organization === orgData.id || membership.organization?.id === orgData.id)
          );
          setMembers(currentOrgMembers);
        } else {
          setMembers(membersResult.data); // Or handle as an error/empty state
        }
        
        if (membersResult.fromCache && !isOffline) {
          // Optionally inform user that cached data is shown, and refresh is happening
        }
      } else {
        setError(membersResult.error?.detail || membersResult.error?.message || 'Failed to fetch members.');
      }
      
      // Fetch organization roles using AuthContext
      console.log('💥 Fetching roles, isRefreshing:', isRefreshing);
      setLocalRolesLoading(true);
      try {
        const rolesResult = await fetchRoles(isRefreshing);
        console.log('💥 Roles result:', rolesResult);
        
        if (rolesResult.success) {
          console.log('💥 Roles found:', rolesResult.data);
          console.log('💥 Roles data type:', typeof rolesResult.data, Array.isArray(rolesResult.data));
          setRoles(rolesResult.data || []);
          console.log('💥 Roles state after update:', roles); // This might show the previous state
        } else {
          console.log('💥 Error fetching roles:', rolesResult.error);
          setError(rolesResult.error?.detail || rolesResult.error?.message || 'Failed to fetch roles.');
        }
      } catch (rolesError) {
        console.error('💥 Error in roles fetch flow:', rolesError);
      } finally {
        setLocalRolesLoading(false);
      }
    } catch (err) {
      console.error('Error fetching organization data:', err);
      setError(err.message || 'Failed to load organization data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    loadOrganizationData(true);
  }, []);
  
  // Effect to ensure roles data is loaded when the roles tab is selected
  useEffect(() => {
    if (activeTab === 'roles' && (!roles || roles.length === 0) && !localRolesLoading && !rolesLoading) {
      console.log('💥 Roles tab activated but no roles data found, fetching roles...');
      setLocalRolesLoading(true);
      fetchRoles(true)
        .then(result => {
          console.log('💥 Roles fetch result from tab activation:', result);
          if (result.success) {
            setRoles(result.data || []);
          }
        })
        .catch(err => {
          console.error('💥 Error fetching roles on tab activation:', err);
        })
        .finally(() => {
          setLocalRolesLoading(false);
        });
    }
  }, [activeTab, roles]);

  // Handler for inviting a new user
  const handleInviteUser = () => {
    navigation.navigate('InviteUser', { organizationId: organization?.id });
  };

  // Function to manage user role
  const handleManageUserRole = (member) => {
    navigation.navigate('UserRoleAssignment', { 
      selectedUser: member.user_details || member.user,
      organizationId: organization?.id
    });
  };
  
  // Function to remove a user from organization
  const handleRemoveUser = (member) => {
    if (isOffline) {
      Alert.alert(
        'Offline Mode',
        'Cannot remove users while offline. Please try again when you have an internet connection.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove User',
      `Are you sure you want to remove ${
        member.user_details?.first_name || 
        member.user?.first_name || 
        member.user_details?.email?.split('@')[0] || 
        member.user?.email?.split('@')[0] || 
        'this user'
      } ${
        member.user_details?.last_name || 
        member.user?.last_name || 
        ''
      } from the organization?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${endpoints.API_BASE_URL}/api/organizations/memberships/${member.id}/`, 
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${user.access_token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (response.ok) {
                // Remove user from local state
                setMembers(members.filter(m => m.id !== member.id));
                
                // Refresh memberships from AuthContext to update cache
                await fetchMemberships(true);
                
                Alert.alert('Success', 'User removed successfully');
              } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to remove user');
              }
            } catch (err) {
              console.error('Error removing user:', err);
              Alert.alert(
                'Error', 
                err.message || 'Failed to remove user. Please try again.'
              );
            }
          }
        }
      ]
    );
  };
  
  // Function to navigate to subscription management screen
  const handleManageSubscription = () => {
    if (!organization?.id) {
      Alert.alert(
        'Error',
        'Cannot manage subscription without a valid organization',
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('SubscriptionManagement', { 
      organizationId: organization.id,
      subscription: subscription,
      fromScreen: 'OrganizationManagement'
    });
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading organization data...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
        <Text style={styles.errorTitle}>Error Loading Data</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadOrganizationData()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Organization Header */}
      <View style={styles.header}>
        <ImageBackground
          source={{ uri: organization?.image || null }}
          style={styles.headerBackground}
          imageStyle={styles.headerBackgroundImage}
        >
          <View style={styles.headerOverlay}>
            <Text style={styles.organizationName}>{organization?.name}</Text>
            <Text style={styles.organizationDetail}>{organization?.address || 'No address provided'}</Text>
            <Text style={styles.organizationDetail}>
              {members?.length || 0} members • Created {organization?.created_at ? new Date(organization.created_at).toLocaleDateString() : 'N/A'}
            </Text>
            {organization?.user_role && (
              <View style={styles.userRoleBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#fff" style={{marginRight: 4}} />
                <Text style={styles.userRoleBadgeText}>
                  Your Role: {organization.user_role}
                </Text>
              </View>
            )}
          </View>
        </ImageBackground>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'details' && styles.activeTabButton]} 
          onPress={() => setActiveTab('details')}
        >
          <Ionicons 
            name="information-circle-outline" 
            size={20} 
            color={activeTab === 'details' ? '#fff' : '#555'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'details' && styles.activeTabButtonText]}>
            Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'members' && styles.activeTabButton]} 
          onPress={() => setActiveTab('members')}
        >
          <Ionicons 
            name="people-outline" 
            size={20} 
            color={activeTab === 'members' ? '#fff' : '#555'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'members' && styles.activeTabButtonText]}>
            Members
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'subscription' && styles.activeTabButton]} 
          onPress={() => setActiveTab('subscription')}
        >
          <Ionicons 
            name="card-outline" 
            size={20} 
            color={activeTab === 'subscription' ? '#fff' : '#555'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'subscription' && styles.activeTabButtonText]}>
            Subscription
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'roles' && styles.activeTabButton]} 
          onPress={() => setActiveTab('roles')}
        >
          <Ionicons 
            name="shield-outline" 
            size={20} 
            color={activeTab === 'roles' ? '#fff' : '#555'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'roles' && styles.activeTabButtonText]}>
            Roles
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'details' && (
          <View style={styles.tabContent}>
            {/* Details Tab Content */}
            {/* ... */}
          </View>
        )}
        
        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            {/* Members Tab Content */}
            {/* ... */}
          </View>
        )}
        
        {activeTab === 'subscription' && (
          <View style={styles.tabContent}>
            {/* Subscription Tab Content */}
            {/* ... */}
          </View>
        )}
        
        {activeTab === 'roles' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              {console.log('💥 Rendering roles tab, roles data:', roles, 'loading:', localRolesLoading || rolesLoading)}
              <View style={styles.sectionHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={styles.sectionTitle}>Organization Roles</Text>
                  {(localRolesLoading || rolesLoading) && <ActivityIndicator size="small" color="#3498db" style={{marginLeft: 10}} />}
                </View>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => navigation.navigate('RoleManagement')}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addButtonText}>Add Role</Text>
                </TouchableOpacity>
              </View>
              
              {(localRolesLoading || rolesLoading) ? (
                <View style={{padding: 20, alignItems: 'center'}}>
                  <ActivityIndicator size="large" color="#3498db" />
                  <Text style={{marginTop: 10, fontSize: 16, color: '#666'}}>Loading roles...</Text>
                </View>
              ) : !roles || roles.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="shield" size={40} color="#ccc" />
                  <Text style={styles.emptyStateText}>No roles defined</Text>
                  <Text style={styles.emptyStateSubText}>Create roles to manage user access</Text>
                </View>
              ) : (
                roles.map((role) => (
                  <TouchableOpacity 
                    key={role.id}
                    style={styles.roleItem}
                    onPress={() => navigation.navigate('RoleManagement', { role })}
                  >
                    <View style={styles.roleHeader}>
                      <Text style={styles.roleName}>{role.name}</Text>
                      <Text style={styles.roleType}>{role.role_type}</Text>
                    </View>
                    
                    <Text style={styles.roleDescription}>
                      {role.description || 'No description provided'}
                    </Text>
                    
                    <View style={styles.permissionsContainer}>
                      {role.can_manage_users && (
                        <View style={styles.permissionBadge}>
                          <Text style={styles.permissionText}>Manage Users</Text>
                        </View>
                      )}
                      
                      {role.can_manage_billing && (
                        <View style={styles.permissionBadge}>
                          <Text style={styles.permissionText}>Manage Billing</Text>
                        </View>
                      )}
                      
                      {role.can_manage_properties && (
                        <View style={styles.permissionBadge}>
                          <Text style={styles.permissionText}>Manage Properties</Text>
                        </View>
                      )}
                      
                      {role.can_manage_tenants && (
                        <View style={styles.permissionBadge}>
                          <Text style={styles.permissionText}>Manage Tenants</Text>
                        </View>
                      )}
                      
                      {role.can_view_reports && (
                        <View style={styles.permissionBadge}>
                          <Text style={styles.permissionText}>View Reports</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.roleActions}>
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Header styles
  header: {
    height: 200,
  },
  headerBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#3498db',
  },
  headerBackgroundImage: {
    opacity: 0.3,
  },
  headerOverlay: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 20,
  },
  organizationName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  organizationDetail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  userRoleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  userRoleBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Tab navigation styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: '#3498db',
    borderBottomColor: '#2980b9',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Content styles
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  tabContent: {
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  
  // Roles tab
  addButton: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    gap: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  roleItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
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
    color: '#333',
  },
  roleType: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  permissionBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  permissionText: {
    fontSize: 12,
    color: '#2980b9',
  },
  roleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#555',
    marginTop: 15,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    marginBottom: 20,
  },
  setupButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 15,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default OrganizationManagementScreen;
