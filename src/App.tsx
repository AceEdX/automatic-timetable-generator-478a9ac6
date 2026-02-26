import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { SchoolDataProvider } from "./context/SchoolDataContext";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import TimeSlotConfig from "./pages/TimeSlotConfig";
import TimetableView from "./pages/TimetableView";
import TeachersPage from "./pages/TeachersPage";
import SubstitutionPanel from "./pages/SubstitutionPanel";
import ClassesPage from "./pages/ClassesPage";
import SchoolSettingsPage from "./pages/SchoolSettingsPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SchoolDataProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/school-settings" element={<SchoolSettingsPage />} />
          <Route path="/time-slots" element={<TimeSlotConfig />} />
          <Route path="/timetable" element={<TimetableView />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/substitution" element={<SubstitutionPanel />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </SchoolDataProvider>
  );
};

const AuthRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
