import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface MonthViewProps {
  year: number;
  month: number;
  onBack: () => void;
  onSelectDate: (date: string) => void;
  userId: Id<"users">;
  isAdmin: boolean;
}

export function MonthView({ year, month, onBack, onSelectDate, userId, isAdmin }: MonthViewProps) {
  const userProfile = useQuery(api.userProfiles.getUserProfile, { targetUserId: userId });
  const monthlyData = useQuery(api.userSummary.getUserMonthlySummary, { 
    year, 
    month, 
    targetUserId: userId 
  });
  const dailyEntries = useQuery(api.dailyEntries.getDailyEntries, { 
    targetUserId: userId, 
    year, 
    month 
  });
  
  const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
  const monthlyAdvances = useQuery(api.dailyEntries.getMonthlyAdvances, {
    targetUserId: userId,
    yearMonth,
  });

  const monthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const getDateEntry = (day: number) => {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return dailyEntries?.find(entry => entry.date === dateStr);
  };

  const renderCalendarDay = (day: number) => {
    const entry = getDateEntry(day);
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const isToday = new Date().toDateString() === new Date(dateStr).toDateString();

    return (
      <button
        key={day}
        onClick={() => onSelectDate(dateStr)}
        className={`
          relative p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg
          ${entry 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 hover:border-green-400' 
            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
          }
          ${isToday ? 'ring-2 ring-orange-400 ring-opacity-50' : ''}
        `}
      >
        <div className="text-center">
          <div className={`text-lg font-bold ${entry ? 'text-green-700' : 'text-gray-600'}`}>
            {day}
          </div>
          {entry && (
            <div className="mt-1">
              {isAdmin ? (
                // عرض المبالغ للمدير فقط
                <>
                  <div className="text-xs text-green-600 font-medium">
                    {entry.total.toLocaleString()} ر.س
                  </div>
                  {entry.remaining > 0 && (
                    <div className="text-xs text-blue-600">
                      متبقي: {entry.remaining.toLocaleString()}
                    </div>
                  )}
                </>
              ) : (
                // عرض "مكتمل" للأعضاء العاديين
                <div className="text-xs text-green-600 font-medium">
                  مكتمل
                </div>
              )}
            </div>
          )}
          {isToday && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full"></div>
          )}
        </div>
      </button>
    );
  };

  if (!userProfile || !monthlyData || dailyEntries === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex justify-center items-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // حساب السلفيات التراكمية (مجموع السلفيات اليومية المدخلة) والمتبقي (النقدي + الشبكة - المشتريات فقط)
  const cumulativeAdvances = monthlyData.totalAdvances || 0; // استخدام السلفيات من المدخلات اليومية
  const simpleRemaining = monthlyData.totalAmount - monthlyData.totalPurchases;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* رأس الصفحة */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <span>←</span>
                <span>العودة</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="text-4xl">📅</span>
                  {monthNames[month - 1]} {year}
                </h1>
                <p className="text-gray-500 mt-1">
                  عرض بيانات: {userProfile.username}
                  {userProfile.isAdmin && (
                    <span className="mr-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      مدير
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* الملخص الشهري */}
          {isAdmin ? (
            // عرض الملخص الكامل للمدير
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {monthlyData.totalAmount.toLocaleString()}
                </div>
                <div className="text-sm text-green-800">إجمالي المبالغ</div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {monthlyData.totalPurchases.toLocaleString()}
                </div>
                <div className="text-sm text-blue-800">المشتريات اليومية</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  {cumulativeAdvances.toLocaleString()}
                </div>
                <div className="text-sm text-purple-800">السلفيات التراكمية</div>
              </div>

              <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {(userProfile.deductions || 0).toLocaleString()}
                </div>
                <div className="text-sm text-red-800">الخصومات</div>
              </div>

              <div className="bg-teal-50 rounded-lg p-4 text-center border border-teal-200">
                <div className={`text-2xl font-bold ${
                  simpleRemaining >= 0 ? 'text-teal-600' : 'text-red-600'
                }`}>
                  {simpleRemaining.toLocaleString()}
                </div>
                <div className="text-sm text-teal-800">المتبقي</div>
              </div>
            </div>
          ) : (
            // عرض ملخص مفصل للأعضاء العاديين (مع السلفيات والخصومات)
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {monthlyData.activeDays}
                </div>
                <div className="text-sm text-green-800">أيام مسجلة</div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {monthlyData.daysInMonth}
                </div>
                <div className="text-sm text-blue-800">إجمالي أيام الشهر</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  {cumulativeAdvances.toLocaleString()}
                </div>
                <div className="text-sm text-purple-800">السلفيات التراكمية</div>
              </div>

              <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {(userProfile.deductions || 0).toLocaleString()}
                </div>
                <div className="text-sm text-red-800">الخصومات الثابتة</div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((monthlyData.activeDays / monthlyData.daysInMonth) * 100)}%
                </div>
                <div className="text-sm text-orange-800">نسبة التسجيل</div>
              </div>
            </div>
          )}
        </div>

        {/* التقويم */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">🗓️</span>
            أيام الشهر
          </h2>

          {/* أيام الأسبوع */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'].map(day => (
              <div key={day} className="text-center font-bold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* أيام الشهر */}
          <div className="grid grid-cols-7 gap-2">
            {/* المساحات الفارغة في بداية الشهر */}
            {Array.from({ length: adjustedFirstDay }, (_, i) => (
              <div key={`empty-${i}`} className="p-3"></div>
            ))}
            
            {/* أيام الشهر */}
            {Array.from({ length: daysInMonth }, (_, i) => renderCalendarDay(i + 1))}
          </div>
        </div>

        {/* إحصائيات إضافية */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            إحصائيات الشهر
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              <span><strong>أيام مسجلة:</strong> {monthlyData.activeDays} من {monthlyData.daysInMonth}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              <span><strong>نسبة التسجيل:</strong> {Math.round((monthlyData.activeDays / monthlyData.daysInMonth) * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              <span><strong>السلفيات التراكمية:</strong> {cumulativeAdvances.toLocaleString()} ر.س</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              <span><strong>الخصومات الثابتة:</strong> {(userProfile.deductions || 0).toLocaleString()} ر.س</span>
            </div>
          </div>
        </div>

        {/* معلومات توضيحية */}
        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            {isAdmin ? 'شرح الحسابات' : 'معلومات الشهر'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            {isAdmin ? (
              // شرح مفصل للمدير
              <>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span><strong>إجمالي المبالغ:</strong> مجموع النقد والشبكة لجميع الأيام</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span><strong>المشتريات اليومية:</strong> مجموع المشتريات المسجلة يومياً</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span><strong>السلفيات التراكمية:</strong> مجموع السلفيات المدخلة في المدخلات اليومية</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span><strong>المتبقي:</strong> النقدي + الشبكة - المشتريات اليومية</span>
                  </div>
                </div>
              </>
            ) : (
              // معلومات مفصلة للأعضاء العاديين
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span><strong>الأيام المكتملة:</strong> الأيام التي تم تسجيل البيانات فيها</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span><strong>نسبة التسجيل:</strong> نسبة الأيام المسجلة من إجمالي أيام الشهر</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span><strong>السلفيات التراكمية:</strong> إجمالي السلفيات المسجلة خلال الشهر</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span><strong>الخصومات الثابتة:</strong> المبلغ المحدد للخصم الشهري (للعرض فقط)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span><strong>اضغط على أي يوم:</strong> لعرض تفاصيل ذلك اليوم أو إضافة بيانات جديدة</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
