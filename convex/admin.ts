import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// دالة للتحقق من صلاحيات المدير
async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile?.isAdmin) {
    throw new Error("ليس لديك صلاحية الوصول لهذه الوظيفة");
  }

  return { userId, profile };
}

// الحصول على جميع المستخدمين
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const profiles = await ctx.db.query("userProfiles").collect();
    
    const profilesWithUserData = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          user: user ? {
            email: user.email,
            name: user.name,
          } : null,
        };
      })
    );

    return profilesWithUserData.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// تحديث خصميات المستخدم
export const updateUserDeductions = mutation({
  args: {
    userId: v.id("users"),
    deductions: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      throw new Error("المستخدم غير موجود");
    }

    await ctx.db.patch(profile._id, {
      deductions: Math.max(0, args.deductions),
    });

    return { success: true };
  },
});

// تحديث اسم المستخدم (من قبل المدير)
export const updateUsername = mutation({
  args: {
    userId: v.id("users"),
    newUsername: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      throw new Error("المستخدم غير موجود");
    }

    // التحقق من عدم تكرار اسم المستخدم
    const existingUsername = await ctx.db
      .query("userProfiles")
      .withIndex("by_username", (q) => q.eq("username", args.newUsername.trim()))
      .first();

    if (existingUsername && existingUsername._id !== profile._id) {
      throw new Error("اسم المستخدم مستخدم بالفعل");
    }

    await ctx.db.patch(profile._id, {
      username: args.newUsername.trim(),
    });

    return { success: true };
  },
});

// الحصول على كلمة المرور الحالية (وظيفة داخلية)
export const getUserCurrentPassword = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // البحث عن ملف المستخدم للحصول على كلمة المرور المحفوظة
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      return null;
    }

    // إرجاع كلمة المرور المحفوظة إذا كانت موجودة
    if (profile.currentPassword) {
      return profile.currentPassword;
    }

    // إرجاع كلمة المرور المؤقتة إذا كانت موجودة
    if (profile.tempPassword) {
      return profile.tempPassword;
    }

    // إذا لم تكن هناك كلمة مرور محفوظة، إرجاع رسالة
    return "غير محفوظة - يرجى تغيير كلمة المرور";
  },
});

// تحديث كلمة المرور المشفرة (وظيفة داخلية)
export const updateUserPasswordHash = internalMutation({
  args: {
    userId: v.id("users"),
    hashedPassword: v.string(),
    plainPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      throw new Error("المستخدم غير موجود");
    }

    // البحث عن حساب المستخدم في جدول المصادقة
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("حساب المستخدم غير موجود في نظام المصادقة");
    }

    // البحث عن جميع حسابات المصادقة للمستخدم
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();

    let passwordAccountFound = false;
    for (const account of authAccounts) {
      if (account.provider === "password") {
        await ctx.db.patch(account._id, {
          secret: args.hashedPassword,
          emailVerified: new Date().toISOString(),
        });
        passwordAccountFound = true;
      }
    }

    if (!passwordAccountFound) {
      throw new Error("لم يتم العثور على حساب كلمة المرور للمستخدم");
    }

    // التأكد من أن المستخدم مُفعل في جدول users أيضاً
    await ctx.db.patch(args.userId, {
      emailVerificationTime: Date.now(),
    });

    // حفظ كلمة المرور الفعلية في ملف المستخدم للمدير
    await ctx.db.patch(profile._id, {
      currentPassword: args.plainPassword, // حفظ كلمة المرور الفعلية
      tempPassword: args.plainPassword, // الاحتفاظ بالحقل القديم للتوافق
    });

    console.log(`Password updated successfully for user ${args.userId}`);

    return { success: true, message: "تم تغيير كلمة المرور بنجاح" };
  },
});

