import React from 'react';
import { ServerProvider, useServerState } from './context/ServerContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewView } from './components/views/OverviewView';
import { NodesView } from './components/views/NodesView';
import { AlertsView } from './components/views/AlertsView';
import { LogsView } from './components/views/LogsView';

const MainContent: React.FC = () => {
  const { activeTab } = useServerState();

  switch (activeTab) {
    case 'overview':
      return <OverviewView />;
    case 'nodes':
      return <NodesView />;
    case 'alerts':
      return <AlertsView />;
    case 'logs':
      return <LogsView />;
    default:
      return <OverviewView />;
  }
};

export function App() {
  return (
    <ServerProvider>
      <AppLayout>
        <MainContent />
      </AppLayout>
    </ServerProvider>
  );
}

export default App;
