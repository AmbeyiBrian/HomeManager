import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';

// Import additional screens
import RegisterScreen from './screens/RegisterScreen';
import TenantPortalScreen from './screens/TenantPortalScreen';
import PropertiesScreen from './screens/PropertiesScreen';
import TicketsScreen from './screens/TicketsScreen';
import ProfileScreen from './screens/ProfileScreen';
import PropertyDetailScreen from './screens/PropertyDetailScreen';
import OrganizationsScreen from './screens/OrganizationsScreen';
import UnitDetailScreen from './screens/UnitDetailScreen';
import AddTenantScreen from './screens/AddTenantScreen';

// Import all implemented screens
import TenantsScreen from './screens/TenantsScreen';
import TicketDetailScreen from './screens/TicketDetailScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import AddPropertyScreen from './screens/AddPropertyScreen';
import AddUnitScreen from './screens/AddUnitScreen';
import CreateTicketScreen from './screens/CreateTicketScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import CreateOrganizationScreen from './screens/CreateOrganizationScreen';
import EditPropertyScreen from './screens/EditPropertyScreen';
import EditUnitScreen from './screens/EditUnitScreen';
import RoleManagementScreen from './screens/RoleManagementScreen';
import UserRoleAssignmentScreen from './screens/UserRoleAssignmentScreen';
import QRCodeManagerScreen from './screens/QRCodeManagerScreen';
import PaymentDetailsScreen from './screens/PaymentDetailsScreen';
import AddPaymentScreen from './screens/AddPaymentScreen';
import OrganizationManagementScreen from './screens/OrganizationManagementScreen';
import EditOrganizationScreen from './screens/EditOrganizationScreen';
import SubscriptionManagementScreen from './screens/SubscriptionManagementScreen';
import InviteUserScreen from './screens/InviteUserScreen';

// Import Notice Screens
import NoticesScreen from './screens/NoticesScreen';
import NoticeDetailScreen from './screens/NoticeDetailScreen';
import CreateNoticeScreen from './screens/CreateNoticeScreen';
import EditNoticeScreen from './screens/EditNoticeScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Helper function to get time-based greeting
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else if (hour >= 17 && hour < 22) {
    return 'Good evening';
  } else {
    return 'Good night';
  }
};

// Custom Header Component with greeting and date
const CustomHeader = ({ route }) => {
  const { authState } = useAuth();
  const { user, isOffline } = authState;
    return (
    <View style={headerStyles.container}>
      {/* Main content row - greeting on left, screen title on right */}
      <View style={headerStyles.mainRow}>
        <View style={headerStyles.greetingSection}>
          <Text style={headerStyles.greeting}>
            {getTimeBasedGreeting()}, {user?.first_name || 'User'}!
          </Text>
          <Text style={headerStyles.date}>
            {new Date().toDateString()}
          </Text>
        </View>
        <View style={headerStyles.titleSection}>
          <Text style={headerStyles.screenTitle}>
            {route.name}
          </Text>
        </View>
      </View>
      
      {/* Offline indicator below if needed */}
      {isOffline && (
        <View style={headerStyles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={14} color="#fff" />
          <Text style={headerStyles.offlineText}>Offline</Text>
        </View>
      )}
    </View>
  );
};

// Auth Navigator
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login"        component={LoginScreen} />
    <Stack.Screen name="Register"     component={RegisterScreen} />
    <Stack.Screen name="TenantPortal" component={TenantPortalScreen} />
  </Stack.Navigator>
);

