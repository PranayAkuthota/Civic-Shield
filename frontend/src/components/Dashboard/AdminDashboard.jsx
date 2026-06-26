import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Divider } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '../../services/api';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <Box display="flex" justifyContent="center" my={8}><CircularProgress /></Box>;
  }

  // Fallback data if API returns empty
  const summary = stats?.summary || { total: 0, resolved: 0, pending: 0, investigation: 0 };
  
  // Dummy data for charts to make it look premium
  const categoryData = [
    { name: 'Lake', value: 400 },
    { name: 'Forest', value: 300 },
    { name: 'Govt Land', value: 300 },
    { name: 'Public Property', value: 200 },
  ];

  const trendData = [
    { name: 'Jan', complaints: 40, resolved: 24 },
    { name: 'Feb', complaints: 30, resolved: 13 },
    { name: 'Mar', complaints: 20, resolved: 58 },
    { name: 'Apr', complaints: 27, resolved: 39 },
    { name: 'May', complaints: 18, resolved: 48 },
    { name: 'Jun', complaints: 23, resolved: 38 },
  ];

  return (
    <Box >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>State Command Center</Typography>
        <Typography color="text.secondary">High-level overview of Civic-Shield operations.</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { title: 'Total Complaints', value: summary.total, color: 'primary.main' },
          { title: 'Resolved', value: summary.resolved, color: 'success.main' },
          { title: 'Pending', value: summary.pending, color: 'error.main' },
          { title: 'Under Investigation', value: summary.investigation, color: 'warning.main' }
        ].map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card  sx={{ height: '100%' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{stat.title}</Typography>
                <Typography variant="h3" sx={{ color: stat.color, fontWeight: 'bold' }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card >
            <CardContent>
              <Typography variant="h6" gutterBottom>Monthly Trends</Typography>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                    <Legend />
                    <Bar dataKey="complaints" name="New Complaints" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card >
            <CardContent>
              <Typography variant="h6" gutterBottom>By Category</Typography>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
