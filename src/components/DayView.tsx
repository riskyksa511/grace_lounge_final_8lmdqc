import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { UserSummaryBar } from "./UserSummaryBar";

interface DayViewProps {
  date: string;
  onBack: () => void;
  userId: Id<"users">;
  isAdmin: boolean;
}

export function DayView({ date, onBack, userId, isAdmin }: DayViewProps) {
  const entries = useQuery(api.dailyEntries.getDailyEntries, { targetUserId: userId });
  const entry = entries?.find((e: any) => e.date === date);
  const userProfile = useQuery(api.userProfiles.getUserProfile, { targetUserId: userId });
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    cashAmount: '',
    networkAmount: '',
    purchasesAmount: '',
    advanceAmount: '',
    notes: ''
  });

  // حالات الصور
  const [uploadedImages, setUploadedImages] = useState<Id<"_storage">[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const upsertEntry = useMutation(api.dailyEntries.upsertDailyEntry);
  const deleteEntry = useMutation(api.dailyEntries.deleteDailyEntry);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const removeImageFromEntry = useMutation(api.images.removeImageFromEntry);

  const handleEdit = () => {
    if (entry) {
      setFormData({
        cashAmount: entry.cashAmount?.toString() || '',
        networkAmount: entry.networkAmount?.toString() || '',
        purchasesAmount: entry.purchasesAmount?.toString() || '',
        advanceAmount: entry.advanceAmount?.toString() || '',
        notes: entry.notes || ''
      });
      setUploadedImages(entry.images || []);
    } else {
      setFormData({
        cashAmount: '',
        networkAmount: '',
        purchasesAmount: '',
        advanceAmount: '',
        notes: ''
      });
      setUploadedImages([]);
    }
    setShowForm(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast.error("يرجى اختيار ملف صورة صالح");
      return;
    }

    // التحقق من حجم الملف (5MB كحد أقصى)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    setUploading(true);
    try {
      // الحصول على رابط الرفع
      const uploadUrl = await generateUploadUrl();
      
      // رفع الصورة
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("فشل في رفع الصورة");
      }

      const { storageId } = await result.json();
      
      // إضافة معرف الصورة للقائمة
      setUploadedImages(prev => [...prev, storageId]);
      toast.success("تم رفع الصورة بنجاح");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // مسح القيمة للسماح برفع نفس الملف مرة أخرى
    event.target.value = '';
  };

  const handleRemoveImage = async (imageId: Id<"_storage">) => {
    if (entry) {
      // إذا كان المدخل موجود، احذف من قاعدة البيانات
      try {
        await removeImageFromEntry({ entryId: entry._id, imageId });
        toast.success("تم حذف الصورة بنجاح");
      } catch (error: any) {
        toast.error(error.message || "حدث خطأ أثناء حذف الصورة");
      }
    } else {
      // إذا كان المدخل جديد، احذف من القائمة المحلية فقط
      setUploadedImages(prev => prev.filter(id => id !== imageId));
      toast.success("تم إزالة الصورة");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cashAmount = Number(formData.cashAmount) || 0;
    const networkAmount = Number(formData.networkAmount) || 0;
    const purchasesAmount = Number(formData.purchasesAmount) || 0;
    const advanceAmount = Number(formData.advanceAmount) || 0;

    if (cashAmount === 0 && networkAmount === 0) {
      toast.error("يجب إدخال مبلغ نقدي أو شبكة على الأقل");
      return;
    }

    try {
      await upsertEntry({
        targetUserId: userId,
        date,
        cashAmount,
        networkAmount,
        purchasesAmount,
        advanceAmount,
        notes: formData.notes.trim() || undefined,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
      });
      
      toast.success(entry ? "تم تحديث المدخل بنجاح" : "تم إضافة المدخل بنجاح");
      setShowForm(false);
      // مسح النموذج بعد الحفظ الناجح
      setFormData({
        cashAmount: '',
        networkAmount: '',
        purchasesAmount: '',
        advanceAmount: '',
        notes: ''
      });
      setUploadedImages([]);
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async () => {
    if (!entry || !confirm("هل أنت متأكد من حذف هذا المدخل؟")) return;
    
    try {
      await deleteEntry({ entryId: entry._id });
      toast.success("تم حذف المدخل بنجاح");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء حذف المدخل");
    }
  };

  if (entries === undefined || userProfile === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex justify-center items-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const netAfterDeductions = (entry?.remaining || 0) - (userProfile?.deductions || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* عرض ملخص المستخدم للمدير فقط */}
        {isAdmin && (
          <div className="mb-8">
            <UserSummaryBar userId={userId} />
          </div>
        )}

        {/* رأس الصفحة المحسن */}
        <div className="bg-white rounded-2xl shadow-xl border border-orange-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <span className="text-lg group-hover:translate-x-1 transition-transform">←</span>
                <span className="font-medium">العودة للشهر</span>
              </button>
              <div className="flex flex-col">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="text-4xl">📅</span>
                  {formattedDate}
                </h1>
                <p className="text-gray-500 mt-1">إدارة المدخلات اليومية</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {entry ? (
                <>
                  {/* للمدير فقط: إمكانية التعديل والحذف */}
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleEdit}
                        className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      >
                        <span className="text-lg group-hover:scale-110 transition-transform">✏️</span>
                        <span className="font-medium">تعديل</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      >
                        <span className="text-lg group-hover:scale-110 transition-transform">🗑️</span>
                        <span className="font-medium">حذف</span>
                      </button>
                    </div>
                  )}
                  {/* للأعضاء: رسالة توضيحية */}
                  {!isAdmin && (
                    <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl border border-gray-300">
                      <span className="text-lg">📝</span>
                      <span className="font-medium">البيانات مسجلة - لا يمكن التعديل</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  الخانات جاهزة للإدخال أدناه ⬇️
                </div>
              )}
            </div>
          </div>
        </div>

        {/* نموذج الإدخال السريع - يظهر عند عدم وجود مدخل */}
        {!entry && (
          <div className="bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden mb-8">
            <div className="px-8 py-6 bg-gradient-to-r from-green-500 to-emerald-500">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">➕</span>
                <span>إضافة مدخل جديد</span>
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              {/* المبالغ الأساسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <label className="block text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                    <span className="text-2xl">💵</span>
                    المبلغ النقدي
                  </label>
                  <input
                    type="number"
                    value={formData.cashAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, cashAmount: e.target.value }))}
                    className="w-full px-4 py-4 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium text-lg"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <label className="block text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                    <span className="text-2xl">💳</span>
                    مبلغ الشبكة
                  </label>
                  <input
                    type="number"
                    value={formData.networkAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, networkAmount: e.target.value }))}
                    className="w-full px-4 py-4 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium text-lg"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                  <label className="block text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                    <span className="text-2xl">🛒</span>
                    المشتريات
                  </label>
                  <input
                    type="number"
                    value={formData.purchasesAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchasesAmount: e.target.value }))}
                    className="w-full px-4 py-4 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium text-lg"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                  <label className="block text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    السلفيات
                  </label>
                  <input
                    type="number"
                    value={formData.advanceAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, advanceAmount: e.target.value }))}
                    className="w-full px-4 py-4 border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium text-lg"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* الملاحظات */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200 mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-2xl">📝</span>
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  rows={3}
                  placeholder="أضف ملاحظات إضافية أو تفاصيل مهمة..."
                />
              </div>

              {/* قسم الصور */}
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-6 border border-pink-200 mb-6">
                <label className="block text-sm font-bold text-pink-700 mb-3 flex items-center gap-2">
                  <span className="text-2xl">📸</span>
                  إضافة صور (اختياري)
                </label>
                
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <span className="text-lg">📷</span>
                    <span>التقاط صورة</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    <span className="text-lg">🖼️</span>
                    <span>اختيار من الألبوم</span>
                  </button>
                </div>

                {/* حقول الرفع المخفية */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {uploading && (
                  <div className="flex items-center gap-2 text-blue-600 mb-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm">جاري رفع الصورة...</span>
                  </div>
                )}

                {/* عرض الصور المرفوعة */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedImages.map((imageId) => (
                      <ImagePreview
                        key={imageId}
                        imageId={imageId}
                        onRemove={() => handleRemoveImage(imageId)}
                        canRemove={true}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* معاينة سريعة للحسابات */}
              {(Number(formData.cashAmount) > 0 || Number(formData.networkAmount) > 0) && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200 mb-6">
                  <h3 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">
                    <span className="text-xl">🧮</span>
                    معاينة الحسابات
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-indigo-600">
                        {((Number(formData.cashAmount) || 0) + (Number(formData.networkAmount) || 0)).toLocaleString()}
                      </div>
                      <div className="text-sm text-indigo-700">إجمالي المبلغ</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-teal-600">
                        {((Number(formData.cashAmount) || 0) + (Number(formData.networkAmount) || 0) - (Number(formData.purchasesAmount) || 0)).toLocaleString()}
                      </div>
                      <div className="text-sm text-teal-700">المتبقي</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        {(((Number(formData.cashAmount) || 0) / ((Number(formData.cashAmount) || 0) + (Number(formData.networkAmount) || 0) || 1)) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-green-700">نسبة النقدي</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {(((Number(formData.networkAmount) || 0) / ((Number(formData.cashAmount) || 0) + (Number(formData.networkAmount) || 0) || 1)) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-blue-700">نسبة الشبكة</div>
                    </div>
                  </div>
                </div>
              )}

              {/* أزرار الإجراءات */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-bold text-lg"
                >
                  <span className="text-2xl">✅</span>
                  حفظ المدخل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      cashAmount: '',
                      networkAmount: '',
                      purchasesAmount: '',
                      advanceAmount: '',
                      notes: ''
                    });
                    setUploadedImages([]);
                  }}
                  className="px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-medium"
                >
                  <span className="text-lg">🔄</span>
                  مسح
                </button>
              </div>
            </form>
          </div>
        )}

        {/* عرض البيانات المحسن */}
        {entry ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* البيانات الأساسية */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl border border-orange-200 overflow-hidden">
                <div className="px-8 py-6 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">✅</span>
                    <span>ملخص الحساب اليومي</span>
                  </h2>
                </div>
                
                <div className="p-8">
                  {/* المبالغ الأساسية */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">💵</span>
                        <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium">نقدي</div>
                      </div>
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {entry.cashAmount?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-green-700 font-medium">المبلغ النقدي</div>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">💳</span>
                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">شبكة</div>
                      </div>
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {entry.networkAmount?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-blue-700 font-medium">مبلغ الشبكة</div>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-200 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">🛒</span>
                        <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">مشتريات</div>
                      </div>
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {entry.purchasesAmount?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-purple-700 font-medium">المشتريات</div>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">💰</span>
                        <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full font-medium">سلفة</div>
                      </div>
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        {entry.advanceAmount?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-orange-700 font-medium">السلفيات</div>
                    </div>
                  </div>

                  {/* الإجماليات */}
                  <div className="border-t border-gray-200 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-200">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">📊</span>
                          <div className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full font-medium">إجمالي</div>
                        </div>
                        <div className="text-4xl font-bold text-indigo-600 mb-2">
                          {entry.total?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-indigo-700 font-medium">إجمالي المبلغ</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-200">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">💎</span>
                          <div className="text-xs text-teal-600 bg-teal-100 px-2 py-1 rounded-full font-medium">متبقي</div>
                        </div>
                        <div className="text-4xl font-bold text-teal-600 mb-2">
                          {entry.remaining?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-teal-700 font-medium">المتبقي قبل الخصم</div>
                      </div>

                      {/* معلومات إضافية للمدير */}
                      {isAdmin && (
                        <div className={`bg-gradient-to-br rounded-2xl p-6 border ${
                          netAfterDeductions >= 0 
                            ? 'from-emerald-50 to-green-50 border-emerald-200' 
                            : 'from-red-50 to-pink-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">{netAfterDeductions >= 0 ? '✨' : '⚠️'}</span>
                            <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                              netAfterDeductions >= 0 
                                ? 'text-emerald-600 bg-emerald-100' 
                                : 'text-red-600 bg-red-100'
                            }`}>
                              صافي
                            </div>
                          </div>
                          <div className={`text-4xl font-bold mb-2 ${
                            netAfterDeductions >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {netAfterDeductions.toLocaleString()}
                          </div>
                          <div className={`text-sm font-medium ${
                            netAfterDeductions >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            الصافي بعد الخصم
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* الملاحظات */}
                  {entry.notes && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl border border-gray-200">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">📝</span>
                        <h3 className="font-bold text-gray-800 text-lg">الملاحظات</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{entry.notes}</p>
                    </div>
                  )}

                  {/* الصور المرفقة */}
                  {entry.images && entry.images.length > 0 && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl border border-pink-200">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">📸</span>
                        <h3 className="font-bold text-gray-800 text-lg">الصور المرفقة</h3>
                        <span className="text-sm text-gray-600 bg-pink-100 px-2 py-1 rounded-full">
                          {entry.images.length} صورة
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {entry.images.map((imageId) => (
                          <ImagePreview
                            key={imageId}
                            imageId={imageId}
                            onRemove={isAdmin ? () => handleRemoveImage(imageId) : undefined}
                            canRemove={isAdmin}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* الشريط الجانبي - معلومات إضافية */}
            <div className="space-y-6">
              {/* معلومات الحساب للمدير */}
              {isAdmin && userProfile && (
                <div className="bg-white rounded-2xl shadow-xl border border-blue-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="text-xl">💼</span>
                      معلومات الحساب
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-200">
                      <span className="text-gray-700 font-medium">الخصومات الثابتة</span>
                      <span className="font-bold text-red-600 text-lg">
                        {userProfile.deductions?.toLocaleString() || 0} ر.س
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-gray-700 font-medium">تاريخ الإنشاء</span>
                      <span className="font-medium text-gray-800">
                        {new Date(entry.createdAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* إحصائيات سريعة */}
              <div className="bg-white rounded-2xl shadow-xl border border-orange-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">📈</span>
                    إحصائيات سريعة
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {((entry.cashAmount || 0) / (entry.total || 1) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-green-700 font-medium">نسبة النقدي</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {((entry.networkAmount || 0) / (entry.total || 1) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-blue-700 font-medium">نسبة الشبكة</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {((entry.purchasesAmount || 0) / (entry.total || 1) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-purple-700 font-medium">نسبة المشتريات</div>
                  </div>
                </div>
              </div>

              {/* نصائح وإرشادات */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💡</span>
                  <h3 className="font-bold text-gray-800">نصائح مفيدة</h3>
                </div>
                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>تأكد من دقة المبالغ المدخلة</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>استخدم الملاحظات لتسجيل تفاصيل إضافية</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>يمكنك إضافة صور للمدخل كمرجع</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>راجع الأرقام قبل الحفظ</span>
                  </div>
                  {!isAdmin && (
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
                      <span>لا يمكن تعديل البيانات بعد الحفظ</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* نموذج إضافة/تعديل المدخل المحسن */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* رأس النموذج */}
              <div className="px-8 py-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">{entry ? '✏️' : '➕'}</span>
                    {entry ? 'تعديل المدخل' : 'إضافة مدخل جديد'}
                  </h3>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
                  >
                    <span className="text-2xl">✕</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* التاريخ */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    التاريخ
                  </label>
                  <input
                    type="text"
                    value={formattedDate}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 font-medium text-gray-800"
                  />
                </div>

                {/* المبالغ الأساسية */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <label className="block text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                      <span className="text-lg">💵</span>
                      المبلغ النقدي
                    </label>
                    <input
                      type="number"
                      value={formData.cashAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, cashAmount: e.target.value }))}
                      className="w-full px-4 py-3 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                    <label className="block text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                      <span className="text-lg">💳</span>
                      مبلغ الشبكة
                    </label>
                    <input
                      type="number"
                      value={formData.networkAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, networkAmount: e.target.value }))}
                      className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
                    <label className="block text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <span className="text-lg">🛒</span>
                      المشتريات
                    </label>
                    <input
                      type="number"
                      value={formData.purchasesAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchasesAmount: e.target.value }))}
                      className="w-full px-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                    <label className="block text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                      <span className="text-lg">💰</span>
                      السلفيات
                    </label>
                    <input
                      type="number"
                      value={formData.advanceAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, advanceAmount: e.target.value }))}
                      className="w-full px-4 py-3 border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* الملاحظات */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    rows={4}
                    placeholder="أضف ملاحظات إضافية أو تفاصيل مهمة..."
                  />
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-bold text-lg"
                  >
                    <span className="text-xl">{entry ? '✅' : '➕'}</span>
                    {entry ? 'تحديث المدخل' : 'إضافة المدخل'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// مكون معاينة الصورة
function ImagePreview({ 
  imageId, 
  onRemove, 
  canRemove 
}: { 
  imageId: Id<"_storage">; 
  onRemove?: () => void; 
  canRemove: boolean;
}) {
  const imageUrl = useQuery(api.images.getImageUrl, { storageId: imageId });
  const [showFullSize, setShowFullSize] = useState(false);

  if (!imageUrl) {
    return (
      <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
        <img
          src={imageUrl}
          alt="صورة مرفقة"
          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
          onClick={() => setShowFullSize(true)}
        />
        
        {canRemove && onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            ✕
          </button>
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
            انقر للتكبير
          </span>
        </div>
      </div>

      {/* عرض الصورة بالحجم الكامل */}
      {showFullSize && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowFullSize(false)}
              className="absolute top-4 right-4 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-colors z-10"
            >
              ✕
            </button>
            <img
              src={imageUrl}
              alt="صورة مرفقة"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
