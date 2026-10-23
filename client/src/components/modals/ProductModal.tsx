import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle } from 'lucide-react';
import { Product, Supplier } from '../../types';
import { api } from '../../api/client';

interface ProductModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Supplements',
  'Beverages',
  'Apparel',
  'Accessories',
  'Equipment',
  'Snacks',
  'General',
];

const UNITS = ['PIECE', 'BOX', 'BOTTLE', 'KG', 'GRAM', 'PAIR', 'PACK'];

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Supplements');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [minStockThreshold, setMinStockThreshold] = useState('5');
  const [unit, setUnit] = useState('PIECE');
  const [supplierId, setSupplierId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getSuppliers().then(setSuppliers).catch(console.error);

      if (product) {
        setName(product.name || '');
        setSku(product.sku || '');
        setBarcode(product.barcode || '');
        setCategory(product.category || 'Supplements');
        setBrand(product.brand || '');
        setDescription(product.description || '');
        setPurchaseCost(String(product.purchaseCost || 0));
        setSellingPrice(String(product.sellingPrice || ''));
        setCurrentStock(String(product.currentStock || 0));
        setMinStockThreshold(String(product.minStockThreshold || 5));
        setUnit(product.unit || 'PIECE');
        setSupplierId(product.supplier?._id || '');
        setBatchNumber(product.batchNumber || '');
        setExpiryDate(product.expiryDate ? product.expiryDate.split('T')[0] : '');
      } else {
        setName('');
        setSku('');
        setBarcode('');
        setCategory('Supplements');
        setBrand('');
        setDescription('');
        setPurchaseCost('0');
        setSellingPrice('');
        setCurrentStock('0');
        setMinStockThreshold('5');
        setUnit('PIECE');
        setSupplierId('');
        setBatchNumber('');
        setExpiryDate('');
      }
      setError(null);
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!sku.trim()) {
      setError('SKU is required');
      return;
    }
    if (!sellingPrice || Number(sellingPrice) < 0) {
      setError('Valid non-negative selling price is required');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        category,
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        purchaseCost: Number(purchaseCost) || 0,
        sellingPrice: Number(sellingPrice),
        minStockThreshold: Number(minStockThreshold) || 5,
        unit,
        supplier: supplierId || undefined,
        batchNumber: batchNumber.trim() || undefined,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      };

      if (!product) {
        payload.currentStock = Math.max(0, Number(currentStock) || 0);
        await api.createProduct(payload);
      } else {
        await api.updateProduct(product._id, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {product ? 'Edit Inventory Product' : 'Register New Product'}
              </h3>
              <p className="text-[11px] text-slate-500">Sagar Fitness Gym Store Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 100% Whey Protein Double Rich Chocolate 2kg"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                SKU / Product Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. WHEY-CHOCO-2KG"
                className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Barcode (Optional for POS scanner)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 890123456789"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Optimum Nutrition, MuscleBlaze"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Selling Price (₹ INR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="5800"
                  className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Purchase Cost */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Purchase Cost (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  placeholder="4000"
                  className="w-full pl-7 pr-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Initial Stock (Only for new product) */}
            {!product && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Initial Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="10"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            )}

            {/* Min Stock Threshold */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Low-Stock Alert Threshold
              </label>
              <input
                type="number"
                min="0"
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Unit of Measure</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Reference */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="">-- No Supplier Linked --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch & Expiry */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Batch Number</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-2026-A"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Flavor notes, serving size, usage instructions..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              {loading ? 'Saving...' : product ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
