import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    try {
      // Validate inputs
      if (typeof username !== 'string' || typeof password !== 'string') {
        throw new Error('Username and password must be strings');
      }
      if (username.length < 3 || username.length > 80) {
        throw new Error('Username must be between 3 and 80 characters');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const response = await axios.post('http://127.0.0.1:5000/api/auth/login', {
        username: username.trim(),
        password: password.trim(),
      });
      const { access_token, farm_id, farm_name } = response.data;
      // Fetch farm details
      const farmResponse = await axios.get('http://127.0.0.1:5000/api/farm', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const userData = {
        token: access_token,
        farm_id,
        username: username.trim(),
        farm_name: farm_name || 'My Farm',
        country: farmResponse.data.country || '',
        currency: farmResponse.data.currency || 'USD',
      };
      localStorage.setItem('token', access_token);
      localStorage.setItem('farmName', userData.farm_name);
      setUser(userData);
      toast.success('Logged in successfully!');
      setLoading(false);
      return true;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('farmName');
    setUser(null);
    toast.success('Logged out successfully!');
  };

  const fetchFarmDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token && !user) {
        const response = await axios.get('http://127.0.0.1:5000/api/farm', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const storedFarmName = localStorage.getItem('farmName');
        setUser({
          token,
          farm_name: response.data.name || storedFarmName || 'My Farm',
          country: response.data.country || '',
          currency: response.data.currency || 'USD',
        });
      }
    } catch (error) {
      console.error('Error fetching farm details:', error);
      if (error.response?.status === 401) {
        logout();
        toast.error('Session expired. Please log in again.');
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      setUser({ token });
      fetchFarmDetails();
    }
    setLoading(false);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};