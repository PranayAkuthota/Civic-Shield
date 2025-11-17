import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Extended interface for axios request config with _retry property
interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'citizen' | 'admin' | 'official' | 'superadmin';
  department?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
}

export interface Complaint {
  _id: string;
  complaintId: string;
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
  status: string;
  evidenceFiles: Array<{
    filename: string;
    originalName: string;
    fileType: string;
    url: string;
    uploadedAt: string;
  }>;
  statusHistory: Array<{
    status: string;
    comment: string;
    timestamp: string;
    updatedBy: {
      name: string;
      email: string;
    };
  }>;
  feedback: Array<{
    rating: number;
    comment: string;
    createdAt: string;
  }>;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for token refresh
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                refreshToken
              });

              const { accessToken, refreshToken: newRefreshToken } = response.data.data;

              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);

              // Retry the original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.logout();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(emailOrPhone: string, password?: string): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const response = await this.api.post('/auth/login', {
        identifier: emailOrPhone,
        password
      });

      const { user, accessToken, refreshToken } = response.data.data;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      return { user, tokens: { accessToken, refreshToken } };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData: {
    name: string;
    email: string;
    phone: string;
    aadhaar: string;
    password?: string;
  }): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const response = await this.api.post('/auth/register', userData);

      const { user, accessToken, refreshToken } = response.data.data;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      return { user, tokens: { accessToken, refreshToken } };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint if available
      await this.api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get('/auth/profile');
      return response.data.data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await this.api.put('/auth/profile', userData);
      const updatedUser = response.data.data.user;

      // Update stored user data
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Complaint methods
  async createComplaint(complaintData: {
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
    isAnonymous?: boolean;
  }): Promise<Complaint> {
    try {
      const response = await this.api.post('/complaints', complaintData);
      return response.data.data.complaint;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getComplaints(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    district?: string;
    my?: boolean;
  }): Promise<{ complaints: Complaint[]; pagination: any }> {
    try {
      const response = await this.api.get('/complaints', { params });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getComplaint(id: string): Promise<Complaint> {
    try {
      const response = await this.api.get(`/complaints/${id}`);
      return response.data.data.complaint;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateComplaint(id: string, updateData: Partial<Complaint>): Promise<Complaint> {
    try {
      const response = await this.api.put(`/complaints/${id}`, updateData);
      return response.data.data.complaint;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateComplaintStatus(id: string, status: string, comment: string): Promise<Complaint> {
    try {
      const response = await this.api.post(`/complaints/${id}/status`, {
        status,
        comment
      });
      return response.data.data.complaint;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async assignComplaint(id: string, officialId: string): Promise<Complaint> {
    try {
      const response = await this.api.post(`/complaints/${id}/assign`, {
        officialId
      });
      return response.data.data.complaint;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addComplaintFeedback(id: string, rating: number, comment?: string): Promise<Complaint> {
    try {
      const response = await this.api.post(`/complaints/${id}/feedback`, {
        rating,
        comment
      });
      return response.data.data.complaint;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchComplaints(query: string, filters?: {
    district?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ complaints: Complaint[]; pagination: any }> {
    try {
      const response = await this.api.get('/complaints/search', {
        params: { q: query, ...filters }
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // File upload methods
  async uploadFile(file: File): Promise<{ url: string; filename: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.api.post('/upload/single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data.file;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadFiles(files: File[]): Promise<Array<{ url: string; filename: string }>> {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await this.api.post('/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data.files;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadComplaintFiles(complaintId: string, files: File[]): Promise<any> {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await this.api.post(`/upload/complaint/${complaintId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getCurrentUserFromStorage(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    } else if (error.message) {
      return new Error(error.message);
    } else {
      return new Error('An unexpected error occurred');
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;