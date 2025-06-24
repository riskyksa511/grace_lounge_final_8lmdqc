import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { YearView } from "./YearView";
import { MonthView } from "./MonthView";
import { DayView } from "./DayView";
import { AdminPanel } from "./AdminPanel";
import { AdminSummary } from "./AdminSummary";
import { Id } from "../../convex/_generated/dataModel";

type View = "year" | "month" | "day" | "admin" | "admin-summary";

interface ViewState {
  type: View;
  year?: number;
  month?: number;
  date?: string;
  userId?: Id<"users">;
}

export function Dashboard() {
  const currentUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.userProfiles.getUserProfile, {});
  
  const [viewState, setViewState] = useState<ViewState>({ type: "year" });

  if (currentUser === undefined || userProfile === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex justify-center items-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const isAdmin = userProfile?.isAdmin || false;
  const effectiveUserId = viewState.userId || currentUser?._id;

  if (!effectiveUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex justify-center items-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const handleSelectUser = (userId: Id<"users">) => {
    setViewState({ type: "year", userId });
  };

  const handleBackToAdmin = () => {
    setViewState({ type: "admin" });
  };

  const handleBackToUserView = () => {
    setViewState({ type: "year" });
  };

  const renderView = () => {
    switch (viewState.type) {
      case "admin":
        return (
          <AdminPanel 
            onSelectUser={handleSelectUser}
            onBack={handleBackToUserView}
          />
        );
      
      case "admin-summary":
        return (
          <AdminSummary 
            onBack={handleBackToUserView}
          />
        );
      
      case "year":
        return (
          <YearView
            onSelectMonth={(year, month) => setViewState({ type: "month", year, month, userId: viewState.userId })}
            onAdminPanel={isAdmin ? () => setViewState({ type: "admin" }) : undefined}
            onAdminSummary={isAdmin ? () => setViewState({ type: "admin-summary" }) : undefined}
            userId={effectiveUserId}
            isAdmin={isAdmin}
            isAccessingUser={!!viewState.userId && viewState.userId !== currentUser?._id}
            onBackToAdmin={viewState.userId && viewState.userId !== currentUser?._id ? handleBackToAdmin : undefined}
          />
        );
      
      case "month":
        return (
          <MonthView
            year={viewState.year!}
            month={viewState.month!}
            onBack={() => setViewState({ type: "year", userId: viewState.userId })}
            onSelectDate={(date) => setViewState({ type: "day", year: viewState.year, month: viewState.month, date, userId: viewState.userId })}
            userId={effectiveUserId}
            isAdmin={isAdmin}
          />
        );
      
      case "day":
        return (
          <DayView
            date={viewState.date!}
            onBack={() => setViewState({ type: "month", year: viewState.year, month: viewState.month, userId: viewState.userId })}
            userId={effectiveUserId}
            isAdmin={isAdmin}
          />
        );
      
      default:
        return null;
    }
  };

  return renderView();
}
