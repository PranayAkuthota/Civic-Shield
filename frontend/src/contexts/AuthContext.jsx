import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { apiService } from '../services/api';
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        error: null
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};
const AuthContext = createContext(undefined);
export const AuthProvider = ({
  children
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 🔁 Auto login on refresh
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (apiService.isAuthenticated()) {
        dispatch({
          type: 'SET_LOADING',
          payload: true
        });
        try {
          const currentUser = await apiService.getCurrentUser();
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: currentUser
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          dispatch({
            type: 'LOGOUT'
          });
        }
      }
    };
    checkAuthStatus();
  }, []);

  // 🔥 LOGIN (supports both citizen + official)
  const login = async (identifier, password) => {
    try {
      dispatch({
        type: 'LOGIN_START'
      });
      let payload;

      // Aadhaar = 12 digits → citizen login
      if (identifier.length === 12) {
        payload = {
          aadhaar: identifier,
          phone: password
        };
      } else {
        payload = {
          identifier,
          password
        };
      }
      const res = await apiService.login(payload);
      if (!res.user) {
        throw new Error("Login failed");
      }
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.user
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      throw error;
    }
  };

  // 📝 REGISTER
  const register = async userData => {
    try {
      dispatch({
        type: 'LOGIN_START'
      });
      const {
        user
      } = await apiService.register(userData);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: user
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      throw error;
    }
  };

  // 🚪 LOGOUT
  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({
        type: 'LOGOUT'
      });
    }
  };

  // 👤 UPDATE PROFILE
  const updateProfile = async userData => {
    try {
      dispatch({
        type: 'SET_LOADING',
        payload: true
      });
      const updatedUser = await apiService.updateProfile(userData);
      dispatch({
        type: 'UPDATE_PROFILE',
        payload: updatedUser
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      throw error;
    }
  };

  // 🔐 CHANGE PASSWORD
  const changePassword = async (currentPassword, newPassword) => {
    try {
      dispatch({
        type: 'SET_LOADING',
        payload: true
      });
      await apiService.changePassword(currentPassword, newPassword);
      dispatch({
        type: 'SET_LOADING',
        payload: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      throw error;
    }
  };
  const clearError = () => {
    dispatch({
      type: 'CLEAR_ERROR'
    });
  };
  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;