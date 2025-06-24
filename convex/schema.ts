import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // ملفات المستخدمين
  userProfiles: defineTable({
    userId: v.id("users"),
    username: v.string(),
    isAdmin: v.boolean(),
    deductions: v.optional(v.number()), // الخصميات الثابتة
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    // حقول قديمة مؤقتة للتنظيف والتوافق
    pin: v.optional(v.string()),
    tempPassword: v.optional(v.string()),
    // حقل جديد لحفظ كلمة المرور الفعلية
    currentPassword: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_username", ["username"])
    .index("by_is_admin", ["isAdmin"]),

  // المدخلات اليومية
  dailyEntries: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    cashAmount: v.optional(v.number()),
    networkAmount: v.optional(v.number()),
    purchasesAmount: v.optional(v.number()),
    advanceAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    images: v.optional(v.array(v.id("_storage"))), // معرفات الصور المرفقة
    total: v.number(), // cashAmount + networkAmount
    remaining: v.number(), // total - purchasesAmount
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_date", ["date"]),

  // السلفيات الشهرية التراكمية (إجمالي السلفيات للشهر كاملاً)
  monthlyAdvances: defineTable({
    userId: v.id("users"),
    yearMonth: v.string(), // YYYY-MM
    totalAdvances: v.number(), // إجمالي السلفيات للشهر
    updatedAt: v.number(),
  })
    .index("by_user_and_month", ["userId", "yearMonth"])
    .index("by_user", ["userId"]),

  // المشتريات الشهرية التراكمية (جديد)
  monthlyPurchases: defineTable({
    userId: v.id("users"),
    yearMonth: v.string(), // YYYY-MM
    totalPurchases: v.number(),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_and_month", ["userId", "yearMonth"])
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