// حذف مستخدم
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx);

    if (args.userId === adminId) {
      throw new Error("لا يمكن حذف حسابك الخاص");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      throw new Error("المستخدم غير موجود");
    }

    if (profile.isAdmin) {
      throw new Error("لا يمكن حذف حساب مدير");
    }

    // حذف جميع البيانات المرتبطة بالمستخدم
    const dailyEntries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const entry of dailyEntries) {
      await ctx.db.delete(entry._id);
    }

    const monthlyAdvances = await ctx.db
      .query("monthlyAdvances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const advance of monthlyAdvances) {
      await ctx.db.delete(advance._id);
    }

    // حذف حسابات المصادقة
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();

    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    // حذف الملف الشخصي
    await ctx.db.delete(profile._id);

    // حذف المستخدم من جدول المصادقة مع معالجة الأخطاء
    try {
      const user = await ctx.db.get(args.userId);
      if (user) {
        await ctx.db.delete(args.userId);
      }
    } catch (error) {
      // تجاهل الخطأ إذا كان المستخدم غير موجود
      console.log(`User ${args.userId} already deleted or doesn't exist`);
    }

    return { success: true };
  },
});

// تصفير البيانات فقط (الاحتفاظ بالمستخدمين)
export const resetDataOnly = mutation({
  args: {
    confirmationText: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.confirmationText !== "تصفير البيانات") {
      throw new Error("نص التأكيد غير صحيح");
    }

    // حذف جميع المدخلات اليومية
    const dailyEntries = await ctx.db.query("dailyEntries").collect();
    for (const entry of dailyEntries) {
      await ctx.db.delete(entry._id);
    }

    // حذف جميع السلفيات الشهرية
    const monthlyAdvances = await ctx.db.query("monthlyAdvances").collect();
    for (const advance of monthlyAdvances) {
      await ctx.db.delete(advance._id);
    }

    return { 
      success: true, 
      message: "تم تصفير جميع البيانات المالية بنجاح مع الاحتفاظ بالمستخدمين" 
    };
  },
});

// تصفير كامل للنظام
export const completeSystemReset = mutation({
  args: {
    confirmationText: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx);

    if (args.confirmationText !== "تصفير كامل") {
      throw new Error("نص التأكيد غير صحيح");
    }

    // حذف جميع المدخلات اليومية
    const dailyEntries = await ctx.db.query("dailyEntries").collect();
    for (const entry of dailyEntries) {
      await ctx.db.delete(entry._id);
    }

    // حذف جميع السلفيات الشهرية
    const monthlyAdvances = await ctx.db.query("monthlyAdvances").collect();
    for (const advance of monthlyAdvances) {
      await ctx.db.delete(advance._id);
    }

    // حذف جميع المستخدمين عدا المدير الحالي
    const allProfiles = await ctx.db.query("userProfiles").collect();
    for (const profile of allProfiles) {
      if (profile.userId !== adminId) {
        // حذف حسابات المصادقة أولاً
        const authAccounts = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) => q.eq("userId", profile.userId))
          .collect();

        for (const account of authAccounts) {
          await ctx.db.delete(account._id);
        }

        // حذف الملف الشخصي
        await ctx.db.delete(profile._id);
        
        // محاولة حذف المستخدم من جدول المصادقة مع معالجة الأخطاء
        try {
          const user = await ctx.db.get(profile.userId);
          if (user) {
            await ctx.db.delete(profile.userId);
          }
        } catch (error) {
          // تجاهل الخطأ إذا كان المستخدم غير موجود
          console.log(`User ${profile.userId} already deleted or doesn't exist`);
        }
      }
    }

    return { 
      success: true, 
      message: "تم تصفير النظام بالكامل بنجاح" 
    };
  },
});

