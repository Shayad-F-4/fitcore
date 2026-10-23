import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  DollarSign,
  Receipt,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Package,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Product, Member, InventorySale } from '../types';
import { api } from '../api/client';
import { formatINR } from '../utils/formatters';
import { PosReceiptModal } from '../components/modals/PosReceiptModal';

interface CartItem {
  product: Product;
  quantity: number;
}

export const PosPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['ALL']);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'NET_BANKING'>('UPI');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<InventorySale | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    try {
      const res = await api.getProducts({ limit: '200', status: 'ACTIVE' });
      setProducts(res.products || []);

      const cats = Array.from(
        new Set((res.products || []).map((p: Product) => p.category).filter(Boolean))
      );
      setCategories(['ALL', ...cats]);
    } catch (err) {
      console.error('Failed to load POS products', err);
    }
  };

  useEffect(() => {
    loadProducts();
    const handleDataChanged = () => loadProducts();
    window.addEventListener('fitcore:data-changed', handleDataChanged);
    return () => window.removeEventListener('fitcore:data-changed', handleDataChanged);
  }, []);

  // Search members when typing in customer search
  useEffect(() => {
    if (memberSearch.trim().length >= 2) {
      api
        .getMembers({ search: memberSearch.trim(), limit: 5 })
        .then((res) => setMembers(res.data || []))
        .catch(console.error);
    } else {
      setMembers([]);
    }
  }, [memberSearch]);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      (p.brand && p.brand.toLowerCase().includes(term));
    return matchesCat && matchesSearch;
  });

  const handleAddToCart = (product: Product) => {
    if (product.currentStock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          alert(`Cannot add more than available stock (${product.currentStock} ${product.unit}s)`);
          return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.currentStock) {
              alert(`Cannot exceed available stock of ${item.product.currentStock} units`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setSelectedMember(null);
    setMemberSearch('');
    setCustomerName('');
    setCustomerPhone('');
    setDiscount('0');
    setNotes('');
    setError(null);
  };

  // Barcode enter key support
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      const matched = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === search.trim().toLowerCase()) ||
          p.sku.toLowerCase() === search.trim().toLowerCase()
      );
      if (matched) {
        handleAddToCart(matched);
        setSearch('');
      }
    }
  };

  const subtotal = cart.reduce((acc, it) => acc + it.quantity * it.product.sellingPrice, 0);
  const numDiscount = Math.max(0, parseFloat(discount) || 0);
  const grandTotal = Math.max(0, subtotal - numDiscount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setError(null);

    try {
      setSubmitting(true);
      const res = await api.createInventorySale({
        items: cart.map((it) => ({
          productId: it.product._id,
          quantity: it.quantity,
        })),
        customerMemberId: selectedMember ? selectedMember._id : undefined,
        customerName: selectedMember ? selectedMember.fullName : customerName.trim() || undefined,
        customerPhone: selectedMember ? selectedMember.phone : customerPhone.trim() || undefined,
        paymentMethod,
        discount: numDiscount,
        notes: notes.trim() || undefined,
      });

      setSuccessReceipt(res);
      handleClearCart();
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              🛍️
            </span>
            Point of Sale (POS) Counter
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Fast counter billing for gym supplements, energy drinks, and merchandise
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Product Catalog & Search (Col 7/8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
          {/* Search & Barcode Scan Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Search product by name, brand, SKU or scan barcode (Press Enter)..."
              className="w-full pl-10 pr-24 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <span className="absolute right-3 top-2.5 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono text-slate-500 font-bold border border-slate-200">
              Enter ↵ Scan
            </span>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat === 'ALL' ? 'All Products' : cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No products found</h4>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with another keyword or category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.currentStock <= 0;
                const isLowStock = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;

                return (
                  <div
                    key={p._id}
                    onClick={() => !isOutOfStock && handleAddToCart(p)}
                    className={`group p-3 bg-white border rounded-2xl transition-all duration-150 select-none flex flex-col justify-between ${
                      isOutOfStock
                        ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50/50'
                        : 'border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      {/* Category & Stock Pill */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {p.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : `${p.currentStock} in stock`}
                        </span>
                      </div>

                      {/* Product Name & Brand */}
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 line-clamp-2 transition-colors">
                        {p.name}
                      </h4>
                      {p.brand && (
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {p.brand}
                        </p>
                      )}
                    </div>

                    {/* Price & Add Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {formatINR(p.sellingPrice)}
                      </span>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Cart & Checkout Panel (Col 5/4) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col sticky top-4">
          {/* Cart Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Current Cart</h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {cart.reduce((a, b) => a + b.quantity, 0)} Items
            </span>
          </div>

          {error && (
            <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Cart Items List */}
          <div className="p-4 space-y-2.5 max-h-[300px] overflow-y-auto divide-y divide-slate-100 flex-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">Cart is currently empty</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click on any product on the left to add items
                </p>
              </div>
            ) : (
              cart.map((it) => (
                <div key={it.product._id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-slate-900 truncate">{it.product.name}</h5>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {formatINR(it.product.sellingPrice)} × {it.quantity} ={' '}
                      <span className="font-bold text-slate-800">
                        {formatINR(it.quantity * it.product.sellingPrice)}
                      </span>
                    </p>
                  </div>

                  {/* Quantity Controller */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(it.product._id, -1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono">
                      {it.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(it.product._id, 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(it.product._id)}
                      className="w-6 h-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer / Member Linking Form */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">Link Gym Member (Optional)</label>
                {selectedMember && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(null);
                      setMemberSearch('');
                    }}
                    className="text-[10px] text-rose-600 font-bold hover:underline"
                  >
                    Unlink
                  </button>
                )}
              </div>

              {selectedMember ? (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-blue-900 block">{selectedMember.fullName}</span>
                    <span className="text-[10px] text-blue-600 font-mono">
                      {selectedMember.memberId} • {selectedMember.phone}
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search member by name or phone..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {members.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto divide-y divide-slate-100">
                      {members.map((m) => (
                        <div
                          key={m._id}
                          onClick={() => {
                            setSelectedMember(m);
                            setMemberSearch('');
                            setMembers([]);
                          }}
                          className="p-2 hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="font-bold text-slate-900">{m.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {m.memberId} • {m.phone}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!selectedMember && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Name (Opt)"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone (for WhatsApp)"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['UPI', 'CASH', 'CARD', 'NET_BANKING'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 text-[10px] font-bold rounded-xl border text-center transition-all ${
                      paymentMethod === method
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100 bg-white'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600 font-medium">Discount (₹):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-24 px-2 py-1 text-right text-xs font-mono font-bold border border-slate-200 rounded-lg focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Pricing Totals & Checkout Button */}
          <div className="p-4 border-t border-slate-200 bg-white space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono">{formatINR(subtotal)}</span>
            </div>
            {numDiscount > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 font-medium">
                <span>Discount:</span>
                <span className="font-mono">- {formatINR(numDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-100">
              <span>Grand Total:</span>
              <span className="font-mono text-xl text-blue-700">{formatINR(grandTotal)}</span>
            </div>

            <button
              type="button"
              disabled={cart.length === 0 || submitting}
              onClick={handleCheckout}
              className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Processing Sale...</span>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Complete Sale & Print Receipt ({formatINR(grandTotal)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* POS Receipt Modal */}
      <PosReceiptModal
        sale={successReceipt}
        isOpen={Boolean(successReceipt)}
        onClose={() => setSuccessReceipt(null)}
      />
    </div>
  );
};
