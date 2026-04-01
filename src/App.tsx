import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import AdminPage from "./pages/AdminPage";
import ProfilePage from "./pages/ProfilePage";
import TeamPage from "./pages/TeamPage";
import RedeemPage from "./pages/RedeemPage";
import WithdrawalHistoryPage from "./pages/WithdrawalHistoryPage";
import CyclesPage from "./pages/CyclesPage";
import PerformanceBonusPage from "./pages/PerformanceBonusPage";
import NotFound from "./pages/NotFound";
import WhatsAppGroupButton from "./components/WhatsAppGroupButton";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Sonner />
        <BrowserRouter>
          <PlatformProvider>
            <WhatsAppGroupButton />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/redeem" element={<RedeemPage />} />
              <Route path="/withdrawal-history" element={<WithdrawalHistoryPage />} />
              <Route path="/cycles" element={<CyclesPage />} />
              <Route path="/bonus" element={<PerformanceBonusPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PlatformProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
