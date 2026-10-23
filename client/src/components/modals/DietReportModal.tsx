import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Dumbbell,
  Droplet,
  Flame,
  CheckCircle2,
  Calendar,
  User,
  ShieldAlert,
} from 'lucide-react';
import { DietPlan, WeightProgress } from '../../types';
import { generateBillPDF } from '../../utils/pdfGenerator';
import { sendWhatsAppDietPlan } from '../../utils/whatsapp';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { formatDateIN } from '../../utils/formatters';

interface DietReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: DietPlan | null;
  recentProgress?: WeightProgress[];
}

export const DietReportModal: React.FC<DietReportModalProps> = ({
  isOpen,
  onClose,
  plan,
  recentProgress = [],
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !plan) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const filename = `Diet-Plan-${plan.member?.memberId || 'Member'}-${plan.name.replace(/\s+/g, '_')}`;
    await generateBillPDF('diet-dossier-print-container', filename);
  };

  const handleShareWhatsApp = () => {
    if (!plan.member?.phone) {
      alert('Member mobile number not found.');
      return;
    }

    sendWhatsAppDietPlan({
      memberName: plan.member.fullName,
      phone: plan.member.phone,
      planName: plan.name,
      fitnessGoal: plan.fitnessGoal,
      dailyCalories: plan.dailyCalories || plan.targetCalories,
      dailyProtein: plan.dailyProtein || plan.targetProtein,
      dailyCarbs: plan.dailyCarbs || plan.targetCarbs,
      dailyFat: plan.dailyFat || plan.targetFat,
      waterIntakeLiters: plan.waterIntakeLiters,
      meals: plan.meals.map((m) => ({
        mealType: m.mealType,
        name: m.name,
        time: m.time,
        items: m.items.map((it) => ({
          foodName: it.foodName,
          quantity: it.quantity,
          servingUnit: it.servingUnit,
        })),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Actions Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">Printable Diet & Nutrition Dossier</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            {plan.member?.phone && (
              <button
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Container */}
        <div
          id="diet-dossier-print-container"
          ref={printRef}
          className="p-8 bg-white text-slate-900 space-y-6"
        >
          {/* Gym Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-lime-400" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                  Sagar Fitness Gym
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  Pathardi, Maharashtra • Elite Athletic & Conditioning Facility
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-lime-100 text-lime-900 border border-lime-300 rounded text-xs font-black uppercase tracking-wider">
                Personalized Diet Protocol
              </span>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Date: {formatDateIN(plan.startDate)}
              </p>
            </div>
          </div>

          {/* Member & Protocol Particulars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Member Name
              </span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{plan.member?.fullName}</p>
              <p className="text-[11px] text-slate-500 font-mono">ID: {plan.member?.memberId}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Phone Number
              </span>
              <p className="font-semibold text-slate-800 font-mono mt-0.5">{plan.member?.phone}</p>
              <p className="text-[11px] text-slate-500">
                Gender: {plan.member?.gender || 'Not specified'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Fitness Goal
              </span>
              <p className="font-bold text-slate-900 mt-0.5">
                {plan.fitnessGoal.replace('_', ' ')}
              </p>
              <p className="text-[11px] text-slate-500">
                Status: <span className="font-bold text-emerald-700">{plan.status}</span>
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Protocol Name
              </span>
              <p className="font-bold text-slate-900 mt-0.5 truncate">{plan.name}</p>
              <p className="text-[11px] text-slate-500">
                Valid: {formatDateIN(plan.startDate)}{' '}
                {plan.endDate ? `to ${formatDateIN(plan.endDate)}` : '(Ongoing)'}
              </p>
            </div>
          </div>

          {/* Caloric & Macronutrient Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-950 text-white rounded-xl">
            <div className="border-r border-slate-800 pr-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Daily Caloric Target
              </span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {plan.dailyCalories || plan.targetCalories}
              </span>
              <span className="text-[10px] text-slate-400 block">kcal / day</span>
            </div>

            <div className="border-r border-slate-800 pr-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Protein Target
              </span>
              <span className="text-xl font-black text-blue-400 font-mono">
                {plan.dailyProtein || plan.targetProtein}g
              </span>
              <span className="text-[10px] text-slate-400 block">Lean mass synthesis</span>
            </div>

            <div className="border-r border-slate-800 pr-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Carbohydrates
              </span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {plan.dailyCarbs || plan.targetCarbs}g
              </span>
              <span className="text-[10px] text-slate-400 block">Glycogen & stamina</span>
            </div>

            <div className="border-r border-slate-800 pr-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Healthy Fats
              </span>
              <span className="text-xl font-black text-rose-400 font-mono">
                {plan.dailyFat || plan.targetFat}g
              </span>
              <span className="text-[10px] text-slate-400 block">Hormonal balance</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Daily Hydration
              </span>
              <span className="text-xl font-black text-cyan-400 font-mono">
                {plan.waterIntakeLiters || 3.5}L
              </span>
              <span className="text-[10px] text-slate-400 block">Clean filtered water</span>
            </div>
          </div>

          {/* Meal-by-Meal Schedule Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              Prescribed Daily Meal Schedule & Food Portions
            </h3>

            <div className="space-y-4">
              {plan.meals.map((meal, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      {idx + 1}. {meal.name} {meal.time ? `• ${meal.time}` : ''}
                    </span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {meal.mealCalories} kcal (P: {meal.mealProtein}g | C: {meal.mealCarbs}g | F: {meal.mealFat}g)
                    </span>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-4">Food Item</th>
                        <th className="py-1.5 px-4 text-center">Portion / Quantity</th>
                        <th className="py-1.5 px-4 text-right">Calories</th>
                        <th className="py-1.5 px-4 text-right">Protein</th>
                        <th className="py-1.5 px-4 text-right">Carbs</th>
                        <th className="py-1.5 px-4 text-right">Fat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {meal.items.map((item, itIdx) => (
                        <tr key={itIdx}>
                          <td className="py-2 px-4 text-slate-800 font-bold">{item.foodName}</td>
                          <td className="py-2 px-4 text-center font-mono">
                            {item.quantity} {item.servingUnit}
                          </td>
                          <td className="py-2 px-4 text-right font-bold text-amber-700">
                            {item.calories} kcal
                          </td>
                          <td className="py-2 px-4 text-right text-blue-700">{item.protein}g</td>
                          <td className="py-2 px-4 text-right text-emerald-700">{item.carbs}g</td>
                          <td className="py-2 px-4 text-right text-rose-700">{item.fat}g</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Weight & Body Measurements Progress */}
          {recentProgress.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                Recent Body Composition Progress Log
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {recentProgress.slice(0, 4).map((p, pIdx) => (
                  <div key={pIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {formatDateIN(p.date)}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{p.weight} kg</span>
                    {p.bmi && (
                      <span className="text-[10px] text-slate-500 block">BMI: {p.bmi}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coaching Guidelines & Notes */}
          {plan.notes && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-amber-900 uppercase tracking-wider block">
                Coaching Instructions & Guidelines
              </span>
              <p className="text-amber-800 whitespace-pre-line">{plan.notes}</p>
            </div>
          )}

          {/* Important Limitations & Disclaimer */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Nutrition Protocol Limitations & Guidance</span>
            </div>
            <p>
              This customized nutrition protocol was prepared by Sagar Fitness Gym for athletic conditioning, body recomposition, and general fitness purposes. All caloric values and macronutrient distributions are calculated based on physiological models (Mifflin-St Jeor equation). This protocol does not replace medical or clinical advice. Consult a licensed medical practitioner before making drastic dietary changes if you have underlying metabolic conditions.
            </p>
          </div>

          {/* Footer Signature */}
          <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-xs">
            <div>
              <p className="font-bold text-slate-900">Sagar Fitness Gym</p>
              <p className="text-slate-500">Pathardi, Maharashtra</p>
            </div>
            <div className="text-right">
              <div className="w-40 border-b border-slate-400 mb-1" />
              <p className="font-semibold text-slate-700">Gym Administrator / Trainer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
