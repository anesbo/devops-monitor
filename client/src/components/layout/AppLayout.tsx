import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100">
      {/* Collapsible Modern Sidebar */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Observability Header Bar */}
        <Header />

        {/* Dynamic View Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#090d16] to-[#070a12] space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
