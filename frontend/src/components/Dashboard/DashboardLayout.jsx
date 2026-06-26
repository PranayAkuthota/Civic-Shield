import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AppBar, Box, Toolbar, Typography, IconButton, Button, 
  Container, Avatar, Menu, MenuItem, useTheme 
} from '@mui/material';
import { Menu as MenuIcon, Logout } from '@mui/icons-material';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = React.useState(null);

  useEffect(() => {
    // If user navigates to exactly /dashboard, redirect them to their specific dashboard
    if (location.pathname === '/dashboard') {
      if (user?.role === 'citizen') navigate('/dashboard/citizen');
      else if (user?.role === 'official') navigate('/dashboard/official');
      else if (user?.role === 'admin' || user?.role === 'superadmin') navigate('/dashboard/admin');
    }
  }, [location, user, navigate]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          color: theme.palette.text.primary
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="h5"
                noWrap
                component="div"
                sx={{ 
                  fontWeight: 800, 
                  background: 'linear-gradient(45deg, #1e3a8a, #3b82f6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/dashboard')}
              >
                Civic-Shield
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Welcome, {user?.name}
              </Typography>
              <IconButton onClick={handleMenu} size="small" sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 36, height: 36 }}>
                  {user?.name?.charAt(0)}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                    mt: 1.5,
                  },
                }}
              >
                <MenuItem onClick={handleLogout}>
                  <Logout fontSize="small" sx={{ mr: 1 }} /> Logout
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
