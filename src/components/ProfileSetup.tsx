import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ProfileSetup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const createProfile = useMutation(api.userProfiles.upsertUserProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error("يرجى إدخال اسم المستخدم");
      return;
    }

    if (username.trim().length < 2) {
      toast.error("اسم المستخدم يجب أن يكون حرفين على الأقل");
      return;
    }

    if (!password) {
      toast.error("يرجى إدخال كلمة المرور");
      return;
    }

    if (password.length < 4) {
      toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("كلمة المرور وتأكيد كلمة المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      await createProfile({ 
        username: username.trim(),
        password: password
      });
      toast.success("تم إنشاء الملف الشخصي بنجاح!");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الملف الشخصي");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-200">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">👤</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              إعداد الملف الشخصي
            </h2>
            <p className="text-gray-600">
              أدخل بياناتك للمتابعة
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-right"
                placeholder="أدخل اسم المستخدم"
                disabled={loading}
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                يجب أن يكون حرفين على الأقل
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-right pr-12"
                  placeholder="أدخل كلمة المرور"
                  disabled={loading}
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                يمكن أن تحتوي على أحرف وأرقام ورموز (4 أحرف على الأقل)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-right pr-12"
                  placeholder="أعد إدخال كلمة المرور"
                  disabled={loading}
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password || !confirmPassword}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>جاري الإنشاء...</span>
                </div>
              ) : (
                "إنشاء الملف الشخصي"
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-800">
              <div className="font-medium mb-1">💡 معلومة مهمة:</div>
              <div>سيتم إنشاء حسابك كمستخدم عادي. يمكن للمدير ترقيتك لاحقاً إذا لزم الأمر.</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">🔐 متطلبات كلمة المرور:</div>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <span className={password.length >= 4 ? "text-green-500" : "text-gray-400"}>✓</span>
                  <span>4 أحرف على الأقل</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={password === confirmPassword && password ? "text-green-500" : "text-gray-400"}>✓</span>
                  <span>تطابق كلمة المرور مع التأكيد</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">ℹ️</span>
                  <span>يمكن استخدام أحرف وأرقام ورموز</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
