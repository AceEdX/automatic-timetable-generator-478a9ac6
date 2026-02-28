import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SchoolDataProvider } from "./context/SchoolDataContext";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import TimeSlotConfig from "./pages/TimeSlotConfig";
import TimetableView from "./pages/TimetableView";
import TeachersPage from "./pages/TeachersPage";
import SubstitutionPanel from "./pages/SubstitutionPanel";
import ClassesPage from "./pages/ClassesPage";
import SchoolSettingsPage from "./pages/SchoolSettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
