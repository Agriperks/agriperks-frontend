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

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [formMode, setFormMode] = useState('add');
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    category: '',
    quantity: 0,
    harvest_date: '',
    minimum_threshold: 0,
    default_unit_id: '',
  });
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState('');
  const [analytics, setAnalytics] = useState({
    totalProducts: 0,
    lowInventory: [],
  });

  const db = new Dexie('FarmPerksDB');
  db.version(2).stores({ products: '++id,name,category,quantity,harvest_date,minimum_threshold,farm_id,default_unit_id' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        const [productsResponse, unitsResponse, dashboardResponse, lowInventoryResponse] = await Promise.all([
          axios.get('http://127.0.0.1:5000/api/products', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get('http://127.0.0.1:5000/api/units', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get('http://127.0.0.1:5000/api/dashboard/summary', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get('http://127.0.0.1:5000/api/products/alerts', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);

        const items = Array.isArray(productsResponse.data.items) ? productsResponse.data.items : [];
        setProducts(items.map(item => ({ ...item, harvest_date: item.harvest_date || null })));
        setUnits(Array.isArray(unitsResponse.data) ? unitsResponse.data : []); // Updated for flat array
        setAnalytics({
          totalProducts: dashboardResponse.data.total_products || 0,
          lowInventory: lowInventoryResponse.data || [],
        });
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load products');
        const offlineProducts = await db.products.toArray();
        if (offlineProducts.length) {
          setProducts(offlineProducts);
          setToast({ message: 'Loaded offline products data', type: 'info', visible: true });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const openModal = (mode = 'add') => {
    setFormMode(mode);
    setModalIsOpen(true);
    if (mode === 'add') {
      setFormData({ id: null, name: '', category: '', quantity: 0, harvest_date: '', minimum_threshold: 0, default_unit_id: '' });
    }
    setSelectedProductId('');
    setQuantityToAdd('');
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setFormData({ id: null, name: '', category: '', quantity: 0, harvest_date: '', minimum_threshold: 0, default_unit_id: '' });
    setFormMode('add');
    setSelectedProductId('');
    setQuantityToAdd('');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ ...toast, visible: false }), 3000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuantityChange = (e) => {
    setQuantityToAdd(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!user?.token) throw new Error('User is not authenticated');
      if (formMode === 'addQuantity') {
        if (!selectedProductId) throw new Error('Please select a product');
        const payload = { quantity_to_add: parseInt(quantityToAdd) };
        const response = await axios.patch(
          `http://127.0.0.1:5000/api/products/${selectedProductId}/quantity`,
          payload,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        setProducts(products.map(p => p.id === parseInt(selectedProductId) ? response.data.product : p));
        await db.products.update(parseInt(selectedProductId), { quantity: response.data.product.quantity });
        showToast(`Added ${quantityToAdd} to ${response.data.product.name}`);
      } else {
        const payload = {
          name: formData.name,
          category: formData.category,
          quantity: parseInt(formData.quantity),
          harvest_date: formData.harvest_date || null,
          minimum_threshold: parseInt(formData.minimum_threshold) || 0,
          default_unit_id: formData.default_unit_id ? parseInt(formData.default_unit_id) : null,
        };
        if (formMode === 'edit' && formData.id) {
          await axios.put(`http://127.0.0.1:5000/api/products/${formData.id}`, payload, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          showToast('Product updated successfully');
        } else {
          const response = await axios.post('http://127.0.0.1:5000/api/products', payload, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          showToast('Product added successfully');
          await db.products.add({ ...payload, id: response.data.product.id, farm_id: user.farm_id });
        }
      }

      const response = await axios.get('http://127.0.0.1:5000/api/products', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const items = Array.isArray(response.data.items) ? response.data.items : [];
      setProducts(items.map(item => ({ ...item, harvest_date: item.harvest_date || null })));
      const lowInventoryResponse = await axios.get('http://127.0.0.1:5000/api/products/alerts', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setAnalytics(prev => ({ ...prev, lowInventory: lowInventoryResponse.data || [] }));
      closeModal();
    } catch (err) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to save product';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      if (err.message.includes('Network Error')) {
        if (formMode === 'addQuantity' && selectedProductId) {
          const product = products.find(p => p.id === parseInt(selectedProductId));
          if (product) {
            await db.products.update(parseInt(selectedProductId), {
              quantity: product.quantity + parseInt(quantityToAdd)
            });
            setProducts(products.map(p =>
              p.id === parseInt(selectedProductId)
                ? { ...p, quantity: p.quantity + parseInt(quantityToAdd) }
                : p
            ));
            showToast(`Quantity update for ${product.name} saved offline`, 'info');
          }
        } else if (formMode === 'add') {
          await db.products.add({ ...formData, id: Date.now(), farm_id: user.farm_id });
          setProducts([...products, { ...formData, id: Date.now() }]);
          showToast('Product saved offline', 'info');
        }
        closeModal();
      }
    }
  };

  const handleEdit = (product) => {
    setFormData({
      id: product.id,
      name: product.name || '',
      category: product.category || '',
      quantity: product.quantity || 0,
      harvest_date: product.harvest_date || '',
      minimum_threshold: product.minimum_threshold || 0,
      default_unit_id: product.default_unit_id || '',
    });
    openModal('edit');
  };

  const handleAddQuantity = (product) => {
    setSelectedProductId(product.id);
    openModal('addQuantity');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        await axios.delete(`http://127.0.0.1:5000/api/products/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setProducts(products.filter((p) => p.id !== id));
        await db.products.delete(id);
        setAnalytics(prev => ({
          ...prev,
          totalProducts: prev.totalProducts - 1,
          lowInventory: prev.lowInventory.filter(item => item.id !== id),
        }));
        showToast('Product deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        const errorMessage = err.response?.data?.error?.message || 'Failed to delete product';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const chartData = {
    labels: products.map(p => p.name),
    datasets: [
      {
        label: 'Quantity in Stock',
        data: products.map(p => p.quantity),
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
      title: { display: true, text: 'Product Quantities' },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Quantity' },
      },
    },
  };

  if (loading) return <div className="text-center text-farmGreen p-4 text-xl">Loading...</div>;
  if (error) return <div className="text-center text-red-500 p-4 text-xl">{error}</div>;

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-farmGreen mb-8 border-b-2 border-farmGreen pb-2">Products Management</h2>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-farmBrown mb-4">Product Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-farmGreen text-white rounded-lg">
            <h4 className="text-lg font-medium">Total Products</h4>
            <p className="text-2xl">{analytics.totalProducts}</p>
          </div>
          <div className="p-4 bg-farmBrown text-white rounded-lg">
            <h4 className="text-lg font-medium">Low Inventory Alerts</h4>
            <p className="text-2xl">{analytics.lowInventory.length}</p>
            {analytics.lowInventory.length > 0 && (
              <ul className="mt-2 text-sm">
                {analytics.lowInventory.map((p) => (
                  <li key={p.id}>{p.name}: {p.quantity} (Min: {p.minimum_threshold})</li>
                ))}
              </ul>
            )}
          </div>
          <div className="md:col-span-1">
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
        Add Product
      </button>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow rounded-lg table-auto">
          <thead>
            <tr className="bg-farmGreen text-white">
              <th className="p-3 text-left text-sm font-semibold">Name</th><th className="p-3 text-left text-sm font-semibold">Category</th><th className="p-3 text-left text-sm font-semibold">Quantity</th><th className="p-3 text-left text-sm font-semibold">Unit</th><th className="p-3 text-left text-sm font-semibold">Harvest Date</th><th className="p-3 text-left text-sm font-semibold">Min Threshold</th><th className="p-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-gray-800">{product.name}</td>
                <td className="p-3 text-gray-800">{product.category}</td>
                <td className="p-3 text-gray-800">{product.quantity}</td>
                <td className="p-3 text-gray-800">{units.find(u => u.id === product.default_unit_id)?.name || 'N/A'}</td>
                <td className="p-3 text-gray-800">{product.harvest_date || 'N/A'}</td>
                <td className="p-3 text-gray-800">{product.minimum_threshold}</td>
                <td className="p-3 flex space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleAddQuantity(product)}
                    className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Add Quantity
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
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
          {formMode === 'edit' ? 'Edit Product' : formMode === 'addQuantity' ? 'Add Quantity' : 'Add Product'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formMode === 'addQuantity' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.quantity} in stock)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity to Add</label>
                <input
                  type="number"
                  value={quantityToAdd}
                  onChange={handleQuantityChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
                  required
                  min="0"
                />
              </div>
            </>
          ) : (
            <>
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
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
                  required
                >
                  <option value="">Select category</option>
                  <option value="crop">Crop</option>
                  <option value="animal">Animal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Unit</label>
                <select
                  name="default_unit_id"
                  value={formData.default_unit_id}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
                >
                  <option value="">Select unit (optional)</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Harvest Date</label>
                <input
                  type="date"
                  name="harvest_date"
                  value={formData.harvest_date}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Threshold</label>
                <input
                  type="number"
                  name="minimum_threshold"
                  value={formData.minimum_threshold}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
                  min="0"
                />
              </div>
            </>
          )}
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
              {formMode === 'edit' ? 'Update' : formMode === 'addQuantity' ? 'Add Quantity' : 'Add'}
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

export default Products;