import React, { useState } from 'react';
import {
  Box,
  Tab,
  Tabs,
  Typography,
  Paper,
} from '@mui/material';
import { RolesList, UserRoleManagement } from '../components/roles';
import { RoleProvider } from '../context/RoleContext';

// TabPanel component for switching between tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`role-tabpanel-${index}`}
      aria-labelledby={`role-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const RoleManagement = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <RoleProvider>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Role & Permissions Management
        </Typography>
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              aria-label="role management tabs"
              sx={{ px: 2, pt: 2 }}
            >
              <Tab label="User Role Assignments" />
              <Tab label="Role Definitions" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <UserRoleManagement />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <RolesList />
          </TabPanel>
        </Paper>
      </Box>
    </RoleProvider>
  );
};

export default RoleManagement;
