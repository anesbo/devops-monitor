import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X, 
  Volume2, 
  VolumeX, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { soundAlert } from '../utils/soundAlert';

export interface ToastItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  nodeName?: string;
  nodeId?: string;
  timestamp?: string;
  onInspect?: () => void;
  onAcknowledge?: () => void;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  isMuted: boolean;
  toggleSound: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(soundAlert.getIsMuted());

  const toggleSound = useCallback(() => {
    const nextState = soundAlert.toggleMute();
    setIsMuted(nextState);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { ...toast, id };
    
    // Play synthesized Web Audio chime according to severity
    soundAlert.play(toast.severity);

    setToasts(prev => [newToast, ...prev].slice(0, 5)); // Keep max 5 visible toasts

    // Auto-dismiss non-critical after 8 seconds; critical stay longer (15s)
    const timer = setTimeout(() => {
      removeToast(id);
    }, toast.severity === 'critical' ? 15000 : 8000);

    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, isMuted, toggleSound }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast, isMuted, toggleSound } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none p-2 sm:p-0">
      {/* Sound Controller Pill */}
      <div className="self-end pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-slate-200 text-slate-700 dark:bg-slate-900/90 dark:border-slate-700/80 dark:text-slate-300 shadow-lg text-[11px] transition-colors duration-200">
        <button
          type="button"
          onClick={toggleSound}
          className="flex items-center gap-1.5 hover:text-slate-950 dark:hover:text-white transition-colors"
          title={isMuted ? 'Telemetry alert audio muted' : 'Telemetry alert audio enabled'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span>Alert Audio Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-500" />
              <span>Alert Audio Active</span>
            </>
          )}
        </button>
      </div>

      {toasts.map((toast) => {
        const isCritical = toast.severity === 'critical';
        const isWarning = toast.severity === 'warning';
        
        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100 rounded-xl p-4 border shadow-2xl backdrop-blur-md ${
              isCritical
                ? 'bg-white/95 border-rose-300 text-slate-900 shadow-[0_0_30px_rgba(244,63,94,0.15)] dark:bg-[#180a0e]/95 dark:border-rose-500/60 dark:text-slate-100 dark:shadow-[0_0_30px_rgba(244,63,94,0.35)]'
                : isWarning
                ? 'bg-white/95 border-amber-300 text-slate-900 shadow-[0_0_25px_rgba(245,158,11,0.15)] dark:bg-[#181206]/95 dark:border-amber-500/60 dark:text-slate-100 dark:shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                : 'bg-white/95 border-cyan-300 text-slate-900 shadow-[0_0_25px_rgba(6,182,212,0.15)] dark:bg-[#0b1424]/95 dark:border-cyan-500/50 dark:text-slate-100 dark:shadow-[0_0_25px_rgba(6,182,212,0.2)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                isCritical 
                  ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 animate-pulse' 
                  : isWarning 
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400' 
                  : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
              }`}>
                {isCritical ? (
                  <AlertOctagon className="w-5 h-5 stroke-[2.2]" />
                ) : isWarning ? (
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                ) : (
                  <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/40'
                    }`}>
                      {toast.severity}
                    </span>
                    {toast.nodeName && (
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                        {toast.nodeName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 -mr-1 -mt-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                  {toast.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">
                  {toast.description}
                </p>

                {(toast.onInspect || toast.onAcknowledge) && (
                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                    {toast.onInspect && (
                      <button
                        type="button"
                        onClick={() => {
                          toast.onInspect?.();
                          removeToast(toast.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {toast.onAcknowledge && (
                      <button
                        type="button"
                        onClick={() => {
                          toast.onAcknowledge?.();
                          removeToast(toast.id);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:text-white transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
