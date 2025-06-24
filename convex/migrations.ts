import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// تنظيف البيانات القديمة (حقول PIN)
export const cleanupOldPinData = mutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    let cleanedCount = 0;

    for (const profile of profiles) {
      if (profile.pin !== undefined) {
        await ctx.db.patch(profile._id, {
          pin: undefined,
        });
        cleanedCount++;
      }
    }

    return {
      success: true,
      message: `تم تنظيف ${cleanedCount} ملف شخصي من حقول PIN القديمة`,
    };
  },
});

// حفظ كلمات المرور الحالية للمستخدمين الموجودين
export const saveCurrentPasswords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    let updatedCount = 0;

    for (const profile of profiles) {
      // إذا كان لديه tempPassword ولكن ليس لديه currentPassword
      if (profile.tempPassword && !profile.currentPassword) {
        await ctx.db.patch(profile._id, {
          currentPassword: profile.tempPassword,
        });
        updatedCount++;
      }
      // إذا لم يكن لديه أي كلمة مرور محفوظة، نضع كلمة مرور افتراضية
      else if (!profile.currentPassword && !profile.tempPassword) {
        const defaultPassword = `user${profile.username}123`;
        await ctx.db.patch(profile._id, {
          currentPassword: defaultPassword,
          tempPassword: defaultPassword,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      message: `تم تحديث كلمات المرور لـ ${updatedCount} مستخدم`,
    };
  },
});

// دالة للمدير لحفظ كلمات المرور الحالية
export const adminSaveCurrentPasswords = mutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    let updatedCount = 0;

    for (const profile of profiles) {
      if (profile.tempPassword && !profile.currentPassword) {
        await ctx.db.patch(profile._id, {
          currentPassword: profile.tempPassword,
        });
        updatedCount++;
      }
      else if (!profile.currentPassword && !profile.tempPassword) {
        const defaultPassword = `user${profile.username}123`;
        await ctx.db.patch(profile._id, {
          currentPassword: defaultPassword,
          tempPassword: defaultPassword,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      message: `تم تحديث كلمات المرور لـ ${updatedCount} مستخدم`,
    };
  },
});
