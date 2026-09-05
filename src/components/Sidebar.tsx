import React from 'react';
import { 
  LayoutDashboard, 
  RotateCw, 
  Banknote, 
  Bot, 
  BarChart3, 
  HelpCircle, 
  LogOut,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ActiveNavTab } from '../types';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  onOpenSupport?: () => void;
  onOpenAutomation?: () => void;
  eventsCount?: string | number;
  recoveryRate?: number | string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onSelectTab,
  onOpenSupport,
  eventsCount = '50 Txns',
  recoveryRate = 20.7
}) => {
  const formattedRate = typeof recoveryRate === 'number' ? `${recoveryRate.toFixed(1)}%` : recoveryRate;
  const formattedCount = typeof eventsCount === 'number' ? `${eventsCount} Txns` : eventsCount;

  return (
    <aside 
      id="ops-sidebar" 
      className="hidden md:flex bg-[#171A21] text-[#E2E2E9] border-r border-[#2A2E3A] fixed left-0 top-0 h-full w-[280px] flex-col py-8 px-4 z-40 select-none"
    >
      {/* Brand Header */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2F6FED] flex items-center justify-center text-white font-bold text-base shadow-sm">
            <RotateCw className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[#E2E2E9] tracking-tight leading-tight">Ops Console</h1>
            <p className="font-mono text-[11px] text-[#8C90A0] mt-0.5">v2.4.0-stable</p>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1.5">
        <button
          id="nav-dashboard-btn"
          onClick={() => onSelectTab('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#44474F] text-[#FFFFFF] shadow-sm font-semibold'
              : 'text-[#C2C6D7] hover:text-[#FFFFFF] hover:bg-[#282A2F]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0 text-[#B1C5FF]" />
          <span>Dashboard</span>
        </button>

        <button
          id="nav-events-btn"
          onClick={() => onSelectTab('events')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-[#44474F] text-[#FFFFFF] shadow-sm font-semibold'
              : 'text-[#C2C6D7] hover:text-[#FFFFFF] hover:bg-[#282A2F]'
          }`}
        >
          <RotateCw className="w-4 h-4 shrink-0" />
          <span>Events</span>
          <span className="ml-auto font-mono text-[10px] bg-[#0F1116] border border-[#2A2E3A] px-1.5 py-0.5 rounded text-[#8C90A0]">
            {formattedCount}
          </span>
        </button>

        <button
          id="nav-recoveries-btn"
          onClick={() => onSelectTab('recoveries')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
            activeTab === 'recoveries'
              ? 'bg-[#44474F] text-[#FFFFFF] shadow-sm font-semibold'
              : 'text-[#C2C6D7] hover:text-[#FFFFFF] hover:bg-[#282A2F]'
          }`}
        >
          <Banknote className="w-4 h-4 shrink-0" />
          <span>Recoveries</span>
          <span className="ml-auto font-mono text-[10px] text-[#A7F3D0] bg-[#1D4E26]/60 px-1.5 py-0.5 rounded">
            {formattedRate}
          </span>
        </button>

        <button
          id="nav-automation-btn"
          onClick={() => onSelectTab('automation')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
            activeTab === 'automation'
              ? 'bg-[#44474F] text-[#FFFFFF] shadow-sm font-semibold'
              : 'text-[#C2C6D7] hover:text-[#FFFFFF] hover:bg-[#282A2F]'
          }`}
        >
          <Bot className="w-4 h-4 shrink-0" />
          <span>Automation</span>
          <span className="ml-auto text-[10px] flex items-center gap-1 text-[#FDE68A]">
            <ShieldCheck className="w-3 h-3" />
            Active
          </span>
        </button>

        <button
          id="nav-analytics-btn"
          onClick={() => onSelectTab('analytics')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-[#44474F] text-[#FFFFFF] shadow-sm font-semibold'
              : 'text-[#C2C6D7] hover:text-[#FFFFFF] hover:bg-[#282A2F]'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0 text-[#B1C5FF]" />
          <span>Analytics</span>
        </button>
      </nav>

      {/* Realtime Engine Status Pill */}
      <div className="my-4 px-3 py-2.5 bg-[#0F1116] border border-[#2A2E3A] rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-[#E2E2E9]">Inference Engine</span>
          </div>
          <span className="font-mono text-[10px] text-[#8C90A0]">42ms</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#8C90A0]">
          <span>Guardrails</span>
          <span className="text-[#A7F3D0] font-mono">100% Gated</span>
        </div>
      </div>

      {/* Footer Utility Links */}
      <div className="mt-auto space-y-1 border-t border-[#2A2E3A] pt-4">
        <button
          id="nav-support-btn"
          onClick={onOpenSupport}
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-[#8C90A0] hover:text-[#E2E2E9] hover:bg-[#282A2F] rounded-lg transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Support & Docs</span>
        </button>

        <button
          id="nav-signout-btn"
          onClick={() => {
            alert('Razorpay AI Revenue Recovery session active. Bounded role: Merchant Finance Ops.');
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-[#8C90A0] hover:text-[#E2E2E9] hover:bg-[#282A2F] rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
