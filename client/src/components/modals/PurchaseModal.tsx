import React, { useState, useEffect } from 'react';
import { X, Receipt, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Product, Supplier } from '../../types';
import { api } from '../../api/client';
import { formatINR } from '../../utils/formatters';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PurchaseLineItem {
  productId: string;
  quantity: number;
  purchaseCost: number;
  batchNumber?: string;
  expiryDate?: string;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<PurchaseLineItem[]>([
    { productId: '', quantity: 1, purchaseCost: 0 },
  ]);
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD'>('UPI');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.getSuppliers(),
        api.getProducts({ limit: '200', status: 'ACTIVE' }),
      ])
        .then(([sups, prods]) => {
          setSuppliers(sups);
          setProducts(prods.products || []);
          if (sups.length > 0) setSupplierId(sups[0]._id);
          if (prods.products && prods.products.length > 0) {
            setItems([
              {
                productId: prods.products[0]._id,
                quantity: 5,
                purchaseCost: prods.products[0].purchaseCost || 0,
              },
            ]);
          }
        })
        .catch(console.error);

      setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProductChange = (idx: number, pId: string) => {
    const selected = products.find((p) => p._id === pId);
    const updated = [...items];
    updated[idx].productId = pId;
    if (selected && selected.purchaseCost) {
      updated[idx].purchaseCost = selected.purchaseCost;
    }
    setItems(updated);
  };

  const handleItemChange = (idx: number, field: keyof PurchaseLineItem, val: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = val;
    setItems(updated);
  };

  const handleAddItem = () => {
    const firstP = products[0];
    setItems([
      ...items,
      {
        productId: firstP ? firstP._id : '',
        quantity: 1,
        purchaseCost: firstP ? firstP.purchaseCost || 0 : 0,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const overallTotal = items.reduce((acc, item) => {
    return acc + (Number(item.quantity) || 0) * (Number(item.purchaseCost) || 0);
  }, 0);

  const numPaid = Number(amountPaid) || 0;
  const balanceRemaining = Math.max(0, overallTotal - numPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }

    if (items.some((it) => !it.productId || it.quantity <= 0)) {
      setError('Please verify that all products and quantities (min 1) are valid');
      return;
    }

    try {
      setLoading(true);
      await api.createPurchase({
        supplierId,
        invoiceNumber: invoiceNumber.trim().toUpperCase(),
        purchaseDate,
        items,
        amountPaid: numPaid,
        paymentMethod,
        notes: notes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record purchase invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Record Stock Purchase Order</h3>
              <p className="text-[11px] text-slate-500">Receive inventory & update supplier ledgers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Invoice / Bill Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                placeholder="INV-00123"
                className="w-full px-3 py-2 text-xs font-mono uppercase font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Purchase Date</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Purchased Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Products Received
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.purchaseCost) || 0);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-12 gap-2.5 items-center shadow-2xs"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                        Product
                      </label>
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">-- Choose Item --</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                        Cost (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={item.purchaseCost}
                        onChange={(e) => handleItemChange(idx, 'purchaseCost', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-3 text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                        Line Total
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 block pt-1">
                        {formatINR(lineTotal)}
                      </span>
                    </div>

                    <div className="col-span-1 text-right">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment & Ledger Section */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Overall Purchase Total
                </span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {formatINR(overallTotal)}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Amount Paid Now (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Supplier Balance Due
                </span>
                <span
                  className={`text-lg font-black font-mono ${
                    balanceRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {formatINR(balanceRemaining)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">NEFT / Bank Transfer</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Delivered by truck, checked by Sagar sir"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              {loading ? 'Processing...' : 'Confirm & Receive Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
