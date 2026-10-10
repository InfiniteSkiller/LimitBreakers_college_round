import React, { useState, useEffect } from 'react';
import { Navbar, UserRole } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { LandingPage } from './pages/LandingPage';
import { SubmitReportPage } from './pages/SubmitReportPage';
import { ModeratorPage } from './pages/ModeratorPage';
import { RecipientDashboardPage } from './pages/RecipientDashboardPage';
import { SecurityArchitecturePage } from './pages/SecurityArchitecturePage';
import { checkHealth } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'submit' | 'moderator' | 'insights' | 'security'>('overview');
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Authentication & Role State
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('incognito_user_role') as UserRole) || null;
  });
  const [studentTicket, setStudentTicket] = useState<string | null>(() => {
    return localStorage.getItem('incognito_student_ticket') || null;
  });
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('incognito_admin_token') || null;
  });

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalRole, setLoginModalRole] = useState<'student' | 'admin'>('student');

  useEffect(() => {
    const verifyHealth = async () => {
      const res = await checkHealth();
      setIsBackendConnected(res.status === 'ok');
    };
    verifyHealth();
    const interval = setInterval(verifyHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenLogin = (role?: 'student' | 'admin') => {
    setLoginModalRole(role || 'student');
    setIsLoginModalOpen(true);
  };

  const handleStudentLogin = (ticket: string) => {
    setUserRole('student');
    setStudentTicket(ticket);
    localStorage.setItem('incognito_user_role', 'student');
    localStorage.setItem('incognito_student_ticket', ticket);
    setIsLoginModalOpen(false);
    setActiveTab('submit');
  };

  const handleAdminLogin = (token: string) => {
    setUserRole('admin');
    setAdminToken(token);
    localStorage.setItem('incognito_user_role', 'admin');
    localStorage.setItem('incognito_admin_token', token);
    setIsLoginModalOpen(false);
    setActiveTab('moderator');
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem('incognito_user_role');
    // Note: preserve demo tokens in storage for quick re-login convenience if desired
    if (activeTab === 'moderator') {
      setActiveTab('overview');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-violet-500/30 selection:text-violet-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendConnected={isBackendConnected}
        userRole={userRole}
        studentTicket={studentTicket}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'overview' && (
          <LandingPage
            onNavigateSubmit={() => {
              if (userRole === 'admin') {
                setActiveTab('moderator');
              } else {
                setActiveTab('submit');
              }
            }}
            onNavigateModerator={() => setActiveTab('moderator')}
            onNavigateSecurity={() => setActiveTab('security')}
            onOpenLogin={handleOpenLogin}
            userRole={userRole}
          />
        )}
        {activeTab === 'submit' && (
          <SubmitReportPage
            initialStudentTicket={studentTicket}
            userRole={userRole}
            onOpenLogin={() => handleOpenLogin('student')}
            onNavigateModerator={() => setActiveTab('moderator')}
          />
        )}
        {activeTab === 'moderator' && (
          <ModeratorPage
            adminToken={adminToken}
            onAdminLogin={handleAdminLogin}
            onLogout={handleLogout}
          />
        )}
        {activeTab === 'insights' && <RecipientDashboardPage />}
        {activeTab === 'security' && <SecurityArchitecturePage />}
      </main>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        defaultRole={loginModalRole}
        onStudentLogin={handleStudentLogin}
        onAdminLogin={handleAdminLogin}
      />

      <Footer />
    </div>
  );
}

export default App;
