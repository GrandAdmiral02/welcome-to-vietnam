import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./hooks/useAuth";

// Layouts and Route Protection
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import { Loader2 } from "lucide-react";

// --- Pages ---
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Matches from "./pages/Matches";
import Discover from "./pages/Discover";
import RandomMatch from "./pages/RandomMatch";
import Browse from "./pages/Browse";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AdminPage from "./pages/Admin";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <BrowserRouter>
        <Routes>
            {/* Public auth route */}
            <Route path="/auth" element={<Auth />} />

            {/* Protected Routes for regular users */}
            <Route path="/*" element={
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/user/:userId" element={<UserProfile />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/random-match" element={<RandomMatch />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/settings" element={<Settings />} />
                  
                  {/* Admin Route - Nested inside for protection */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminPage />} />
                  </Route>

                  {/* Fallback 404 Not Found Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ProtectedRoute>
            } />
        </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner richColors position="top-right" />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
