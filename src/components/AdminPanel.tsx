import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface AdminPanelProps {
  onSelectUser: (userId: Id<"users">) => void;
  onBack: () => void;
}

export function AdminPanel({ onSelectUser, onBack }: AdminPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [newDeductions, setNewDeductions] = useState("");
  const [loading, setLoading] = useState(false);

  const allUsers = useQuery(api.userProfiles.getAllUsers);
  const updateDeductions = useMutation(api.userProfiles.updateDeductions);

  const handleUpdateDeductions = async () => {
    if (!selectedUserId) {
      toast.error("يرجى اختيار مستخدم أولاً");
      return;
    }

    const deductions = parseFloat(newDeductions) || 0;
    if (deductions < 0) {
      toast.error("لا يمكن أن تكون الخصومات أقل من الصفر");
      return;
    }

    setLoading(true);
    try {
      await updateDeductions({
        targetUserId: selectedUserId,
        deductions,
      });
      toast.success("تم تحديث الخصومات بنجاح");
      setNewDeductions("");
      setSelectedUserId(null);
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء تحديث الخصومات");
    } finally {
      setLoading(false);
    }
  };

  const handleAccessUser = (userId: Id<"users">) => {
    onSelectUser(userId);
  };

  if (allUsers === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex justify-center items-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* رأس الصفحة */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <span>←</span>
                <span>العودة</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="text-4xl">👨‍💼</span>
                  لوحة تحكم المدير
                </h1>
                <p className="text-gray-500 mt-1">إدارة المستخدمين والوصول إلى حساباتهم</p>
              </div>
            </div>
          </div>
        </div>

        {/* قائمة المستخدمين */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">👥</span>
            قائمة المستخدمين
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allUsers.map((user) => (
              <div
                key={user._id}
                className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{user.username}</h3>
                      <div className="flex items-center gap-2">
                        {user.isAdmin && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                            مدير
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          ID: {user.userId.slice(-6)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                    <span className="text-sm text-gray-600">الخصومات الثابتة</span>
                    <span className="font-bold text-red-600">
                      {user.deductions?.toLocaleString() || 0} ر.س
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccessUser(user.userId)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-medium"
                    >
                      <span className="text-lg">🔍</span>
                      <span>دخول للحساب</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedUserId(user.userId);
                        setNewDeductions(user.deductions?.toString() || "0");
                      }}
                      className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-300"
                    >
                      <span className="text-lg">✏️</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* نموذج تحديث الخصومات */}
        {selectedUserId && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">✏️</span>
                  تحديث الخصومات
                </h3>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    المستخدم المحدد
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    {allUsers.find(u => u.userId === selectedUserId)?.username}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    مبلغ الخصومات الثابتة (ر.س)
                  </label>
                  <input
                    type="number"
                    value={newDeductions}
                    onChange={(e) => setNewDeductions(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleUpdateDeductions}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-medium disabled:opacity-50"
                  >
                    <span className="text-lg">✅</span>
                    {loading ? "جاري الحفظ..." : "حفظ"}
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedUserId(null);
                      setNewDeductions("");
                    }}
                    disabled={loading}
                    className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            معلومات مهمة للمدير
          </h3>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span><strong>دخول للحساب:</strong> يمكنك الدخول إلى حساب أي مستخدم بصلاحيات المدير</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span><strong>تحديث الخصومات:</strong> يمكنك تعديل الخصومات الثابتة لأي مستخدم</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span><strong>عرض البيانات:</strong> ستتمكن من رؤية جميع المعلومات المالية والإحصائيات</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span><strong>التعديل والحذف:</strong> يمكنك تعديل وحذف المدخلات اليومية</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
