import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  Truck,
  Receipt,
  FileBarChart,
  SlidersHorizontal,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Eye,
  Edit2,
  Trash2,
  DollarSign,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import {
  Product,
  Supplier,
  Purchase,
  StockMovement,
  InventoryDashboardStats,
  InventoryReportData,
} from '../types';
import { api } from '../api/client';
import { formatINR, formatDateIN } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { ProductModal } from '../components/modals/ProductModal';
import { StockAdjustmentModal } from '../components/modals/StockAdjustmentModal';
import { SupplierModal } from '../components/modals/SupplierModal';
import { PurchaseModal } from '../components/modals/PurchaseModal';
import { ReturnRefundModal } from '../components/modals/ReturnRefundModal';
import { PosReceiptModal } from '../components/modals/PosReceiptModal';

type TabType = 'DASHBOARD' | 'PRODUCTS' | 'MOVEMENTS' | 'PURCHASES' | 'SUPPLIERS' | 'REPORTS';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN';

  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');
  const [stats, setStats] = useState<InventoryDashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('ALL');
  const [productStockFilter, setProductStockFilter] = useState('ALL');

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Reports
  const [reportPeriod, setReportPeriod] = useState('month');
  const [reportData, setReportData] = useState<InventoryReportData | null>(null);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'DASHBOARD') {
        const d = await api.getInventoryDashboard();
        setStats(d);
      } else if (activeTab === 'PRODUCTS') {
        const params: Record<string, string> = {
          limit: '100',
        };
        if (productSearch.trim()) params.search = productSearch.trim();
        if (productCategory !== 'ALL') params.category = productCategory;
        if (productStockFilter === 'LOW') params.lowStock = 'true';
        if (productStockFilter === 'OUT') params.outOfStock = 'true';

        const p = await api.getProducts(params);
        setProducts(p.products || []);
      } else if (activeTab === 'MOVEMENTS') {
        const m = await api.getStockMovements({ limit: '100' });
        setMovements(m.movements || []);
      } else if (activeTab === 'PURCHASES' && isAdmin) {
        const pu = await api.getPurchases({ limit: '100' });
        setPurchases(pu.purchases || []);
      } else if (activeTab === 'SUPPLIERS' && isAdmin) {
        const s = await api.getSuppliers();
        setSuppliers(s);
      } else if (activeTab === 'REPORTS') {
        const r = await api.getInventoryReports({ period: reportPeriod });
        setReportData(r);
      }
    } catch (err) {
      console.error('Failed to load inventory data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleDataChanged = () => loadData();
    window.addEventListener('fitcore:data-changed', handleDataChanged);
    return () => window.removeEventListener('fitcore:data-changed', handleDataChanged);
  }, [activeTab, productSearch, productCategory, productStockFilter, reportPeriod]);

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete or deactivate ${product.name}?`)) return;
    try {
      await api.deleteProduct(product._id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const tabs = [
    { id: 'DASHBOARD' as TabType, label: 'Dashboard', icon: Layers },
    { id: 'PRODUCTS' as TabType, label: 'Products', icon: Package },
    { id: 'MOVEMENTS' as TabType, label: 'Stock Movements', icon: SlidersHorizontal },
    ...(isAdmin
      ? [
          { id: 'PURCHASES' as TabType, label: 'Purchases', icon: Receipt },
          { id: 'SUPPLIERS' as TabType, label: 'Suppliers', icon: Truck },
        ]
      : []),
    { id: 'REPORTS' as TabType, label: 'Reports & Analytics', icon: FileBarChart },
  ];

  return (
    <div className="space-y-5">
      {/* Page Title & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              📦
            </span>
            Inventory & Store Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Supplements, gym apparel, stock audits, purchasing ledgers & store reports
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 active:scale-95"
              >
                <Receipt className="w-4 h-4 text-indigo-600" />
                Receive Purchase
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pill Tabs Bar */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto scrollbar-none border border-slate-200/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap select-none ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: INVENTORY DASHBOARD                                */}
      {/* ========================================================= */}
      {activeTab === 'DASHBOARD' && stats && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Products
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {stats.totalActiveProducts}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {stats.totalStockUnits} total units in stock
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Low Stock Alerts
              </span>
              <div
                className={`text-2xl font-black font-mono mt-1 ${
                  stats.lowStockProducts > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {stats.lowStockProducts}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {stats.outOfStockProducts} completely out of stock
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Today's Product Sales
              </span>
              <div className="text-2xl font-black text-blue-700 font-mono mt-1">
                {formatINR(stats.todaySales)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {stats.todaySalesCount} sales completed today
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isAdmin ? "Today's Gross Profit" : 'Monthly Sales'}
              </span>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                {isAdmin && stats.todayGrossProfit !== undefined
                  ? formatINR(stats.todayGrossProfit)
                  : formatINR(stats.monthSales)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {isAdmin && stats.inventoryValuation !== undefined
                  ? `Valuation: ${formatINR(stats.inventoryValuation)}`
                  : `${stats.monthSalesCount} orders this month`}
              </span>
            </div>
          </div>

          {/* Low Stock Alerts & Expiry Warnings Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Low-stock Table */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900">Low Stock Warning</h3>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('PRODUCTS');
                    setProductStockFilter('LOW');
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  View All
                </button>
              </div>

              {stats.lowStockList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1" />
                  All active products have healthy stock levels
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.lowStockList.map((p) => (
                    <div key={p._id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.sku} • Min alert at {p.minStockThreshold} {p.unit}s
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                            p.currentStock <= 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {p.currentStock} {p.unit}s remaining
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expiring Soon Table */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Expiring Within 30 Days ({stats.productsApproachingExpiry})
                  </h3>
                </div>
              </div>

              {stats.expiringList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1" />
                  No products approaching expiry in the next 30 days
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.expiringList.map((p) => (
                    <div key={p._id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.sku} {p.batchNumber ? `• Batch: ${p.batchNumber}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-rose-600 block">
                          Expires: {formatDateIN(p.expiryDate)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.currentStock} units in stock
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PRODUCT MANAGEMENT                                 */}
      {/* ========================================================= */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filters Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name, SKU, barcode..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Categories</option>
                <option value="Supplements">Supplements</option>
                <option value="Beverages">Beverages</option>
                <option value="Apparel">Apparel</option>
                <option value="Accessories">Accessories</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>

            <div>
              <select
                value={productStockFilter}
                onChange={(e) => setProductStockFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Stock Levels</option>
                <option value="LOW">Low Stock Only</option>
                <option value="OUT">Out of Stock Only</option>
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Stock Level</th>
                    <th className="py-3 px-3">Selling Price</th>
                    {isAdmin && <th className="py-3 px-3">Unit Cost</th>}
                    <th className="py-3 px-3">Supplier</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-400">
                        No inventory products found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isOut = p.currentStock <= 0;
                      const isLow = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;

                      return (
                        <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              SKU: {p.sku} {p.barcode ? `• Barcode: ${p.barcode}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-700">{p.category}</span>
                            {p.brand && (
                              <span className="text-[10px] text-slate-400 block">{p.brand}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                                isOut
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : isLow
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                              />
                              {p.currentStock} {p.unit}s
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {formatINR(p.sellingPrice)}
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {formatINR(p.purchaseCost || 0)}
                            </td>
                          )}
                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            {p.supplier ? p.supplier.name : '—'}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdjustingProduct(p);
                                    setIsAdjustModalOpen(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                  title="Adjust stock (Found, damage, expiry)"
                                >
                                  Adjust
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setIsProductModalOpen(true);
                                  }}
                                  className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Edit Product"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p)}
                                  className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: STOCK MOVEMENTS AUDIT TRAIL                        */}
      {/* ========================================================= */}
      {activeTab === 'MOVEMENTS' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden animate-in fade-in duration-150">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Comprehensive Stock Audit History</h3>
            <span className="text-xs text-slate-500 font-medium">{movements.length} logged events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Movement Type</th>
                  <th className="py-3 px-3">Qty</th>
                  <th className="py-3 px-3">Stock Progression</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                  <th className="py-3 px-4">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isAdd =
                      m.movementType === 'PURCHASE' ||
                      m.movementType === 'ADJUSTMENT_ADD' ||
                      m.movementType === 'RETURN';

                    return (
                      <tr key={m._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {formatDateIN(m.createdAt)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{m.product?.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{m.product?.sku}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.movementType === 'PURCHASE'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : m.movementType === 'SALE'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : m.movementType === 'RETURN'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.movementType === 'DAMAGE' || m.movementType === 'EXPIRY'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {m.movementType}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          <span className={isAdd ? 'text-emerald-700' : 'text-rose-700'}>
                            {isAdd ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {m.previousStock} → <span className="font-bold text-slate-900">{m.newStock}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={m.reason}>
                          {m.reason}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {m.performedByName || m.performedBy?.fullName || 'Staff'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: PURCHASES WORKFLOW (Admin Only)                    */}
      {/* ========================================================= */}
      {activeTab === 'PURCHASES' && isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden animate-in fade-in duration-150">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Stock Purchase Invoices</h3>
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Receive New Stock
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Items Count</th>
                  <th className="py-3 px-3">Overall Total</th>
                  <th className="py-3 px-3">Amount Paid</th>
                  <th className="py-3 px-3">Balance Due</th>
                  <th className="py-3 px-4">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No purchase orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  purchases.map((pu) => (
                    <tr key={pu._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        #{pu.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {formatDateIN(pu.purchaseDate)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{pu.supplier?.name}</div>
                        <div className="text-[10px] text-slate-400">{pu.supplier?.phone}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {pu.items?.length || 0} items
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {formatINR(pu.overallTotal)}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">
                        {formatINR(pu.amountPaid)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={pu.outstandingBalance > 0 ? 'text-amber-600' : 'text-slate-500'}>
                          {formatINR(pu.outstandingBalance)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pu.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : pu.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {pu.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: SUPPLIER MANAGEMENT (Admin Only)                   */}
      {/* ========================================================= */}
      {activeTab === 'SUPPLIERS' && isAdmin && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Authorized Product Suppliers</h3>
            <button
              onClick={() => {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Register Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div
                key={s._id}
                className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{s.phone}</p>
                    {s.email && <p className="text-[11px] text-slate-400">{s.email}</p>}
                  </div>
                  <button
                    onClick={() => {
                      setEditingSupplier(s);
                      setIsSupplierModalOpen(true);
                    }}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Total Purchased
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatINR(s.totalPurchases || 0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Balance Due
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        s.outstandingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatINR(s.outstandingBalance || 0)}
                    </span>
                  </div>
                </div>

                {s.address && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 truncate">
                    📍 {s.address}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: REPORTS & ANALYTICS                                */}
      {/* ========================================================= */}
      {activeTab === 'REPORTS' && reportData && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Header & Controls */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {(['today', 'yesterday', 'week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setReportPeriod(period)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all ${
                    reportPeriod === period
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : period === 'year' ? 'This Year' : period}
                </button>
              ))}
            </div>

            {isAdmin && (
              <button
                onClick={() => api.downloadInventoryCsv({ type: 'sales', period: reportPeriod })}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Sales CSV
              </button>
            )}
          </div>

          {/* Revenue & Profit Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Sales Revenue
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {formatINR(reportData.sales.totalRevenue)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {reportData.sales.salesCount} sales completed
              </span>
            </div>

            {isAdmin && (
              <>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Cost of Goods Sold (COGS)
                  </span>
                  <div className="text-2xl font-black text-slate-700 font-mono mt-1">
                    {formatINR(reportData.sales.totalCost || 0)}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Weighted-average stock cost
                  </span>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Gross Store Profit
                  </span>
                  <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                    {formatINR(reportData.sales.grossProfit || 0)}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    Revenue minus actual product cost
                  </span>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Current Inventory Valuation
                  </span>
                  <div className="text-2xl font-black text-indigo-700 font-mono mt-1">
                    {formatINR(reportData.stock.totalValuation || 0)}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {reportData.stock.totalUnits} units on shelves
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Product-wise Sales Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Product Sales Breakdown ({reportPeriod.toUpperCase()})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3 text-center">Units Sold</th>
                    <th className="py-3 px-3 text-right">Revenue</th>
                    {isAdmin && <th className="py-3 px-3 text-right">Cost</th>}
                    {isAdmin && <th className="py-3 px-4 text-right">Gross Profit</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.productSales.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 4} className="py-8 text-center text-slate-400">
                        No product sales recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    reportData.productSales.map((ps) => (
                      <tr key={ps.productId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{ps.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{ps.sku}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {ps.unitsSold}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(ps.revenue)}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {formatINR(ps.cost || 0)}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {formatINR(ps.profit || 0)}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProductModal
        product={editingProduct}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <StockAdjustmentModal
        product={adjustingProduct}
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <SupplierModal
        supplier={editingSupplier}
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
};
