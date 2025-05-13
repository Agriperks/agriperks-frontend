import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import { useTranslation } from 'react-i18next';
import i18next from '../i18n';

const Settings = () => {
  const { user, setUser, logout } = useAuth();
  const { t } = useTranslation();
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });
  const [farmData, setFarmData] = useState({
    name: user?.farm_name || '',
    country: user?.country || '',
    currency: user?.currency || 'USD',
  });
  const [localization, setLocalization] = useState({ language: i18next.language });
  const [feedback, setFeedback] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

  // Fetch farm details on component mount to ensure latest data
  useEffect(() => {
    const fetchFarmDetails = async () => {
      try {
        if (!user?.token) return;
        const response = await axios.get('http://127.0.0.1:5000/api/farm', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const { name, country, currency } = response.data;
        setFarmData({
          name: name || user.farm_name || '',
          country: country || user.country || '',
          currency: currency || user.currency || 'USD',
        });
        // Update user context with the latest farm details
        setUser(prevUser => ({
          ...prevUser,
          farm_name: name || prevUser.farm_name,
          country: country || prevUser.country,
          currency: currency || prevUser.currency,
        }));
      } catch (err) {
        console.error('Error fetching farm details:', err);
        showToast(t('settings.farmError'), 'error');
      }
    };
    fetchFarmDetails();
  }, [user?.token, setUser, t]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleFarmChange = (e) => {
    setFarmData({ ...farmData, [e.target.name]: e.target.value });
  };

  const handleLocalizationChange = (e) => {
    const newLang = e.target.value;
    setLocalization({ language: newLang });
    i18next.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    showToast(t('settings.languageUpdated'));
  };

  const handleFeedbackChange = (e) => {
    setFeedback(e.target.value);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { current_password, new_password } = passwordData;
    if (new_password.length < 8) {
      showToast('New password must be at least 8 characters long', 'error');
      return;
    }
    try {
      const response = await axios.put(
        'http://127.0.0.1:5000/api/users/me',
        { current_password, new_password },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      if (response.status === 200) {
        showToast(t('settings.passwordUpdated'));
        setPasswordData({ current_password: '', new_password: '' });
        setTimeout(() => {
          logout();
        }, 2000);
      }
    } catch (err) {
      console.error('Error updating password:', err);
      const errorMessage = err.response?.data?.error?.message || t('settings.passwordError');
      showToast(errorMessage, 'error');
    }
  };

  const handleFarmSubmit = async (e) => {
    e.preventDefault();
    if (!farmData.name.trim()) {
      showToast('Farm name cannot be empty', 'error');
      return;
    }
    try {
      const response = await axios.put(
        'http://127.0.0.1:5000/api/farm',
        farmData,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      if (response.status === 200 && response.data.message === 'Farm updated') {
        const { name, country, currency } = response.data.farm;
        setUser(prevUser => ({
          ...prevUser,
          farm_name: name,
          country: country,
          currency: currency,
        }));
        setFarmData({ name, country, currency }); // Update form state
        showToast(t('settings.farmUpdated'));
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      console.error('Error updating farm:', err);
      const errorMessage = err.response?.data?.error?.message || t('settings.farmError');
      showToast(errorMessage, 'error');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      showToast(t('settings.feedbackError'), 'error');
      return;
    }
    try {
      console.log('Feedback submitted:', feedback);
      showToast(t('settings.feedbackSent'));
      setFeedback('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      showToast(t('settings.feedbackError'), 'error');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('settings.title')}</h1>

      {/* Toast Notification */}
      {toast.visible && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      )}

      {/* Farm Details */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{t('settings.farmDetails')}</h2>
        <form onSubmit={handleFarmSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">{t('settings.farmName')}</label>
            <input
              type="text"
              name="name"
              value={farmData.name}
              onChange={handleFarmChange}
              className="mt-1 block w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('settings.country')}</label>
            <input
              type="text"
              name="country"
              value={farmData.country || ''} // Ensure controlled input
              onChange={handleFarmChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('settings.currency')}</label>
            <select
              name="currency"
              value={farmData.currency}
              onChange={handleFarmChange}
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="NGN">NGN</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-farmGreen text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {t('settings.updateFarm')}
          </button>
        </form>
      </section>

      {/* Password Update */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{t('settings.updatePassword')}</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">{t('settings.currentPassword')}</label>
            <input
              type="password"
              name="current_password"
              value={passwordData.current_password}
              onChange={handlePasswordChange}
              className="mt-1 block w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('settings.newPassword')}</label>
            <input
              type="password"
              name="new_password"
              value={passwordData.new_password}
              onChange={handlePasswordChange}
              className="mt-1 block w-full border rounded p-2"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-farmGreen text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {t('settings.updatePassword')}
          </button>
        </form>
      </section>

      {/* Localization */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{t('settings.localization')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">{t('settings.language')}</label>
            <select
              value={localization.language}
              onChange={handleLocalizationChange}
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>
      </section>

      {/* Feedback */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{t('settings.feedback')}</h2>
        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">{t('settings.sendFeedback')}</label>
            <textarea
              value={feedback}
              onChange={handleFeedbackChange}
              className="mt-1 block w-full border rounded p-2"
              rows="4"
              placeholder="Enter your feedback..."
            />
          </div>
          <button
            type="submit"
            className="bg-farmGreen text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {t('settings.sendFeedback')}
          </button>
        </form>
      </section>
    </div>
  );
};

export default Settings;