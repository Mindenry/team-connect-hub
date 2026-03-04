import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import CommandPalette from "@/components/shared/CommandPalette";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { auth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MeetingRoom = lazy(() => import("./pages/MeetingRoom"));
const MeetingLobby = lazy(() => import("./pages/MeetingLobby"));
const Meetings = lazy(() => import("./pages/Meetings"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const Chat = lazy(() => import("./pages/Chat"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Teams = lazy(() => import("./pages/Teams"));
const Directory = lazy(() => import("./pages/Directory"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Reminders = lazy(() => import("./pages/Reminders"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const InviteSetup = lazy(() => import("./pages/InviteSetup"));
const SharedDrive = lazy(() => import("./pages/SharedDrive"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Reports = lazy(() => import("./pages/Reports"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback for standalone pages (login, invite, etc.)
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="space-y-4 w-full max-w-md">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // Data stays fresh for 30 seconds
      retry: 1,                // Retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CommandPalette />
        <Routes>
          {/* Standalone routes — each has its own Suspense */}
          <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
          <Route path="/invite" element={<Suspense fallback={<PageLoader />}><InviteSetup /></Suspense>} />
          <Route path="/meeting-lobby/:id" element={<Suspense fallback={<PageLoader />}><ProtectedRoute><MeetingLobby /></ProtectedRoute></Suspense>} />
          <Route path="/meeting-room" element={<Suspense fallback={<PageLoader />}><ProtectedRoute><MeetingRoom /></ProtectedRoute></Suspense>} />
          <Route path="/meeting-room/:id" element={<Suspense fallback={<PageLoader />}><ProtectedRoute><MeetingRoom /></ProtectedRoute></Suspense>} />

          {/* Layout routes — Suspense is inside AppLayout, sidebar stays stable */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/drive" element={<SharedDrive />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/audit-trail" element={<AuditTrail />} />
            <Route path="/wiki" element={<KnowledgeBase />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
          <Route path="*" element={auth.isAuthenticated() ? <NotFound /> : <Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

