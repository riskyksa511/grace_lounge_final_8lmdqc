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

// الحصول على المدخلات اليومية
export const getDailyEntries = query({
  args: {
    targetUserId: v.optional(v.id("users")),
    year: v.optional(v.number()),
    month: v.optional(v.number()),
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

    let entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();

    // تصفية حسب السنة والشهر إذا تم تحديدهما
    if (args.year && args.month) {
      const yearMonth = `${args.year}-${args.month.toString().padStart(2, '0')}`;
      entries = entries.filter(entry => entry.date.startsWith(yearMonth));
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
});

// إضافة أو تحديث مدخل يومي
export const upsertDailyEntry = mutation({
  args: {
    targetUserId: v.optional(v.id("users")),
    date: v.string(),
    cashAmount: v.number(),
    networkAmount: v.number(),
    purchasesAmount: v.optional(v.number()),
    advanceAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    images: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    // تحديد المستخدم المستهدف
    let targetUserId = args.targetUserId;
    if (!targetUserId) {
      targetUserId = userId;
    }
    
    // التحقق من الصلاحيات - المدير يمكنه التعديل لأي مستخدم
    if (targetUserId !== userId && !isAdmin) {
      throw new Error("ليس لديك صلاحية لتعديل هذه البيانات");
    }

    const total = args.cashAmount + args.networkAmount;
    const remaining = total - (args.purchasesAmount || 0);

    // البحث عن مدخل موجود
    const existingEntry = await ctx.db
      .query("dailyEntries")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", targetUserId).eq("date", args.date)
      )
      .first();

    const entryData = {
      userId: targetUserId,
      date: args.date,
      cashAmount: args.cashAmount,
      networkAmount: args.networkAmount,
      purchasesAmount: args.purchasesAmount || 0,
      advanceAmount: args.advanceAmount || 0,
      total,
      remaining,
      notes: args.notes,
      images: args.images,
      updatedAt: Date.now(),
    };

    if (existingEntry) {
      // تحديث المدخل الموجود
      await ctx.db.patch(existingEntry._id, entryData);
      return existingEntry._id;
    } else {
      // إنشاء مدخل جديد
      return await ctx.db.insert("dailyEntries", {
        ...entryData,
        createdAt: Date.now(),
      });
    }
  },
});

// حذف مدخل يومي
export const deleteDailyEntry = mutation({
  args: {
    entryId: v.id("dailyEntries"),
  },
  handler: async (ctx, args) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("المدخل غير موجود");
    }

    // التحقق من الصلاحيات - المدير يمكنه الحذف لأي مستخدم
    if (entry.userId !== userId && !isAdmin) {
      throw new Error("ليس لديك صلاحية لحذف هذا المدخل");
    }

    await ctx.db.delete(args.entryId);
  },
});

// الحصول على السلفيات الشهرية
export const getMonthlyAdvances = query({
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

    const monthlyAdvance = await ctx.db
      .query("monthlyAdvances")
      .withIndex("by_user_and_month", (q) => 
        q.eq("userId", targetUserId).eq("yearMonth", args.yearMonth)
      )
      .first();

    return monthlyAdvance?.totalAdvances || 0;
  },
});

// تحديث السلفيات الشهرية
export const updateMonthlyAdvances = mutation({
  args: {
    targetUserId: v.optional(v.id("users")),
    yearMonth: v.string(),
    totalAdvances: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    // تحديد المستخدم المستهدف
    let targetUserId = args.targetUserId;
    if (!targetUserId) {
      targetUserId = userId;
    }
    
    // التحقق من الصلاحيات - المدير فقط يمكنه تحديث السلفيات
    if (!isAdmin) {
      throw new Error("ليس لديك صلاحية لتحديث السلفيات الشهرية");
    }

    const existingAdvance = await ctx.db
      .query("monthlyAdvances")
      .withIndex("by_user_and_month", (q) => 
        q.eq("userId", targetUserId).eq("yearMonth", args.yearMonth)
      )
      .first();

    if (existingAdvance) {
      await ctx.db.patch(existingAdvance._id, {
        totalAdvances: args.totalAdvances,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("monthlyAdvances", {
        userId: targetUserId,
        yearMonth: args.yearMonth,
        totalAdvances: args.totalAdvances,
        updatedAt: Date.now(),
      });
    }
  },
});
