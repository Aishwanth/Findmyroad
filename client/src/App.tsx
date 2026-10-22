import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider } from './context/RoleContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { ReportWizardPage } from './pages/ReportWizardPage';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { CitizenReportDetailPage } from './pages/CitizenReportDetailPage';
import { OfficerDashboardPage } from './pages/OfficerDashboardPage';
import { OfficerReportDetailPage } from './pages/OfficerReportDetailPage';
import { AboutPage } from './pages/AboutPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <ToastProvider>
          <BrowserRouter>
            <div className="flex flex-col min-h-screen bg-[#0B1120] text-slate-100 font-sans selection:bg-brand-emerald selection:text-slate-900">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/report" element={<ReportWizardPage />} />
                  <Route path="/citizen" element={<CitizenDashboardPage />} />
                  <Route path="/citizen/reports/:id" element={<CitizenReportDetailPage />} />
                  <Route path="/officer" element={<OfficerDashboardPage />} />
                  <Route path="/officer/reports/:id" element={<OfficerReportDetailPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </ToastProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
};

export default App;
