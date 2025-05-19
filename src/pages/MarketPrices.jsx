import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from 'react-modal';
import Toast from '../components/Toast';
import Dexie from 'dexie';

Modal.setAppElement('#root');

const Prices = () => {
  const { user } = useAuth();
  const [prices, setPrices] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [formData, setFormData] = useState({
    id: null,
    product_name: '',
    current_price: 0,
    location: '',
    date_updated: '',
    unit: '',
  });

  const db = new Dexie('FarmPerksDB');
  db.version(1).stores({ prices: '++id,product_name,current_price,location,date_updated,unit,farm_id' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.token) throw new Error('User is not authenticated');

        // Fetch units
        console.log('Fetching units for farm_id:', user.farm_id);
        const unitsResponse = await fetch('http://127.0.0.1:5000/api/units', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!unitsResponse.ok) {
          throw new Error(`Failed to fetch units: ${unitsResponse.status} ${await unitsResponse.text()}`);
        }
        const unitsData = await unitsResponse.json();
        console.log('Units response:', unitsData);
        const unitsItems = Array.isArray(unitsData.items) ? unitsData.items : [];
        if (unitsItems.length === 0) {
          console.warn('No units found in the database. Using fallback units.');
          setUnits([
            { id: 'fallback-1', name: 'kg' },
            { id: 'fallback-2', name: 'litre' },
            { id: 'fallback-3', name: 'dozen' },
          ]);
          setToast({ message: 'No units found in database. Using fallback units.', type: 'warning', visible: true });
        } else {
          setUnits(unitsItems);
        }

        // Fetch market prices
        console.log('Fetching market prices...');
        const pricesResponse = await fetch('http://127.0.0.1:5000/api/prices', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!pricesResponse.ok) {
          throw new Error(`Failed to fetch prices: ${pricesResponse.status} ${await pricesResponse.text()}`);
        }
        const pricesData = await pricesResponse.json();
        console.log('Prices response:', pricesData);
        const items = Array.isArray(pricesData.items) ? pricesData.items : [];
        setPrices(items.map(item => ({
          ...item,
          date_updated: item.date_updated || null,
          unit: item.unit || null,
        })));
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load market prices');
        const offlinePrices = await db.prices.toArray();
        if (offlinePrices.length) {
          setPrices(offlinePrices);
          setToast({ message: 'Loaded offline prices data', type: 'info', visible: true });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => {
    setModalIsOpen(false);
    setFormData({ id: null, product_name: '', current_price: 0, location: '', date_updated: '', unit: '' });
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
        product_name: formData.product_name,
        current_price: parseFloat(formData.current_price),
        location: formData.location || null,
        date_updated: formData.date_updated || null,
        unit: formData.unit || null,
      };
      console.log('Submitting payload:', payload);

      let response;
      if (formData.id) {
        response = await fetch(`http://127.0.0.1:5000/api/prices/${formData.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Failed to update market price: ${response.status} ${await response.text()}`);
        }
        showToast('Market price updated successfully');
      } else {
        response = await fetch('http://127.0.0.1:5000/api/prices', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to add market price: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        let newMarketPrice = data.market_price || data;
        if (!newMarketPrice || typeof newMarketPrice !== 'object') {
          throw new Error('Invalid market price structure: ' + JSON.stringify(newMarketPrice));
        }
        if (!('id' in newMarketPrice)) {
          throw new Error('Market price ID not found in response: ' + JSON.stringify(newMarketPrice));
        }
        await db.prices.put({
          ...newMarketPrice,
          farm_id: user.farm_id,
          date_updated: newMarketPrice.date_updated || null,
          unit: newMarketPrice.unit || null,
        });
        showToast('Market price added successfully');
      }

      const getResponse = await fetch('http://127.0.0.1:5000/api/prices', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!getResponse.ok) {
        throw new Error(`Failed to fetch updated prices: ${getResponse.status} ${await getResponse.text()}`);
      }
      const getData = await getResponse.json();
      const items = Array.isArray(getData.items) ? getData.items : [];
      setPrices(items.map(item => ({
        ...item,
        date_updated: item.date_updated || null,
        unit: item.unit || null,
      })));
      closeModal();
    } catch (err) {
      console.error('Submit error:', err.message);
      const errorMessage = err.message || 'Failed to save market price';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      if (err.message.includes('Network Error')) {
        await db.prices.add({ ...formData, farm_id: user.farm_id, id: Date.now() });
        showToast('Market price saved offline', 'info');
        setPrices([...prices, { ...formData, id: Date.now(), date_updated: formData.date_updated || null }]);
        closeModal();
      }
    }
  };

  const handleEdit = (price) => {
    setFormData({
      id: price.id,
      product_name: price.product_name || '',
      current_price: price.current_price || 0,
      location: price.location || '',
      date_updated: price.date_updated || '',
      unit: price.unit || '',
    });
    openModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this market price?')) {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        const response = await fetch(`http://127.0.0.1:5000/api/prices/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to delete market price: ${response.status} ${await response.text()}`);
        }
        setPrices(prices.filter((p) => p.id !== id));
        await db.prices.delete(id);
        showToast('Market price deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        const errorMessage = err.message || 'Failed to delete market price';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const formatNumber = (number) => {
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) return <div className="text-center text-farmGreen p-4 text-xl">Loading...</div>;
  if (error) return <div className="text-center text-red-500 p-4 text-xl">{error}</div>;

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-farmGreen mb-8 border-b-2 border-farmGreen pb-2">Market Prices Management</h2>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-farmBrown mb-4">Prices Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-farmGreen text-white rounded-lg">
            <h4 className="text-lg font-medium">Total Prices</h4>
            <p className="text-2xl">{prices.length}</p>
          </div>
        </div>
      </div>

      <button
        onClick={openModal}
        className="bg-farmGreen text-white px-6 py-3 rounded-lg mb-6 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-farmGreen"
      >
        Add Market Price
      </button>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow rounded-lg table-auto">
          <thead>
            <tr className="bg-farmGreen text-white">
              <th className="p-3 text-left text-sm font-semibold">Product</th>
              <th className="p-3 text-left text-sm font-semibold">Price</th>
              <th className="p-3 text-left text-sm font-semibold">Unit</th>
              <th className="p-3 text-left text-sm font-semibold">Location</th>
              <th className="p-3 text-left text-sm font-semibold">Date Updated</th>
              <th className="p-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price) => (
              <tr key={price.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-gray-800">{price.product_name || 'N/A'}</td>
                <td className="p-3 text-gray-800">{price.current_price ? `${formatNumber(price.current_price)} ${user?.currency || 'USD'}` : 'N/A'}</td>
                <td className="p-3 text-gray-800">{price.unit || 'N/A'}</td>
                <td className="p-3 text-gray-800">{price.location || 'N/A'}</td>
                <td className="p-3 text-gray-800">{price.date_updated || 'N/A'}</td>
                <td className="p-3 flex space-x-2">
                  <button
                    onClick={() => handleEdit(price)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(price.id)}
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
          {formData.id ? 'Edit Market Price' : 'Add Market Price'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Product Name</label>
            <input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Price</label>
            <input
              type="number"
              name="current_price"
              value={formData.current_price}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
            >
              <option value="">Select Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.name}>
                  {unit.name}
                </option>
              ))}
            </select>
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Updated</label>
            <input
              type="date"
              name="date_updated"
              value={formData.date_updated}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
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

export default Prices;