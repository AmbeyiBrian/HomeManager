import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Build as BuildIcon,
  Payments as PaymentsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Group as GroupIcon,
  ColorLens as ColorLensIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  BarChart as BarChartIcon,
  Phone as PhoneIcon,
  Sms as SmsIcon
} from '@mui/icons-material';

// Define branding defaults
const branding = {
  logoUrl: null,
  organizationName: 'HomeManager',
  primaryColor: '#1976d2',
  secondaryColor: '#2196f3'
};

const Navigation = () => {
  const { currentUser, isAuthenticated, logout, currentOrganization } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          background: `linear-gradient(90deg, #1976d2 0%, #2196f3 100%)`,
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ py: 0.75 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { xs: 'flex', md: 'none' },
                background: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  background: 'rgba(255,255,255,0.2)'
                }
              }}
            >
              <MenuIcon />
            </IconButton>
            
            {/* Logo and brand name */}
            <Box 
              sx={{ 
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                mr: 2
              }}
            >
              {branding.logoUrl && (
                <Box 
                  component="img" 
                  src={branding.logoUrl} 
                  alt="Logo"
                  sx={{ 
                    height: 36, 
                    mr: 1.5,
                    borderRadius: '4px',
                    background: 'white',
                    p: 0.5
                  }} 
                />
              )}
              <Typography
                variant="h6"
                noWrap
                component={Link}
                to="/"
                sx={{
                  fontWeight: 700,
                  color: 'inherit',
                  letterSpacing: '.05rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {currentOrganization?.name || 'HomeManager'}
              </Typography>
            </Box>            {/* Desktop navigation */}
            <Box sx={{ 
              flexGrow: 1, 
              display: { xs: 'none', md: 'flex' }, 
              ml: 2,
              '& .MuiButton-root': {
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }
            }}>
              {isAuthenticated && (
                <>
                  <Button
                    component={Link}
                    to="/dashboard"
                    color="inherit"
                    sx={{ 
                      mx: 0.5, 
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 1,
                      fontWeight: isActive('/dashboard') ? 700 : 500,
                      position: 'relative',
                      bgcolor: isActive('/dashboard') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                      },
                      '&::after': isActive('/dashboard') ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '15%',
                        width: '70%',
                        height: 3,
                        bgcolor: 'white',
                        borderRadius: 3,
                      } : {}
                    }}
                    startIcon={<DashboardIcon sx={{ fontSize: 20 }} />}
                  >
                    Dashboard
                  </Button>
                  <Button
                    component={Link}
                    to="/properties"
                    color="inherit"
                    sx={{ 
                      mx: 0.5, 
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 1,
                      fontWeight: isActive('/properties') ? 700 : 500,
                      position: 'relative',
                      bgcolor: isActive('/properties') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&::after': isActive('/properties') ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '15%',
                        width: '70%',
                        height: 3,
                        bgcolor: 'white',
                        borderRadius: 3,
                      } : {}
                    }}
                    startIcon={<BusinessIcon sx={{ fontSize: 20 }} />}
                  >
                    Properties
                  </Button>
                  <Button
                    component={Link}
                    to="/tenants"
                    color="inherit"
                    sx={{ 
                      mx: 0.5, 
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 1,
                      fontWeight: isActive('/tenants') ? 700 : 500,
                      position: 'relative',
                      bgcolor: isActive('/tenants') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&::after': isActive('/tenants') ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '15%',
                        width: '70%',
                        height: 3,
                        bgcolor: 'white',
                        borderRadius: 3,
                      } : {}
                    }}
                    startIcon={<PeopleIcon sx={{ fontSize: 20 }} />}
                  >
                    Tenants
                  </Button>
                  <Button
                    component={Link}
                    to="/tickets"
                    color="inherit"
                    sx={{ 
                      mx: 0.5, 
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 1,
                      fontWeight: isActive('/tickets') ? 700 : 500,
                      position: 'relative',
                      bgcolor: isActive('/tickets') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&::after': isActive('/tickets') ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '15%',
                        width: '70%',
                        height: 3,
                        bgcolor: 'white',
                        borderRadius: 3,
                      } : {}
                    }}
                    startIcon={<BuildIcon sx={{ fontSize: 20 }} />}
                  >
                    Tickets
                  </Button>
                  <Button
                    component={Link}
                    to="/payments"
                    color="inherit"
                    sx={{ 
                      mx: 0.5, 
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 1,
                      fontWeight: isActive('/payments') ? 700 : 500,
                      position: 'relative',
                      bgcolor: isActive('/payments') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&::after': isActive('/payments') ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '15%',
                        width: '70%',
                        height: 3,
                        bgcolor: 'white',
                        borderRadius: 3,
                      } : {}
                    }}
                    startIcon={<PaymentsIcon sx={{ fontSize: 20 }} />}
                  >
                    Payments
                  </Button>                  <Button
                    component={Link}
                    to="/notices"
                    color="inherit"
                    sx={{ 
                      mx: 0.5, 
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 1,
                      fontWeight: isActive('/notices') ? 700 : 500,
                      position: 'relative',
                      bgcolor: isActive('/notices') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&::after': isActive('/notices') ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '15%',
                        width: '70%',
                        height: 3,
                        bgcolor: 'white',
                        borderRadius: 3,
                      } : {}
                    }}
                    startIcon={<NotificationsIcon sx={{ fontSize: 20 }} />}
                  >
                    Notices
                  </Button>
                  <Button
                    component={Link}
                    to="/analytics"
                    color="inherit"
                    sx={{ 
                      mx: 0.5, 
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 1,
                      fontWeight: isActive('/analytics') ? 700 : 500,
                      position: 'relative',
                      bgcolor: isActive('/analytics') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&::after': isActive('/analytics') ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '15%',
                        width: '70%',
                        height: 3,
                        bgcolor: 'white',
                        borderRadius: 3,
                      } : {}
                    }}
                    startIcon={<BarChartIcon sx={{ fontSize: 20 }} />}
                  >
                    Analytics
                  </Button>
                  <Button
                    component={Link}
                    to="/sms"
                    color="inherit"
                    sx={{ 
                      mx: 0.5, 
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 1,
                      fontWeight: isActive('/sms') ? 700 : 500,
                      position: 'relative',
                      bgcolor: isActive('/sms') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&::after': isActive('/sms') ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '15%',
                        width: '70%',
                        height: 3,
                        bgcolor: 'white',
                        borderRadius: 3,
                      } : {}
                    }}
                    startIcon={<SmsIcon sx={{ fontSize: 20 }} />}
                  >
                    SMS
                  </Button>
                </>
              )}
              
              {!isAuthenticated && (
                <Button
                  component={Link}
                  to="/tenant-access"
                  color="inherit"
                  sx={{ 
                    mx: 0.5, 
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    fontWeight: isActive('/tenant-access') ? 700 : 500,
                    position: 'relative',
                    bgcolor: isActive('/tenant-access') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  Tenant Access
                </Button>
              )}
            </Box>            {/* User menu */}
            <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
              {isAuthenticated ? (
                <>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '30px',
                      py: 0.5,
                      px: { xs: 0.5, sm: 1.5 },
                      mr: { xs: 0, sm: 1 }
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        mr: 1.5, 
                        display: { xs: 'none', sm: 'block' },
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.95)',
                      }}
                    >
                      {currentUser?.full_name || 'Welcome'}
                    </Typography>
                    <Tooltip title="Account settings" arrow>
                      <IconButton 
                        onClick={handleOpenUserMenu} 
                        sx={{ 
                          p: 0.5,
                          background: 'rgba(255,255,255,0.15)',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          '&:hover': {
                            background: 'rgba(255,255,255,0.25)',
                            transform: 'scale(1.08) rotate(5deg)'
                          }
                        }}
                      >
                        <Avatar 
                          alt={currentUser?.full_name || 'User'} 
                          src={currentUser?.profile_image}
                          sx={{ 
                            width: 36, 
                            height: 36,
                            border: '2px solid rgba(255,255,255,0.85)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}
                        >
                          {!currentUser?.profile_image && (currentUser?.first_name?.[0] || 'U')}
                        </Avatar>
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Menu
                    sx={{ 
                      mt: '45px',
                      '& .MuiPaper-root': {
                        borderRadius: 2,
                        minWidth: 220,
                        boxShadow: '0px 5px 15px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(0,0,0,0.08)',
                      }
                    }}
                    id="menu-appbar"
                    anchorEl={anchorElUser}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                  >
                    <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/profile'); }}>
                      <ListItemIcon>
                        <AccountCircleIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography textAlign="center">Profile</Typography>
                    </MenuItem>
                    
                    <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/team-members'); }}>
                      <ListItemIcon>
                        <GroupIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography textAlign="center">Team Members</Typography>
                    </MenuItem>
                    
                    {/* <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/branding'); }}>
                      <ListItemIcon>
                        <ColorLensIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography textAlign="center">Branding</Typography>
                    </MenuItem> */}
                    
                    {/* <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/role-management'); }}>
                      <ListItemIcon>
                        <SecurityIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography textAlign="center">Roles & Permissions</Typography>
                    </MenuItem> */}
                    
                    <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/organizations'); }}>
                      <ListItemIcon>
                        <BusinessIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography textAlign="center">Organizations</Typography>
                    </MenuItem>
                    
                    <Divider />
                    
                    <MenuItem onClick={handleLogout}>
                      <ListItemIcon>
                        <LogoutIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <Typography textAlign="center" color="error">Logout</Typography>
                    </MenuItem>
                  </Menu>
                </>              ) : (
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    component={Link}
                    to="/login"
                    color="inherit"
                    sx={{ 
                      px: 2, 
                      py: 0.8,
                      borderRadius: 2,
                      fontWeight: 500,
                      letterSpacing: 0.3,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transform: 'translateY(-1px)',
                      }
                    }}
                    startIcon={<AccountCircleIcon />}
                  >
                    Login
                  </Button>
                  <Button
                    component={Link}
                    to="/register"
                    variant="contained"
                    sx={{ 
                      px: 2,
                      py: 0.8,
                      borderRadius: 2,
                      fontWeight: 600,
                      backgroundColor: 'white',
                      color: branding.primaryColor || '#1976d2',
                      boxShadow: '0px 3px 6px rgba(0,0,0,0.1)',
                      letterSpacing: 0.3,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        boxShadow: '0px 6px 10px rgba(0,0,0,0.15)',
                        transform: 'translateY(-1px)',
                      }
                    }}
                    startIcon={<PersonIcon />}
                  >
                    Register
                  </Button>
                </Box>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>        {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            borderRight: 'none',
            boxShadow: '0px 8px 24px rgba(0,0,0,0.15)'
          },
        }}
      >
        <Box
          sx={{ width: 280 }}
          role="presentation"
        >
          <Box 
            sx={{ 
              py: 2.5, 
              px: 2.5, 
              display: 'flex', 
              flexDirection: 'column',
              background: `linear-gradient(135deg, ${branding.primaryColor || '#1976d2'} 0%, ${branding.secondaryColor || '#2196f3'} 100%)`,
              color: 'white',
              height: 120,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -15,
                right: -15,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -30,
                left: -30, 
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
              {branding.logoUrl && (
                <Box 
                  component="img" 
                  src={branding.logoUrl} 
                  alt="Logo"
                  sx={{ 
                    height: 40, 
                    mr: 1.5,
                    borderRadius: '6px',
                    background: 'white',
                    p: 0.5,
                    boxShadow: '0 3px 6px rgba(0,0,0,0.1)'
                  }} 
                />
              )}             
              <Typography variant="h6" noWrap fontWeight="bold" letterSpacing={0.3}>
                {currentOrganization?.name || branding.organizationName || 'HomeManager'}
              </Typography>
            </Box>
            
            <Typography 
              variant="caption" 
              sx={{ 
                mt: 1.5, 
                opacity: 0.85, 
                fontWeight: 500,
                zIndex: 1
              }}
            >
              Property Management System
            </Typography>
          </Box>
          <Divider />
            {isAuthenticated ? (
            <List sx={{ py: 1 }}>
              {/* User info section if authenticated */}
              {currentUser && (
                <Box sx={{ px: 2, py: 1.5, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Avatar
                      alt={currentUser?.full_name || 'User'}
                      src={currentUser?.profile_image}
                      sx={{
                        width: 48,
                        height: 48,
                        border: `2px solid ${branding.primaryColor || '#1976d2'}`
                      }}
                    >
                      {!currentUser?.profile_image && (currentUser?.first_name?.[0] || 'U')}
                    </Avatar>
                    <Box sx={{ ml: 1.5 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {currentUser?.full_name || 'User'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {currentUser?.email || 'user@example.com'}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider />
                </Box>
              )}

              <ListItem 
                button 
                onClick={() => handleNavigate('/dashboard')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/dashboard') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/dashboard') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <DashboardIcon 
                    color={isActive('/dashboard') ? 'primary' : 'inherit'} 
                    sx={{ 
                      color: isActive('/dashboard') ? branding.primaryColor : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Dashboard" 
                  primaryTypographyProps={{
                    fontWeight: isActive('/dashboard') ? 600 : 400
                  }}
                />
              </ListItem>
              
              <ListItem 
                button 
                onClick={() => handleNavigate('/properties')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/properties') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/properties') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <BusinessIcon 
                    sx={{ 
                      color: isActive('/properties') ? branding.primaryColor : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Properties"
                  primaryTypographyProps={{
                    fontWeight: isActive('/properties') ? 600 : 400
                  }}
                />
              </ListItem>
              
              <ListItem 
                button 
                onClick={() => handleNavigate('/tenants')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/tenants') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/tenants') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <PeopleIcon 
                    sx={{ 
                      color: isActive('/tenants') ? branding.primaryColor : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Tenants"
                  primaryTypographyProps={{
                    fontWeight: isActive('/tenants') ? 600 : 400
                  }}
                />
              </ListItem>
              
              <ListItem 
                button 
                onClick={() => handleNavigate('/tickets')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/tickets') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/tickets') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <BuildIcon 
                    sx={{ 
                      color: isActive('/tickets') ? branding.primaryColor : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Tickets"
                  primaryTypographyProps={{
                    fontWeight: isActive('/tickets') ? 600 : 400
                  }}
                />
              </ListItem>
                <ListItem 
                button 
                onClick={() => handleNavigate('/payments')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/payments') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/payments') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <PaymentsIcon 
                    sx={{ 
                      color: isActive('/payments') ? branding.primaryColor : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Payments"
                  primaryTypographyProps={{
                    fontWeight: isActive('/payments') ? 600 : 400
                  }}
                />
              </ListItem>
                <ListItem 
                button 
                onClick={() => handleNavigate('/notices')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/notices') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/notices') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <NotificationsIcon 
                    sx={{ 
                      color: isActive('/notices') ? branding.primaryColor : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Notices"
                  primaryTypographyProps={{
                    fontWeight: isActive('/notices') ? 600 : 400
                  }}
                />
              </ListItem>

              <ListItem 
                button 
                onClick={() => handleNavigate('/analytics')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/analytics') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/analytics') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <BarChartIcon 
                    sx={{ 
                      color: isActive('/analytics') ? branding.primaryColor : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Analytics"
                  primaryTypographyProps={{
                    fontWeight: isActive('/analytics') ? 600 : 400
                  }}
                />
              </ListItem>

              <ListItem 
                button 
                onClick={() => handleNavigate('/sms')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/sms') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/sms') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <SmsIcon 
                    sx={{ 
                      color: isActive('/sms') ? branding.primaryColor : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="SMS"
                  primaryTypographyProps={{
                    fontWeight: isActive('/sms') ? 600 : 400
                  }}
                />
              </ListItem>
              
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="medium">
                  Management
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 1 }} />
              </Box>
                <ListItem 
                button 
                onClick={() => handleNavigate('/team-members')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/team-members') ? '#1976d215' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/team-members') ? '#1976d225' : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <GroupIcon 
                    sx={{ 
                      color: isActive('/team-members') ? '#1976d2' : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Team Members"
                  primaryTypographyProps={{
                    fontWeight: isActive('/team-members') ? 600 : 400
                  }}
                />
              </ListItem>
                <ListItem 
                button 
                onClick={() => handleNavigate('/role-management')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/role-management') ? '#1976d215' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/role-management') ? '#1976d225' : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <SecurityIcon 
                    sx={{ 
                      color: isActive('/role-management') ? '#1976d2' : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Role Management"
                  primaryTypographyProps={{
                    fontWeight: isActive('/role-management') ? 600 : 400
                  }}
                />
              </ListItem>
              
              <ListItem 
                button 
                onClick={() => handleNavigate('/profile')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: isActive('/profile') ? '#1976d215' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/profile') ? '#1976d225' : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <AccountCircleIcon 
                    sx={{ 
                      color: isActive('/profile') ? branding.primaryColor : 'inherit',
                      fontSize: 22
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Profile"
                  primaryTypographyProps={{
                    fontWeight: isActive('/profile') ? 600 : 400
                  }}
                />
              </ListItem>
              
              <Box sx={{ px: 2, py: 1.5, mt: 2 }}>
                <Divider sx={{ mb: 1 }} />
              </Box>
              
              <ListItem 
                button 
                onClick={handleLogout}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 0.5,
                  bgcolor: 'rgba(211, 47, 47, 0.08)',
                  '&:hover': {
                    bgcolor: 'rgba(211, 47, 47, 0.15)'
                  }
                }}
              >
                <ListItemIcon>
                  <LogoutIcon sx={{ color: 'error.main' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Logout" 
                  primaryTypographyProps={{
                    color: 'error.main',
                    fontWeight: 500
                  }}
                />
              </ListItem>
            </List>          ) : (
            <List sx={{ py: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Welcome to HomeManager
                </Typography>
                <Typography variant="body2" sx={{ px: 3, color: 'text.secondary' }}>
                  Manage your properties efficiently with our platform
                </Typography>
              </Box>

              <ListItem 
                button 
                onClick={() => handleNavigate('/tenant-access')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 1,
                  bgcolor: isActive('/tenant-access') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/tenant-access') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <HomeIcon 
                    sx={{ 
                      color: isActive('/tenant-access') ? branding.primaryColor : 'inherit' 
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Tenant Access"
                  primaryTypographyProps={{
                    fontWeight: isActive('/tenant-access') ? 600 : 400
                  }}
                />
              </ListItem>
              
              <Box sx={{ px: 2, py: 1.5 }}>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="overline" color="text.secondary" fontWeight="medium">
                  Account
                </Typography>
              </Box>
              
              <ListItem 
                button 
                onClick={() => handleNavigate('/login')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 1,
                  bgcolor: isActive('/login') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/login') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <AccountCircleIcon 
                    sx={{ 
                      color: isActive('/login') ? branding.primaryColor : 'inherit' 
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Login"
                  primaryTypographyProps={{
                    fontWeight: isActive('/login') ? 600 : 400
                  }}
                />
              </ListItem>
              
              <ListItem 
                button 
                onClick={() => handleNavigate('/register')}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  mb: 1,
                  bgcolor: isActive('/register') ? `${branding.primaryColor}15` : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('/register') ? `${branding.primaryColor}25` : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <PersonIcon 
                    sx={{ 
                      color: isActive('/register') ? branding.primaryColor : 'inherit' 
                    }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Register"
                  primaryTypographyProps={{
                    fontWeight: isActive('/register') ? 600 : 400
                  }}
                />
              </ListItem>
            </List>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default Navigation;