// Main Tab Navigator (after login)
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Properties') {
          iconName = focused ? 'business' : 'business-outline';
        } else if (route.name === 'Tenants') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'Tickets') {
          iconName = focused ? 'construct' : 'construct-outline';
        } else if (route.name === 'Payments') {
          iconName = focused ? 'cash' : 'cash-outline';
        } else if (route.name === 'Notices') { // New entry
          iconName = focused ? 'list-circle' : 'list-circle-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#3498db',
      tabBarInactiveTintColor: 'gray',
      header: (props) => <CustomHeader route={props.route} />,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Properties" component={PropertiesScreen} />
    <Tab.Screen name="Tenants" component={TenantsScreen} />
    <Tab.Screen name="Tickets" component={TicketsScreen} />
    <Tab.Screen name="Payments" component={PaymentsScreen} />
    <Tab.Screen name="Notices" component={NoticesScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Main Stack Navigator (includes tabs and other screens)
const MainStackNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Main" 
      component={MainTabNavigator} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="PropertyDetails" 
      component={PropertyDetailScreen}
      options={({ route }) => ({ title: route.params.property.name })}
    />
    <Stack.Screen 
      name="UnitDetail" 
      component={UnitDetailScreen}
      options={({ route }) => ({ title: `Unit ${route.params.unit.unit_number}` })}
    />
    <Stack.Screen 
      name="TicketDetail" 
      component={TicketDetailScreen}
      options={{ title: 'Maintenance Ticket' }}
    />
    <Stack.Screen 
      name="TenantPortal" 
      component={TenantPortalScreen}
      options={{ title: 'Tenant Portal' }}
    />
    <Stack.Screen 
      name="AddProperty" 
      component={AddPropertyScreen}
      options={{ title: 'Add New Property' }}
    />
    <Stack.Screen 
      name="AddTenant" 
      component={AddTenantScreen}
      options={{ title: 'Add New Tenant' }}
    />
    <Stack.Screen 
      name="AddUnit" 
      component={AddUnitScreen}
      options={{ title: 'Add New Unit' }}
    />
    <Stack.Screen 
      name="CreateTicket" 
      component={CreateTicketScreen}
      options={{ title: 'Report Maintenance Issue' }}
    />
    <Stack.Screen 
      name="EditProfile" 
      component={EditProfileScreen}
      options={{ title: 'Edit Profile' }}
    />
    <Stack.Screen 
      name="ChangePassword" 
      component={ChangePasswordScreen}
      options={{ title: 'Change Password' }}
    />    
    <Stack.Screen 
      name="Organizations" 
      component={OrganizationsScreen}
      options={{ title: 'My Organizations' }}
    />
    <Stack.Screen 
      name="CreateOrganization" 
      component={CreateOrganizationScreen}
      options={{ title: 'Create Organization' }}
    />
    <Stack.Screen 
      name="EditProperty" 
      component={EditPropertyScreen}
      options={({ route }) => ({ title: `Edit ${route.params.property.name}` })}
    />
    <Stack.Screen 
      name="EditUnit" 
      component={EditUnitScreen}
      options={{ title: 'Edit Unit' }}
    />
    <Stack.Screen 
      name="RoleManagement" 
      component={RoleManagementScreen}
      options={{ title: 'Role Management' }}
    />
    <Stack.Screen 
      name="UserRoleAssignment" 
      component={UserRoleAssignmentScreen}
      options={{ title: 'Assign User Roles' }}
    />
    <Stack.Screen 
      name="OrganizationManagement" 
      component={OrganizationManagementScreen}
      options={{ title: 'Organization Management' }}
    />
    <Stack.Screen 
      name="QRCodeManager" 
      component={QRCodeManagerScreen}
      options={{ title: 'QR Code Manager' }}
    />
    <Stack.Screen 
      name="PaymentDetails" 
      component={PaymentDetailsScreen}
      options={{ title: 'Payment Details' }}
    />    
    <Stack.Screen 
      name="AddPayment" 
      component={AddPaymentScreen}
      options={{ title: 'Create Payment' }}
    />
    {/* Notice Screens */}
    <Stack.Screen 
      name="NoticeDetail" 
      component={NoticeDetailScreen} 
      // Title is set dynamically in NoticeDetailScreen using navigation.setOptions
    />
    <Stack.Screen 
      name="CreateNotice" 
      component={CreateNoticeScreen}
      options={{ title: 'Create New Notice' }}
    />
    <Stack.Screen 
      name="EditNotice" 
      component={EditNoticeScreen}
      // Title is set dynamically in EditNoticeScreen using navigation.setOptions
    />
    <Stack.Screen 
      name="EditOrganization" 
      component={EditOrganizationScreen}
      options={{ title: 'Edit Organization' }}
    />
    <Stack.Screen 
      name="SubscriptionManagement" 
      component={SubscriptionManagementScreen}
      options={{ title: 'Subscription Management' }}
    />
    <Stack.Screen 
      name="InviteUser" 
      component={InviteUserScreen}
      options={{ title: 'Invite User' }}
    />
  </Stack.Navigator>
);

// Root Navigator that handles authentication state
const RootNavigator = () => {
  const { authState, checkAndRefreshToken } = useAuth();
  const { authenticated, loading, isOffline } = authState;
  
  // Check and refresh token when app is mounted
  React.useEffect(() => {
    const tokenCheck = async () => {
      if (authenticated) {
        await checkAndRefreshToken();
      }
    };
    
    tokenCheck();
    
    // Set up a timer to check the token periodically (every 5 minutes)
    const tokenRefreshInterval = setInterval(() => {
      if (authenticated) {
        checkAndRefreshToken();
      }
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
    
    // Clean up the interval when component unmounts
    return () => clearInterval(tokenRefreshInterval);
  }, [authenticated]);
  
  // Set up AppState listener to check token when app comes to foreground
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && authenticated) {
        // App has come to the foreground, check token
        checkAndRefreshToken();
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Unsubscribe when component unmounts
      subscription.remove();
    };
  }, [authenticated]);
  
  // Show splash screen while checking authentication
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }
  
  return (
    <>
      <NavigationContainer>
        {authenticated ? <MainStackNavigator /> : <AuthNavigator />}
      </NavigationContainer>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}
    </>
  );
};

// App entry point with auth provider
export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

// Some basic styles
const styles = {
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#e74c3c',
    padding: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: 'bold',
  },
};

// Header styles
const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#3498db',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    numberOfLines: 1,
    flexShrink: 1,
  },
  date: {
    fontSize: 14,
    color: '#ecf0f1',
    marginTop: 2,
  },
  titleSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'right',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});
