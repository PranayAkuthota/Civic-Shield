import React, { useState, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Add,
  LocationOn,
  Description,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

const TELANGANA_DISTRICTS = [
  'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial',
  'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy',
  'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar',
  'Mancherial', 'Medak', 'Medchal Malkajgiri', 'Mulugu', 'Nagarkurnool',
  'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli',
  'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet',
  'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
];

interface ComplaintFormData {
  title: string;
  description: string;
  category: string;
  severity: string;
  location: {
    address: string;
    coordinates: [number, number];
    district: string;
    mandal: string;
    village: string;
  };
  isAnonymous: boolean;
  files: File[];
}

const ComplaintForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState<ComplaintFormData>({
    title: '',
    description: '',
    category: '',
    severity: 'medium',
    location: {
      address: '',
      coordinates: [78.5, 17.4], // Default to Hyderabad
      district: '',
      mandal: '',
      village: ''
    },
    isAnonymous: false,
    files: []
  });

  const steps = ['Basic Information', 'Location Details', 'Evidence Files', 'Review & Submit'];

  const categories = [
    { value: 'lake_encroachment', label: 'Lake Encroachment' },
    { value: 'tank_encroachment', label: 'Tank Encroachment' },
    { value: 'government_land', label: 'Government Land' },
    { value: 'forest_land', label: 'Forest Land' },
    { value: 'water_body', label: 'Water Body' },
    { value: 'public_property', label: 'Public Property' },
    { value: 'other', label: 'Other' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'success' },
    { value: 'medium', label: 'Medium', color: 'warning' },
    { value: 'high', label: 'High', color: 'error' },
    { value: 'critical', label: 'Critical', color: 'error' }
  ];

  const handleInputChange = (field: string, value: any): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleLocationChange = (field: string, value: string): void => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
    setError(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      return allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB
    });

    if (validFiles.length !== files.length) {
      setError('Some files were rejected due to invalid type or size');
    }

    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles]
    }));
  };

  const handleRemoveFile = (index: number): void => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleNext = (): void => {
    if (validateStep()) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = (): void => {
    setActiveStep(prev => prev - 1);
  };

  const validateStep = (): boolean => {
    switch (activeStep) {
      case 0:
        if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.title.length < 10 || formData.title.length > 200) {
          setError('Title must be between 10 and 200 characters');
          return false;
        }
        if (formData.description.length < 50 || formData.description.length > 2000) {
          setError('Description must be between 50 and 2000 characters');
          return false;
        }
        break;
      case 1:
        if (!formData.location.address.trim() || !formData.location.district || !formData.location.mandal || !formData.location.village) {
          setError('Please fill in all location fields');
          return false;
        }
        break;
      case 2:
        if (formData.files.length === 0) {
          setError('Please upload at least one evidence file');
          return false;
        }
        break;
    }
    return true;
  };

  const getCurrentLocation = (): void => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              coordinates: [position.coords.longitude, position.coords.latitude]
            }
          }));
        },
        (error) => {
          setError('Unable to get your location. Please enter manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError(null);

      // First upload files
      let uploadedFiles: Array<{ url: string; filename: string }> = [];
      if (formData.files.length > 0) {
        uploadedFiles = await apiService.uploadFiles(formData.files);
      }

      // Create complaint
      const complaintData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        severity: formData.severity,
        location: formData.location,
        isAnonymous: formData.isAnonymous
      };

      const complaint = await apiService.createComplaint(complaintData);

      // Upload files to complaint if any
      if (uploadedFiles.length > 0) {
        await apiService.uploadComplaintFiles(complaint._id, formData.files);
      }

      navigate('/dashboard', {
        state: {
          message: 'Complaint filed successfully!',
          complaintId: complaint.complaintId
        }
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = (step: number): React.ReactNode => {
    switch (step) {
      case 0:
        return (
          <Box>
            <TextField
              fullWidth
              label="Complaint Title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              multiline
              rows={2}
              helperText="Brief title describing the issue (10-200 characters)"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Detailed Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
              multiline
              rows={6}
              helperText="Provide detailed information about the encroachment (50-2000 characters)"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Severity Level</InputLabel>
                <Select
                  value={formData.severity}
                  onChange={(e) => handleInputChange('severity', e.target.value)}
                >
                  {severityLevels.map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      <Box display="flex" alignItems="center">
                        <Typography>{level.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isAnonymous}
                  onChange={(e) => handleInputChange('isAnonymous', e.target.checked)}
                  color="primary"
                />
              }
              label="File complaint anonymously"
            />
            <Typography variant="caption" display="block" color="textSecondary">
              Your identity will be hidden from public view, but officials can still contact you if needed
            </Typography>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box mb={2}>
              <Button
                variant="outlined"
                startIcon={<LocationOn />}
                onClick={getCurrentLocation}
                fullWidth
              >
                Use My Current Location
              </Button>
            </Box>
            <TextField
              fullWidth
              label="Complete Address"
              value={formData.location.address}
              onChange={(e) => handleLocationChange('address', e.target.value)}
              required
              multiline
              rows={3}
              helperText="Enter the complete address of the encroached property"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>District</InputLabel>
                <Select
                  value={formData.location.district}
                  onChange={(e) => handleLocationChange('district', e.target.value)}
                >
                  {TELANGANA_DISTRICTS.map(district => (
                    <MenuItem key={district} value={district}>
                      {district}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Mandal"
                value={formData.location.mandal}
                onChange={(e) => handleLocationChange('mandal', e.target.value)}
                required
                helperText="Enter the mandal name"
              />
            </Box>
            <TextField
              fullWidth
              label="Village/Area"
              value={formData.location.village}
              onChange={(e) => handleLocationChange('village', e.target.value)}
              required
              helperText="Enter the village name or area name"
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Card variant="outlined">
              <CardContent>
                <Box mb={2}>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<CloudUpload />}
                    fullWidth
                  >
                    Upload Evidence Files
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                    />
                  </Button>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Upload images, documents, or other evidence files. Max size: 10MB per file.
                  Supported formats: Images (JPG, PNG), Documents (PDF, DOC, DOCX)
                </Typography>
              </CardContent>
            </Card>
            {formData.files.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Uploaded Files ({formData.files.length})
                </Typography>
                {formData.files.map((file, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box flex={1}>
                          <Typography variant="body2" noWrap>
                            {file.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                        <IconButton
                          onClick={() => handleRemoveFile(index)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid xs={12}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Complaint Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12} md={6}>
                    <Typography variant="subtitle2">Title:</Typography>
                    <Typography variant="body1">{formData.title}</Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Typography variant="subtitle2">Category:</Typography>
                    <Typography variant="body1">
                      {categories.find(c => c.value === formData.category)?.label}
                    </Typography>
                  </Grid>
                  <Grid xs={12}>
                    <Typography variant="subtitle2">Description:</Typography>
                    <Typography variant="body1">{formData.description}</Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Typography variant="subtitle2">District:</Typography>
                    <Typography variant="body1">{formData.location.district}</Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Typography variant="subtitle2">Location:</Typography>
                    <Typography variant="body1">
                      {formData.location.village}, {formData.location.mandal}
                    </Typography>
                  </Grid>
                  <Grid xs={12}>
                    <Typography variant="subtitle2">Address:</Typography>
                    <Typography variant="body1">{formData.location.address}</Typography>
                  </Grid>
                  <Grid xs={12}>
                    <Typography variant="subtitle2">Evidence Files:</Typography>
                    <Typography variant="body1">{formData.files.length} files uploaded</Typography>
                  </Grid>
                  {formData.isAnonymous && (
                    <Grid xs={12}>
                      <Typography variant="subtitle2" color="primary">
                        This complaint will be filed anonymously
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            File a Complaint
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Report unauthorized land encroachment and help protect Telangana's assets
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {isSubmitting && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress />
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Submitting your complaint...
              </Typography>
            </Box>
          )}

          <Box sx={{ mb: 4 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Submit Complaint'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ComplaintForm;