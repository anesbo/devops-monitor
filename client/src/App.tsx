import React, { useEffect, useRef } from 'react';
import { ServerProvider, useServerState } from './context/ServerContext';
import { ToastProvider, useToast } from './components/AlertToast';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewView } from './components/views/OverviewView';
import { NodesView } from './components/views/NodesView';
import { AlertsView } from './components/views/AlertsView';
import { LogsView } from './components/views/LogsView';

const MainContent: React.FC = () => {
  const { activeTab, alerts, setSelectedNodeId, setActiveTab } = useServerState();
  const { addToast } = useToast();
  const seenIncidentIdsRef = useRef<Set<string>>(new Set());

  // Background monitor: Fire toast & synthesized sound when new critical incident arrives
  useEffect(() => {
    if (alerts.length === 0) return;

    alerts.forEach(alert => {
      if (!alert.resolved && alert.severity === 'critical' && !seenIncidentIdsRef.current.has(alert.id)) {
        seenIncidentIdsRef.current.add(alert.id);
        
        // Show visual toast notification with sound
        addToast({
          title: `CRITICAL ALERT: ${alert.title}`,
          description: alert.description,
          severity: 'critical',
          nodeName: alert.nodeName,
          nodeId: alert.nodeId,
          timestamp: alert.timestamp,
          onInspect: () => {
            setSelectedNodeId(alert.nodeId);
            setActiveTab('logs');
          }
        });
      }
    });
  }, [alerts, addToast, setSelectedNodeId, setActiveTab]);

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
      <ToastProvider>
        <AppLayout>
          <MainContent />
        </AppLayout>
      </ToastProvider>
    </ServerProvider>
  );
}

export default App;
