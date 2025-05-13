import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Modal from 'react-modal';
import Toast from '../components/Toast';
import Dexie from 'dexie';

Modal.setAppElement('#root');

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [formData, setFormData] = useState({
    id: null,
    description: '',
    amount: '',
    category: '',
    date_incurred: '',
  });
  const [exportDates, setExportDates] = useState({ start_date: '', end_date: '' });

  const db = new Dexie('FarmPerksDB');
  db.version(1).stores({ expenses: '++id,description,amount,category,date_incurred,farm_id' });

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        const response = await axios.get('http://127.0.0.1:5000/api/expenses', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const items = Array.isArray(response.data.items) ? response.data.items : [];
        const normalizedExpenses = items
          .map((expense, index) => {
            const normalized = {
              id: expense.id,
              description: typeof expense.description === 'string' ? expense.description : String(expense.description || 'N/A'),
              amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || 0),
              category: typeof expense.category === 'string' || expense.category === null ? expense.category : null,
              date_incurred: typeof expense.date_incurred === 'string' || expense.date_incurred === null ? expense.date_incurred : null,
              farm_id: expense.farm_id,
            };
            if (!normalized.id || typeof normalized.id !== 'number') {
              console.warn(`Invalid expense ID at index ${index}:`, expense);
              return null;
            }
            return normalized;
          })
          .filter(expense => expense !== null);
        setExpenses(normalizedExpenses);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load expenses');
        const offlineExpenses = await db.expenses.toArray();
        if (offlineExpenses.length) {
          const normalizedOffline = offlineExpenses
            .map((expense, index) => {
              const normalized = {
                id: expense.id,
                description: typeof expense.description === 'string' ? expense.description : String(expense.description || 'N/A'),
                amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || 0),
                category: typeof expense.category === 'string' || expense.category === null ? expense.category : null,
                date_incurred: typeof expense.date_incurred === 'string' || expense.date_incurred === null ? expense.date_incurred : null,
                farm_id: expense.farm_id,
              };
              if (!normalized.id || typeof normalized.id !== 'number') {
                console.warn(`Invalid offline expense ID at index ${index}:`, expense);
                return null;
              }
              return normalized;
            })
            .filter(expense => expense !== null);
          setExpenses(normalizedOffline);
          setToast({ message: 'Loaded offline expenses data', type: 'info', visible: true });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [user]);

  const syncOfflineExpenses = async () => {
    try {
      const offlineExpenses = await db.expenses.toArray();
      for (const expense of offlineExpenses) {
        if (!expense.id || typeof expense.id !== 'number') continue;
        try {
          const payload = {
            description: expense.description,
            amount: parseFloat(expense.amount),
            category: expense.category || null,
            date_incurred: expense.date_incurred || null,
          };
          const response = await axios.post('http://127.0.0.1:5000/api/expenses', payload, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          await db.expenses.delete(expense.id);
          await db.expenses.add({ ...payload, id: response.data.expense.id, farm_id: user.farm_id });
        } catch (err) {
          console.error(`Failed to sync expense ID ${expense.id}:`, err);
        }
      }
      const response = await axios.get('http://127.0.0.1:5000/api/expenses', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const items = Array.isArray(response.data.items) ? response.data.items : [];
      setExpenses(items.map((expense) => ({
        id: expense.id,
        description: typeof expense.description === 'string' ? expense.description : String(expense.description || 'N/A'),
        amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || 0),
        category: typeof expense.category === 'string' || expense.category === null ? expense.category : null,
        date_incurred: typeof expense.date_incurred === 'string' || expense.date_incurred === null ? expense.date_incurred : null,
        farm_id: expense.farm_id,
      })));
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => {
    setModalIsOpen(false);
    setFormData({ id: null, description: '', amount: '', category: '', date_incurred: '' });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.description) return 'Description is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) return 'Amount must be greater than 0';
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
      console.log('Submitting expense formData:', formData);
      const payload = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category || null,
        date_incurred: formData.date_incurred || null,
      };
      let response;
      if (formData.id) {
        if (typeof formData.id !== 'number') {
          throw new Error('Invalid expense ID');
        }
        response = await axios.put(`http://127.0.0.1:5000/api/expenses/${formData.id}`, payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('Expense updated successfully');
      } else {
        response = await axios.post('http://127.0.0.1:5000/api/expenses', payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        showToast('Expense added successfully');
        await db.expenses.add({ ...payload, id: response.data.expense.id, farm_id: user.farm_id });
      }
      const expensesResponse = await axios.get('http://127.0.0.1:5000/api/expenses', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const items = Array.isArray(expensesResponse.data.items) ? expensesResponse.data.items : [];
      setExpenses(items.map((expense) => ({
        id: expense.id,
        description: typeof expense.description === 'string' ? expense.description : String(expense.description || 'N/A'),
        amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || 0),
        category: typeof expense.category === 'string' || expense.category === null ? expense.category : null,
        date_incurred: typeof expense.date_incurred === 'string' || expense.date_incurred === null ? expense.date_incurred : null,
        farm_id: expense.farm_id,
      })));
      closeModal();
    } catch (err) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to save expense';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      if (err.message.includes('Network Error')) {
        await db.expenses.add({ ...payload, id: Date.now(), farm_id: user.farm_id });
        showToast('Expense saved offline', 'info');
        setExpenses([...expenses, { ...payload, id: Date.now(), farm_id: user.farm_id }]);
        closeModal();
      }
    }
  };

  const handleEdit = (expense) => {
    if (!expense.id || typeof expense.id !== 'number') {
      showToast('Cannot edit expense: Invalid ID', 'error');
      return;
    }
    setFormData({
      id: expense.id,
      description: expense.description || '',
      amount: expense.amount || '',
      category: expense.category || '',
      date_incurred: expense.date_incurred || '',
    });
    openModal();
  };

  const handleDelete = async (id) => {
    if (!id || typeof id !== 'number') {
      showToast('Cannot delete expense: Invalid ID', 'error');
      return;
    }
    console.log('Deleting expense ID:', id);
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        if (!user?.token) throw new Error('User is not authenticated');
        await syncOfflineExpenses();
        await axios.delete(`http://127.0.0.1:5000/api/expenses/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setExpenses(expenses.filter((e) => e.id !== id));
        await db.expenses.delete(id);
        showToast('Expense deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        const errorMessage = err.response?.data?.error?.message || 'Failed to delete expense';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleExport = async () => {
    try {
      if (!user?.token) throw new Error('User is not authenticated');
      const params = {};
      if (exportDates.start_date) params.start_date = exportDates.start_date;
      if (exportDates.end_date) params.end_date = exportDates.end_date;
      const response = await axios.get('http://127.0.0.1:5000/api/expenses/export', {
        headers: { Authorization: `Bearer ${user.token}` },
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'expenses_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Expenses exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export expenses', 'error');
    }
  };

  const formatNumber = (number) => {
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) return <div className="text-center text-farmGreen p-4 text-xl">Loading...</div>;
  if (error) return <div className="text-center text-red-500 p-4 text-xl">{error}</div>;

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-farmGreen mb-8 border-b-2 border-farmGreen pb-2">Expenses Management</h2>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-farmBrown mb-4">Expenses Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-farmGreen text-white rounded-lg">
            <h4 className="text-lg font-medium">Total Expenses</h4>
            <p className="text-2xl">{formatNumber(expenses.reduce((sum, e) => sum + (e.amount || 0), 0))} {user?.currency || 'USD'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
        <button
          onClick={openModal}
          className="bg-farmGreen text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-farmGreen"
        >
          Add Expense
        </button>
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
            Export Expenses
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow rounded-lg table-auto">
          <thead>
            <tr className="bg-farmGreen text-white">
              <th className="p-3 text-left text-sm font-semibold">Description</th>
              <th className="p-3 text-left text-sm font-semibold">Amount</th>
              <th className="p-3 text-left text-sm font-semibold">Category</th>
              <th className="p-3 text-left text-sm font-semibold">Date Incurred</th>
              <th className="p-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-gray-800">{expense.description}</td>
                <td className="p-3 text-gray-800">{expense.amount ? `${formatNumber(expense.amount)} ${user?.currency || 'USD'}` : 'N/A'}</td>
                <td className="p-3 text-gray-800">{expense.category || 'N/A'}</td>
                <td className="p-3 text-gray-800">{expense.date_incurred || 'N/A'}</td>
                <td className="p-3 flex space-x-2">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
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
          {formData.id ? 'Edit Expense' : 'Add Expense'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category (Optional)</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-farmGreen focus:border-farmGreen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Incurred (Optional)</label>
            <input
              type="date"
              name="date_incurred"
              value={formData.date_incurred}
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

export default Expenses;