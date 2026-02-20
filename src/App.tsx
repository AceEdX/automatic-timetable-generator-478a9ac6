import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import TimeSlotConfig from "./pages/TimeSlotConfig";
import TimetableView from "./pages/TimetableView";
import TeachersPage from "./pages/TeachersPage";
import SubstitutionPanel from "./pages/SubstitutionPanel";
import ClassesPage from "./pages/ClassesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/time-slots" element={<TimeSlotConfig />} />
            <Route path="/timetable" element={<TimetableView />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/substitution" element={<SubstitutionPanel />} />
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
