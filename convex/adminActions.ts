"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import bcrypt from "bcryptjs";
import { api, internal } from "./_generated/api";

// دالة للتحقق من صلاحيات المدير
async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  const profile = await ctx.runQuery(api.userProfiles.getUserProfile, {
    targetUserId: userId,
  });

  if (!profile?.isAdmin) {
    throw new Error("ليس لديك صلاحية الوصول لهذه الوظيفة");
  }

  return { userId, profile };
}

// الحصول على كلمة المرور الحالية (للمدير فقط)
export const getCurrentPassword = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ currentPassword: string | null }> => {
    await requireAdmin(ctx);
    
    const result = await ctx.runQuery(internal.admin.getUserCurrentPassword, {
      userId: args.userId,
    });

    return { currentPassword: result };
  },
});

// تغيير كلمة المرور (للمدير فقط)
export const changeUserPassword = action({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    await requireAdmin(ctx);
    
    if (args.newPassword.length < 6) {
      throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword: string = await bcrypt.hash(args.newPassword, 10);

    // استدعاء mutation لتحديث كلمة المرور
    const result: { success: boolean; message: string } = await ctx.runMutation(internal.admin.updateUserPasswordHash, {
      userId: args.userId,
      hashedPassword: hashedPassword,
      plainPassword: args.newPassword,
    });

    return result;
  },
});

// اختبار كلمة المرور الجديدة (للمدير فقط)
export const testUserPassword = action({
  args: {
    userId: v.id("users"),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    await requireAdmin(ctx);
    
    // الحصول على بيانات المستخدم
    const user = await ctx.runQuery(internal.admin.getUserCurrentPassword, {
      userId: args.userId,
    });

    if (!user) {
      return { success: false, message: "المستخدم غير موجود" };
    }

    // مقارنة كلمة المرور
    const isMatch = user === args.password;
    
    return { 
      success: isMatch, 
      message: isMatch ? "كلمة المرور صحيحة" : "كلمة المرور غير صحيحة" 
    };
  },
});
