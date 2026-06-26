import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Alert, CircularProgress, Tabs, Tab, Divider, Link } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TabPanel = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    aadhaar: '',
    password: '',
    department: ''
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isOfficial = tabValue === 1;

    if (!form.name || !form.email || !form.phone || !form.aadhaar || (isOfficial && !form.password)) {
      setError('Please fill in all required fields');
      return;
    }

    if (form.aadhaar.length !== 12) {
      setError('Aadhaar number must be 12 digits');
      return;
    }

    if (form.phone.length !== 10) {
      setError('Phone number must be 10 digits');
      return;
    }

    if (isOfficial && !form.department) {
      setError('Department is required for officials');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        aadhaar: form.aadhaar,
        role: isOfficial ? 'official' : 'citizen'
      };

      if (isOfficial) {
        payload.password = form.password;
        payload.department = form.department;
      }

      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        py: 4
      }}>
        <Paper elevation={6} sx={{ p: 5, width: '100%', borderRadius: 0 }}>
          <Typography variant="h4" component="h1" align="center" sx={{ fontWeight: 800, mb: 1 }}>
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Join the Civic-Shield Portal
          </Typography>

          <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
            <Tab label="Citizen Registration" sx={{ fontWeight: 600 }} />
            <Tab label="Official Registration" sx={{ fontWeight: 600 }} />
          </Tabs>

          <Divider sx={{ mb: 3 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              name="name"
              label="Full Name"
              value={form.name}
              onChange={handleChange}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              name="email"
              label="Email Address"
              type="email"
              value={form.email}
              onChange={handleChange}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              name="phone"
              label="Phone Number"
              value={form.phone}
              onChange={(e) => handleChange({ target: { name: 'phone', value: e.target.value.replace(/\D/g, '') }})}
              inputProps={{ maxLength: 10 }}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              name="aadhaar"
              label="Aadhaar Number"
              value={form.aadhaar}
              onChange={(e) => handleChange({ target: { name: 'aadhaar', value: e.target.value.replace(/\D/g, '') }})}
              inputProps={{ maxLength: 12 }}
              margin="normal"
              required
            />

            {/* Official specific fields */}
            {tabValue === 1 && (
              <>
                <TextField
                  fullWidth
                  name="department"
                  label="Department"
                  value={form.department}
                  onChange={handleChange}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  margin="normal"
                  required
                />
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : (tabValue === 0 ? 'Register as Citizen' : 'Register as Official')}
            </Button>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Box>
          </Box>

        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
