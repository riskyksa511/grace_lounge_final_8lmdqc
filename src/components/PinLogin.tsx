// Empty component to maintain compatibility
export function PinLogin({ onBack }: { onBack: () => void }) {
  return (
    <div className="text-center p-8">
      <div className="text-4xl mb-4">🚫</div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        PIN غير متاح
      </h2>
      <p className="text-gray-600 mb-6">
        تم إزالة نظام PIN من التطبيق. يرجى استخدام تسجيل الدخول العادي.
      </p>
      <button
        onClick={onBack}
        className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
      >
        العودة لتسجيل الدخول
      </button>
    </div>
  );
}
