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
import CacheBanner from '../components/CacheBanner';

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
  const [organizationFromCache, setOrganizationFromCache] = useState(false);
  
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
  };  // Fetch organization data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadOrganizationData();
      return () => {
      };
    }, [])
  );
    // Using the fetchSubscription function from AuthContext instead of local implementation
  
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
          const cachedOrg = await getCachedData('user_organization');          if (cachedOrg) {
            const orgWithRole = ensureOrganizationRole(cachedOrg);
            setOrganization(orgWithRole);
            setOrganizationFromCache(true);
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
            // Set whether the data is from cache
            setOrganizationFromCache(orgResult.fromCache || false);
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
      }        // Fetch organization roles using AuthContext - similar to subscriptions and members
      console.log('💥 Fetching roles, isRefreshing:', isRefreshing);
      const rolesResult = await fetchRoles(isRefreshing);
      console.log('💥 Roles result:', rolesResult);
      
      if (rolesResult.success) {
        console.log(rolesResult);
        console.log('💥 Roles found:', rolesResult.data);
        setRoles(rolesResult.data || []);
      } else {
        console.log('💥 Error fetching roles:', rolesResult.error);
        // Don't set the overall error just for roles - let the UI handle it in the roles tab
      }
      
    } catch (err) {
      console.error('Error fetching organization data:', err);
      setError(err.message || 'Failed to load organization data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    loadOrganizationData(true);
  }, []);

  // Effect to ensure roles data is loaded when the roles tab is selected
  useEffect(() => {
    // Only fetch roles when the tab is activated and we have no roles data
    if (activeTab === 'roles' && (!roles || roles.length === 0) && !rolesLoading) {
      console.log('💥 Roles tab activated but no roles data found, fetching roles...');
      // Don't use local loading state as it causes render loops - rely only on rolesLoading from context
      fetchRoles(true).then(result => {
        console.log('💥 Roles fetch result from tab activation:', result);
        if (result.success) {
          setRoles(result.data || []);
        }
      }).catch(err => {
        console.error('💥 Error fetching roles on tab activation:', err);
      });
    }
  }, [activeTab]);  // Only depend on activeTab to prevent infinite re-renders

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

    Alert.alert(      'Remove User',
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
        <View style={styles.headerContent}>
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
            </View>          )}
        </View>
        {organizationFromCache && <CacheBanner visible={true} />}
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organization Details</Text>
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={20} color="#555" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{organization?.name}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="map-outline" size={20} color="#555" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={styles.detailValue}>{organization?.address || 'Not provided'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={20} color="#555" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{organization?.email || 'Not provided'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={20} color="#555" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{organization?.phone || 'Not provided'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="globe-outline" size={20} color="#555" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Website:</Text>
                <Text style={styles.detailValue}>{organization?.website || 'Not provided'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={20} color="#555" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Owner:</Text>
                <Text style={styles.detailValue}>
                  {organization?.primary_owner?.first_name} {organization?.primary_owner?.last_name || ''}
                </Text>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>
                {organization?.description || 'No description provided.'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('EditOrganization', { organization })}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit Organization Details</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Organization Members</Text>
                <TouchableOpacity 
                  style={styles.inviteButton}
                  onPress={handleInviteUser}
                >
                  <Ionicons name="person-add" size={18} color="#fff" />
                  <Text style={styles.inviteButtonText}>Invite</Text>
                </TouchableOpacity>
              </View>
              
              {members.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people" size={40} color="#ccc" />
                  <Text style={styles.emptyStateText}>No members found</Text>
                  <Text style={styles.emptyStateSubText}>Invite members to your organization</Text>
                </View>
              ) : 
              members.map((member) => 
                (
                  <View key={member.id} style={styles.memberItem}>
                    <View style={styles.memberInfo}>                      <View style={styles.memberAvatar}>                        <Text style={styles.memberInitial}>
                          {(
                            (member.user_details?.first_name && member.user_details.first_name.charAt(0)) || 
                            (member.user_details?.email && member.user_details.email.charAt(0)) ||
                            (member.user_details?.username && member.user_details.username.charAt(0)) ||
                            (member.user?.first_name && member.user.first_name.charAt(0)) || 
                            (member.user?.email && member.user.email.charAt(0)) ||
                            (member.user?.username && member.user.username.charAt(0)) ||
                            '?'
                          ).toUpperCase()}
                        </Text>
                      </View>                      <View style={styles.memberDetails}>                        <Text style={styles.memberName}>
                          {member.user_details?.first_name || 
                           member.user?.first_name || 
                           member.user_details?.email?.split('@')[0] || 
                           member.user?.email?.split('@')[0] || 
                           'User'} {member.user_details?.last_name || member.user?.last_name || ''}
                          {(member.user_details?.id === user?.id || member.user?.id === user?.id) && (
                            <Text style={styles.currentUserLabel}> (You)</Text>
                          )}
                        </Text>
                        <Text style={styles.memberEmail}>{member.user_details?.email || member.user?.email}</Text><View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>
                            {
                              // Try multiple ways to get the role name
                              (member.role && typeof member.role === 'object' && member.role.name) ||
                              (member.role_details && member.role_details.name) ||
                              (member.role && typeof member.role === 'string' && roles.find(r => r.id.toString() === member.role.toString())?.name) ||
                              'Member'
                            }
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        style={styles.memberActionButton}
                        onPress={() => handleManageUserRole(member)}
                      >
                        <Ionicons name="shield-outline" size={20} color="#3498db" />
                      </TouchableOpacity>                        {(member.user_details?.id !== user?.id && member.user?.id !== user?.id) && (
                        <TouchableOpacity
                          style={styles.memberActionButton}
                          onPress={() => handleRemoveUser(member)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )
              )
              }
            </View>
          </View>
        )}
        
        {activeTab === 'subscription' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subscription Details</Text>
                
                {!subscription || !isValidSubscription(subscription) ? (
                <View>
                  <View style={styles.emptyState}>
                    <Ionicons name="card" size={40} color="#ccc" />
                    <Text style={styles.emptyStateText}>No valid subscription found</Text>
                    <Text style={styles.emptyStateSubText}>Set up a subscription plan for your organization</Text>
                    
                    <TouchableOpacity
                      style={styles.setupButton}
                      onPress={handleManageSubscription}
                    >
                      <Text style={styles.setupButtonText}>Set Up Subscription</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.subscriptionCard}>
                    {/* Header Section - Plan Name & Status */}
                    <View style={styles.subscriptionHeader}>
                      <Text style={styles.planName}>
                        {(() => {
                          // Get plan details using the most reliable source
                          const planDetails = subscription.plan_details || 
                            (typeof subscription.plan === 'object' ? subscription.plan : null);
                          
                          return planDetails?.name || 'Subscription Plan';
                        })()}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: 
                          subscription.status === 'active' ? '#27ae60' : 
                          subscription.status === 'trialing' ? '#f39c12' : 
                          subscription.status === 'past_due' ? '#e74c3c' : 
                          subscription.status === 'canceled' ? '#95a5a6' :
                          subscription.status === 'incomplete' ? '#e67e22' :
                          '#95a5a6' }
                      ]}>
                        <Text style={styles.statusText}>{subscription.status || 'unknown'}</Text>
                      </View>
                    </View>
                    
                    {/* Subscription Details Section */}
                    <View style={styles.subscriptionDetails}>
                      {/* Billing Period Row */}
                      <View style={styles.subscriptionRow}>
                        <Text style={styles.subscriptionLabel}>Billing Period:</Text>
                        <Text style={styles.subscriptionValue}>
                          {subscription.billing_period === 'monthly' ? 'Monthly' : 'Yearly'}
                        </Text>
                      </View>
                      
                      {/* Start Date Row */}
                      <View style={styles.subscriptionRow}>
                        <Text style={styles.subscriptionLabel}>Start Date:</Text>
                        <Text style={styles.subscriptionValue}>
                          {subscription.start_date ? 
                            new Date(subscription.start_date).toLocaleDateString() : 
                            'Not specified'}
                        </Text>
                      </View>
                      
                      {/* End Date Row - Only show if exists */}
                      {subscription.end_date && (
                        <View style={styles.subscriptionRow}>
                          <Text style={styles.subscriptionLabel}>End Date:</Text>
                          <Text style={styles.subscriptionValue}>
                            {new Date(subscription.end_date).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                      
                      {/* Trial End Date Row - Only show if exists */}
                      {subscription.trial_end_date && (
                        <View style={styles.subscriptionRow}>
                          <Text style={styles.subscriptionLabel}>Trial Ends:</Text>
                          <Text style={styles.subscriptionValue}>
                            {new Date(subscription.trial_end_date).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                      
                      {/* Amount/Price Row */}
                      <View style={styles.subscriptionRow}>
                        <Text style={styles.subscriptionLabel}>Amount:</Text>
                        <Text style={styles.subscriptionValue}>
                          {(() => {
                            try {
                              const planDetails = subscription.plan_details || 
                                (typeof subscription.plan === 'object' ? subscription.plan : null);
                              
                              if (!planDetails) return 'N/A';
                              
                              const currency = planDetails.currency || 'USD';
                              if (subscription.billing_period === 'monthly') {
                                return `${currency} ${planDetails.price_monthly || '0'}/${subscription.billing_period}`;
                              } else {
                                return `${currency} ${planDetails.price_yearly || '0'}/${subscription.billing_period}`;
                              }
                            } catch (err) {
                              console.error('Error displaying subscription amount:', err);
                              return 'N/A';
                            }
                          })()}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Plan Features Section */}
                    <View style={styles.planFeatures}>
                      <Text style={styles.featuresTitle}>Plan Features</Text>
                      
                      {(() => {
                        try {
                          const planDetails = subscription.plan_details || 
                            (typeof subscription.plan === 'object' ? subscription.plan : null);
                          
                          if (!planDetails) return (
                            <Text style={{color: '#666', fontStyle: 'italic', marginTop: 5}}>
                              Plan feature details not available
                            </Text>
                          );
                          
                          // Define all possible features with their display names
                          const features = [
                            { key: 'has_tenant_portal', name: 'Tenant Portal' },
                            { key: 'has_payment_processing', name: 'Payment Processing' },
                            { key: 'has_maintenance_management', name: 'Maintenance Management' },
                            { key: 'has_custom_branding', name: 'Custom Branding' },
                            { key: 'has_api_access', name: 'API Access' },
                            { key: 'has_reporting', name: 'Advanced Reporting' },
                            { key: 'has_accounting_integration', name: 'Accounting Integration' }
                          ];
                          
                          return (
                            <>
                              {features.map(feature => (
                                // Only render features that are defined in the plan
                                planDetails[feature.key] !== undefined && (
                                  <View key={feature.key} style={styles.featureRow}>
                                    <Ionicons 
                                      name={planDetails[feature.key] ? "checkmark-circle" : "close-circle"} 
                                      size={20} 
                                      color={planDetails[feature.key] ? "#27ae60" : "#e74c3c"} 
                                    />
                                    <Text style={styles.featureText}>{feature.name}</Text>
                                  </View>
                                )
                              ))}
                            </>
                          );
                        } catch (err) {
                          console.error('Error displaying plan features:', err);
                          return (
                            <Text style={{color: '#666', fontStyle: 'italic', marginTop: 5}}>
                              Error loading plan features
                            </Text>
                          );
                        }
                      })()}
                    </View>
                    
                    {/* Plan Limits Section */}
                    <View style={styles.planLimits}>
                      <Text style={styles.limitsTitle}>Plan Limits</Text>
                      
                      {(() => {
                        try {
                          const planDetails = subscription.plan_details || 
                            (typeof subscription.plan === 'object' ? subscription.plan : null);
                          
                          if (!planDetails) return (
                            <Text style={{color: '#666', fontStyle: 'italic', marginTop: 5}}>
                              Plan limit details not available
                            </Text>
                          );
                          
                          // Define all possible limits with their display names and override properties
                          const limits = [
                            { 
                              key: 'max_properties', 
                              name: 'Max Properties',
                              override: 'max_properties_override'
                            },
                            { 
                              key: 'max_units', 
                              name: 'Max Units',
                              override: 'max_units_override'
                            },
                            { 
                              key: 'max_users', 
                              name: 'Max Users',
                              override: 'max_users_override'
                            },
                            { 
                              key: 'max_files', 
                              name: 'Max File Storage',
                              override: 'max_files_override',
                              format: (value) => `${value} GB`
                            }
                          ];
                          
                          return (
                            <>
                              {limits.map(limit => (
                                // Only render limits that exist in either plan or as overrides
                                (planDetails[limit.key] !== undefined || subscription[limit.override] !== undefined) && (
                                  <View key={limit.key} style={styles.limitRow}>
                                    <Text style={styles.limitLabel}>{limit.name}:</Text>
                                    <Text style={styles.limitValue}>
                                      {(() => {
                                        // First check for override value in subscription
                                        if (subscription[limit.override] !== undefined) {
                                          const value = subscription[limit.override];
                                          // Apply formatting if specified
                                          return limit.format ? limit.format(value) : value || 'Unlimited';
                                        }
                                        
                                        // Then fallback to plan value
                                        const value = planDetails[limit.key];
                                        // Apply formatting if specified
                                        return limit.format ? limit.format(value) : value || 'Unlimited';
                                      })()}
                                    </Text>
                                  </View>
                                )
                              ))}
                            </>
                          );
                        } catch (err) {
                          console.error('Error displaying plan limits:', err);
                          return (
                            <Text style={{color: '#666', fontStyle: 'italic', marginTop: 5}}>
                              Error loading plan limits
                            </Text>
                          );
                        }
                      })()}
                      
                      {/* Support Level - if available */}
                      {(() => {
                        const planDetails = subscription.plan_details || 
                          (typeof subscription.plan === 'object' ? subscription.plan : null);
                        
                        if (planDetails?.support_level) {
                          return (
                            <View style={styles.limitRow}>
                              <Text style={styles.limitLabel}>Support Level:</Text>
                              <Text style={styles.limitValue}>
                                {planDetails.support_level.charAt(0).toUpperCase() + 
                                  planDetails.support_level.slice(1)}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Description - if available */}
                      {(() => {
                        const planDetails = subscription.plan_details || 
                          (typeof subscription.plan === 'object' ? subscription.plan : null);
                        
                        if (planDetails?.description) {
                          return (
                            <View style={[styles.limitRow, {marginTop: 10}]}>
                              <Text style={{fontSize: 14, color: '#666', fontStyle: 'italic'}}>
                                {planDetails.description}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.manageSubscriptionButton}
                    onPress={handleManageSubscription}
                  >
                    <Text style={styles.manageSubscriptionText}>Manage Subscription</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}          {activeTab === 'roles' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>              <View style={styles.sectionHeader}>                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={styles.sectionTitle}>Organization Roles</Text>
                  {rolesLoading && <ActivityIndicator size="small" color="#3498db" style={{marginLeft: 10}} />}
                </View>
              </View>
              
              <Text style={{fontSize: 14, color: '#666', marginBottom: 15, fontStyle: 'italic'}}>
                Roles are predefined in the system and determine user permissions.
              </Text>
              
              {rolesLoading ? (
                <View style={{padding: 20, alignItems: 'center'}}>
                  <ActivityIndicator size="large" color="#3498db" />
                  <Text style={{marginTop: 10, fontSize: 16, color: '#666'}}>Loading roles...</Text>
                </View>
              ) : !roles || roles.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="shield" size={40} color="#ccc" />
                  <Text style={styles.emptyStateText}>No roles available</Text>
                  <Text style={styles.emptyStateSubText}>Roles are predefined by the system</Text>
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
    backgroundColor: '#f8f9fa',  },
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
    fontSize: 16,    fontWeight: '600',
  },
  // Header styles
  header: {
    backgroundColor: '#3498db',
    padding: 24,
    paddingTop: 30,
  },
  headerContent: {
    alignItems: 'center',
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
    fontSize: 14,    fontWeight: '600',
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
    color: '#fff',    fontWeight: '600',
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
    alignItems: 'center',    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  
  // Organization details tab
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
    width: 24,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 20,
  },
  editButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 15,
    elevation: 2,
  },  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  
  // Members tab  
  inviteButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 5,
    elevation: 2,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  currentUserLabel: {
    fontStyle: 'italic',
    color: '#666',
    fontWeight: 'normal',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#555',
  },
  memberActions: {
    flexDirection: 'row',
  },
  memberActionButton: {
    padding: 8,
    marginLeft: 5,  },
  // Subscription tab
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  subscriptionDetails: {
    paddingVertical: 10,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  subscriptionLabel: {
    fontSize: 15,
    color: '#666',
  },
  subscriptionValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  planFeatures: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 10,
  },
  planLimits: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 15,
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  limitLabel: {
    fontSize: 15,
    color: '#666',
  },
  limitValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  manageSubscriptionButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  manageSubscriptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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