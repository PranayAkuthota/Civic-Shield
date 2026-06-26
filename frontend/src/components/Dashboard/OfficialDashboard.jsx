import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, CircularProgress, Divider, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

const OfficialDashboard = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await apiService.getComplaints({ limit: 50 });
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
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>Official Workspace</Typography>
        <Typography color="text.secondary">Manage and investigate assigned complaints.</Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      ) : complaints.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">No complaints found.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {complaints.map((c) => (
            <Grid item xs={12} md={6} lg={4} key={c._id}>
              <Card 
                sx={{ 
                  cursor: 'pointer', 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
                }}
                onClick={() => navigate(`/complaint/${c._id}`)}
              >
                <CardContent>
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
                  <Box display="flex" gap={1} mb={2}>
                    <Chip label={c.category.replace('_', ' ').toUpperCase()} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                    <Chip label={c.severity} size="small" color={c.severity === 'critical' ? 'error' : 'default'} sx={{ borderRadius: 1 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {c.location.district}, {c.location.mandal}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Filed on {new Date(c.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default OfficialDashboard;
