import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Modal from 'react-modal';
import Toast from '../components/Toast';
import Dexie from 'dexie';

Modal.setAppElement('#root');

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [formData, setFormData] = useState({
    id: null,
    username: '',
    password: '',
    role: '',
  });

  const db = new Dexie('FarmPerksDB');
  db.version(1).stores({ users: '++id,username,role,farm_id' });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        const response = await axios.get('http://127.0.0.1:5000/api/users', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const items = Array.isArray(response.data.items) ? response.data.items : [];
        setUsers(items);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load users');
        const offlineUsers = await db.users.toArray();
        if (offlineUsers.length) {
          setUsers(offlineUsers);
          setToast({ message: 'Loaded offline users data', type: 'info', visible: true });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => {
    setModalIsOpen(false);
    setFormData({ id: null, username: '', password: '', role: '' });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!user?.token) throw new Error('User is not authenticated');
      const payload = {
        username: formData.username,
        password: formData.password,
        role: formData.role,
      };
      if (formData.id) {
        const updatePayload = { ...payload };
        delete updatePayload.password;
        if (formData.password) updatePayload.password = formData.password;
        await axios.put(`http://127.0.0.1:5000/api/users/${formData.id}`, updatePayload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('User updated successfully');
      } else {
        const response = await axios.post('http://127.0.0.1:5000/api/users', payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('User added successfully');
        await db.users.add({ ...payload, id: response.data.user.id, farm_id: user.farm_id });
      }
      const response = await axios.get('http://127.0.0.1:5000/api/users', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(Array.isArray(response.data.items) ? response.data.items : []);
      closeModal();
    } catch (err) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to save user';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      if (err.message.includes('Network Error')) {
        await db.users.add({ ...formData, farm_id: user.farm_id });
        showToast('User saved offline', 'info');
        setUsers([...users, { ...formData, id: Date.now() }]);
        closeModal();
      }
    }
  };

  const handleEdit = (user) => {
    setFormData({
      id: user.id,
      username: user.username || '',
      password: '',
      role: user.role || '',
    });
    openModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        await axios.delete(`http://127.0.0.1:5000/api/users/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setUsers(users.filter((u) => u.id !== id));
        await db.users.delete(id);
        showToast('User deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        const errorMessage = err.response?.data?.error?.message || 'Failed to delete user';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  if (loading) return <div className="text-center text-farmGreen p-4 text-xl">Loading...</div>;
  if (error) return <div className="text-center text-red-500 p-4 text-xl">{error}</div>;

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-farmGreen mb-8 border-b-2 border-farmGreen pb-2">Users Management</h2>

      <button
        onClick={openModal}
        className="bg-farmGreen text-white px-6 py-3 rounded-lg mb-6 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-farmGreen"
      >
        Add User
      </button>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow rounded-lg table-auto">
          <thead>
            <tr className="bg-farmGreen text-white">
              <th className="p-3 text-left text-sm font-semibold">Username</th>
              <th className="p-3 text-left text-sm font-semibold">Role</th>
              <th className="p-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-gray-800">{user.username || 'N/A'}</td>
                <td className="p-3 text-gray-800">{user.role || 'N/A'}</td>
                <td className="p-3 flex space-x-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <h2 className="text-xl font-bold text-farmGreen mb-4">
          {formData.id ? 'Edit User' : 'Add User'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password {formData.id && '(Leave blank to keep unchanged)'}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
              required={!formData.id}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
              required
            >
              <option value="">Select Role</option>
              <option value="admin">Admin</option>
              <option value="sales">Sales</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeModal}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-farmGreen text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, visible: false })}
        />
      )}
    </div>
  );
};

export default Users;