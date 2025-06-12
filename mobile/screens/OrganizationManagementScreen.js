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
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import CacheBanner from '../components/CacheBanner';

const { width, height } = Dimensions.get('window');

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
    
    return org;  };
  
  // Fetch organization data when screen comes into focus
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
        }      } else {
        setError(membersResult.error?.detail || membersResult.error?.message || 'Failed to fetch members.');
      }
      
      // Fetch organization roles using AuthContext - similar to subscriptions and members
      console.log('💥 Fetching roles, isRefreshing:', isRefreshing);
      const rolesResult = await fetchRoles(isRefreshing);
      console.log('💥 Roles result:', rolesResult);
        if (rolesResult.success) {
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
  }  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <View style={styles.organizationInfo}>
            <View style={styles.organizationIcon}>
              <Ionicons name="business" size={24} color="#fff" />
            </View>
            <View style={styles.organizationDetails}>
              <Text style={styles.organizationName}>{organization?.name}</Text>
              <Text style={styles.memberCount}>{members?.length || 0} members</Text>
            </View>
          </View>
          
          {organization?.user_role && (
            <View style={styles.roleBadgeContainer}>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#fff" />
                <Text style={styles.roleBadgeText}>{organization.user_role}</Text>
              </View>
            </View>
          )}
        </View>
        
        {organizationFromCache && <CacheBanner visible={true} />}
      </View>

      {/* Enhanced Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollView}>
          {[
            { key: 'details', icon: 'information-circle', label: 'Details' },
            { key: 'members', icon: 'people', label: 'Members' },
            { key: 'subscription', icon: 'card', label: 'Subscription' },
            { key: 'roles', icon: 'shield', label: 'Roles' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, activeTab === tab.key && styles.activeTabButton]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={activeTab === tab.key ? '#3498db' : '#666'}
              />
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >        {activeTab === 'details' && (
          <View style={styles.tabContent}>
            {/* Organization Info Card */}
            <View style={styles.modernCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="business" size={24} color="#3498db" />
                </View>
                <Text style={styles.cardTitle}>Organization Information</Text>
              </View>
              
              <View style={styles.cardContent}>
                {[
                  { icon: 'business', label: 'Name', value: organization?.name },
                  { icon: 'location', label: 'Address', value: organization?.address || 'Not provided' },
                  { icon: 'mail', label: 'Email', value: organization?.email || 'Not provided' },
                  { icon: 'call', label: 'Phone', value: organization?.phone || 'Not provided' },
                  { icon: 'globe', label: 'Website', value: organization?.website || 'Not provided' },
                  { icon: 'person-circle', label: 'Owner', value: `${organization?.primary_owner?.first_name || ''} ${organization?.primary_owner?.last_name || ''}`.trim() || 'Not specified' }
                ].map((item, index) => (
                  <View key={index} style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name={item.icon} size={18} color="#666" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>{item.label}</Text>
                      <Text style={styles.infoValue}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Description Card */}
            <View style={styles.modernCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="document-text" size={24} color="#9b59b6" />
                </View>
                <Text style={styles.cardTitle}>Description</Text>
              </View>
              
              <View style={styles.cardContent}>
                <Text style={styles.descriptionText}>
                  {organization?.description || 'No description provided for this organization.'}
                </Text>
              </View>
            </View>
            
            {/* Organization Stats Card */}
            <View style={styles.modernCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="stats-chart" size={24} color="#e67e22" />
                </View>
                <Text style={styles.cardTitle}>Quick Stats</Text>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{members?.length || 0}</Text>
                  <Text style={styles.statLabel}>Members</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{roles?.length || 0}</Text>
                  <Text style={styles.statLabel}>Roles</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {organization?.created_at 
                      ? Math.floor((new Date() - new Date(organization.created_at)) / (1000 * 60 * 60 * 24))
                      : '0'
                    }
                  </Text>
                  <Text style={styles.statLabel}>Days Active</Text>
                </View>
              </View>
            </View>            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => navigation.navigate('EditOrganization', { organization })}
            >
              <View style={styles.buttonContainer}>
                <Ionicons name="create" size={20} color="#fff" />
                <Text style={styles.primaryActionText}>Edit Organization</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
          {activeTab === 'members' && (
          <View style={styles.tabContent}>
            {/* Members Header */}
            <View style={styles.membersHeader}>
              <View style={styles.membersHeaderInfo}>
                <Text style={styles.membersTitle}>Team Members</Text>
                <Text style={styles.membersSubtitle}>{members.length} total members</Text>
              </View>              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleInviteUser}
              >
                <View style={styles.inviteButtonContainer}>
                  <Ionicons name="person-add" size={18} color="#fff" />
                  <Text style={styles.inviteButtonText}>Invite</Text>
                </View>
              </TouchableOpacity>
            </View>

            {members.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="people" size={48} color="#bdc3c7" />
                </View>
                <Text style={styles.emptyStateTitle}>No members yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Start building your team by inviting members to your organization
                </Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={handleInviteUser}>
                  <Text style={styles.emptyStateButtonText}>Invite Your First Member</Text>
                </TouchableOpacity>
              </View>
            ) : (              <View style={styles.modernCard}>
                {members.map((member, index) => {
                  console.log('🎭 Rendering member:', {
                    id: member.id,
                    user_details: member.user_details,
                    user: member.user,
                    memberKeys: Object.keys(member)
                  });
                  
                  return (
                  <View key={member.id}>
                    <View style={styles.memberCard}>
                      <View style={styles.memberInfo}>                        <View style={[
                          styles.memberAvatar,
                          { backgroundColor: `hsl(${(member.id?.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) * 137.5) % 360}, 70%, 50%)` }
                        ]}>
                          <Text style={styles.memberInitial}>
                            {(() => {
                              // Get the first name or fallback to email prefix
                              const firstName = member.user_details?.first_name || member.user?.first_name;
                              const lastName = member.user_details?.last_name || member.user?.last_name;
                              const email = member.user_details?.email || member.user?.email;
                              const username = member.user_details?.username || member.user?.username;
                              
                              if (firstName && lastName) {
                                return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
                              } else if (firstName) {
                                return firstName.charAt(0).toUpperCase();
                              } else if (email) {
                                return email.charAt(0).toUpperCase();
                              } else if (username) {
                                return username.charAt(0).toUpperCase();
                              }
                              return 'U';
                            })()}
                          </Text>
                        </View>
                        
                        <View style={styles.memberDetails}>
                          <View style={styles.memberNameContainer}>
                            <Text style={styles.memberName}>
                              {member.user_details?.first_name ||
                               member.user?.first_name ||
                               member.user_details?.email?.split('@')[0] ||
                               member.user?.email?.split('@')[0] ||
                               'User'} {member.user_details?.last_name || member.user?.last_name || ''}
                            </Text>
                            {(member.user_details?.id === user?.id || member.user?.id === user?.id) && (
                              <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>You</Text>
                              </View>
                            )}
                          </View>
                          
                          <Text style={styles.memberEmail}>
                            {member.user_details?.email || member.user?.email}
                          </Text>
                          
                          <View style={styles.memberRoleBadge}>
                            <Ionicons name="shield-checkmark" size={12} color="#3498db" />
                            <Text style={styles.memberRoleText}>
                              {
                                (member.role && typeof member.role === 'object' && member.role.name) ||
                                (member.role_details && member.role_details.name) ||
                                (member.role && typeof member.role === 'string' && 
                                 roles.find(r => r.id.toString() === member.role.toString())?.name) ||
                                'Member'
                              }
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.memberActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleManageUserRole(member)}
                        >
                          <Ionicons name="settings" size={18} color="#3498db" />
                        </TouchableOpacity>
                        
                        {(member.user_details?.id !== user?.id && member.user?.id !== user?.id) && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.dangerButton]}
                            onPress={() => handleRemoveUser(member)}
                          >
                            <Ionicons name="trash" size={18} color="#e74c3c" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                      {index < members.length - 1 && <View style={styles.memberDivider} />}
                  </View>
                  );
                })}
              </View>
            )}
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
    backgroundColor: '#f8f9fa',
  },
  
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
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
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },  // Modern Header Styles
  headerContainer: {
    backgroundColor: '#3498db',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  organizationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  organizationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  organizationDetails: {
    flex: 1,
  },
  organizationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  roleBadgeContainer: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },

  // Enhanced Tab Navigation
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    elevation: 2,
  },
  tabScrollView: {
    flexDirection: 'row',
  },
  tabButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: width / 4,
    position: 'relative',
  },
  activeTabButton: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#3498db',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#3498db',
    borderRadius: 2,
  },

  // Content Styles
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  tabContent: {
    padding: 16,
  },

  // Modern Card Styles
  modernCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cardContent: {
    padding: 20,
  },

  // Info Row Styles
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    marginTop: 2,
  },

  // Description Styles
  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e1e8ed',
    marginHorizontal: 16,
  },
  // Action Buttons
  primaryActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: '#3498db', // Solid background
  },  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Members Tab Styles
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  membersHeaderInfo: {
    flex: 1,
  },
  membersTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  membersSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },  inviteButton: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    backgroundColor: '#27ae60', // Solid green background
  },  inviteButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Member Cards
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 8,
  },
  youBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  youBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  memberRoleText: {
    fontSize: 11,
    color: '#3498db',
    fontWeight: '600',
    marginLeft: 4,
  },
  memberActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#ffebee',
  },
  memberDivider: {
    height: 1,
    backgroundColor: '#f1f3f4',
    marginHorizontal: 16,
  },

  // Empty States
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Subscription Tab Styles
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 1,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subscriptionDetails: {
    padding: 20,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  subscriptionLabel: {
    fontSize: 15,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  subscriptionValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
  },
  planFeatures: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 12,
    flex: 1,
  },
  planLimits: {
    padding: 20,
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  limitLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  limitValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  manageSubscriptionButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  manageSubscriptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  setupButton: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Roles Tab Styles
  roleItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#2c3e50',
  },
  roleType: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  permissionBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  permissionText: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '500',
  },  roleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },

  // Additional Styles for Section and Empty States
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default OrganizationManagementScreen;