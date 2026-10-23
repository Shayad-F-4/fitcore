import React, { useState, useEffect } from 'react';
import { X, Truck, AlertCircle } from 'lucide-react';
import { Supplier } from '../../types';
import { api } from '../../api/client';

interface SupplierModalProps {
  supplier?: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setName(supplier.name || '');
        setPhone(supplier.phone || '');
        setEmail(supplier.email || '');
        setAddress(supplier.address || '');
        setNotes(supplier.notes || '');
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, supplier]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Supplier name is required');
      return;
    }
    if (!phone.trim()) {
      setError('Supplier phone number is required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (supplier) {
        await api.updateSupplier(supplier._id, payload);
      } else {
        await api.createSupplier(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {supplier ? 'Edit Supplier Details' : 'Register New Supplier'}
              </h3>
              <p className="text-[11px] text-slate-500">Inventory & Purchasing Vendors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Supplier / Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Optimum Nutrition Maharashtra Dist."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Contact Phone <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98220 00000"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@supplier.in"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Office / Depot Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. MIDC Industrial Area, Pune / Pathardi Depot"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Terms</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Credit period 15 days, delivers every Tuesday..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
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
              className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              {loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
