import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 transition-colors duration-200">
      {/* Collapsible Modern Sidebar */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Observability Header Bar */}
        <Header />

        {/* Dynamic View Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-900 dark:bg-gradient-to-b dark:from-[#090d16] dark:to-[#070a12] dark:text-slate-100 space-y-6 transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};
