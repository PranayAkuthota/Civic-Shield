import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Chip, CircularProgress } from '@mui/material';
import { Add as AddIcon, Assignment as AssignmentIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await apiService.getComplaints({ my: true, limit: 10 });
        setComplaints(res.complaints || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const getStatusColor = (status) => {
    const map = {
      filed: 'info',
      under_review: 'warning',
      investigation: 'warning',
      resolved: 'success',
      rejected: 'error',
      closed: 'default'
    };
    return map[status] || 'default';
  };

  return (
    <Box >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h3" gutterBottom>My Complaints</Typography>
          <Typography color="text.secondary">Track and manage your property complaints.</Typography>
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          size="large"
          onClick={() => navigate('/file-complaint')}
          sx={{ borderRadius: 1, px: 4 }}
        >
          File New Complaint
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      ) : complaints.length === 0 ? (
        <Card  sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.light', mb: 2 }} />
            <Typography variant="h5" gutterBottom>No complaints found</Typography>
            <Typography color="text.secondary">You haven't filed any complaints yet.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {complaints.map((c, i) => (
            <Grid item xs={12} md={6} key={c._id || i}>
              <Card 
                 
                sx={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}
                onClick={() => navigate(`/complaint/${c._id}`)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Chip label={c.complaintId} size="small" sx={{ borderRadius: 1 }} />
                    <Chip 
                      label={c.status.replace('_', ' ').toUpperCase()} 
                      color={getStatusColor(c.status)} 
                      size="small" 
                      sx={{ borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom noWrap>{c.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 2
                  }}>
                    {c.description}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt="auto">
                    <WarningIcon fontSize="small" color={c.severity === 'critical' || c.severity === 'high' ? 'error' : 'warning'} />
                    <Typography variant="caption" fontWeight={600} color="text.primary">
                      {c.severity.toUpperCase()} SEVERITY
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default CitizenDashboard;
