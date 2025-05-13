import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Modal from 'react-modal';
import Toast from '../components/Toast';
import Dexie from 'dexie';

Modal.setAppElement('#root');

const Buyers = () => {
  const { user } = useAuth();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    contact: '',
    location: '',
  });

  const db = new Dexie('FarmPerksDB');
  db.version(1).stores({ buyers: '++id,name,contact,location,farm_id' });

  useEffect(() => {
    const fetchBuyers = async () => {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        const response = await axios.get('http://127.0.0.1:5000/api/buyers', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const items = Array.isArray(response.data.items) ? response.data.items : [];
        setBuyers(items);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.response?.data?.error?.message || 'Failed to load buyers');
        const offlineBuyers = await db.buyers.toArray();
        if (offlineBuyers.length) {
          setBuyers(offlineBuyers);
          showToast('Loaded offline buyers data', 'info');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBuyers();
  }, [user]);

  const openModal = (buyer = null) => {
    setFormData(
      buyer
        ? { id: buyer.id, name: buyer.name || '', contact: buyer.contact || '', location: buyer.location || '' }
        : { id: null, name: '', contact: '', location: '' }
    );
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setFormData({ id: null, name: '', contact: '', location: '' });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ ...toast, visible: false }), 3000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!user?.token) throw new Error('User is not authenticated');
      const payload = {
        name: formData.name,
        contact: formData.contact || null,
        location: formData.location || null,
      };
      if (formData.id) {
        await axios.put(`http://127.0.0.1:5000/api/buyers/${formData.id}`, payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('Buyer updated successfully');
      } else {
        const response = await axios.post('http://127.0.0.1:5000/api/buyers', payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('Buyer added successfully');
        await db.buyers.add({ ...payload, id: response.data.buyer.id, farm_id: user.farm_id });
      }
      const response = await axios.get('http://127.0.0.1:5000/api/buyers', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setBuyers(Array.isArray(response.data.items) ? response.data.items : []);
      closeModal();
    } catch (err) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to save buyer';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      if (err.message.includes('Network Error')) {
        await db.buyers.add({ ...formData, farm_id: user.farm_id });
        showToast('Buyer saved offline', 'info');
        setBuyers([...buyers, { ...formData, id: Date.now() }]);
        closeModal();
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this buyer?')) {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        await axios.delete(`http://127.0.0.1:5000/api/buyers/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setBuyers(buyers.filter((b) => b.id !== id));
        await db.buyers.delete(id);
        showToast('Buyer deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        const errorMessage = err.response?.data?.error?.message || 'Failed to delete buyer';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleExport = async () => {
    try {
      if (!user?.token) throw new Error('User is not authenticated');
      const response = await axios.get('http://127.0.0.1:5000/api/buyers/export', {
        headers: { Authorization: `Bearer ${user.token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `buyers_export_${user.farm_id}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Buyers exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to export buyers';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  if (loading) return <div className="text-center text-farmGreen p-4 text-xl">Loading...</div>;
  if (error) return <div className="text-center text-red-500 p-4 text-xl">{error}</div>;

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-farmGreen mb-8 border-b-2 border-farmGreen pb-2">Buyers Management</h2>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-farmBrown mb-4">Buyers Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-farmGreen text-white rounded-lg">
            <h4 className="text-lg font-medium">Total Buyers</h4>
            <p className="text-2xl">{buyers.length}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex space-x-4">
        <button
          onClick={() => openModal()}
          className="bg-farmGreen text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-farmGreen"
        >
          Add Buyer
        </button>
        <button
          onClick={handleExport}
          className="bg-farmBrown text-white px-6 py-3 rounded-lg hover:bg-brown-700 focus:outline-none focus:ring-2 focus:ring-farmBrown"
        >
          Export Buyers
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow rounded-lg table-auto">
          <thead>
            <tr className="bg-farmGreen text-white">
              <th className="p-3 text-left text-sm font-semibold">Name</th>
              <th className="p-3 text-left text-sm font-semibold">Contact</th>
              <th className="p-3 text-left text-sm font-semibold">Location</th>
              <th className="p-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {buyers.map((buyer) => (
              <tr key={buyer.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-gray-800">{buyer.name || 'N/A'}</td>
                <td className="p-3 text-gray-800">{buyer.contact || 'N/A'}</td>
                <td className="p-3 text-gray-800">{buyer.location || 'N/A'}</td>
                <td className="p-3 flex space-x-2">
                  <button
                    onClick={() => openModal(buyer)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(buyer.id)}
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
          {formData.id ? 'Edit Buyer' : 'Add Buyer'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeModal}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-farmGreen text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-farmGreen"
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

export default Buyers;