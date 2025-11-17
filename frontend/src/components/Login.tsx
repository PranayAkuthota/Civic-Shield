import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Citizen login form
  const [citizenForm, setCitizenForm] = useState({
    aadhaarNumber: '',
    phone: ''
  });

  // Official login form
  const [officialForm, setOfficialForm] = useState({
    email: '',
    password: ''
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!citizenForm.aadhaarNumber || !citizenForm.phone) {
      setError('Please fill in all fields');
      return;
    }

    if (citizenForm.aadhaarNumber.length !== 12) {
      setError('Aadhaar number must be 12 digits');
      return;
    }

    if (citizenForm.phone.length !== 10) {
      setError('Phone number must be 10 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await login(citizenForm.aadhaarNumber, citizenForm.phone);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOfficialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!officialForm.email || !officialForm.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await login(officialForm.email, officialForm.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4
        }}
      >
        <Paper elevation={6} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Telangana Properties
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Assets & Properties Protection Portal
          </Typography>

          <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 2 }}>
            <Tab label="Citizen Login" />
            <Tab label="Official Login" />
          </Tabs>

          <Divider sx={{ mb: 2 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              File Complaint as Citizen
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Login with your Aadhaar number to file complaints about property encroachments
            </Typography>

            <Box component="form" onSubmit={handleCitizenSubmit}>
              <TextField
                fullWidth
                label="Aadhaar Number"
                value={citizenForm.aadhaarNumber}
                onChange={(e) => setCitizenForm(prev => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, '') }))}
                placeholder="Enter 12-digit Aadhaar number"
                inputProps={{ maxLength: 12 }}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Phone Number"
                value={citizenForm.phone}
                onChange={(e) => setCitizenForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                placeholder="Enter 10-digit phone number"
                inputProps={{ maxLength: 10 }}
                margin="normal"
                required
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Login as Citizen'}
              </Button>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Official Access
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Login with government credentials to manage complaints
            </Typography>

            <Box component="form" onSubmit={handleOfficialSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                value={officialForm.email}
                onChange={(e) => setOfficialForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="official@telangana.gov.in"
                type="email"
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Password"
                value={officialForm.password}
                onChange={(e) => setOfficialForm(prev => ({ ...prev, password: e.target.value }))}
                type="password"
                margin="normal"
                required
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Login as Official'}
              </Button>
            </Box>
          </TabPanel>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              For citizen login support: 1800-4250-0001
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;