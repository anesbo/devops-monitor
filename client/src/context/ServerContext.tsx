import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ServerNode, ClusterTelemetry, MetricPoint, AlertItem, LogEntry, TimeRange, ViewTab } from '../types';
import { api, calculateTelemetry } from '../services/api';
import { 
  Theme, 
  ThemeContext, 
  getInitialTheme, 
  applyThemeToDocument, 
  THEME_STORAGE_KEY 
} from './ThemeContext';

interface ServerContextType {
  // Navigation & View Tab
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;

  // Selected Node
  selectedNodeId: string; // 'all' or node id
  setSelectedNodeId: (id: string) => void;
  selectedNode: ServerNode | undefined;

  // Server Fleet State
  nodes: ServerNode[];
  isLoadingNodes: boolean;

  // Cluster Telemetry
  telemetry: ClusterTelemetry;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;

  // Metrics History
  metricsHistory: MetricPoint[];
  isLoadingMetrics: boolean;

  // Alerts & Incidents
  alerts: AlertItem[];
  activeIncidentsCount: number;
  unreadIncidentsCount: number;
  acknowledgeAlert: (id: string) => Promise<void>;
  resolveAlert: (id: string) => Promise<void>;

  // Live Logs
  logs: LogEntry[];

  // Polling Controller
  isPolling: boolean;
  setIsPolling: (active: boolean) => void;
  togglePolling: () => void;
  pollingInterval: number; // in milliseconds (e.g. 2500)
  setPollingInterval: (ms: number) => void;
  lastRefreshed: Date;
  manualRefresh: () => Promise<void>;

  // Global Filter / Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Layout UI State
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;

  // Theme Management
  theme: Theme;
  toggleTheme: () => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

const DEFAULT_TELEMETRY: ClusterTelemetry = {
  totalNodes: 0,
  healthyCount: 0,
  warningCount: 0,
  criticalCount: 0,
  offlineCount: 0,
  avgCpu: 0,
  avgMemory: 0,
  avgDisk: 0,
  avgLatencyMs: 0,
  totalThroughputMbps: 0,
  activeAlertsCount: 0,
  healthStatus: 'optimal',
  systemMessage: 'Initializing cluster telemetry...'
};

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('15m');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Fleet & Telemetry Data
  const [nodes, setNodes] = useState<ServerNode[]>([]);
  const [isLoadingNodes, setIsLoadingNodes] = useState<boolean>(true);
  const [telemetry, setTelemetry] = useState<ClusterTelemetry>(DEFAULT_TELEMETRY);
  const [metricsHistory, setMetricsHistory] = useState<MetricPoint[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Polling Controls (2.5s default interval)
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [pollingInterval, setPollingInterval] = useState<number>(2500);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Theme Management (coordinated with ThemeContext if available, or self-contained)
  const existingThemeContext = useContext(ThemeContext);
  const [internalTheme, setInternalTheme] = useState<Theme>(getInitialTheme);

  const theme = existingThemeContext?.theme ?? internalTheme;
  const toggleTheme = useCallback(() => {
    if (existingThemeContext) {
      existingThemeContext.toggleTheme();
    } else {
      setInternalTheme(prev => {
        const next = prev === 'dark' ? 'light' : 'dark';
        applyThemeToDocument(next);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch (err) {
          console.warn('Failed to save theme to localStorage:', err);
        }
        return next;
      });
    }
  }, [existingThemeContext]);

  useEffect(() => {
    if (!existingThemeContext) {
      applyThemeToDocument(internalTheme);
    }
  }, [existingThemeContext, internalTheme]);

  // Toggle Sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Toggle Polling
  const togglePolling = useCallback(() => {
    setIsPolling(prev => !prev);
  }, []);

  // Fetch Fleet Data
  const fetchFleetData = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoadingNodes(true);
    try {
      const [fetchedNodes, fetchedTelemetry, fetchedAlerts, fetchedLogs] = await Promise.all([
        api.getNodes(),
        api.getLiveTelemetry(selectedNodeId),
        api.getAlerts(),
        api.getLogs(selectedNodeId, 25)
      ]);

      setNodes(fetchedNodes);
      setTelemetry(fetchedTelemetry || calculateTelemetry(fetchedNodes));
      setAlerts(fetchedAlerts);
      setLogs(fetchedLogs);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching cluster data:', err);
    } finally {
      if (isInitial) setIsLoadingNodes(false);
    }
  }, [selectedNodeId]);

  // Fetch History Metrics
  const fetchMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const history = await api.getMetricsHistory(timeRange, selectedNodeId);
      setMetricsHistory(history);
    } catch (err) {
      console.error('Error fetching metrics history:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [timeRange, selectedNodeId]);

  // Manual Refresh
  const manualRefresh = useCallback(async () => {
    await Promise.all([fetchFleetData(false), fetchMetrics()]);
  }, [fetchFleetData, fetchMetrics]);

  // Initial Mount
  useEffect(() => {
    fetchFleetData(true);
    fetchMetrics();
  }, [fetchFleetData, fetchMetrics]);

  // Real-time Polling controller
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      fetchFleetData(false);
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [isPolling, pollingInterval, fetchFleetData]);

  // Alert Actions
  const acknowledgeAlert = useCallback(async (id: string) => {
    const updated = await api.acknowledgeAlert(id);
    setAlerts(updated);
  }, []);

  const resolveAlert = useCallback(async (id: string) => {
    const updated = await api.resolveAlert(id);
    setAlerts(updated);
  }, []);

  // Computed values
  const selectedNode = useMemo(() => {
    if (selectedNodeId === 'all') return undefined;
    return nodes.find(n => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  const activeIncidentsCount = useMemo(() => {
    return alerts.filter(a => !a.resolved).length;
  }, [alerts]);

  const unreadIncidentsCount = useMemo(() => {
    return alerts.filter(a => !a.acknowledged && !a.resolved).length;
  }, [alerts]);

  const value: ServerContextType = {
    activeTab,
    setActiveTab,
    selectedNodeId,
    setSelectedNodeId,
    selectedNode,
    nodes,
    isLoadingNodes,
    telemetry,
    timeRange,
    setTimeRange,
    metricsHistory,
    isLoadingMetrics,
    alerts,
    activeIncidentsCount,
    unreadIncidentsCount,
    acknowledgeAlert,
    resolveAlert,
    logs,
    isPolling,
    setIsPolling,
    togglePolling,
    pollingInterval,
    setPollingInterval,
    lastRefreshed,
    manualRefresh,
    searchQuery,
    setSearchQuery,
    isSidebarCollapsed,
    toggleSidebar,
    setIsSidebarCollapsed,
    theme,
    toggleTheme,
  };

  return (
    <ServerContext.Provider value={value}>
      {children}
    </ServerContext.Provider>
  );
};

export function useServerState(): ServerContextType {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServerState must be used within a ServerProvider');
  }
  return context;
}

export type { Theme } from './ThemeContext';
export { ThemeProvider, useTheme } from './ThemeContext';
