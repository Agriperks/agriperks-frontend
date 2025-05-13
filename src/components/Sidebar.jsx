import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const farmName = user?.farm_name || 'My Farm';

  return (
    <div
      className={`fixed inset-y-0 left-0 w-64 bg-farmBrown text-white transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 z-20`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col items-center w-full">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-2">
            <svg
              className="w-12 h-12 text-farmGreen"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold">{farmName}</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="md:hidden focus:outline-none"
          aria-label={t('sidebar.toggle')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 p-4">
  <ul className="space-y-2">
    <li>
      <Link
        to="/"
        className="block px-4 py-2 rounded hover:bg-farmGreen"
        onClick={() => toggleSidebar()}
        aria-label={t('sidebar.dashboard')}
      >
        {t('sidebar.dashboard')}
      </Link>
    </li>
    <li>
      <Link
        to="/products"
        className="block px-4 py-2 rounded hover:bg-farmGreen"
        onClick={() => toggleSidebar()}
        aria-label={t('sidebar.products')}
      >
        {t('sidebar.products')}
      </Link>
    </li>
    <li>
      <Link
        to="/sales"
        className="block px-4 py-2 rounded hover:bg-farmGreen"
        onClick={() => toggleSidebar()}
        aria-label={t('sidebar.sales')}
      >
        {t('sidebar.sales')}
      </Link>
    </li>
    <li>
      <Link
        to="/expenses"
        className="block px-4 py-2 rounded hover:bg-farmGreen"
        onClick={() => toggleSidebar()}
        aria-label={t('sidebar.expenses')}
      >
        {t('sidebar.expenses')}
      </Link>
    </li>
    <li>
      <Link
        to="/users"
        className="block px-4 py-2 rounded hover:bg-farmGreen"
        onClick={() => toggleSidebar()}
        aria-label={t('sidebar.users')}
      >
        {t('sidebar.users')}
      </Link>
    </li>
    <li>
      <Link
        to="/buyers"
        className="block px-4 py-2 rounded hover:bg-farmGreen"
        onClick={() => toggleSidebar()}
        aria-label={t('sidebar.buyers')}
      >
        {t('sidebar.buyers')}
      </Link>
    </li>
    <li>
      <Link
        to="/market-prices"
        className="block px-4 py-2 rounded hover:bg-farmGreen"
        onClick={() => toggleSidebar()}
        aria-label={t('sidebar.marketPrices')}
      >
        {t('sidebar.marketPrices')}
      </Link>
    </li>
    <li>
      <Link
        to="/sync"
        className="block px-4 py-2 rounded hover:bg-farmGreen"
        onClick={() => toggleSidebar()}
        aria-label={t('sidebar.sync')}
      >
        {t('sidebar.sync')}
      </Link>
    </li>
    <li>
      <Link
        to="/units"
        className="block px-4 py-2 rounded hover:bg-farmGreen"
        onClick={() => toggleSidebar()}
        aria-label={t('sidebar.units')}
      >
        {t('sidebar.units')}
      </Link>
    </li>
  </ul>
</nav>
    </div>
  );
};

export default Sidebar;