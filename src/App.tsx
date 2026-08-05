import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index.tsx";
import Reports from "./pages/Reports.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import ResumeAnalyzer from "./pages/ResumeAnalyzer.tsx";
import InterviewCoach from "./pages/InterviewCoach.tsx";
import CareerRoadmap from "./pages/CareerRoadmap.tsx";
import CareerAssistant from "./pages/CareerAssistant.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminJobMatches from "./pages/AdminJobMatches.tsx";
import EmailSettings from "./pages/EmailSettings.tsx";
import JobAlerts from "./pages/JobAlerts.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/resume" element={<ProtectedRoute><ResumeAnalyzer /></ProtectedRoute>} />
            <Route path="/interview" element={<ProtectedRoute><InterviewCoach /></ProtectedRoute>} />
            <Route path="/roadmap" element={<ProtectedRoute><CareerRoadmap /></ProtectedRoute>} />
            <Route path="/assistant" element={<ProtectedRoute><CareerAssistant /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
            <Route path="/admin/job-matches" element={<ProtectedRoute><AdminRoute><AdminJobMatches /></AdminRoute></ProtectedRoute>} />
            <Route path="/settings/email" element={<ProtectedRoute><EmailSettings /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><JobAlerts /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
