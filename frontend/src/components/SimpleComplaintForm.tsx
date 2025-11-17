import React, { useState } from 'react';
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
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import { CloudUpload, Delete, LocationOn } from '@mui/icons-material';
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

interface SimpleComplaintFormData {
  title: string;
  description: string;
  category: string;
  severity: string;
  location: {
    address: string;
    district: string;
    mandal: string;
    village: string;
  };
  isAnonymous: boolean;
  files: File[];
}

const SimpleComplaintForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<SimpleComplaintFormData>({
    title: '',
    description: '',
    category: '',
    severity: 'medium',
    location: {
      address: '',
      district: '',
      mandal: '',
      village: ''
    },
    isAnonymous: false,
    files: []
  });

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
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  const handleInputChange = (field: string, value: any): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
    setSuccess(null);
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
    setSuccess(null);
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

  const getCurrentLocation = (): void => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSuccess('Location obtained successfully');
        },
        (error) => {
          setError('Unable to get your location. Please enter manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  const validateForm = (): boolean => {
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
    if (!formData.location.address.trim() || !formData.location.district || !formData.location.mandal || !formData.location.village) {
      setError('Please fill in all location fields');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Create complaint with location coordinates (default to Hyderabad)
      const complaintData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        severity: formData.severity,
        location: {
          ...formData.location,
          coordinates: [78.5, 17.4] as [number, number] // Default to Hyderabad coordinates
        },
        isAnonymous: formData.isAnonymous
      };

      const complaint = await apiService.createComplaint(complaintData);

      // Upload files if any
      if (formData.files.length > 0) {
        try {
          await apiService.uploadComplaintFiles(complaint._id, formData.files);
        } catch (fileError) {
          console.warn('File upload failed, but complaint was created:', fileError);
        }
      }

      setSuccess('Complaint filed successfully!');
      setTimeout(() => {
        navigate('/dashboard', {
          state: {
            message: 'Complaint filed successfully!',
            complaintId: complaint.complaintId
          }
        });
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
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

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Basic Information Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>

              <TextField
                fullWidth
                label="Complaint Title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
                multiline
                rows={2}
                sx={{ mb: 2 }}
                helperText="Brief title describing the issue (10-200 characters)"
              />

              <TextField
                fullWidth
                label="Detailed Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                required
                multiline
                rows={6}
                sx={{ mb: 2 }}
                helperText="Provide detailed information about the encroachment (50-2000 characters)"
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
                        {level.label}
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

            {/* Location Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Location Details
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<LocationOn />}
                  onClick={getCurrentLocation}
                  fullWidth
                  sx={{ mb: 2 }}
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
                sx={{ mb: 2 }}
                helperText="Enter the complete address of the encroached property"
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
                sx={{ mb: 2 }}
                helperText="Enter the village name or area name"
              />
            </Box>

            {/* Evidence Files Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Evidence Files
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
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
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Upload images, documents, or other evidence files. Max size: 10MB per file.
                  Supported formats: Images (JPG, PNG), Documents (PDF, DOC, DOCX)
                </Typography>
              </Paper>

              {formData.files.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Uploaded Files ({formData.files.length})
                  </Typography>
                  {formData.files.map((file, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" noWrap>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </Box>
                      <Button
                        onClick={() => handleRemoveFile(index)}
                        color="error"
                        size="small"
                        startIcon={<Delete />}
                      >
                        Remove
                      </Button>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>

            {/* Submit Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={isSubmitting}
                sx={{ minWidth: 200 }}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Submit Complaint'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default SimpleComplaintForm;