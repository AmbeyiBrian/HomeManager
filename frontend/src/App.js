import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './App.css';

// Import auth components
import { AuthProvider } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';

// Import components
import Navigation from './components/Navigation';
import TenantPortal from './pages/TenantPortal';
import TenantAccess from './pages/TenantAccess';
import OrganizationManager from './pages/OrganizationManager';
import Login from './pages/Login';
import Register from './pages/Register';
import PasswordReset from './pages/PasswordReset';
import PropertyCreate from './pages/PropertyCreate';
import PropertyList from './pages/PropertyList';
import EnhancedPropertyList from './pages/EnhancedPropertyList';
import PropertyDetail from './pages/PropertyDetail';
import TenantList from './pages/TenantList';
import EnhancedTenantList from './pages/EnhancedTenantList';
import TicketList from './pages/TicketList';
import EnhancedTicketList from './pages/EnhancedTicketList';
import TicketDetail from './pages/TicketDetail';
import PaymentList from './pages/PaymentList';
import EnhancedPaymentList from './pages/EnhancedPaymentList';
import Profile from './pages/Profile';
import NoticeList from './pages/NoticeList';
import EnhancedNoticeList from './pages/EnhancedNoticeList';
import TeamMembers from './pages/TeamMembers';
import EnhancedTeamMembers from './pages/EnhancedTeamMembers';
import EnhancedProfile from './pages/EnhancedProfile';
import Dashboard from './pages/Dashboard';
import EnhancedDashboard from './pages/EnhancedDashboard';
import RoleManagement from './pages/RoleManagement';
import EnhancedRoleManagement from './pages/EnhancedRoleManagement';
import EnhancedAnalytics from './pages/EnhancedAnalytics';
import EnhancedSMS from './pages/EnhancedSMS';
import EnhancedOrganizationManager from './pages/EnhancedOrganizationManager';

// Layout with navigation
const Layout = ({ children }) => (
  <>
    <Navigation />
    <div>{children}</div>
  </>
);

// Private Route implementation with authentication check using AuthContext
const PrivateRoute = ({ children }) => {
  // Use localStorage for initial check to prevent the need for context
  // The AuthContext with more advanced validation will be available after login
  const token = localStorage.getItem('token');
  
  // Try to decode token to check if it's expired
  if (token) {
    try {
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // If token exists and is not expired
      if (decodedToken && decodedToken.exp > currentTime) {
        return children;
      }
    } catch (error) {
      console.error('Token validation error in PrivateRoute:', error);
    }
  }
  
  // If no token or expired, navigate to login
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
    <RoleProvider>
          <Router>
            <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        
        {/* Tenant Portal Routes - public, no authentication needed */}
        <Route path="/tenant-access" element={<Layout><TenantAccess /></Layout>} />
        <Route path="/tenant-portal" element={<Layout><TenantPortal /></Layout>} />
        <Route path="/tenant-portal/:qrCode" element={<Layout><TenantPortal /></Layout>} />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout>
              <EnhancedDashboard />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Layout>
              <EnhancedDashboard />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/organizations" element={
          <PrivateRoute>
            <Layout>
              <EnhancedOrganizationManager />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/properties" element={
          <PrivateRoute>
            <Layout>
              <EnhancedPropertyList />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/properties/new" element={
          <PrivateRoute>
            <Layout>
              <PropertyCreate />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/properties/:id" element={
          <PrivateRoute>
            <Layout>
              <PropertyDetail />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/tenants" element={
          <PrivateRoute>
            <Layout>
              <EnhancedTenantList />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/tickets" element={
          <PrivateRoute>
            <Layout>
              <EnhancedTicketList />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/tickets/:id" element={
          <PrivateRoute>
            <Layout>
              <TicketDetail />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/payments" element={
          <PrivateRoute>
            <Layout>
              <EnhancedPaymentList />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/notices" element={
          <PrivateRoute>
            <Layout>
              <EnhancedNoticeList />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute>
            <Layout>
              <EnhancedProfile />
            </Layout>
          </PrivateRoute>
        } />
        
        {/* New routes for Team Members */}
        <Route path="/team-members" element={
          <PrivateRoute>
            <Layout>
              <EnhancedTeamMembers />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/role-management" element={
          <PrivateRoute>
            <Layout>
              <EnhancedRoleManagement />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute>
            <Layout>
              <EnhancedAnalytics />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/sms" element={
          <PrivateRoute>
            <Layout>
              <EnhancedSMS />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </RoleProvider>
    </AuthProvider>
  );
}

export default App;
