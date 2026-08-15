export interface Role {
  id: number;
  code: string;
  name: string;
  level: number;
  description?: string;
}

export interface TerritoryNode {
  id: number;
  name: string;
  code: string;
  level: 'NATIONAL' | 'REGION' | 'SUB_REGION' | 'AREA' | 'TERRITORY';
  parentId: number | null;
  path: string;
  managerUserId: number | null;
  managerUser?: { id: number; name: string } | null;
  children?: TerritoryNode[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  employeeCode: string;
  phone?: string | null;
  status: string;
  roleId: number;
  role: Role;
  territoryNodeId: number | null;
  territoryNode?: TerritoryNode | null;
  managerId: number | null;
  manager?: { id: number; name: string } | null;
}

export type UniverseStatus = 'UNTAPPED' | 'COVERED' | 'PRODUCTIVE' | 'NON_PRODUCTIVE';
export type RetailerCategory = 'GENERAL_TRADE' | 'WHOLESALE' | 'HORECA' | 'MODERN_TRADE' | 'KIRANA';

export interface Retailer {
  id: number;
  name: string;
  ownerName?: string | null;
  category: RetailerCategory;
  phone?: string | null;
  address?: string | null;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: UniverseStatus;
  lastVisitDate?: string | null;
  lastOrderDate?: string | null;
  territoryNodeId: number;
  territoryNode?: TerritoryNode;
  addedByUserId: number;
  addedByUser?: { id: number; name: string };
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  skuCode: string;
  category: string;
  brand: string;
  packSize: string;
  mrp: number;
  distributorPrice: number;
  active: boolean;
}

export interface Distributor {
  id: number;
  name: string;
  code: string;
  territoryNodeId: number;
  territoryNode?: TerritoryNode;
  address?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  creditLimit: number;
  status: string;
  userId?: number | null;
}

export interface OrderItem {
  id: number;
  productId: number;
  product?: Product;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  retailerId: number;
  retailer?: Retailer;
  obUserId: number;
  obUser?: { id: number; name: string };
  distributorId: number;
  distributor?: { id: number; name: string };
  orderDate: string;
  status: 'PENDING' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  items: OrderItem[];
}

export interface Visit {
  id: number;
  obUserId: number;
  retailerId: number;
  retailer?: Retailer;
  plannedDate: string;
  visitStatus: 'PLANNED' | 'VISITED' | 'SKIPPED';
  checkInTime?: string | null;
  checkOutTime?: string | null;
  outcome?: 'ORDER_TAKEN' | 'NO_ORDER' | 'CLOSED' | 'NOT_INTERESTED' | null;
  remarks?: string | null;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
}

export interface UniverseSummary {
  total: number;
  untapped: number;
  covered: number;
  productive: number;
  nonProductive: number;
}

export interface DashboardSummary {
  universe: UniverseSummary;
  mtdSalesValue: number;
  mtdOrderCount: number;
  newVsRepeat: { newValue: number; repeatValue: number; newShopCount: number };
  casesSoldMtd: number;
  distributorCount: number;
  target: { targetValue: number; achievedValue: number } | null;
  incentive: { incentiveAmount: number; schemes: { name: string; amount: number; metricValue: number | null }[] } | null;
  unreadNotifications: number;
  leaderboard: { id: number; name: string; role: string; mtdSales: number }[];
  pjpCompliance: { planned: number; visited: number; compliancePct: number } | null;
}

export interface Receipt {
  id: number;
  receiptNumber: string;
  retailerId: number;
  retailer?: { id: number; name: string };
  orderId?: number | null;
  order?: { id: number; orderNumber: string; totalAmount: number } | null;
  obUser?: { id: number; name: string };
  amount: number;
  method: 'CASH' | 'BANK' | 'CREDIT_NOTE';
  receivedAt: string;
}

export interface ReturnDoc {
  id: number;
  returnNumber: string;
  retailerId: number;
  retailer?: { id: number; name: string };
  distributorId: number;
  distributor?: { id: number; name: string };
  obUser?: { id: number; name: string };
  orderId?: number | null;
  reason?: string | null;
  returnDate: string;
  totalAmount: number;
  items: { id: number; productId: number; product?: Product; qty: number; unitPrice: number; amount: number }[];
}

export interface StockOrder {
  id: number;
  orderNumber: string;
  distributorId: number;
  distributor?: { id: number; name: string };
  requestedByUser?: { id: number; name: string };
  status: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED';
  orderDate: string;
  notes?: string | null;
  items: { id: number; productId: number; product?: Product; qty: number }[];
}

export interface OutstandingRow {
  id: number;
  name: string;
  territory?: string;
  ordered: number;
  collected: number;
  outstanding: number;
}

export interface ShopStockRow {
  retailerId: number;
  retailerName: string;
  category: string;
  territory?: string;
  takenAt: string;
  items: { productId: number; name: string; skuCode: string; packSize: string; qty: number }[];
  totalUnits: number;
}
