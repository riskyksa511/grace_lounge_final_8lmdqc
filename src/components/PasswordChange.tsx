import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface PasswordChangeProps {
  onClose: () => void;
  targetUserId?: Id<"users">;
  isAdmin?: boolean;
}

export function PasswordChange({ onClose, targetUserId, isAdmin = false }: PasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const updatePassword = useMutation(api.userProfiles.updatePassword);
  const targetProfile = useQuery(
    api.userProfiles.getUserProfile, 
    targetUserId ? { targetUserId } : {}
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin && !currentPassword) {
      toast.error("يرجى إدخال كلمة المرور الحالية");
      return;
    }

    if (!newPassword) {
      toast.error("يرجى إدخال كلمة المرور الجديدة");
      return;
    }

    if (newPassword.length < 4) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      await updatePassword({
        currentPassword: currentPassword || "admin-override",
        newPassword,
        targetUserId,
      });
      
      toast.success("تم تغيير كلمة المرور بنجاح!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🔐</span>
            تغيير كلمة المرور
          </h3>
          {targetProfile && isAdmin && (
            <p className="text-blue-100 text-sm mt-1">
              للمستخدم: {targetProfile.username}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور الحالية
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right pr-12"
                  placeholder="أدخل كلمة المرور الحالية"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right pr-12"
                placeholder="أدخل كلمة المرور الجديدة"
                disabled={loading}
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords ? "🙈" : "👁️"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              يمكن أن تحتوي على أحرف وأرقام ورموز (4 أحرف على الأقل)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تأكيد كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right pr-12"
                placeholder="أعد إدخال كلمة المرور الجديدة"
                disabled={loading}
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* مؤشر قوة كلمة المرور */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">🔐 متطلبات كلمة المرور:</div>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <span className={newPassword.length >= 4 ? "text-green-500" : "text-gray-400"}>✓</span>
                  <span>4 أحرف على الأقل</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={newPassword === confirmPassword && newPassword ? "text-green-500" : "text-gray-400"}>✓</span>
                  <span>تطابق كلمة المرور مع التأكيد</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={/[a-zA-Z]/.test(newPassword) ? "text-green-500" : "text-gray-400"}>✓</span>
                  <span>تحتوي على أحرف (اختياري)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={/[0-9]/.test(newPassword) ? "text-green-500" : "text-gray-400"}>✓</span>
                  <span>تحتوي على أرقام (اختياري)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword || (!isAdmin && !currentPassword)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>جاري التحديث...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">✅</span>
                  <span>تغيير كلمة المرور</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
