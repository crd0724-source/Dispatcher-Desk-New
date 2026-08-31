import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { TimezoneProvider } from './contexts/TimezoneContext.tsx';
import { AppShell } from './components/layout/AppShell.tsx';

// Modules
import { DashboardView } from './modules/dashboard/DashboardView.tsx';
import { ClientsView } from './modules/clients/ClientsView.tsx';
import { BrokersView } from './modules/brokers/BrokersView.tsx';
import { TrucksView } from './modules/trucks/TrucksView.tsx';
import { DriversView } from './modules/drivers/DriversView.tsx';
import { LoadsView } from './modules/loads/LoadsView.tsx';
import { PipelineView } from './modules/pipeline/PipelineView.tsx';
import { ProfitabilityView } from './modules/profitability/ProfitabilityView.tsx';
import { DocumentsView } from './modules/documents/DocumentsView.tsx';
import { NotesView } from './modules/notes/NotesView.tsx';
import { ReportsView } from './modules/reports/ReportsView.tsx';
import { AIAssistantView } from './modules/ai/AIAssistantView.tsx';
import { SettingsView } from './modules/settings/SettingsView.tsx';
import { CheckCallsView } from './modules/checkcalls/CheckCallsView.tsx';
import { AccessorialsView } from './modules/accessorials/AccessorialsView.tsx';
import { TasksView } from './modules/tasks/TasksView.tsx';
import { CalendarView } from './modules/calendar/CalendarView.tsx';
import { DispatchMapView } from './modules/map/DispatchMapView.tsx';

import { NavModule } from './components/layout/Sidebar.tsx';

// Modals & Onboarding
import { AuthModal } from './modules/auth/AuthModal.tsx';
import { OnboardingOrgModal } from './modules/auth/OnboardingOrgModal.tsx';
import { InvitationAcceptView } from './modules/team/InvitationAcceptView.tsx';

const MainApp: React.FC = () => {
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [isBookLoadModalOpen, setIsBookLoadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  // Detect invitation token in URL query params or hash and clean URL immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const queryToken = url.searchParams.get('invitation_token') || url.searchParams.get('token');
      let extractedToken: string | null = null;

      if (queryToken) {
        extractedToken = queryToken;
      } else if (window.location.hash.includes('invitation_token=')) {
        const hashMatch = window.location.hash.match(/invitation_token=([^&]+)/);
        if (hashMatch && hashMatch[1]) {
          extractedToken = decodeURIComponent(hashMatch[1]);
        }
      }

      if (extractedToken) {
        setInvitationToken(extractedToken);
        // Clean URL immediately so raw token does not linger in address bar or history
        if (window.history && window.history.replaceState) {
          url.searchParams.delete('invitation_token');
          url.searchParams.delete('token');
          if (url.hash.includes('invitation_token=')) {
            url.hash = url.hash.replace(/invitation_token=[^&]+&?/, '').replace(/[?&]$/, '').replace(/#$/, '');
          }
          const cleanPath = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
          window.history.replaceState({}, document.title, cleanPath || '/');
        }
      }
    }
  }, []);

  const handleDismissInvitation = () => {
    setInvitationToken(null);
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleInvitationAccepted = (joinedOrgId: string) => {
    handleDismissInvitation();
    setActiveModule('dashboard');
  };

  // If viewing an invitation link, render the dedicated invitation acceptance page
  if (invitationToken) {
    return (
      <InvitationAcceptView
        rawToken={invitationToken}
        onAccepted={handleInvitationAccepted}
        onDismiss={handleDismissInvitation}
      />
    );
  }

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={(mod: string) => setActiveModule(mod as NavModule)}
            onNewLoadClick={() => {
              setActiveModule('loads');
              setIsBookLoadModalOpen(true);
            }}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            onNewLoadClick={() => {
              setActiveModule('loads');
              setIsBookLoadModalOpen(true);
            }}
          />
        );
      case 'map':
        return (
          <DispatchMapView
            onNewLoadClick={() => {
              setActiveModule('loads');
              setIsBookLoadModalOpen(true);
            }}
          />
        );
      case 'clients':
        return <ClientsView />;
      case 'brokers':
        return <BrokersView />;
      case 'trucks':
        return <TrucksView />;
      case 'drivers':
        return <DriversView />;
      case 'loads':
        return (
          <LoadsView
            isModalOpenExternal={isBookLoadModalOpen}
            onCloseModalExternal={() => setIsBookLoadModalOpen(false)}
          />
        );
      case 'pipeline':
        return (
          <PipelineView
            onNavigate={(mod: string) => setActiveModule(mod as NavModule)}
            onNewLoadClick={() => {
              setActiveModule('loads');
              setIsBookLoadModalOpen(true);
            }}
          />
        );
      case 'checkcalls':
        return <CheckCallsView />;
      case 'accessorials':
        return <AccessorialsView />;
      case 'tasks':
        return <TasksView />;
      case 'profitability':
        return <ProfitabilityView />;
      case 'documents':
        return <DocumentsView />;
      case 'notes':
        return <NotesView />;
      case 'reports':
        return <ReportsView />;
      case 'ai':
        return <AIAssistantView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <DashboardView
            onNavigate={(mod: string) => setActiveModule(mod as NavModule)}
            onNewLoadClick={() => {
              setActiveModule('loads');
              setIsBookLoadModalOpen(true);
            }}
          />
        );
    }
  };

  return (
    <>
      <AppShell
        activeModule={activeModule}
        onSelectModule={(mod: NavModule) => setActiveModule(mod)}
        onCreateOrgClick={() => setIsOnboardingModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      >
        {renderModuleContent()}
      </AppShell>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <OnboardingOrgModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
      />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TimezoneProvider>
        <MainApp />
      </TimezoneProvider>
    </AuthProvider>
  );
};

export default App;
