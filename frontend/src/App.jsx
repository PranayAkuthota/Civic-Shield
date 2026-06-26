import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Landing from './components/Landing';
import SimpleComplaintForm from './components/SimpleComplaintForm';
import theme from './theme';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import CitizenDashboard from './components/Dashboard/CitizenDashboard';
import OfficialDashboard from './components/Dashboard/OfficialDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import ComplaintDetail from './components/ComplaintDetail';
const ProtectedRoute = ({
  children
}) => {
  const token = localStorage.getItem('accessToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};
function App() {
  return <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>}>
              <Route path="citizen" element={<CitizenDashboard />} />
              <Route path="official" element={<OfficialDashboard />} />
              <Route path="admin" element={<AdminDashboard />} />
            </Route>
            <Route path="/complaint/:id" element={<ProtectedRoute>
                <ComplaintDetail />
              </ProtectedRoute>} />
            <Route path="/file-complaint" element={<ProtectedRoute>
                <SimpleComplaintForm />
              </ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>;
}
export default App;