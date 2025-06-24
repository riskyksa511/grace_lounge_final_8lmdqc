import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// دالة للحصول على ملف المستخدم مع التحقق من صلاحيات المدير
async function getCurrentUserProfile(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile) {
    throw new Error("ملف المستخدم غير موجود");
  }

  return { 
    userId,
    profile,
    isAdmin: profile.isAdmin || false
  };
}

// الحصول على ملخص المستخدم الشهري
export const getUserMonthlySummary = query({
  args: {
    year: v.number(),
    month: v.number(),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    // تحديد المستخدم المستهدف
    let targetUserId = args.targetUserId;
    if (!targetUserId) {
      targetUserId = userId;
    }
    
    // التحقق من الصلاحيات - المدير يمكنه الوصول لأي مستخدم
    if (targetUserId !== userId && !isAdmin) {
      throw new Error("ليس لديك صلاحية لعرض هذه البيانات");
    }

    const yearMonth = `${args.year}-${args.month.toString().padStart(2, '0')}`;
    
    // الحصول على جميع المدخلات للمستخدم في الشهر المحدد
    const entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();

    const monthEntries = entries.filter(entry => entry.date.startsWith(yearMonth));

    // حساب الإجماليات
    const summary = monthEntries.reduce((acc, entry) => ({
      totalCash: acc.totalCash + (entry.cashAmount || 0),
      totalNetwork: acc.totalNetwork + (entry.networkAmount || 0),
      totalAmount: acc.totalAmount + ((entry.cashAmount || 0) + (entry.networkAmount || 0)),
      totalPurchases: acc.totalPurchases + (entry.purchasesAmount || 0),
      totalAdvances: acc.totalAdvances + (entry.advanceAmount || 0),
      totalRemaining: acc.totalRemaining + (entry.remaining || 0),
      activeDays: acc.activeDays,
    }), {
      totalCash: 0,
      totalNetwork: 0,
      totalAmount: 0,
      totalPurchases: 0,
      totalAdvances: 0,
      totalRemaining: 0,
      activeDays: new Set(monthEntries.map(e => e.date)).size,
    });

    // الحصول على ملف المستخدم المستهدف للحصول على الخصميات
    const targetUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", targetUserId))
      .first();

    // الحصول على المشتريات الشهرية
    const monthlyPurchases = await ctx.db
      .query("monthlyPurchases")
      .withIndex("by_user_and_month", (q) => q.eq("userId", targetUserId).eq("yearMonth", yearMonth))
      .first();

    const deductions = targetUserProfile?.deductions || 0;
    const monthlyPurchasesAmount = monthlyPurchases?.totalPurchases || 0;

    return {
      ...summary,
      deductions,
      monthlyPurchases: monthlyPurchasesAmount,
      // المتبقي = إجمالي المبالغ - المشتريات اليومية فقط
      totalRemaining: summary.totalAmount - summary.totalPurchases,
      daysInMonth: new Date(args.year, args.month, 0).getDate(),
      averageDailyAmount: summary.activeDays > 0 ? Math.round(summary.totalAmount / summary.activeDays) : 0,
    };
  },
});

// الحصول على ملخص المستخدم السنوي
export const getUserYearlySummary = query({
  args: {
    year: v.number(),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    // تحديد المستخدم المستهدف
    let targetUserId = args.targetUserId;
    if (!targetUserId) {
      targetUserId = userId;
    }
    
    // التحقق من الصلاحيات - المدير يمكنه الوصول لأي مستخدم
    if (targetUserId !== userId && !isAdmin) {
      throw new Error("ليس لديك صلاحية لعرض هذه البيانات");
    }

    // الحصول على جميع المدخلات للمستخدم في السنة المحددة
    const entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();

    const yearEntries = entries.filter(entry => entry.date.startsWith(args.year.toString()));

    // تجميع البيانات حسب الشهر
    const monthlyData = new Map();
    
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${args.year}-${month.toString().padStart(2, '0')}`;
      const monthEntries = yearEntries.filter(entry => entry.date.startsWith(monthKey));
      
      const monthSummary = monthEntries.reduce((acc, entry) => ({
        totalCash: acc.totalCash + (entry.cashAmount || 0),
        totalNetwork: acc.totalNetwork + (entry.networkAmount || 0),
        totalAmount: acc.totalAmount + ((entry.cashAmount || 0) + (entry.networkAmount || 0)),
        totalPurchases: acc.totalPurchases + (entry.purchasesAmount || 0),
        totalAdvances: acc.totalAdvances + (entry.advanceAmount || 0),
        totalRemaining: acc.totalRemaining + (entry.remaining || 0),
        activeDays: new Set(monthEntries.map(e => e.date)).size,
      }), {
        totalCash: 0,
        totalNetwork: 0,
        totalAmount: 0,
        totalPurchases: 0,
        totalAdvances: 0,
        totalRemaining: 0,
        activeDays: 0,
      });

      // تصحيح حساب المتبقي للشهر = إجمالي المبالغ - المشتريات
      monthSummary.totalRemaining = monthSummary.totalAmount - monthSummary.totalPurchases;

      monthlyData.set(month, {
        month,
        monthName: new Date(args.year, month - 1).toLocaleDateString('ar-SA', { month: 'long' }),
        ...monthSummary,
        daysInMonth: new Date(args.year, month, 0).getDate(),
      });
    }

    // حساب الإجماليات السنوية
    const yearlyTotals = Array.from(monthlyData.values()).reduce((acc, month) => ({
      totalCash: acc.totalCash + month.totalCash,
      totalNetwork: acc.totalNetwork + month.totalNetwork,
      totalAmount: acc.totalAmount + month.totalAmount,
      totalPurchases: acc.totalPurchases + month.totalPurchases,
      totalAdvances: acc.totalAdvances + month.totalAdvances,
      totalRemaining: acc.totalRemaining + month.totalRemaining,
      activeDays: acc.activeDays + month.activeDays,
    }), {
      totalCash: 0,
      totalNetwork: 0,
      totalAmount: 0,
      totalPurchases: 0,
      totalAdvances: 0,
      totalRemaining: 0,
      activeDays: 0,
    });

    // الحصول على ملف المستخدم المستهدف للحصول على الخصميات
    const targetUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", targetUserId))
      .first();

    const deductions = targetUserProfile?.deductions || 0;

    return {
      monthlyData: Array.from(monthlyData.values()),
      yearlyTotals: {
        ...yearlyTotals,
        deductions: deductions * 12, // الخصميات السنوية
        // المتبقي السنوي = إجمالي المبالغ - المشتريات فقط
        totalRemaining: yearlyTotals.totalAmount - yearlyTotals.totalPurchases,
        averageMonthlyAmount: yearlyTotals.totalAmount > 0 ? Math.round(yearlyTotals.totalAmount / 12) : 0,
        averageDailyAmount: yearlyTotals.activeDays > 0 ? Math.round(yearlyTotals.totalAmount / yearlyTotals.activeDays) : 0,
      },
    };
  },
});
