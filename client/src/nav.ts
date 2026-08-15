export interface NavItem {
  label: string;
  to: string;
  roles: string[]; // role codes allowed to see this item
  icon: string; // lucide-react icon name, mapped in Sidebar.tsx
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// CSO (Chief Sales Officer) > GM (General Manager) > RM (Regional Manager)
// > UM (Unit Manager) > AM (Area Manager) > TSO (Territory Sales Officer)
// > OB (Order Booker / Presales) > DISTRIBUTOR (portal-only login).
const MANAGEMENT = ['CSO', 'GM', 'RM', 'UM', 'AM', 'TSO'];
const FIELD = ['TSO', 'OB'];

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/', roles: ['ADMIN', 'CSO', 'GM', 'RM', 'UM', 'AM', 'TSO', 'OB', 'DISTRIBUTOR'], icon: 'LayoutDashboard' }],
  },
  {
    title: 'Universe',
    items: [
      { label: 'Retailer List', to: '/universe', roles: [...MANAGEMENT, 'OB'], icon: 'Store' },
      { label: 'Universe Kanban', to: '/universe/kanban', roles: [...MANAGEMENT, 'OB'], icon: 'Kanban' },
      { label: 'Add Retailer', to: '/universe/add', roles: ['OB'], icon: 'PlusCircle' },
      { label: 'Territory Tree', to: '/territory-tree', roles: [...MANAGEMENT], icon: 'Network' },
    ],
  },
  {
    title: 'Journey & Visits',
    items: [
      { label: 'PJP Builder', to: '/pjp', roles: FIELD, icon: 'Route' },
      { label: "Today's Route", to: '/route-plan', roles: ['OB'], icon: 'Navigation' },
    ],
  },
  {
    title: 'Secondary Sales',
    items: [
      { label: 'New Order', to: '/orders/new', roles: ['OB'], icon: 'ShoppingCart' },
      { label: 'Order History', to: '/orders', roles: [...MANAGEMENT, 'OB', 'DISTRIBUTOR'], icon: 'ClipboardList' },
      { label: 'Receipts', to: '/receipts', roles: [...MANAGEMENT, 'OB', 'DISTRIBUTOR'], icon: 'Receipt' },
      { label: 'Returns', to: '/returns', roles: [...MANAGEMENT, 'OB', 'DISTRIBUTOR'], icon: 'Undo2' },
    ],
  },
  {
    title: 'Distribution',
    items: [
      { label: 'Stock Orders', to: '/distribution/stock-orders', roles: ['ADMIN', ...MANAGEMENT, 'DISTRIBUTOR'], icon: 'PackagePlus' },
      { label: 'Stock Transfer', to: '/distribution/transfer', roles: ['ADMIN', ...MANAGEMENT], icon: 'Truck' },
      { label: 'Stock Balance', to: '/distribution/balance', roles: ['ADMIN', ...MANAGEMENT, 'DISTRIBUTOR'], icon: 'Boxes' },
      { label: 'Shop Stock Report', to: '/reports/shop-stock', roles: [...MANAGEMENT, 'OB'], icon: 'ClipboardCheck' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Secondary Sales', to: '/reports/secondary-sales', roles: ['ADMIN', ...MANAGEMENT], icon: 'BarChart3' },
      { label: 'Universe Funnel', to: '/reports/universe-funnel', roles: ['ADMIN', ...MANAGEMENT], icon: 'PieChart' },
      { label: 'Incentives', to: '/reports/incentives', roles: ['ADMIN', ...MANAGEMENT, 'OB'], icon: 'Award' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Users', to: '/admin/users', roles: ['ADMIN'], icon: 'Users' },
      { label: 'Roles', to: '/admin/roles', roles: ['ADMIN'], icon: 'ShieldCheck' },
      { label: 'Territories', to: '/admin/territories', roles: ['ADMIN'], icon: 'Map' },
      { label: 'Distributors', to: '/admin/distributors', roles: ['ADMIN'], icon: 'Building2' },
      { label: 'Products', to: '/admin/products', roles: ['ADMIN'], icon: 'Package' },
      { label: 'Incentive Schemes', to: '/admin/incentive-schemes', roles: ['ADMIN'], icon: 'Trophy' },
      { label: 'Targets', to: '/admin/targets', roles: ['ADMIN'], icon: 'Target' },
    ],
  },
];
