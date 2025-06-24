import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface MonthlyPurchasesModalProps {
  onClose: () => void;
  userId: Id<"users">;
  year: number;
  month: number;
  username: string;
}

export function MonthlyPurchasesModal({ 
  onClose, 
  userId, 
  year, 
  month, 
  username 
}: MonthlyPurchasesModalProps) {
  const [totalPurchases, setTotalPurchases] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
  
  const monthlyPurchases = useQuery(api.monthlyPurchases.getMonthlyPurchases, {
    targetUserId: userId,
    yearMonth,
  });
  
  const updateMonthlyPurchases = useMutation(api.monthlyPurchases.updateMonthlyPurchases);

  useEffect(() => {
    if (monthlyPurchases) {
      setTotalPurchases(monthlyPurchases.totalPurchases?.toString() || "0");
      setNotes(monthlyPurchases.notes || "");
    }
  }, [monthlyPurchases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const purchasesAmount = parseFloat(totalPurchases) || 0;
    if (purchasesAmount < 0) {
      toast.error("لا يمكن أن تكون المشتريات أقل من الصفر");
      return;
    }

    setLoading(true);
    try {
      await updateMonthlyPurchases({
        targetUserId: userId,
        yearMonth,
        totalPurchases: purchasesAmount,
        notes: notes.trim(),
      });
      
      toast.success("تم تحديث المشتريات الشهرية بنجاح!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء تحديث المشتريات");
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-2xl">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            المشتريات الشهرية
          </h3>
          <p className="text-purple-100 text-sm mt-1">
            {username} - {monthNames[month - 1]} {year}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              إجمالي المشتريات الشهرية (ر.س)
            </label>
            <input
              type="number"
              value={totalPurchases}
              onChange={(e) => setTotalPurchases(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="0"
              step="0.01"
              placeholder="0.00"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              المبلغ الإجمالي للمشتريات خلال الشهر
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              rows={3}
              placeholder="أضف ملاحظات حول المشتريات..."
              disabled={loading}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {notes.length}/500 حرف
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-800">
              <div className="font-medium mb-2">📝 معلومات مهمة:</div>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>هذه المشتريات منفصلة عن المشتريات اليومية</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>يتم احتسابها في الملخص الشهري الإجمالي</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>يمكن تعديلها في أي وقت من قبل المدير</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">💾</span>
                  <span>حفظ المشتريات</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
