import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface YearViewProps {
  onSelectMonth: (year: number, month: number) => void;
  onAdminPanel?: () => void;
  onAdminSummary?: () => void;
  userId?: Id<"users">;
  isAdmin: boolean;
  isAccessingUser?: boolean;
  onBackToAdmin?: () => void;
}

const MONTHS = [
  { number: 1, name: "يناير", emoji: "❄️" },
  { number: 2, name: "فبراير", emoji: "🌸" },
  { number: 3, name: "مارس", emoji: "🌷" },
  { number: 4, name: "أبريل", emoji: "🌺" },
  { number: 5, name: "مايو", emoji: "🌻" },
  { number: 6, name: "يونيو", emoji: "☀️" },
  { number: 7, name: "يوليو", emoji: "🏖️" },
  { number: 8, name: "أغسطس", emoji: "🌞" },
  { number: 9, name: "سبتمبر", emoji: "🍂" },
  { number: 10, name: "أكتوبر", emoji: "🎃" },
  { number: 11, name: "نوفمبر", emoji: "🍁" },
  { number: 12, name: "ديسمبر", emoji: "🎄" },
];

export function YearView({ 
  onSelectMonth, 
  onAdminPanel, 
  onAdminSummary, 
  userId, 
  isAdmin, 
  isAccessingUser, 
  onBackToAdmin 
}: YearViewProps) {
  const [currentYear] = useState(new Date().getFullYear());
  const userProfile = useQuery(api.userProfiles.getUserProfile, userId ? { targetUserId: userId } : {});

  if (userProfile === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex justify-center items-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* رأس الصفحة */}
        <div className="bg-white rounded-2xl shadow-xl border border-orange-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              {onBackToAdmin && (
                <button
                  onClick={onBackToAdmin}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span>←</span>
                  <span>العودة للمدير</span>
                </button>
              )}
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="text-4xl">📅</span>
                  أشهر عام {currentYear}
                </h1>
                <p className="text-gray-500 mt-1">
                  {isAccessingUser ? `عرض بيانات: ${userProfile?.username}` : `مرحباً، ${userProfile?.username}`}
                  {userProfile?.isAdmin && (
                    <span className="mr-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      مدير
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isAdmin && onAdminPanel && (
                <button
                  onClick={onAdminPanel}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <span>👨‍💼</span>
                  <span>لوحة المدير</span>
                </button>
              )}
              {isAdmin && onAdminSummary && (
                <button
                  onClick={onAdminSummary}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <span>📊</span>
                  <span>ملخص شامل</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* شبكة الأشهر */}
        <div className="bg-white rounded-2xl shadow-xl border border-orange-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">🗓️</span>
            اختر الشهر
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {MONTHS.map((month) => (
              <button
                key={month.number}
                onClick={() => onSelectMonth(currentYear, month.number)}
                className="group relative bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 shadow-lg border border-orange-200 hover:border-orange-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4 group-hover:scale-125 transition-transform duration-300">
                    {month.emoji}
                  </div>
                  <div className="text-xl font-bold text-gray-800 mb-2">
                    {month.name}
                  </div>
                  <div className="text-sm text-gray-600 bg-white bg-opacity-70 px-3 py-1 rounded-full">
                    الشهر {month.number}
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </button>
            ))}
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            معلومات مفيدة
          </h3>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span><strong>اختيار الشهر:</strong> انقر على أي شهر لعرض التفاصيل اليومية</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span><strong>المدخلات اليومية:</strong> يمكنك إضافة وتعديل المبالغ اليومية</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span><strong>الإحصائيات:</strong> عرض ملخص شهري مفصل للمبالغ والمتبقي</span>
            </div>
            {isAdmin && (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span><strong>للمدير:</strong> يمكنك الوصول للوحة التحكم وإدارة المستخدمين</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span><strong>الملخص الشامل:</strong> عرض إحصائيات جميع المستخدمين</span>
                </div>
              </>
            )}
            {isAccessingUser && (
              <div className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span><strong>وضع المدير:</strong> تعرض حالياً بيانات مستخدم آخر</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
