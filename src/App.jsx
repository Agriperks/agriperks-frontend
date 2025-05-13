import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Users from './pages/Users';
import Buyers from './pages/Buyers';
import MarketPrices from './pages/MarketPrices';
import Sync from './pages/Sync';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';
import './i18n';

// Lazy load Settings to improve performance
const Settings = lazy(() => import('./pages/Settings'));

// Import the Units component
import Units from './pages/Units';

const AppLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (loading) {
    return <div className="text-center text-farmGreen p-4">Loading...</div>;
  }

  if (isAuthPage && user) {
    return <Navigate to="/" replace />;
  }

  if (!user && !isAuthPage) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {!isAuthPage && (
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      )}
      <div className="flex-1 flex flex-col">
        {!isAuthPage && <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}
        <main className="flex-1 p-4">
          <ErrorBoundary>
            <Suspense fallback={<div className="text-center text-farmGreen p-4">Loading...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<PrivateRoute />}>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<Products />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="users" element={<Users />} />
                  <Route path="buyers" element=<Buyers /> />
                  <Route path="market-prices" element={<MarketPrices />} />
                  <Route path="sync" element={<Sync />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="units" element={<Units />} />
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;