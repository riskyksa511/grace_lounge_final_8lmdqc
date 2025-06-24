import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// دالة للحصول على ملف المستخدم
async function getUserProfile(ctx: any) {
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

  return { userId, profile };
}

// إنشاء رابط رفع للصور
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getUserProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// الحصول على رابط الصورة
export const getImageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// حذف صورة من المدخل
export const removeImageFromEntry = mutation({
  args: {
    entryId: v.id("dailyEntries"),
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);
    
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("المدخل غير موجود");
    }
    
    // التحقق من الصلاحيات
    if (entry.userId !== userId && !profile.isAdmin) {
      throw new Error("ليس لديك صلاحية لتعديل هذا المدخل");
    }
    
    // إزالة الصورة من قائمة الصور
    const updatedImages = (entry.images || []).filter(id => id !== args.imageId);
    
    await ctx.db.patch(args.entryId, {
      images: updatedImages,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// إضافة صورة للمدخل
export const addImageToEntry = mutation({
  args: {
    entryId: v.id("dailyEntries"),
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);
    
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("المدخل غير موجود");
    }
    
    // التحقق من الصلاحيات
    if (entry.userId !== userId && !profile.isAdmin) {
      throw new Error("ليس لديك صلاحية لتعديل هذا المدخل");
    }
    
    // إضافة الصورة لقائمة الصور
    const currentImages = entry.images || [];
    const updatedImages = [...currentImages, args.imageId];
    
    await ctx.db.patch(args.entryId, {
      images: updatedImages,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});
