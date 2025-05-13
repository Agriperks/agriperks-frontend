import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import { useTranslation } from 'react-i18next';
import { CurrencyDollarIcon, ShoppingCartIcon, ChartBarIcon, ExclamationTriangleIcon, BoltIcon } from '@heroicons/react/24/outline';

// Register Chart.js components including ArcElement for Doughnut chart
ChartJS.register(ArcElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, financialRes, trendsRes] = await Promise.all([
        axios.get('http://127.0.0.1:5000/api/dashboard/summary', {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        axios.get('http://127.0.0.1:5000/api/dashboard/financial', {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        axios.get('http://127.0.0.1:5000/api/dashboard/trends', {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);
      setSummary(summaryRes.data);
      setFinancial(financialRes.data);
      setTrends(trendsRes.data);
      toast.success(t('dashboard.dataLoaded'));
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || t('dashboard.error');
      setError(errorMessage);
      toast.error(errorMessage);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('farmName');
        navigate('/login');
        toast.error(t('auth.sessionExpired'));
      }
    } finally {
      setLoading(false);
    }
  }, [user.token, navigate, t]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Memoize chart data for Doughnut chart
  const chartData = useMemo(
    () =>
      trends
        ? {
            labels: [t('dashboard.sales'), t('dashboard.expenses')],
            datasets: [
              {
                data: [
                  Object.values(trends.sales_by_month).reduce((a, b) => a + b, 0),
                  Object.values(trends.expenses_by_month).reduce((a, b) => a + b, 0),
                ],
                backgroundColor: ['#2E7D32', '#F4A261'],
                borderColor: ['#FFFFFF', '#FFFFFF'],
                borderWidth: 2,
                hoverOffset: 10,
              },
            ],
          }
        : null,
    [trends, t]
  );

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 14 }, color: '#374151' } },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#D1D5DB',
        borderWidth: 1,
      },
      title: {
        display: true,
        text: t('dashboard.salesExpensesTrend'),
        font: { size: 18, weight: 'bold' },
        color: '#1F2937',
      },
    },
    maintainAspectRatio: false,
  };

  const formatNumber = (number) => {
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) return <div className="text-center text-farmGreen p-4 text-xl">{t('dashboard.loading')}</div>;
  if (error) return <div className="text-center text-red-500 p-4 text-xl">{error}</div>;

  return (
    <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <h2 className="text-4xl font-bold text-farmGreen mb-10 border-b-4 border-farmGreen pb-4">{t('dashboard.title')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-50 to-white flex items-center space-x-4">
          <ShoppingCartIcon className="h-12 w-12 text-farmGreen" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-semibold text-farmBrown">{t('dashboard.totalProducts')}</h3>
            <p className="text-3xl text-farmGreen font-bold">{summary.total_products}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-50 to-white flex items-center space-x-4">
          <ChartBarIcon className="h-12 w-12 text-farmGreen" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-semibold text-farmBrown">{t('dashboard.totalSales')}</h3>
            <p className="text-3xl text-farmGreen font-bold">{summary.total_sales}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-50 to-white flex items-center space-x-4">
          <CurrencyDollarIcon className="h-12 w-12 text-farmGreen" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-semibold text-farmBrown">{t('dashboard.totalRevenue')}</h3>
            <p className="text-3xl text-farmGreen font-bold">
              {formatNumber(summary.total_revenue)} {user.currency || 'USD'}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-50 to-white flex items-center space-x-4">
          <CurrencyDollarIcon className="h-12 w-12 text-farmGreen" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-semibold text-farmBrown">{t('dashboard.recentRevenue')}</h3>
            <p className="text-3xl text-farmGreen font-bold">
              {formatNumber(summary.recent_revenue)} {user.currency || 'USD'}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-yellow-50 to-white flex items-center space-x-4">
          <ExclamationTriangleIcon className="h-12 w-12 text-farmYellow" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-semibold text-farmBrown">{t('dashboard.lowInventoryAlerts')}</h3>
            <p className="text-3xl text-farmYellow font-bold">{summary.low_inventory_alerts}</p>
          </div>
        </div>
      </div>
      {financial && (
        <div className="mt-12">
          <h3 className="text-3xl font-bold text-farmGreen mb-8">{t('dashboard.financialSummary')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-50 to-white">
              <h4 className="text-xl font-semibold text-farmBrown">{t('dashboard.totalRevenue')}</h4>
              <p className="text-3xl text-farmGreen font-bold">
                {formatNumber(financial.total_revenue)} {user.currency || 'USD'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-50 to-white">
              <h4 className="text-xl font-semibold text-farmBrown">{t('dashboard.totalExpenses')}</h4>
              <p className="text-3xl text-farmGreen font-bold">
                {formatNumber(financial.total_expenses)} {user.currency || 'USD'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-50 to-white">
              <h4 className="text-xl font-semibold text-farmBrown">{t('dashboard.netProfit')}</h4>
              <p className="text-3xl text-farmGreen font-bold">
                {formatNumber(financial.net_profit)} {user.currency || 'USD'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-50 to-white">
              <h4 className="text-xl font-semibold text-farmBrown">{t('dashboard.profitMargin')}</h4>
              <p className="text-3xl text-farmGreen font-bold">{financial.profit_margin}%</p>
            </div>
          </div>
        </div>
      )}
      {chartData && (
        <div className="mt-12">
          <h3 className="text-3xl font-bold text-farmGreen mb-8">{t('dashboard.salesExpensesTrend')}</h3>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="relative w-full h-96">
              <Doughnut data={chartData} options={chartOptions} aria-label={t('dashboard.salesExpensesTrend')} />
            </div>
            <p className="sr-only">
              {t('dashboard.chartDescription', {
                sales: Object.values(trends.sales_by_month).join(', '),
                expenses: Object.values(trends.expenses_by_month).join(', '),
              })}
            </p>
          </div>
        </div>
      )}
      <div className="mt-12">
        <h3 className="text-3xl font-bold text-farmGreen mb-8">{t('dashboard.quickActions')}</h3>
        <div className="flex flex-wrap gap-6">
          <button
            onClick={() => navigate('/products')}
            className="bg-gradient-to-r from-farmGreen to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center space-x-3 transition-all duration-300"
            aria-label={t('dashboard.addProduct')}
          >
            <BoltIcon className="h-6 w-6" aria-hidden="true" />
            <span className="text-lg font-medium">{t('dashboard.addProduct')}</span>
          </button>
          <button
            onClick={() => navigate('/sales')}
            className="bg-gradient-to-r from-farmGreen to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center space-x-3 transition-all duration-300"
            aria-label={t('dashboard.recordSale')}
          >
            <BoltIcon className="h-6 w-6" aria-hidden="true" />
            <span className="text-lg font-medium">{t('dashboard.recordSale')}</span>
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="bg-gradient-to-r from-farmGreen to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center space-x-3 transition-all duration-300"
            aria-label={t('dashboard.addExpense')}
          >
            <BoltIcon className="h-6 w-6" aria-hidden="true" />
            <span className="text-lg font-medium">{t('dashboard.addExpense')}</span>
          </button>
          <button
            onClick={() => navigate('/buyers')}
            className="bg-gradient-to-r from-farmGreen to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center space-x-3 transition-all duration-300"
            aria-label={t('dashboard.addBuyer')}
          >
            <BoltIcon className="h-6 w-6" aria-hidden="true" />
            <span className="text-lg font-medium">{t('dashboard.addBuyer')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;