// الحصول على الملخص الشامل الشهري
export const getComprehensiveMonthlySummary = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const yearMonth = `${args.year}-${args.month.toString().padStart(2, '0')}`;
    
    // الحصول على جميع المدخلات للشهر
    const allEntries = await ctx.db.query("dailyEntries").collect();
    const monthEntries = allEntries.filter(entry => entry.date.startsWith(yearMonth));

    if (monthEntries.length === 0) {
      return {
        dailySummary: [],
        totals: {
          totalGross: 0,
          totalCash: 0,
          totalNetwork: 0,
          totalPurchases: 0,
          totalAdvances: 0,
          totalNet: 0,
          activeDays: 0,
          activeUsers: 0,
          averageDailyAmount: 0,
          daysInMonth: new Date(args.year, args.month, 0).getDate(),
        }
      };
    }

    // تجميع البيانات حسب التاريخ
    const dailyData = new Map();
    
    monthEntries.forEach(entry => {
      const date = entry.date;
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          totalCash: 0,
          totalNetwork: 0,
          totalAmount: 0,
          totalPurchases: 0,
          totalAdvances: 0,
          totalRemaining: 0,
          entriesCount: 0,
        });
      }
      
      const dayData = dailyData.get(date);
      dayData.totalCash += entry.cashAmount || 0;
      dayData.totalNetwork += entry.networkAmount || 0;
      dayData.totalAmount += (entry.cashAmount || 0) + (entry.networkAmount || 0);
      dayData.totalPurchases += entry.purchasesAmount || 0;
      dayData.totalAdvances += entry.advanceAmount || 0;
      dayData.totalRemaining += entry.remaining || 0;
      dayData.entriesCount += 1;
    });

    const dailySummary = Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));

    // حساب الإجماليات
    const totals = dailySummary.reduce((acc, day) => ({
      totalGross: acc.totalGross + day.totalAmount,
      totalCash: acc.totalCash + day.totalCash,
      totalNetwork: acc.totalNetwork + day.totalNetwork,
      totalPurchases: acc.totalPurchases + day.totalPurchases,
      totalAdvances: acc.totalAdvances + day.totalAdvances,
      totalNet: acc.totalNet + day.totalRemaining,
      activeDays: acc.activeDays + 1,
      activeUsers: acc.activeUsers,
      averageDailyAmount: 0,
      daysInMonth: new Date(args.year, args.month, 0).getDate(),
    }), {
      totalGross: 0,
      totalCash: 0,
      totalNetwork: 0,
      totalPurchases: 0,
      totalAdvances: 0,
      totalNet: 0,
      activeDays: 0,
      activeUsers: new Set(monthEntries.map(e => e.userId)).size,
      averageDailyAmount: 0,
      daysInMonth: new Date(args.year, args.month, 0).getDate(),
    });

    totals.averageDailyAmount = totals.activeDays > 0 ? Math.round(totals.totalGross / totals.activeDays) : 0;

    return {
      dailySummary,
      totals,
    };
  },
});

// الحصول على ملخص المستخدمين الشهري
export const getUsersMonthlySummary = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const yearMonth = `${args.year}-${args.month.toString().padStart(2, '0')}`;
    
    // الحصول على جميع المدخلات للشهر
    const allEntries = await ctx.db.query("dailyEntries").collect();
    const monthEntries = allEntries.filter(entry => entry.date.startsWith(yearMonth));

    // الحصول على جميع المستخدمين
    const allProfiles = await ctx.db.query("userProfiles").collect();

    // تجميع البيانات حسب المستخدم
    const userSummaries = allProfiles.map(profile => {
      const userEntries = monthEntries.filter(entry => entry.userId === profile.userId);
      
      const summary = userEntries.reduce((acc, entry) => ({
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
        activeDays: new Set(userEntries.map(e => e.date)).size,
      });

      return {
        userId: profile.userId,
        username: profile.username,
        isAdmin: profile.isAdmin,
        deductions: profile.deductions || 0,
        ...summary,
        totalRemaining: summary.totalRemaining - (profile.deductions || 0),
      };
    });

    return userSummaries.sort((a, b) => b.totalAmount - a.totalAmount);
  },
});
