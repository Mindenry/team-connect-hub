import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import CommandPalette from "@/components/shared/CommandPalette";
import Dashboard from "./pages/Dashboard";
import MeetingRoom from "./pages/MeetingRoom";
import MeetingSummary from "./pages/MeetingSummary";
import Meetings from "./pages/Meetings";
import Chat from "./pages/Chat";
import Tasks from "./pages/Tasks";
import Teams from "./pages/Teams";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import SettingsPage from "./pages/Settings";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import InviteSetup from "./pages/InviteSetup";
import VirtualOffice from "./pages/VirtualOffice";
import NotFound from "./pages/NotFound";
import { auth } from "@/lib/auth";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CommandPalette />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/invite" element={<InviteSetup />} />
          <Route path="/meeting-room" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />
          <Route path="/meeting-room/:id" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/virtual-office" element={<VirtualOffice />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/meeting-summary" element={<MeetingSummary />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
