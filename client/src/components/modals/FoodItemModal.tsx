import React, { useState, useEffect } from 'react';
import { X, Apple, Check, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { FoodItem, FoodCategory } from '../../types';

interface FoodItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (food: FoodItem) => void;
  foodToEdit?: FoodItem | null;
}

const CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: 'PROTEINS', label: 'Proteins (Eggs, Chicken, Fish, Dal, Chana)' },
  { value: 'CARBOHYDRATES', label: 'Carbohydrates (Rice, Oats, Roti, Sweet Potato)' },
  { value: 'HEALTHY_FATS', label: 'Healthy Fats (Almonds, Peanut Butter, Nuts)' },
  { value: 'DAIRY', label: 'Dairy (Milk, Paneer, Curd, Greek Yogurt)' },
  { value: 'VEGETABLES', label: 'Vegetables (Broccoli, Spinach, Salad, Veggies)' },
  { value: 'FRUITS', label: 'Fruits (Banana, Apple, Berries)' },
  { value: 'SUPPLEMENTS', label: 'Supplements (Whey Protein, Creatine, BCAA)' },
  { value: 'SNACKS_OTHERS', label: 'Snacks & Other Whole Foods' },
];

export const FoodItemModal: React.FC<FoodItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  foodToEdit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('PROTEINS');
  const [servingSize, setServingSize] = useState<number | string>(100);
  const [servingUnit, setServingUnit] = useState('g');
  const [calories, setCalories] = useState<number | string>('');
  const [protein, setProtein] = useState<number | string>('');
  const [carbs, setCarbs] = useState<number | string>('');
  const [fat, setFat] = useState<number | string>('');
  const [fiber, setFiber] = useState<number | string>('');
  const [source, setSource] = useState('Standard Gym Nutrition Database (Verified)');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (foodToEdit) {
      setName(foodToEdit.name);
      setCategory(foodToEdit.category);
      setServingSize(foodToEdit.servingSize);
      setServingUnit(foodToEdit.servingUnit);
      setCalories(foodToEdit.calories);
      setProtein(foodToEdit.protein);
      setCarbs(foodToEdit.carbs);
      setFat(foodToEdit.fat);
      setFiber(foodToEdit.fiber || 0);
      setSource(foodToEdit.source || 'Custom Gym Entry');
      setNotes(foodToEdit.notes || '');
    } else {
      setName('');
      setCategory('PROTEINS');
      setServingSize(100);
      setServingUnit('g');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setFiber('');
      setSource('Standard Gym Nutrition Database (Verified)');
      setNotes('');
    }
    setError(null);
  }, [foodToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a food name');
      return;
    }
    if (Number(calories) < 0 || Number(protein) < 0 || Number(carbs) < 0 || Number(fat) < 0) {
      setError('Nutritional values cannot be negative');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        category,
        servingSize: Number(servingSize) || 100,
        servingUnit: servingUnit.trim() || 'g',
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        fiber: Number(fiber) || 0,
        source: source.trim(),
        notes: notes.trim(),
      };

      let result;
      if (foodToEdit) {
        result = await api.updateFood(foodToEdit._id, payload);
      } else {
        result = await api.createFood(payload);
      }

      onSuccess(result.data.food);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save food item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Apple className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {foodToEdit ? 'Edit Food Item' : 'Add New Verified Food Item'}
              </h2>
              <p className="text-xs text-slate-500">Sagar Fitness Gym Nutrition Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Food Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Boiled Egg White, Grilled Chicken Breast, Paneer..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodCategory)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Serving Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={servingSize}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setServingSize(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Serving Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={servingUnit}
                  onChange={(e) => setServingUnit(e.target.value)}
                  placeholder="g, scoop, piece, bowl"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Macro Inputs */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Nutritional Values Per Serving ({servingSize || 100} {servingUnit})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Calories (kcal) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={calories}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCalories(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Protein (g) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={protein}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setProtein(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Carbs (g) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={carbs}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCarbs(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fat (g) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={fat}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFat(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Dietary Fiber (g) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={fiber}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFiber(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nutrition Source Reference
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Standard Gym Nutrition Database (Verified)"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Preparation / Cooking Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Boiled without butter/oil, raw weight, skinless..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : foodToEdit ? 'Update Food' : 'Save Food Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
