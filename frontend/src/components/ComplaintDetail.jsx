import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, Chip, Button, Divider, CircularProgress, Paper, Stepper, Step, StepLabel, Select, MenuItem, FormControl, InputLabel, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ArrowBack as ArrowBackIcon, LocationOn as LocationIcon, AttachFile as AttachFileIcon, Edit as EditIcon } from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_STEPS = ['filed', 'under_review', 'investigation', 'resolved'];

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateComment, setUpdateComment] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ title: '', description: '', severity: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const data = await apiService.getComplaint(id);
        setComplaint(data);
        setUpdateStatus(data.status);
        setEditData({ title: data.title, description: data.description, severity: data.severity });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchComplaint();
  }, [id]);

  const handleStatusUpdate = async () => {
    try {
      setLoading(true);
      const updated = await apiService.updateComplaintStatus(id, updateStatus, updateComment);
      setComplaint(updated);
      setUpdateComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    try {
      setSavingEdit(true);
      const updated = await apiService.updateComplaint(id, editData);
      setComplaint(updated);
      setEditDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to update complaint');
    } finally {
      setSavingEdit(false);
    }
  };

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

  if (loading && !complaint) return <Box display="flex" justifyContent="center" my={8}><CircularProgress /></Box>;
  if (!complaint) return <Typography align="center" my={8}>Complaint not found.</Typography>;

  const activeStep = STATUS_STEPS.indexOf(complaint.status) !== -1 ? STATUS_STEPS.indexOf(complaint.status) : STATUS_STEPS.length;
  const isOfficial = user?.role === 'official' || user?.role === 'admin' || user?.role === 'superadmin';
  const isOwner = user?.id === (complaint.filedBy?._id || complaint.filedBy?.id);
  const canEdit = isOwner && complaint.status === 'filed';

  return (
    <Box >
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>
        Back to Dashboard
      </Button>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" display="inline-block" mr={2}>{complaint.title}</Typography>
                  {canEdit && (
                    <Button startIcon={<EditIcon />} variant="outlined" size="small" onClick={() => setEditDialogOpen(true)}>
                      Edit
                    </Button>
                  )}
                </Box>
                <Chip label={complaint.status.replace('_', ' ').toUpperCase()} color={getStatusColor(complaint.status)} sx={{ borderRadius: 1 }} />
              </Box>
              
              <Box display="flex" gap={2} mb={3}>
                <Chip label={complaint.complaintId} variant="outlined" />
                <Chip label={complaint.category.replace('_', ' ').toUpperCase()} />
                <Chip label={`${complaint.severity} severity`} color={complaint.severity === 'critical' ? 'error' : 'default'} />
              </Box>

              <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                {complaint.description}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom><LocationIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> Location Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">District</Typography>
                  <Typography>{complaint.location.district}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">Mandal</Typography>
                  <Typography>{complaint.location.mandal}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">Village</Typography>
                  <Typography>{complaint.location.village}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Exact Address</Typography>
                  <Typography>{complaint.location.address}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom><AttachFileIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> Evidence Files</Typography>
              {complaint.evidenceFiles && complaint.evidenceFiles.length > 0 ? (
                <Grid container spacing={2}>
                  {complaint.evidenceFiles.map((file, idx) => (
                    <Grid item xs={12} sm={6} key={idx}>
                      <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AttachFileIcon color="action" />
                        <Box sx={{ flexGrow: 1, overflow: 'hidden', minWidth: 0 }}>
                          <Typography variant="body2" noWrap title={file.originalName}>{file.originalName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(file.size / 1024).toFixed(1)} KB
                          </Typography>
                        </Box>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          href={`${process.env.REACT_APP_API_URL.replace('/api', '')}${file.url}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">No evidence files uploaded.</Typography>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Status History</Typography>
              <Box sx={{ width: '100%', mt: 4, mb: 4 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                  {STATUS_STEPS.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label.replace('_', ' ').toUpperCase()}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>
              
              <Box mt={3}>
                {complaint.statusHistory.map((h, i) => (
                  <Paper key={i} elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'background.default', border: '1px solid #e2e8f0' }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="subtitle2" fontWeight="bold">
                        {h.status.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(h.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" mt={1}>{h.comment}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Updated by: {h.updatedBy?.name || 'System'}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={12} lg={isOfficial ? 6 : 12}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Complaint Info</Typography>
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary" display="block">Filed On</Typography>
                    <Typography>{new Date(complaint.createdAt).toLocaleString()}</Typography>
                  </Box>
                  {!complaint.isAnonymous && complaint.filedBy && (
                    <Box mb={2}>
                      <Typography variant="caption" color="text.secondary" display="block">Filed By</Typography>
                      <Typography>{complaint.filedBy.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{complaint.filedBy.email}</Typography>
                    </Box>
                  )}
                  {complaint.assignedTo && (
                    <Box mb={2}>
                      <Typography variant="caption" color="text.secondary" display="block">Assigned To</Typography>
                      <Typography>{complaint.assignedTo.name}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Action Panel for Officials */}
            {isOfficial && (
              <Grid item xs={12} lg={6}>
                <Card sx={{ height: '100%', borderColor: 'primary.main', borderWidth: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary.main">Update Status</Typography>
                    <FormControl fullWidth size="small" sx={{ mb: 2, mt: 1 }}>
                      <InputLabel>New Status</InputLabel>
                      <Select
                        value={updateStatus}
                        label="New Status"
                        onChange={(e) => setUpdateStatus(e.target.value)}
                      >
                        {['under_review', 'investigation', 'resolved', 'rejected', 'closed'].map(s => (
                          <MenuItem key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Official Comment / Notes"
                      value={updateComment}
                      onChange={(e) => setUpdateComment(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Button 
                      fullWidth 
                      variant="contained" 
                      color="primary"
                      onClick={handleStatusUpdate}
                      disabled={loading || !updateComment.trim()}
                    >
                      Save Update
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Complaint</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Severity</InputLabel>
            <Select
              label="Severity"
              value={editData.severity}
              onChange={(e) => setEditData({ ...editData, severity: e.target.value })}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={savingEdit}>
            {savingEdit ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplaintDetail;
