import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const userToLog = { ...user, token: user.token ? '***' : undefined };
      if (process.env.NODE_ENV !== 'production') {
        console.log('Navbar user:', userToLog);
      }
    }
  }, [user]);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const farmName = user?.farm_name || 'My Farm';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <nav className="bg-farmGreen text-white p-4 shadow">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded"
            aria-label={t('navbar.toggleSidebar')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <Link
            to="/"
            className="text-xl font-bold hover:underline border-2 border-white rounded bg-farmBrown p-1"
            aria-label={t('app.title')}
          >
            {t('app.title', { defaultValue: 'FarmPerks' })}
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="relative dropdown-container">
              <button
                onClick={toggleDropdown}
                className="text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-white rounded"
                aria-expanded={dropdownOpen}
                aria-label={t('navbar.farmDetails', { farmName })}
              >
                {farmName}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-farmBrown rounded shadow-lg z-10">
                  <div className="px-4 py-2 font-semibold">{farmName}</div>
                  <div className="px-4 py-2 text-gray-600">{user?.country || 'No Country'}</div>
                  <div className="px-4 py-2 text-gray-600">{user?.currency || 'USD'}</div>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => setDropdownOpen(false)}
                    aria-label={t('settings.title')}
                  >
                    {t('settings.title')}
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    aria-label={t('settings.logout')}
                  >
                    {t('settings.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-white rounded"
              aria-label={t('navbar.login')}
            >
              {t('navbar.login')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;