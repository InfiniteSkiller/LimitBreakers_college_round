import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { SubmitReportPage } from './pages/SubmitReportPage';
import { ModeratorPage } from './pages/ModeratorPage';
import { RecipientDashboardPage } from './pages/RecipientDashboardPage';
import { SecurityArchitecturePage } from './pages/SecurityArchitecturePage';
import { BackgroundDecor } from './components/BackgroundDecor';
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
    <div className="relative min-h-screen flex flex-col text-ink">
      <BackgroundDecor />
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendConnected={isBackendConnected}
        isModeratorAuthenticated={false}
      />

      <main className="relative z-10 flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
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
