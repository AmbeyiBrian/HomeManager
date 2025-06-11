import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

import { useApi } from '../hooks/useApi';

const OrganizationsScreen = ({ navigation }) => {
  const { 
    user, 
    currentOrganization, 
    isOffline, 
    getCachedData, 
    cacheDataForOffline,
    fetchMyOrganization 
  } = useAuth();
  const { endpoints } = useApi();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrganizationDetails = async () => {
    try {
      setLoading(true);
      
      // If we have currentOrganization from AuthContext, use it
      if (currentOrganization) {
        console.log('Using currentOrganization from AuthContext:', currentOrganization);
        setOrganization(currentOrganization);
        setLoading(false);
        return;
      }
      
      if (isOffline) {
        // If offline, try to load cached organization
        const cachedOrg = await getCachedData('user_organization');
        if (cachedOrg) {
          console.log('Offline mode - using cached organization:', cachedOrg);
          setOrganization(cachedOrg);
        }
        setLoading(false);
        return;
      }
      
      // Use the AuthContext method to fetch the user's organization
      const result = await fetchMyOrganization();
      console.log('Organization API result:', result);
      
      if (result.success && result.data) {
        console.log('Organization data:', result.data);
        setOrganization(result.data);
        
        // Cache organization for offline use
        await cacheDataForOffline('user_organization', result.data);
      } else {
        console.error('Failed to fetch organization:', result.error);
        setOrganization(null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching organization details:', error);
      setOrganization(null);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrganizationDetails();
    setRefreshing(false);
  };
  useEffect(() => {
    fetchOrganizationDetails();
  }, []);

  // Removed handleSelectOrganization function as switching is no longer possible

  const renderOrganizationDetails = () => {
    if (!organization) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={80} color="#dddddd" />
          <Text style={styles.emptyText}>No Organization Assigned</Text>
          <Text style={styles.emptySubtext}>
            You are not currently assigned to an organization.
          </Text>
        </View>
      );
    }    // Check if user has admin permissions
    const isAdmin = organization.user_role?.toLowerCase() === 'admin' || 
                   organization.user_role?.toLowerCase() === 'owner' || 
                   organization.user_role?.toLowerCase()?.includes('admin') || 
                   organization.user_role?.toLowerCase()?.includes('owner');

    return (
      <View>
        <View style={styles.orgCard}> 
          {organization.logo ? (
            <Image source={{ uri: organization.logo }} style={styles.orgLogo} />
          ) : (
            <View style={styles.orgLogoPlaceholder}>
              <Text style={styles.orgLogoText}>
                {organization.name ? organization.name.charAt(0) : 'O'}
              </Text>
            </View>
          )}
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>{organization.name || 'Organization Details'}</Text>
            {/* Additional details can be shown here if needed */}
            <Text style={styles.orgRole}>
              Role: {organization.user_role ? 
                    organization.user_role.charAt(0).toUpperCase() + organization.user_role.slice(1) : 
                    'Member'}
            </Text>
            <View style={styles.orgStats}>
              <View style={styles.orgStat}>
                <Ionicons name="business-outline" size={14} color="#7f8c8d" />
                <Text style={styles.orgStatText}>
                  {organization.properties_count || 0} Properties
                </Text>
              </View>
              <View style={styles.orgStat}>
                <Ionicons name="people-outline" size={14} color="#7f8c8d" />
                <Text style={styles.orgStatText}>
                  {organization.members_count || 0} Members
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Admin Management Section - only visible to admins/owners */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Administration</Text>
            
            <TouchableOpacity 
              style={styles.adminItem} 
              onPress={() => navigation.navigate('RoleManagement')}
            >
              <View style={styles.adminItemContent}>
                <Ionicons name="shield-outline" size={22} color="#3498db" />
                <View style={styles.adminItemText}>
                  <Text style={styles.adminItemTitle}>Role Management</Text>
                  <Text style={styles.adminItemSubtitle}>Manage roles and permissions</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#bbb" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.adminItem} 
              onPress={() => navigation.navigate('UserRoleAssignment')}
            >
              <View style={styles.adminItemContent}>
                <Ionicons name="people" size={22} color="#3498db" />
                <View style={styles.adminItemText}>
                  <Text style={styles.adminItemTitle}>User Role Assignment</Text>
                  <Text style={styles.adminItemSubtitle}>Assign roles to organization members</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#bbb" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Organization</Text> 
          <Text style={styles.headerSubtitle}>
            Details of your current organization
          </Text>
        </View>
        
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
          </View>
        ) : (
          <>
            {renderOrganizationDetails()}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    // marginBottom: 8, // Adjusted as Create Org button is removed
  },
  orgCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOrgCard: {
    // Styles for selected card - may not be needed if only one org is displayed
    // backgroundColor: '#f0f9ff',
    // borderWidth: 1,
    // borderColor: '#3498db',
  },
  orgLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  orgLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  orgLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  orgRole: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  orgStats: {
    flexDirection: 'row',
  },
  orgStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  orgStatText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
  },
  // Admin Section Styles
  adminSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  adminItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminItemText: {
    marginLeft: 12,
  },
  adminItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  adminItemSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
});

export default OrganizationsScreen;
