import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.username, formData.password);
      navigate('/');
      toast.success('Welcome back!');
    } catch (error) {
      // Error is already handled in AuthContext with toast
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-farmGreen mb-6 text-center">Login to FarmPerks</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-farmBrown mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-farmGreen focus:border-farmGreen"
              required
              aria-label="Username"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-farmBrown mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-farmGreen focus:border-farmGreen"
              required
              aria-label="Password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-farmGreen text-white py-2 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-farmGreen ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-label="Login"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-center text-farmBrown">
          Don't have an account?{' '}
          <a href="/register" className="text-farmGreen hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;