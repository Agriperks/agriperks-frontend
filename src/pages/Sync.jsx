import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOfflineRecords, syncRecords, clearOfflineRecords } from '../utils/offline';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Sync = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [offlineData, setOfflineData] = useState({
    products: [],
    sales: [],
    expenses: [],
    buyers: [],
    marketPrices: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const fetchOfflineData = async () => {
      try {
        const [products, sales, expenses, buyers, marketPrices] = await Promise.all([
          getOfflineRecords('products'),
          getOfflineRecords('sales'),
          getOfflineRecords('expenses'),
          getOfflineRecords('buyers'),
          getOfflineRecords('marketPrices'),
        ]);
        setOfflineData({ products, sales, expenses, buyers, marketPrices });
      } catch (err) {
        setError(t('sync.fetchError'));
      } finally {
        setLoading(false);
      }
    };
    fetchOfflineData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t]);

  const handleSync = async () => {
    if (!isOnline) {
      toast.error(t('sync.offlineError'));
      return;
    }
    setLoading(true);
    try {
      const result = await syncRecords(user.token);
      if (result.success) {
        toast.success(result.message);
        const [products, sales, expenses, buyers, marketPrices] = await Promise.all([
          getOfflineRecords('products'),
          getOfflineRecords('sales'),
          getOfflineRecords('expenses'),
          getOfflineRecords('buyers'),
          getOfflineRecords('marketPrices'),
        ]);
        setOfflineData({ products, sales, expenses, buyers, marketPrices });
      } else {
        toast.error(result.message);
        if (result.errors?.length > 0) {
          result.errors.forEach((err) => toast.error(err));
        }
      }
    } catch (err) {
      setError(t('sync.syncError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async (type) => {
    try {
      await clearOfflineRecords(type);
      setOfflineData((prev) => ({ ...prev, [type]: [] }));
      toast.success(t('sync.clearSuccess', { type: t(`sync.${type}`) }));
    } catch (err) {
      setError(t('sync.clearError', { type: t(`sync.${type}`) }));
    }
  };

  if (loading) return <div className="text-center text-farmGreen">{t('sync.loading')}</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  const renderTable = (type, records) => (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-farmGreen mb-4">{t(`sync.${type}`)}</h3>
      <button
        onClick={handleSync}
        disabled={!isOnline}
        className={`bg-farmGreen text-white px-4 py-2 rounded mb-4 mr-2 ${
          isOnline ? 'hover:bg-green-700' : 'opacity-50 cursor-not-allowed'
        }`}
      >
        {t('sync.syncAll')}
      </button>
      <button
        onClick={() => handleClear(type)}
        className="bg-red-500 text-white px-4 py-2 rounded mb-4 hover:bg-red-700"
      >
        {t('sync.clear')}
      </button>
      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-farmGreen text-white">
            {type === 'products' && (
              <>
                <th className="p-2">{t('sync.productName')}</th>
                <th className="p-2">{t('sync.category')}</th>
                <th className="p-2">{t('sync.quantity')}</th>
                <th className="p-2">{t('sync.harvestDate')}</th>
                <th className="p-2">{t('sync.minThreshold')}</th>
              </>
            )}
            {type === 'sales' && (
              <>
                <th className="p-2">{t('sync.productId')}</th>
                <th className="p-2">{t('sync.quantitySold')}</th>
                <th className="p-2">{t('sync.pricePerUnit')}</th>
                <th className="p-2">{t('sync.buyerName')}</th>
                <th className="p-2">{t('sync.buyerContact')}</th>
              </>
            )}
            {type === 'expenses' && (
              <>
                <th className="p-2">{t('sync.description')}</th>
                <th className="p-2">{t('sync.amount')}</th>
                <th className="p-2">{t('sync.expenseCategory')}</th>
                <th className="p-2">{t('sync.expenseDate')}</th>
              </>
            )}
            {type === 'buyers' && (
              <>
                <th className="p-2">{t('sync.buyerName')}</th>
                <th className="p-2">{t('sync.contact')}</th>
                <th className="p-2">{t('sync.address')}</th>
              </>
            )}
            {type === 'marketPrices' && (
              <>
                <th className="p-2">{t('sync.productId')}</th>
                <th className="p-2">{t('sync.price')}</th>
                <th className="p-2">{t('sync.date')}</th>
                <th className="p-2">{t('sync.source')}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b">
              {type === 'products' && (
                <>
                  <td className="p-2">{record.name || '-'}</td>
                  <td className="p-2">{record.category || '-'}</td>
                  <td className="p-2">{record.quantity || '-'}</td>
                  <td className="p-2">{record.harvest_date || '-'}</td>
                  <td className="p-2">{record.minimum_threshold || '-'}</td>
                </>
              )}
              {type === 'sales' && (
                <>
                  <td className="p-2">{record.product_id || '-'}</td>
                  <td className="p-2">{record.quantity_sold || '-'}</td>
                  <td className="p-2">{record.price_per_unit || '-'}</td>
                  <td className="p-2">{record.buyer_name || '-'}</td>
                  <td className="p-2">{record.buyer_contact || '-'}</td>
                </>
              )}
              {type === 'expenses' && (
                <>
                  <td className="p-2">{record.description || '-'}</td>
                  <td className="p-2">{record.amount || '-'}</td>
                  <td className="p-2">{record.category || '-'}</td>
                  <td className="p-2">{record.expense_date || '-'}</td>
                </>
              )}
              {type === 'buyers' && (
                <>
                  <td className="p-2">{record.name || '-'}</td>
                  <td className="p-2">{record.contact || '-'}</td>
                  <td className="p-2">{record.address || '-'}</td>
                </>
              )}
              {type === 'marketPrices' && (
                <>
                  <td className="p-2">{record.product_id || '-'}</td>
                  <td className="p-2">{record.price || '-'}</td>
                  <td className="p-2">{record.date || '-'}</td>
                  <td className="p-2">{record.source || '-'}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold text-farmGreen mb-6">{t('sync.title')}</h2>
      <div className="mb-4">
        <span className={`text-${isOnline ? 'farmGreen' : 'red-500'}`}>
          {t('sync.status')}: {isOnline ? t('sync.online') : t('sync.offline')}
        </span>
      </div>
      {renderTable('products', offlineData.products)}
      {renderTable('sales', offlineData.sales)}
      {renderTable('expenses', offlineData.expenses)}
      {renderTable('buyers', offlineData.buyers)}
      {renderTable('marketPrices', offlineData.marketPrices)}
    </div>
  );
};

export default Sync;