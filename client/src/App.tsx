import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import RetailerList from './pages/universe/RetailerList';
import RetailerDetail from './pages/universe/RetailerDetail';
import AddRetailer from './pages/universe/AddRetailer';
import UniverseKanbanPage from './pages/universe/UniverseKanbanPage';
import TerritoryTreePage from './pages/TerritoryTreePage';

import PJPBuilder from './pages/pjp/PJPBuilder';
import TodayRoute from './pages/routeplan/TodayRoute';

import NewOrder from './pages/orders/NewOrder';
import OrderHistory from './pages/orders/OrderHistory';
import Receipts from './pages/orders/Receipts';
import Returns from './pages/orders/Returns';

import StockOrders from './pages/distribution/StockOrders';
import StockTransfer from './pages/distribution/StockTransfer';
import StockBalance from './pages/distribution/StockBalance';

import SecondarySalesReport from './pages/reports/SecondarySalesReport';
import UniverseFunnelReport from './pages/reports/UniverseFunnelReport';
import IncentivesReport from './pages/reports/IncentivesReport';
import ShopStockReport from './pages/reports/ShopStockReport';

import AdminUsers from './pages/admin/AdminUsers';
import AdminRoles from './pages/admin/AdminRoles';
import AdminTerritories from './pages/admin/AdminTerritories';
import AdminDistributors from './pages/admin/AdminDistributors';
import AdminProducts from './pages/admin/AdminProducts';
import AdminIncentiveSchemes from './pages/admin/AdminIncentiveSchemes';
import AdminTargets from './pages/admin/AdminTargets';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />

          <Route path="/universe" element={<RetailerList />} />
          <Route path="/universe/kanban" element={<UniverseKanbanPage />} />
          <Route path="/universe/add" element={<AddRetailer />} />
          <Route path="/universe/:id" element={<RetailerDetail />} />
          <Route path="/territory-tree" element={<TerritoryTreePage />} />

          <Route path="/pjp" element={<PJPBuilder />} />
          <Route path="/route-plan" element={<TodayRoute />} />

          <Route path="/orders/new" element={<NewOrder />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/returns" element={<Returns />} />

          <Route path="/distribution/stock-orders" element={<StockOrders />} />
          <Route path="/distribution/transfer" element={<StockTransfer />} />
          <Route path="/distribution/balance" element={<StockBalance />} />

          <Route path="/reports/secondary-sales" element={<SecondarySalesReport />} />
          <Route path="/reports/universe-funnel" element={<UniverseFunnelReport />} />
          <Route path="/reports/incentives" element={<IncentivesReport />} />
          <Route path="/reports/shop-stock" element={<ShopStockReport />} />
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route element={<Layout />}>
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            <Route path="/admin/territories" element={<AdminTerritories />} />
            <Route path="/admin/distributors" element={<AdminDistributors />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/incentive-schemes" element={<AdminIncentiveSchemes />} />
            <Route path="/admin/targets" element={<AdminTargets />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
