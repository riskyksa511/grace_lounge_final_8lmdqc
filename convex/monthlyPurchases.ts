import { query, mutation } from "./_generated/server";
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

// الحصول على المشتريات الشهرية
export const getMonthlyPurchases = query({
  args: {
    targetUserId: v.optional(v.id("users")),
    yearMonth: v.string(),
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

    const monthlyPurchases = await ctx.db
      .query("monthlyPurchases")
      .withIndex("by_user_and_month", (q) => 
        q.eq("userId", targetUserId).eq("yearMonth", args.yearMonth)
      )
      .first();

    return monthlyPurchases || { totalPurchases: 0, notes: "" };
  },
});

// تحديث المشتريات الشهرية
export const updateMonthlyPurchases = mutation({
  args: {
    targetUserId: v.optional(v.id("users")),
    yearMonth: v.string(),
    totalPurchases: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    // تحديد المستخدم المستهدف
    let targetUserId = args.targetUserId;
    if (!targetUserId) {
      targetUserId = userId;
    }
    
    // التحقق من الصلاحيات - المدير فقط يمكنه تحديث المشتريات
    if (!isAdmin) {
      throw new Error("ليس لديك صلاحية لتحديث المشتريات الشهرية");
    }

    const existingPurchases = await ctx.db
      .query("monthlyPurchases")
      .withIndex("by_user_and_month", (q) => 
        q.eq("userId", targetUserId).eq("yearMonth", args.yearMonth)
      )
      .first();

    if (existingPurchases) {
      await ctx.db.patch(existingPurchases._id, {
        totalPurchases: args.totalPurchases,
        notes: args.notes,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("monthlyPurchases", {
        userId: targetUserId,
        yearMonth: args.yearMonth,
        totalPurchases: args.totalPurchases,
        notes: args.notes,
        updatedAt: Date.now(),
      });
    }
  },
});

// الحصول على جميع المشتريات الشهرية للمستخدم
export const getAllMonthlyPurchases = query({
  args: {
    targetUserId: v.optional(v.id("users")),
    year: v.optional(v.number()),
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

    let purchases = await ctx.db
      .query("monthlyPurchases")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();

    // تصفية حسب السنة إذا تم تحديدها
    if (args.year) {
      purchases = purchases.filter(purchase => 
        purchase.yearMonth.startsWith(args.year!.toString())
      );
    }

    return purchases.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  },
});
