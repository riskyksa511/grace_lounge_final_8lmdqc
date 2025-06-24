import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

interface AdminSummaryProps {
  onBack: () => void;
}

const MONTH_NAMES = [
  "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export function AdminSummary({ onBack }: AdminSummaryProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'daily' | 'users'>('daily');

  const comprehensiveSummary = useQuery(api.admin.getComprehensiveMonthlySummary, {
    year: selectedYear,
    month: selectedMonth
  });

  const usersSummary = useQuery(api.admin.getUsersMonthlySummary, {
    year: selectedYear,
    month: selectedMonth
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      weekday: 'short',
      day: 'numeric'
    });
  };

  if (comprehensiveSummary === undefined || usersSummary === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log('comprehensiveSummary:', comprehensiveSummary);
  console.log('usersSummary:', usersSummary);

  // التحقق من وجود البيانات
  const hasData = comprehensiveSummary?.dailySummary && comprehensiveSummary.dailySummary.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md border border-blue-200 hover:border-blue-400 transition-colors"
          >
            <span>←</span>
            <span>العودة</span>
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              📊 الملخص الشامل للحسابات
            </h2>
            <p className="text-gray-600 mt-1">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </p>
          </div>
        </div>

        {/* Month/Year Selector */}
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_NAMES.slice(1).map((month, index) => (
              <option key={index + 1} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 6 }, (_, i) => 2025 + i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {comprehensiveSummary?.totals?.totalGross?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">إجمالي المبالغ</div>
        </div>
        
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            {comprehensiveSummary?.totals?.totalCash?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">إجمالي الكاش</div>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">
            {comprehensiveSummary?.totals?.totalNetwork?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">إجمالي الشبكة</div>
        </div>
        
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">
            {comprehensiveSummary?.totals?.totalPurchases?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">إجمالي المشتريات</div>
        </div>
        
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
          <div className="text-2xl font-bold text-indigo-600">
            {comprehensiveSummary?.totals?.totalAdvances?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">إجمالي السلفيات</div>
        </div>
        
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="text-2xl font-bold text-red-600">
            {comprehensiveSummary?.totals?.totalNet?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">الصافي</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 text-center">
          <div className="text-xl font-bold text-gray-800">
            {comprehensiveSummary?.totals?.activeDays || 0}
          </div>
          <div className="text-sm text-gray-600">أيام نشطة</div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 text-center">
          <div className="text-xl font-bold text-gray-800">
            {comprehensiveSummary?.totals?.activeUsers || 0}
          </div>
          <div className="text-sm text-gray-600">مستخدمين نشطين</div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 text-center">
          <div className="text-xl font-bold text-gray-800">
            {comprehensiveSummary?.totals?.averageDailyAmount?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">متوسط يومي</div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 text-center">
          <div className="text-xl font-bold text-gray-800">
            {comprehensiveSummary?.totals?.activeDays && comprehensiveSummary?.totals?.daysInMonth ? 
              ((comprehensiveSummary.totals.activeDays / comprehensiveSummary.totals.daysInMonth) * 100).toFixed(1) : 0}%
          </div>
          <div className="text-sm text-gray-600">نسبة النشاط</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200 w-fit">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === 'daily'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          📅 ملخص يومي
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === 'users'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          👥 ملخص المستخدمين
        </button>
      </div>

      {/* Content */}
      {!hasData ? (
        <div className="bg-yellow-50 rounded-xl p-8 border border-yellow-200 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">لا توجد بيانات</h3>
          <p className="text-gray-600">لا توجد بيانات مالية لشهر {MONTH_NAMES[selectedMonth]} {selectedYear} بعد</p>
          <p className="text-sm text-gray-500 mt-2">قم بإضافة بعض البيانات اليومية أولاً</p>
        </div>
      ) : activeTab === 'daily' ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500">
            <h3 className="text-xl font-semibold text-white">📅 الملخص اليومي</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكاش</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الشبكة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموع</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المشتريات</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">السلفيات</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتبقي</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدخلات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comprehensiveSummary?.dailySummary?.map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatDate(day.date)}
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-medium">
                      {day.totalCash.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-purple-600 font-medium">
                      {day.totalNetwork.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-green-600 font-bold">
                      {day.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-orange-600 font-medium">
                      {day.totalPurchases.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-indigo-600 font-medium">
                      {day.totalAdvances.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 font-bold ${day.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {day.totalRemaining.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {day.entriesCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500">
            <h3 className="text-xl font-semibold text-white">👥 ملخص المستخدمين</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستخدم</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكاش</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الشبكة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموع</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المشتريات</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">السلفيات</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخصميات</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتبقي</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">أيام نشطة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersSummary?.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {user.isAdmin ? "👑" : "👤"}
                        </span>
                        <span className="font-medium text-gray-900">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-medium">
                      {user.totalCash.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-purple-600 font-medium">
                      {user.totalNetwork.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-green-600 font-bold">
                      {user.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-orange-600 font-medium">
                      {user.totalPurchases.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-indigo-600 font-medium">
                      {user.totalAdvances.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-red-600 font-medium">
                      {user.deductions.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 font-bold ${user.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {user.totalRemaining.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {user.activeDays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
