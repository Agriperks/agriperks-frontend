import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    farm_name: '',
    country: '',
    currency: '',
    email: '',           // Added email field
    phone_number: '',    // Added phone_number field
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/auth/register', {
        ...formData,
        role: 'admin',
      });
      alert(response.data.message);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-farmBrown">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-farmGreen mb-6">Register Your Farm</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Farm Name</label>
            <input
              type="text"
              name="farm_name"
              value={formData.farm_name}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
            />
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Currency</label>
            <input
              type="text"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              placeholder="e.g., NGN"
            />
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-farmBrown mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              placeholder="e.g., +2348012345678"
            />
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-farmGreen text-white p-2 rounded hover:bg-green-700"
          >
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-farmBrown">
          Already have an account?{' '}
          <a href="/login" className="text-farmGreen hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;