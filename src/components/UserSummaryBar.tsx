import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface UserSummaryBarProps {
  userId: Id<"users">;
}

export function UserSummaryBar({ userId }: UserSummaryBarProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const userProfile = useQuery(api.userProfiles.getUserProfile, { targetUserId: userId });
  const monthlyData = useQuery(api.userSummary.getUserMonthlySummary, { 
    year: currentYear, 
    month: currentMonth, 
    targetUserId: userId 
  });

  if (!userProfile || !monthlyData) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="mr-2 text-blue-700">جاري تحميل الإحصائيات...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📊</span>
        <h3 className="text-xl font-bold text-blue-800">
          ملخص المستخدم: {userProfile.username}
        </h3>
      </div>

      {/* الإحصائيات الإجمالية */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center shadow-sm border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            {monthlyData.activeDays}
          </div>
          <div className="text-sm text-blue-800">أيام مسجلة</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center shadow-sm border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {monthlyData.totalAmount.toLocaleString()}
          </div>
          <div className="text-sm text-green-800">إجمالي المبالغ</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 text-center shadow-sm border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">
            {monthlyData.totalAdvances.toLocaleString()}
          </div>
          <div className="text-sm text-purple-800">السلفيات التراكمية</div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 text-center shadow-sm border border-red-200">
          <div className="text-2xl font-bold text-red-600">
            {userProfile.deductions?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-red-800">الخصومات الثابتة</div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 text-center shadow-sm border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">
            {(monthlyData.totalRemaining - (userProfile.deductions || 0)).toLocaleString()}
          </div>
          <div className="text-sm text-orange-800">المبلغ المتبقي</div>
        </div>


      </div>

      {/* تفاصيل إضافية */}
      <div className="bg-white rounded-lg p-4 mb-4 border border-blue-100">
        <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <span className="text-lg">📊</span>
          تفاصيل إضافية
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">
              {monthlyData.totalPurchases.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">مشتريات الشهر</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-indigo-600">
              {monthlyData.averageDailyAmount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">متوسط يومي</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-teal-600">
              {monthlyData.daysInMonth}
            </div>
            <div className="text-sm text-gray-600">أيام الشهر</div>
          </div>
        </div>
      </div>

      {/* الخصومات والصافي */}
      <div className="bg-white rounded-lg p-4 border border-blue-100">
        <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <span className="text-lg">💰</span>
          الحساب النهائي
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="text-center">
            <div className="text-xl font-bold text-teal-600">
              {(monthlyData.totalRemaining + (userProfile.deductions || 0)).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">المتبقي قبل الخصم</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${
              (monthlyData.totalRemaining - (userProfile.deductions || 0)) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(monthlyData.totalRemaining - (userProfile.deductions || 0)).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">الصافي بعد الخصم</div>
          </div>
        </div>
      </div>

      {/* ملاحظة للمدير */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="text-sm text-yellow-700 flex items-center gap-2">
          <span className="text-lg">ℹ️</span>
          <div>
            <strong>ملاحظة للمدير:</strong> هذه الإحصائيات خاصة بالمستخدم "{userProfile.username}" فقط للشهر الحالي.
          </div>
        </div>
      </div>
    </div>
  );
}
