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

// الحصول على ملف المستخدم
export const getUserProfile = query({
  args: {
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // تحديد المستخدم المستهدف
    let targetUserId = args.targetUserId;
    if (!targetUserId) {
      targetUserId = userId;
    }

    // الحصول على ملف المستخدم الحالي للتحقق من الصلاحيات
    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .first();

    const isAdmin = currentProfile?.isAdmin || false;
    
    // التحقق من الصلاحيات - المدير يمكنه الوصول لأي مستخدم
    if (targetUserId !== userId && !isAdmin) {
      throw new Error("ليس لديك صلاحية لعرض هذه البيانات");
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", targetUserId))
      .first();

    return targetProfile;
  },
});

// إنشاء أو تحديث ملف المستخدم
export const upsertUserProfile = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    deductions: v.optional(v.number()),
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("يجب تسجيل الدخول أولاً");
    }

    // التحقق من صحة كلمة المرور
    if (args.password.length < 4) {
      throw new Error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
    }

    // التحقق من عدم تكرار اسم المستخدم
    const existingUsername = await ctx.db
      .query("userProfiles")
      .withIndex("by_username", (q) => q.eq("username", args.username.trim()))
      .first();

    if (existingUsername && existingUsername.userId !== userId) {
      throw new Error("اسم المستخدم مستخدم بالفعل");
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    const profileData = {
      userId,
      username: args.username.trim(),
      deductions: args.deductions || 0,
      isAdmin: args.isAdmin || false,
      // حفظ كلمة المرور للمدير (مؤقتاً)
      currentPassword: args.password,
      tempPassword: args.password, // للتوافق مع النظام القديم
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        ...profileData,
        updatedAt: Date.now(),
      });
      return existingProfile._id;
    } else {
      return await ctx.db.insert("userProfiles", {
        ...profileData,
        createdAt: Date.now(),
      });
    }
  },
});

// تحديث الخصومات
export const updateDeductions = mutation({
  args: {
    targetUserId: v.id("users"),
    deductions: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    // المدير فقط يمكنه تحديث الخصومات
    if (!isAdmin) {
      throw new Error("ليس لديك صلاحية لتحديث الخصومات");
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetProfile) {
      throw new Error("ملف المستخدم المستهدف غير موجود");
    }

    await ctx.db.patch(targetProfile._id, {
      deductions: args.deductions,
    });
  },
});

// الحصول على جميع المستخدمين (للمدير فقط)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    if (!isAdmin) {
      throw new Error("ليس لديك صلاحية لعرض جميع المستخدمين");
    }

    return await ctx.db.query("userProfiles").collect();
  },
});

// التحقق من صحة كلمة المرور
export const verifyPassword = query({
  args: {
    password: v.string(),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    // تحديد المستخدم المستهدف
    let targetUserId = args.targetUserId;
    if (!targetUserId) {
      targetUserId = userId;
    }
    
    // التحقق من الصلاحيات - المدير يمكنه التحقق من أي كلمة مرور
    if (targetUserId !== userId && !isAdmin) {
      throw new Error("ليس لديك صلاحية للتحقق من كلمة المرور");
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", targetUserId))
      .first();

    if (!targetProfile) {
      return false;
    }

    // التحقق من كلمة المرور الحالية أولاً
    if (targetProfile.currentPassword) {
      return targetProfile.currentPassword === args.password;
    }

    // التحقق من كلمة المرور المؤقتة (للتوافق مع النظام القديم)
    if (targetProfile.tempPassword) {
      return targetProfile.tempPassword === args.password;
    }

    // التحقق من الرقم السري القديم (للتوافق مع النظام القديم)
    if (targetProfile.pin) {
      return targetProfile.pin === args.password;
    }

    return false;
  },
});

// تحديث كلمة المرور
export const updatePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId, profile, isAdmin } = await getCurrentUserProfile(ctx);
    
    // تحديد المستخدم المستهدف
    let targetUserId = args.targetUserId;
    if (!targetUserId) {
      targetUserId = userId;
    }
    
    // التحقق من الصلاحيات - المدير يمكنه تغيير أي كلمة مرور
    if (targetUserId !== userId && !isAdmin) {
      throw new Error("ليس لديك صلاحية لتغيير كلمة المرور");
    }

    // التحقق من صحة كلمة المرور الجديدة
    if (args.newPassword.length < 4) {
      throw new Error("كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل");
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", targetUserId))
      .first();

    if (!targetProfile) {
      throw new Error("ملف المستخدم المستهدف غير موجود");
    }

    // التحقق من كلمة المرور الحالية (إلا إذا كان المدير يغير لمستخدم آخر)
    if (targetUserId === userId) {
      const currentPasswordValid = 
        targetProfile.currentPassword === args.currentPassword ||
        targetProfile.tempPassword === args.currentPassword ||
        targetProfile.pin === args.currentPassword;

      if (!currentPasswordValid) {
        throw new Error("كلمة المرور الحالية غير صحيحة");
      }
    }

    // تحديث كلمة المرور
    await ctx.db.patch(targetProfile._id, {
      currentPassword: args.newPassword,
      tempPassword: args.newPassword, // للتوافق مع النظام القديم
      updatedAt: Date.now(),
    });

    return { success: true, message: "تم تغيير كلمة المرور بنجاح" };
  },
});
