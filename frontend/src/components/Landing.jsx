import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Grid, 
  Paper,
  AppBar,
  Toolbar,
  useTheme
} from '@mui/material';
import { 
  Security as SecurityIcon, 
  TrackChanges as TrackIcon, 
  Gavel as GavelIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Bar */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', py: 1 }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.5px' }}>
              Civic Shield
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => navigate('/login')}
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                Login
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => navigate('/register')}
                sx={{ fontWeight: 600, borderRadius: 2, boxShadow: 2 }}
              >
                Sign Up
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{ 
        flex: 1,
        display: 'flex', 
        alignItems: 'center', 
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.main}15 100%)`,
        py: { xs: 8, md: 14 }
      }}>
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 900, 
              color: 'text.primary',
              fontSize: { xs: '2.5rem', md: '4rem' },
              lineHeight: 1.2,
              mb: 3
            }}
          >
            Protecting Our Civic Assets, <Box component="span" sx={{ color: 'primary.main' }}>Together</Box>.
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary', 
              mb: 6,
              fontWeight: 400,
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            A transparent, secure, and highly efficient platform for reporting and tracking unauthorized land encroachments. Join hands with us to safeguard our community resources.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => navigate('/register')}
              sx={{ 
                px: 5, 
                py: 1.8, 
                fontSize: '1.1rem', 
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: 4
              }}
            >
              Report an Encroachment
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => navigate('/login')}
              sx={{ 
                px: 5, 
                py: 1.8, 
                fontSize: '1.1rem', 
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'grey.50' }
              }}
            >
              Track a Complaint
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" sx={{ fontWeight: 800, mb: 8 }}>
            Why Use Civic Shield?
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 4 
          }}>
            {[
              {
                icon: <SecurityIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
                title: "Secure & Anonymous",
                description: "Your identity is protected. Report issues confidently without fear of compromising your personal information."
              },
              {
                icon: <TrackIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
                title: "Real-time Tracking",
                description: "Get instant, transparent updates on the status of your reported complaints from submission to resolution."
              },
              {
                icon: <GavelIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
                title: "Direct Action",
                description: "Complaints are automatically routed directly to the appropriate government officials for swift legal action."
              }
            ].map((feature, index) => (
              <Box key={index} sx={{ flex: 1 }}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 4, 
                    height: '100%', 
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 4,
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme.shadows[8]
                    }
                  }}
                >
                  <Box sx={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: '50%', 
                    bgcolor: `${theme.palette.primary.main}15`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3
                  }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ 
        bgcolor: '#0f172a', // Premium dark slate color
        color: 'grey.400', 
        py: 8, 
        mt: 'auto' 
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            justifyContent: 'space-between',
            gap: { xs: 6, md: 4 },
            mb: 6
          }}>
            {/* Brand Column */}
            <Box sx={{ flex: 1.5 }}>
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 800, mb: 2, letterSpacing: '-0.5px' }}>
                Civic Shield
              </Typography>
              <Typography variant="body2" sx={{ maxWidth: 350, lineHeight: 1.8 }}>
                The official portal for protecting civic properties. We empower citizens to report unauthorized land encroachments directly to government officials to ensure transparency and accountability.
              </Typography>
            </Box>

            {/* Quick Links Column */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2" component="a" href="#" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>Home</Typography>
                <Typography variant="body2" component="a" href="#" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>About Us</Typography>
                <Typography variant="body2" component="a" href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }} sx={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>Login</Typography>
                <Typography variant="body2" component="a" href="#" onClick={(e) => { e.preventDefault(); navigate('/register'); }} sx={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>Sign Up</Typography>
              </Box>
            </Box>

            {/* Legal Column */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
                Legal
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2" component="a" href="#" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>Privacy Policy</Typography>
                <Typography variant="body2" component="a" href="#" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>Terms of Service</Typography>
                <Typography variant="body2" component="a" href="#" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>Accessibility</Typography>
              </Box>
            </Box>

            {/* Contact Column */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
                Contact Support
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2">
                  <Box component="span" sx={{ color: 'primary.main', mr: 1, fontWeight: 'bold' }}>Toll Free:</Box> 1800-4250-0001
                </Typography>
                <Typography variant="body2">
                  <Box component="span" sx={{ color: 'primary.main', mr: 1, fontWeight: 'bold' }}>Email:</Box> support@civicshield.gov
                </Typography>
                <Typography variant="body2">
                  <Box component="span" sx={{ color: 'primary.main', mr: 1, fontWeight: 'bold' }}>Hours:</Box> Mon-Fri, 9AM - 6PM
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ 
            borderTop: '1px solid', 
            borderColor: 'rgba(255,255,255,0.1)', 
            pt: 4, 
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2
          }}>
            <Typography variant="body2" sx={{ color: 'grey.500' }}>
              © {new Date().getFullYear()} Civic Shield Government Initiative. All rights reserved.
            </Typography>
            <Typography variant="body2" sx={{ color: 'grey.500' }}>
              Powered by Advanced Governance Tech
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Landing;
