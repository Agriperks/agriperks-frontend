import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Modal from 'react-modal';
import Toast from '../components/Toast';
import Dexie from 'dexie';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
Modal.setAppElement('#root');

const Units = () => {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [formMode, setFormMode] = useState('add');
  const [formData, setFormData] = useState({
    id: null,
    name: '',
  });
  const [analytics, setAnalytics] = useState({
    totalUnits: 0,
  });

  const db = new Dexie('FarmPerksDB');
  db.version(1).stores({ units: '++id,name,farm_id' });

  const fetchUnits = async () => {
    try {
      if (!user?.token) throw new Error('User is not authenticated');
      const unitsResponse = await axios.get('http://127.0.0.1:5000/api/units', {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const items = Array.isArray(unitsResponse.data) ? unitsResponse.data : [];
      setUnits(items);
      setAnalytics({
        totalUnits: items.length,
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load units');
      const offlineUnits = await db.units.toArray();
      if (offlineUnits.length) {
        setUnits(offlineUnits);
        setAnalytics({ totalUnits: offlineUnits.length });
        setToast({ message: 'Loaded offline units data', type: 'info', visible: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [user]); // Removed dependency on `units` to prevent infinite loop

  const openModal = (mode = 'add') => {
    setFormMode(mode);
    setModalIsOpen(true);
    if (mode === 'add') {
      setFormData({ id: null, name: '' });
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setFormData({ id: null, name: '' });
    setFormMode('add');
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
    if (!formData.name) {
      showToast('Unit name is required', 'error');
      return;
    }

    try {
      if (!user?.token) throw new Error('User is not authenticated');
      const payload = { name: formData.name };

      if (formMode === 'edit' && formData.id) {
        await axios.put(`http://127.0.0.1:5000/api/units/${formData.id}`, payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('Unit updated successfully');
      } else {
        const response = await axios.post('http://127.0.0.1:5000/api/units', payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('Unit added successfully');
        const newUnit = response.data.unit; // Assuming backend returns the new unit
        if (newUnit) {
          setUnits((prevUnits) => [...prevUnits, newUnit]); // Update state immediately
          setAnalytics((prev) => ({ ...prev, totalUnits: prev.totalUnits + 1 }));
        }
        await db.units.add({ ...payload, id: response.data.unit.id, farm_id: user.farm_id });
      }

      // Fetch the latest units to ensure consistency
      await fetchUnits();
      closeModal();
    } catch (err) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to save unit';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      if (err.message.includes('Network Error') && formMode === 'add') {
        const tempId = Date.now();
        await db.units.add({ ...payload, id: tempId, farm_id: user.farm_id });
        setUnits([...units, { ...payload, id: tempId, farm_id: user.farm_id }]);
        setAnalytics((prev) => ({ ...prev, totalUnits: prev.totalUnits + 1 }));
        showToast('Unit saved offline', 'info');
        closeModal();
      }
    }
  };

  const handleEdit = (unit) => {
    setFormData({
      id: unit.id,
      name: unit.name || '',
    });
    openModal('edit');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        await axios.delete(`http://127.0.0.1:5000/api/units/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setUnits(units.filter((u) => u.id !== id));
        await db.units.delete(id);
        setAnalytics((prev) => ({ ...prev, totalUnits: prev.totalUnits - 1 }));
        showToast('Unit deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        const errorMessage = err.response?.data?.error?.message || 'Failed to delete unit';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const chartData = {
    labels: units.map((u) => u.name),
    datasets: [
      {
        label: 'Units',
        data: units.map(() => 1), // Simple count for visualization
        backgroundColor: 'rgba(46, 125, 50, 0.6)',
        borderColor: 'rgba(46, 125, 50, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Units Overview' },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Count' },
      },
    },
  };

  if (loading) return <div className="text-center text-farmGreen p-4 text-xl">Loading...</div>;
  if (error) return <div className="text-center text-red-500 p-4 text-xl">{error}</div>;

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-farmGreen mb-8 border-b-2 border-farmGreen pb-2">Units Management</h2>

      {/* Analytics Section */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-farmBrown mb-4">Units Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-farmGreen text-white rounded-lg">
            <h4 className="text-lg font-medium">Total Units</h4>
            <p className="text-2xl">{analytics.totalUnits}</p>
          </div>
          <div className="md:col-span-2">
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => openModal('add')}
        className="bg-farmGreen text-white px-6 py-3 rounded-lg mb-6 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-farmGreen"
      >
        Add Unit
      </button>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow rounded-lg table-auto">
          <thead>
            <tr className="bg-farmGreen text-white">
              <th className="p-3 text-left text-sm font-semibold">Name</th>
              <th className="p-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-gray-800">{unit.name}</td>
                <td className="p-3 flex space-x-2">
                  <button
                    onClick={() => handleEdit(unit)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(unit.id)}
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
          {formMode === 'edit' ? 'Edit Unit' : 'Add Unit'}
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
              {formMode === 'edit' ? 'Update' : 'Add'}
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

export default Units;