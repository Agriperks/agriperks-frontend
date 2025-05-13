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

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [formData, setFormData] = useState({
    id: null,
    product_id: '',
    quantity_sold: '',
    price_per_unit: '',
    sale_date: '',
    buyer_id: '',
    create_new_buyer: false,
    buyer_name: '',
    buyer_contact: '',
    unit_id: '',
  });
  const [exportDates, setExportDates] = useState({ start_date: '', end_date: '' });
  const [bulkDeleteDates, setBulkDeleteDates] = useState({ start_date: '', end_date: '' });
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    topProducts: [],
    lowInventory: [],
  });

  const db = new Dexie('FarmPerksDB');
  db.version(3).stores({
    sales: '++id,product_id,quantity_sold,price_per_unit,sale_date,buyer_id,farm_id,unit_id',
    pendingDeletions: '++id,entity_type,entity_id,farm_id',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        const [salesResponse, productsResponse, unitsResponse, buyersResponse, dashboardResponse, topProductsResponse, lowInventoryResponse] = await Promise.all([
          axios.get('http://127.0.0.1:5000/api/sales', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get('http://127.0.0.1:5000/api/products', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get('http://127.0.0.1:5000/api/units', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get('http://127.0.0.1:5000/api/buyers', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get('http://127.0.0.1:5000/api/dashboard/summary', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get('http://127.0.0.1:5000/api/dashboard/top-selling', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get('http://127.0.0.1:5000/api/products/alerts', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);

        const salesItems = Array.isArray(salesResponse.data.items) ? salesResponse.data.items : [];
        const normalizedSales = salesItems.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity_sold: item.quantity_sold,
          price_per_unit: item.price_per_unit,
          total_price: item.total_price,
          sale_date: item.sale_date || null,
          buyer_id: item.buyer_id || null,
          unit_id: item.unit_id || null,
          farm_id: item.farm_id,
        }));

        setSales(normalizedSales);
        setProducts(Array.isArray(productsResponse.data.items) ? productsResponse.data.items : []);
        setUnits(Array.isArray(unitsResponse.data) ? unitsResponse.data : []); // Updated for flat array
        setBuyers(Array.isArray(buyersResponse.data.items) ? buyersResponse.data.items : []);
        setAnalytics({
          totalRevenue: dashboardResponse.data.total_revenue || 0,
          topProducts: topProductsResponse.data || [],
          lowInventory: lowInventoryResponse.data || [],
        });

        await syncPendingDeletions();
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load sales');
        const offlineSales = await db.sales.toArray();
        if (offlineSales.length) {
          const normalizedOffline = offlineSales.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            quantity_sold: item.quantity_sold,
            price_per_unit: item.price_per_unit,
            total_price: item.total_price,
            sale_date: item.sale_date || null,
            buyer_id: item.buyer_id || null,
            unit_id: item.unit_id || null,
            farm_id: item.farm_id,
          }));
          setSales(normalizedOffline);
          setToast({ message: 'Loaded offline sales data', type: 'info', visible: true });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const syncPendingDeletions = async () => {
    try {
      const pendingDeletions = await db.pendingDeletions.toArray();
      if (pendingDeletions.length && user?.token) {
        const response = await axios.post(
          'http://127.0.0.1:5000/api/sync',
          { deletions: pendingDeletions },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        if (response.data.deletions_synced > 0) {
          await db.pendingDeletions.clear();
          showToast(`Synced ${response.data.deletions_synced} deletions`, 'success');
          const salesResponse = await axios.get('http://127.0.0.1:5000/api/sales', {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          const salesItems = Array.isArray(salesResponse.data.items) ? salesResponse.data.items : [];
          setSales(
            salesItems.map((item) => ({
              id: item.id,
              product_id: item.product_id,
              quantity_sold: item.quantity_sold,
              price_per_unit: item.price_per_unit,
              total_price: item.total_price,
              sale_date: item.sale_date || null,
              buyer_id: item.buyer_id || null,
              unit_id: item.unit_id || null,
              farm_id: item.farm_id,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Sync deletions error:', err);
      showToast('Failed to sync deletions', 'error');
    }
  };

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => {
    setModalIsOpen(false);
    setFormData({ id: null, product_id: '', quantity_sold: '', price_per_unit: '', sale_date: '', buyer_id: '', create_new_buyer: false, buyer_name: '', buyer_contact: '', unit_id: '' });
  };

  const openBulkDeleteModal = () => setBulkDeleteModalOpen(true);
  const closeBulkDeleteModal = () => {
    setBulkDeleteModalOpen(false);
    setBulkDeleteDates({ start_date: '', end_date: '' });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ ...toast, visible: false }), 3000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBulkDeleteChange = (e) => {
    setBulkDeleteDates({ ...bulkDeleteDates, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.product_id) return 'Product is required';
    if (!formData.quantity_sold || parseInt(formData.quantity_sold) <= 0) return 'Quantity sold must be greater than 0';
    if (!formData.price_per_unit || parseFloat(formData.price_per_unit) < 0) return 'Price per unit must be non-negative';
    if (!formData.sale_date) return 'Sale date is required';
    if (!formData.unit_id) return 'Unit is required';
    if (!formData.create_new_buyer && !formData.buyer_id) return 'Buyer is required';
    if (formData.create_new_buyer && !formData.buyer_name) return 'Buyer name is required when adding a new buyer';
    if (formData.create_new_buyer && !formData.buyer_contact) return 'Buyer contact is required when adding a new buyer';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    try {
      if (!user?.token) throw new Error('User is not authenticated');
      const payload = {
        product_id: parseInt(formData.product_id),
        quantity_sold: parseInt(formData.quantity_sold),
        price_per_unit: parseFloat(formData.price_per_unit),
        sale_date: formData.sale_date || null,
        buyer_id: formData.buyer_id ? parseInt(formData.buyer_id) : null,
        create_new_buyer: formData.create_new_buyer,
        buyer_name: formData.create_new_buyer ? formData.buyer_name : null,
        buyer_contact: formData.create_new_buyer ? formData.buyer_contact : null,
        unit_id: parseInt(formData.unit_id),
      };
      let response;
      if (formData.id) {
        response = await axios.put(`http://127.0.0.1:5000/api/sales/${formData.id}`, payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('Sale updated successfully');
      } else {
        response = await axios.post('http://127.0.0.1:5000/api/sales', payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('Sale added successfully');
        await db.sales.add({ ...payload, id: response.data.sale.id, buyer_id: payload.buyer_id, farm_id: user.farm_id });
      }
      const salesResponse = await axios.get('http://127.0.0.1:5000/api/sales', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const items = Array.isArray(salesResponse.data.items) ? salesResponse.data.items : [];
      setSales(
        items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity_sold: item.quantity_sold,
          price_per_unit: item.price_per_unit,
          total_price: item.total_price,
          sale_date: item.sale_date || null,
          buyer_id: item.buyer_id || null,
          unit_id: item.unit_id || null,
          farm_id: item.farm_id,
        }))
      );
      closeModal();
    } catch (err) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to save sale';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      if (err.message.includes('Network Error')) {
        const tempId = Date.now();
        await db.sales.add({ ...payload, id: tempId, buyer_id: payload.buyer_id, farm_id: user.farm_id });
        showToast('Sale saved offline', 'info');
        setSales([...sales, { ...payload, id: tempId, farm_id: user.farm_id }]);
        closeModal();
      }
    }
  };

  const handleEdit = (sale) => {
    setFormData({
      id: sale.id,
      product_id: sale.product_id || '',
      quantity_sold: sale.quantity_sold || '',
      price_per_unit: sale.price_per_unit || '',
      sale_date: sale.sale_date || '',
      buyer_id: sale.buyer_id || '',
      create_new_buyer: false,
      buyer_name: '',
      buyer_contact: '',
      unit_id: sale.unit_id || '',
    });
    openModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        await axios.delete(`http://127.0.0.1:5000/api/sales/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setSales(sales.filter((s) => s.id !== id));
        await db.sales.delete(id);
        showToast('Sale deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        const errorMessage = err.response?.data?.error?.message || 'Failed to delete sale';
        setError(errorMessage);
        showToast(errorMessage, 'error');
        if (err.message.includes('Network Error')) {
          await db.pendingDeletions.add({ entity_type: 'sale', entity_id: id, farm_id: user.farm_id });
          setSales(sales.filter((s) => s.id !== id));
          await db.sales.delete(id);
          showToast('Deletion queued offline', 'info');
        }
      }
    }
  };

  const handleBulkDelete = async (e) => {
    e.preventDefault();
    if (!bulkDeleteDates.start_date || !bulkDeleteDates.end_date) {
      showToast('Please select both start and end dates', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to delete all sales between ${bulkDeleteDates.start_date} and ${bulkDeleteDates.end_date}?`)) {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        const response = await axios.delete('http://127.0.0.1:5000/api/sales/bulk', {
          headers: { Authorization: `Bearer ${user.token}` },
          data: bulkDeleteDates,
        });
        showToast(response.data.message, 'success');
        const salesResponse = await axios.get('http://127.0.0.1:5000/api/sales', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const items = Array.isArray(salesResponse.data.items) ? salesResponse.data.items : [];
        setSales(
          items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            quantity_sold: item.quantity_sold,
            price_per_unit: item.price_per_unit,
            total_price: item.total_price,
            sale_date: item.sale_date || null,
            buyer_id: item.buyer_id || null,
            unit_id: item.unit_id || null,
            farm_id: item.farm_id,
          }))
        );
        closeBulkDeleteModal();
      } catch (err) {
        console.error('Bulk delete error:', err);
        const errorMessage = err.response?.data?.error?.message || 'Failed to delete sales';
        setError(errorMessage);
        showToast(errorMessage, 'error');
        if (err.message.includes('Network Error')) {
          const tempIds = sales
            .filter((s) => {
              const saleDate = new Date(s.sale_date);
              const startDate = new Date(bulkDeleteDates.start_date);
              const endDate = new Date(bulkDeleteDates.end_date);
              return saleDate >= startDate && saleDate <= endDate;
            })
            .map((s) => s.id);
          await Promise.all(
            tempIds.map((id) =>
              db.pendingDeletions.add({ entity_type: 'sale', entity_id: id, farm_id: user.farm_id })
            )
          );
          setSales(sales.filter((s) => !tempIds.includes(s.id)));
          await Promise.all(tempIds.map((id) => db.sales.delete(id)));
          showToast('Bulk deletion queued offline', 'info');
          closeBulkDeleteModal();
        }
      }
    }
  };

  const handleExport = async () => {
    try {
      if (!user?.token) throw new Error('User is not authenticated');
      const params = {};
      if (exportDates.start_date) params.start_date = exportDates.start_date;
      if (exportDates.end_date) params.end_date = exportDates.end_date;
      const response = await axios.get('http://127.0.0.1:5000/api/sales/export', {
        headers: { Authorization: `Bearer ${user.token}` },
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Sales exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export sales', 'error');
    }
  };

  const formatNumber = (number) => {
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const chartData = {
    labels: analytics.topProducts.map((p) => p.name),
    datasets: [
      {
        label: 'Total Earned',
        data: analytics.topProducts.map((p) => p.total_earned),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Top Selling Products' },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: `Revenue (${user?.currency || 'USD'})` },
      },
    },
  };

  if (loading) return <div className="text-center text-farmGreen p-4 text-xl">Loading...</div>;
  if (error) return <div className="text-center text-red-500 p-4 text-xl">{error}</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-farmGreen mb-8 border-b-2 border-farmGreen pb-2">Sales Management</h2>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-farmBrown mb-4">Sales Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-farmGreen text-white rounded-lg">
            <h4 className="text-lg font-medium">Total Revenue</h4>
            <p className="text-2xl">{formatNumber(analytics.totalRevenue)} {user?.currency || 'USD'}</p>
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

      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
        <div className="flex space-x-2">
          <button
            onClick={openModal}
            className="bg-farmGreen text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-farmGreen"
          >
            Add Sale
          </button>
          <div className="relative group">
            <button
              onClick={openBulkDeleteModal}
              className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Bulk Delete
            </button>
            <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 -mt-10">
              Delete multiple sales within a date range
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <input
            type="date"
            value={exportDates.start_date}
            onChange={(e) => setExportDates({ ...exportDates, start_date: e.target.value })}
            className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmBrown"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={exportDates.end_date}
            onChange={(e) => setExportDates({ ...exportDates, end_date: e.target.value })}
            className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmBrown"
            placeholder="End Date"
          />
          <button
            onClick={handleExport}
            className="bg-farmBrown text-white px-6 py-3 rounded-lg hover:bg-brown-700 focus:outline-none focus:ring-2 focus:ring-farmBrown"
          >
            Export Sales
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow rounded-lg table-auto">
          <thead>
            <tr className="bg-farmGreen text-white">
              <th className="p-3 text-left text-sm font-semibold">Product</th><th className="p-3 text-left text-sm font-semibold">Quantity Sold</th><th className="p-3 text-left text-sm font-semibold">Unit</th><th className="p-3 text-left text-sm font-semibold">Price/Unit</th><th className="p-3 text-left text-sm font-semibold">Total</th><th className="p-3 text-left text-sm font-semibold">Date</th><th className="p-3 text-left text-sm font-semibold">Buyer</th><th className="p-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-gray-800">{products.find((p) => p.id === sale.product_id)?.name || 'N/A'}</td>
                <td className="p-3 text-gray-800">{sale.quantity_sold || 'N/A'}</td>
                <td className="p-3 text-gray-800">{units.find((u) => u.id === sale.unit_id)?.name || 'N/A'}</td>
                <td className="p-3 text-gray-800">{sale.price_per_unit ? `${formatNumber(sale.price_per_unit)} ${user?.currency || 'USD'}` : 'N/A'}</td>
                <td className="p-3 text-gray-800">{sale.total_price ? `${formatNumber(sale.total_price)} ${user?.currency || 'USD'}` : 'N/A'}</td>
                <td className="p-3 text-gray-800">{sale.sale_date || 'N/A'}</td>
                <td className="p-3 text-gray-800">{buyers.find((b) => b.id === sale.buyer_id)?.name || 'N/A'}</td>
                <td className="p-3 flex space-x-2">
                  <button
                    onClick={() => handleEdit(sale)}
                    className="bg-farmGreen text-white px-3 py-1 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-farmGreen"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(sale.id)}
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
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        <h2 className="text-xl font-bold text-farmGreen mb-4">
          {formData.id ? 'Edit Sale' : 'Add Sale'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Product</label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Quantity Sold</label>
            <input
              type="number"
              name="quantity_sold"
              value={formData.quantity_sold}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
              min="1"
            />
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Unit</label>
            <select
              name="unit_id"
              value={formData.unit_id}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
            >
              <option value="">Select Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Price per Unit</label>
            <input
              type="number"
              name="price_per_unit"
              value={formData.price_per_unit}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Sale Date</label>
            <input
              type="date"
              name="sale_date"
              value={formData.sale_date}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Select Buyer</label>
            <select
              name="buyer_id"
              value={formData.buyer_id}
              onChange={(e) => {
                setFormData({ ...formData, buyer_id: e.target.value, create_new_buyer: false, buyer_name: '', buyer_contact: '' });
              }}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              disabled={formData.create_new_buyer}
            >
              <option value="">Select Buyer</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">
              <input
                type="checkbox"
                name="create_new_buyer"
                checked={formData.create_new_buyer}
                onChange={(e) => setFormData({ ...formData, create_new_buyer: e.target.checked, buyer_id: '' })}
                className="mr-2"
              />
              Add New Buyer
            </label>
            {formData.create_new_buyer && (
              <>
                <input
                  type="text"
                  name="buyer_name"
                  value={formData.buyer_name}
                  onChange={handleChange}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
                  required
                  placeholder="Buyer Name"
                />
                <input
                  type="text"
                  name="buyer_contact"
                  value={formData.buyer_contact}
                  onChange={handleChange}
                  className="w-full p-2 border rounded mt-2 focus:outline-none focus:ring-2 focus:ring-farmGreen"
                  required
                  placeholder="Buyer Contact"
                />
              </>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeModal}
              className="bg-gray-300 text-farmBrown px-4 py-2 rounded hover:bg-gray-400"
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

      <Modal
        isOpen={bulkDeleteModalOpen}
        onRequestClose={closeBulkDeleteModal}
        className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        <h2 className="text-xl font-bold text-farmGreen mb-4">Bulk Delete Sales</h2>
        <form onSubmit={handleBulkDelete}>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={bulkDeleteDates.start_date}
              onChange={handleBulkDeleteChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-farmBrown mb-2">End Date</label>
            <input
              type="date"
              name="end_date"
              value={bulkDeleteDates.end_date}
              onChange={handleBulkDeleteChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-farmGreen"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeBulkDeleteModal}
              className="bg-gray-300 text-farmBrown px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </form>
      </Modal>

      {toast.visible && toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, visible: false })}
        />
      )}
    </div>
  );
};

export default Sales;