import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { SubmitReportPage } from './pages/SubmitReportPage';
import { ModeratorPage } from './pages/ModeratorPage';
import { RecipientDashboardPage } from './pages/RecipientDashboardPage';
import { SecurityArchitecturePage } from './pages/SecurityArchitecturePage';
import { checkHealth } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'submit' | 'moderator' | 'insights' | 'security'>('overview');
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  useEffect(() => {
    const verifyHealth = async () => {
      const res = await checkHealth();
      setIsBackendConnected(res.status === 'ok');
    };
    verifyHealth();
    const interval = setInterval(verifyHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-violet-500/30 selection:text-violet-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendConnected={isBackendConnected}
        isModeratorAuthenticated={true}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'overview' && (
          <LandingPage
            onNavigateSubmit={() => setActiveTab('submit')}
            onNavigateSecurity={() => setActiveTab('security')}
          />
        )}
        {activeTab === 'submit' && <SubmitReportPage />}
        {activeTab === 'moderator' && <ModeratorPage />}
        {activeTab === 'insights' && <RecipientDashboardPage />}
        {activeTab === 'security' && <SecurityArchitecturePage />}
      </main>

      <Footer />
    </div>
  );
}

export default App;
