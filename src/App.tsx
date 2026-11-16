import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AnalysisPage from './pages/AnalysisPage';
import ParametersPage from './pages/ParametersPage';
import CameraLidarPage from './pages/CameraLidarPage';
import ResultsPage from './pages/ResultsPage';
import HistoryPage from './pages/HistoryPage';
import NotFoundPage from './pages/NotFoundPage';
import MobileBottomNav from './components/MobileBottomNav';
import { OfflineIndicator } from './components/PWAInstallButton';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analiza" element={<AnalysisPage />} />
        <Route path="/parametry" element={<ParametersPage />} />
        <Route path="/skaner" element={<CameraLidarPage />} />
        <Route path="/wyniki/:id" element={<ResultsPage />} />
        <Route path="/historia" element={<HistoryPage />} />
        <Route path="/historia/:token" element={<HistoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <MobileBottomNav />
      <OfflineIndicator />
    </BrowserRouter>
  );
}
