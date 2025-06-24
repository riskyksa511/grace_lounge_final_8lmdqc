import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Dashboard } from "./components/Dashboard";
import { ProfileSetup } from "./components/ProfileSetup";
import { PasswordChange } from "./components/PasswordChange";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { useState } from "react";

function App() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <AuthLoading>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex justify-center items-center min-h-screen p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                💰 نظام الحسابات اليومية
              </h1>
              <p className="text-gray-600">
                سجل دخولك لإدارة حساباتك اليومية
              </p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Toaster position="top-center" richColors />
    </main>
  );
}

function AuthenticatedApp() {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const userProfile = useQuery(api.userProfiles.getUserProfile, {});

  if (userProfile === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!userProfile) {
    return <ProfileSetup />;
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💰</div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  نظام الحسابات اليومية
                </h1>
                <p className="text-sm text-gray-600">
                  مرحباً، {userProfile.username}
                  {userProfile.isAdmin && (
                    <span className="mr-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      مدير
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPasswordChange(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <span>🔐</span>
                <span>تغيير كلمة المرور</span>
              </button>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />
      </div>

      {showPasswordChange && (
        <PasswordChange
          onClose={() => setShowPasswordChange(false)}
          isAdmin={userProfile.isAdmin}
        />
      )}
    </div>
  );
}

export default App;
