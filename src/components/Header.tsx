import React, { useState } from 'react';
import { Search, Bell, Settings, Download, X, ShieldAlert, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { ActiveNavTab } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  backendOnline?: boolean | null;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenExport,
  onOpenSettings,
  activeTab,
  onSelectTab,
  backendOnline = null
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const notifications = [
    {
      id: 'n1',
      title: 'Guardrail Intervention Triggered',
      desc: 'EVT-992-ALPHA: Model intent Force Charge halted due to Account Frozen block.',
      time: '12m ago',
      type: 'warning'
    },
    {
      id: 'n2',
      title: 'Batch Auto-Recovery Complete',
      desc: 'Batch recovery completed. Check Dashboard for latest recovered amount.',
      time: '34m ago',
      type: 'success'
    },
    {
      id: 'n3',
      title: 'Model Calibration Updated',
      desc: 'rc-v4.2-ensemble evaluated with 98% precision on held-out dataset.',
      time: '2h ago',
      type: 'info'
    }
  ];

  return (
    <header 
      id="top-header"
      className="bg-[#111318] border-b border-[#2A2E3A] fixed top-0 w-full md:w-[calc(100%-280px)] md:left-[280px] h-16 z-30 flex justify-between items-center px-6 transition-all"
    >
      {/* Brand / Context Title */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-[20px] font-bold text-[#E2E2E9] tracking-tight leading-none">
            Recovery Copilot
          </h1>
          <span className="text-[11px] font-medium text-[#8C90A0] mt-1">
            AI Revenue Recovery
          </span>
        </div>
        {/* Backend connection status pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold font-mono transition-all"
          style={{
            borderColor: backendOnline === null ? '#424654' : backendOnline ? '#34D399' : '#F59E0B',
            color: backendOnline === null ? '#8C90A0' : backendOnline ? '#34D399' : '#F59E0B',
            background: backendOnline === null ? 'transparent' : backendOnline ? 'rgba(52,211,153,0.08)' : 'rgba(245,158,11,0.08)',
          }}
        >
          {backendOnline === null && <Loader2 className="w-3 h-3 animate-spin" />}
          {backendOnline === true && <Wifi className="w-3 h-3" />}
          {backendOnline === false && <WifiOff className="w-3 h-3" />}
          <span>
            {backendOnline === null ? 'CONNECTING' : backendOnline ? 'API LIVE' : 'OFFLINE MODE'}
          </span>
        </div>
      </div>

      {/* Center/Right Controls */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        {/* Search Bar */}
        <div className="relative w-72 hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C90A0]" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search event ID or failure code"
            className="w-full bg-[#171A21] border border-[#2A2E3A] rounded-md pl-9 pr-8 py-1.5 font-mono text-[12px] text-[#E2E2E9] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED] transition-colors placeholder:text-[#6B7280] outline-none"
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C90A0] hover:text-[#E2E2E9]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 relative">
          {/* Notification Button */}
          <div className="relative">
            <button
              id="notifications-toggle-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-[#C2C6D7] hover:text-[#E2E2E9] hover:bg-[#282A2F] rounded-md transition-colors cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full ring-2 ring-[#111318]"></span>
            </button>

            {/* Notification Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[#171A21] border border-[#2A2E3A] rounded-lg shadow-2xl py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#2A2E3A] mb-2">
                  <span className="text-[12px] font-bold text-[#E2E2E9] uppercase tracking-wider">Audit Alerts</span>
                  <span className="text-[10px] text-[#8C90A0]">3 New</span>
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {notifications.map((item) => (
                    <div key={item.id} className="p-2 rounded bg-[#0F1116] border border-[#2A2E3A]/60 text-left">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#E2E2E9]">
                        <span className="flex items-center gap-1">
                          {item.type === 'warning' && <ShieldAlert className="w-3 h-3 text-[#FFB4AB]" />}
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#8C90A0]">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-[#8C90A0] mt-1 leading-snug">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings Button */}
          <button
            id="settings-toggle-btn"
            onClick={onOpenSettings}
            className="p-2 text-[#C2C6D7] hover:text-[#E2E2E9] hover:bg-[#282A2F] rounded-md transition-colors cursor-pointer"
            title="Settings & Policies"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Export Button */}
          <button
            id="export-top-btn"
            onClick={onOpenExport}
            className="bg-[#2F6FED] hover:bg-[#2558c4] text-white font-semibold text-[12px] px-4 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ml-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* User Profile Avatar */}
          <div className="relative ml-2">
            <button
              id="profile-toggle-btn"
              onClick={() => setShowProfileModal(!showProfileModal)}
              className="w-8 h-8 rounded-full border border-[#424654] overflow-hidden focus:ring-2 focus:ring-[#2F6FED] cursor-pointer"
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuATGxb57H2hpF-l37Deh6kc-cgv9P9frDX5Xmq4EbeoPDGCGjR35RJdmR53WYtH0F9OFBEMaU4w8HYVvK0FLBqpU0t2J_ZC-F9zr5rFGMq5dW-CUbY4tQqXMgczZq1FaMyY6Z_uYFgsi4Bsl-cG-KeGa2CM8eAaXNoaRdAZWhsVJwyoXIxD8ajvCgLzcSYI_V2rKclJVoAXjX0fGu3-ACI86LD9SEEZqNHOqKY_cuNww5iBC32j66Fvig"
                alt="Ops User Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>

            {/* Profile Popover */}
            {showProfileModal && (
              <div className="absolute right-0 mt-2 w-64 bg-[#171A21] border border-[#2A2E3A] rounded-lg shadow-2xl p-4 z-50 text-left">
                <div className="flex items-center gap-3 pb-3 border-b border-[#2A2E3A]">
                  <div className="w-10 h-10 rounded-full bg-[#2F6FED]/20 border border-[#2F6FED] flex items-center justify-center font-bold text-sm text-[#B1C5FF]">
                    SJ
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-[13px] font-bold text-[#E2E2E9] truncate">Merchant Ops Admin</h4>
                    <p className="text-[11px] text-[#8C90A0] truncate">sj0261@srmist.edu.in</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-[11px] text-[#8C90A0]">
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="text-[#E2E2E9] font-medium">Finance & Risk Ops</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span className="text-[#A7F3D0] font-mono">Production Sandbox</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Gateway:</span>
                    <span className="text-[#B1C5FF] font-mono">Razorpay Multi-Rail</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
