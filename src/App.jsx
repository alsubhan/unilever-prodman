import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/reports/Dashboard';
import UsersPage from './pages/masters/UsersPage';
import FinishedGoodsPage from './pages/masters/FinishedGoodsPage';
import PackingMaterialsPage from './pages/masters/PackingMaterialsPage';
import PackingMachinesPage from './pages/masters/PackingMachinesPage';
import ShiftsPage from './pages/masters/ShiftsPage';
import AccessRightsPage from './pages/masters/AccessRightsPage';
import ProductionPlanningPage from './pages/transactions/ProductionPlanningPage';
import ScannerPage from './pages/transactions/ScannerPage';
import PackingMaterialUsagePage from './pages/reports/PackingMaterialUsagePage';
import BackupPage from './pages/utility/BackupPage';
import RestorePage from './pages/utility/RestorePage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-secondary)' }}>
      <span className="spinner" style={{fontSize:'24px'}}>⟳</span>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/scan" element={<ScannerPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="masters/users" element={<UsersPage />} />
        <Route path="masters/finished-goods" element={<FinishedGoodsPage />} />
        <Route path="masters/packing-materials" element={<PackingMaterialsPage />} />
        <Route path="masters/packing-machines" element={<PackingMachinesPage />} />
        <Route path="masters/shifts" element={<ShiftsPage />} />
        <Route path="masters/access-rights" element={<AccessRightsPage />} />
        <Route path="transactions/production-planning" element={<ProductionPlanningPage />} />
        <Route path="reports/packing-material-usage" element={<PackingMaterialUsagePage />} />
        <Route path="utility/backup" element={<BackupPage />} />
        <Route path="utility/restore" element={<RestorePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
