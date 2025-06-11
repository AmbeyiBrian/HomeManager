import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = ({ navigation }) => {    const { 
    user, 
    logout, 
    getCachedData, 
    cacheDataForOffline, 
    fetchMyOrganization, 
    currentOrganization,
    isOffline 
  } = useAuth();
    const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);  useEffect(() => {
    fetchUserOrganization();
    loadSettings();
  }, []);
  const loadSettings = async () => {
    try {
      const offlineSetting = await getCachedData('offline_enabled');
      const notificationsSetting = await getCachedData('notifications_enabled');
      
      if (offlineSetting !== null) {
        setOfflineEnabled(offlineSetting === 'true');
      }
      
      if (notificationsSetting !== null) {
        setNotificationsEnabled(notificationsSetting === 'true');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };
  const saveSettings = async (setting, value) => {
    try {
      await cacheDataForOffline(setting, value.toString());
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };  // Helper function to ensure organization object has the required role information
  const ensureOrganizationRole = (org) => {
    if (!org) return org;
    
    console.log('Checking organization role data:', org);
    
    // Check if user_role is missing or undefined
    if (org.user_role === undefined) {
      console.log('user_role property missing, looking for alternative sources');
      
      // Try to find role information from membership data if available
      if (org.memberships && Array.isArray(org.memberships)) {
        console.log('Found memberships array in organization data');
        const userMembership = org.memberships.find(m => {
          // Check different possible structures of user ID in membership objects
          const membershipUserId = typeof m.user === 'object' ? m.user.id : m.user;
          return membershipUserId === user?.id || membershipUserId === user?.id?.toString();
        });
        
        if (userMembership && userMembership.role) {
          console.log('Found user membership with role:', userMembership.role);
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
        console.log('Checking user_membership field:', org.user_membership);
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
          console.log('User is primary owner, setting role as owner');
          org.user_role = 'owner';
        }
      }
      
      // Default to 'member' if nothing else is available
      if (!org.user_role) {
        console.log('No role information found, defaulting to member');
        org.user_role = 'member';
      }
    }
    
    console.log('Final organization with role:', org);
    return org;
  };
  const fetchUserOrganization = async () => {
    try {
      console.log('Starting fetchUserOrganization');
      
      // If we have currentOrganization from AuthContext, use it
      if (currentOrganization) {
        console.log('Using currentOrganization from AuthContext:', currentOrganization);
        const orgWithRole = ensureOrganizationRole(currentOrganization);
        setOrganization(orgWithRole);
        return;
      }
      
      if (isOffline) {
        // If offline, try to load cached organization
        const cachedOrg = await getCachedData('user_organization');
        if (cachedOrg) {
          console.log('Offline mode - cached organization:', cachedOrg);
          const orgWithRole = ensureOrganizationRole(cachedOrg);
          setOrganization(orgWithRole);
        }
        return;
      }
      
      setLoading(true);
      // Use the AuthContext method to fetch the user's organization
      const result = await fetchMyOrganization();
      console.log('Organization API result:', result);
      
      if (result.success && result.data) {
        console.log('Organization data:', result.data);
        
        // Process organization to ensure it has role information
        const processedOrgData = ensureOrganizationRole(result.data);
        console.log('Organization data with role:', processedOrgData);
        
        setOrganization(processedOrgData);
        
        // Cache organization for offline use
        await cacheDataForOffline('user_organization', processedOrgData);
      } else {
        console.error('Failed to fetch organization:', result.error);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching organization:', error);
      setLoading(false);
    }
  };
  const handleToggleOffline = (value) => {
    setOfflineEnabled(value);
    saveSettings('offline_enabled', value);
  };

  const handleToggleNotifications = (value) => {
    setNotificationsEnabled(value);
    saveSettings('notifications_enabled', value);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: () => logout()
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* User Info Section */}
      <View style={styles.userSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.first_name ? user.first_name[0] : ''}
              {user?.last_name ? user.last_name[0] : ''}
            </Text>
          </View>
        </View>
        
        <Text style={styles.userName}>
          {user?.first_name} {user?.last_name}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.userPhone}>{user?.phone_number || 'No phone number'}</Text>
      </View>
        {/* Organization */}
      {organization && (
        <View style={styles.currentOrgSection}>
          <Text style={styles.sectionTitle}>Organization</Text>
          <View style={styles.orgCard}>
            {organization.logo ? (
              <Image source={{ uri: organization.logo }} style={styles.orgLogo} />
            ) : (
              <View style={styles.orgLogoPlaceholder}>
                <Text style={styles.orgLogoText}>
                  {organization.name.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.orgInfo}>
              <Text style={styles.orgName}>{organization.name}</Text>
              <Text style={styles.orgRole}>
                Role: {organization.user_role ? 
                      organization.user_role.charAt(0).toUpperCase() + organization.user_role.slice(1) : 
                      'Member'}
              </Text>
            </View>
          </View>
        </View>
      )}
      
      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="cloud-download-outline" size={22} color="#555" />
            <Text style={styles.settingText}>Enable Offline Mode</Text>
          </View>
          <Switch
            value={offlineEnabled}
            onValueChange={handleToggleOffline}
            trackColor={{ false: '#d0d0d0', true: '#bde0fe' }}
            thumbColor={offlineEnabled ? '#3498db' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications-outline" size={22} color="#555" />
            <Text style={styles.settingText}>Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#d0d0d0', true: '#bde0fe' }}
            thumbColor={notificationsEnabled ? '#3498db' : '#f4f3f4'}
          />
        </View>
      </View>
      
      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('EditProfile')}>
          <View style={styles.actionInfo}>
            <Ionicons name="person-outline" size={22} color="#555" />
            <Text style={styles.actionText}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('ChangePassword')}>
          <View style={styles.actionInfo}>
            <Ionicons name="key-outline" size={22} color="#555" />
            <Text style={styles.actionText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>      {/* Show role management options for admins/owners */}
        {organization && (
          <>
            {/* Debug info for role-based permissions */}
            {console.log('Current org details for permissions check:', JSON.stringify(organization, null, 2))}
            {console.log('User role property exists:', organization.hasOwnProperty('user_role'))}
            {console.log('User role value:', organization.user_role)}
            {console.log('Current user is admin/owner?', 
              organization.user_role === 'admin' || 
              organization.user_role === 'owner' || 
              organization.user_role === 'Admin' || 
              organization.user_role === 'Owner')}
              {/* Organization Management - Show only for admin/owner roles or when role can't be determined */}
            {(organization.user_role?.toLowerCase() === 'admin' || 
             organization.user_role?.toLowerCase() === 'owner' || 
             organization.user_role?.toLowerCase()?.includes('admin') || 
             organization.user_role?.toLowerCase()?.includes('owner') || 
             !organization.user_role) && (
              <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('OrganizationManagement')}>
                <View style={styles.actionInfo}>
                  <Ionicons name="business-outline" size={22} color="#555" />
                  <Text style={styles.actionText}>Organization Management</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#bbb" />
              </TouchableOpacity>
            )}
              {/* Manage Roles - Show only for admin/owner roles or when role can't be determined */}
            {(organization.user_role?.toLowerCase() === 'admin' || 
             organization.user_role?.toLowerCase() === 'owner' || 
             organization.user_role?.toLowerCase()?.includes('admin') || 
             organization.user_role?.toLowerCase()?.includes('owner') || 
             !organization.user_role) && (
              <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('RoleManagement')}>
                <View style={styles.actionInfo}>
                  <Ionicons name="shield-outline" size={22} color="#555" />
                  <Text style={styles.actionText}>Manage Roles</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#bbb" />
              </TouchableOpacity>
            )}
              {/* Assign User Roles - Show only for admin/owner roles or when role can't be determined */}
            {(organization.user_role?.toLowerCase() === 'admin' || 
             organization.user_role?.toLowerCase() === 'owner' || 
             organization.user_role?.toLowerCase()?.includes('admin') || 
             organization.user_role?.toLowerCase()?.includes('owner') || 
             !organization.user_role) && (
              <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('UserRoleAssignment')}>
                <View style={styles.actionInfo}>
                  <Ionicons name="people" size={22} color="#555" />
                  <Text style={styles.actionText}>Assign User Roles</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#bbb" />
              </TouchableOpacity>
            )}

            {/* QR Code Manager - Available to all organization members */}
            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('QRCodeManager')}>
              <View style={styles.actionInfo}>
                <Ionicons name="qr-code" size={22} color="#555" />
                <Text style={styles.actionText}>QR Code Manager</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#bbb" />
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
          <View style={styles.actionInfo}>
            <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
            <Text style={[styles.actionText, { color: '#e74c3c' }]}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.version}>HomeManager v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userSection: {
    backgroundColor: '#3498db',
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  userPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  currentOrgSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 12,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  orgLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  orgLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  orgLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  orgRole: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  orgSwitchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orgSwitchLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  orgSwitchLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orgSwitchInfo: {
    flex: 1,
  },
  orgSwitchName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  orgSwitchRole: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  version: {
    fontSize: 12,
    color: '#95a5a6',
  },
});

export default ProfileScreen;
