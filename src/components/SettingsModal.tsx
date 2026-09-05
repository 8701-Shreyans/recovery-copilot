import React, { useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Key, 
  Cpu, 
  CreditCard, 
  ShieldCheck, 
  Check, 
  Save, 
  ToggleLeft, 
  ToggleRight,
  Server,
  Zap,
  Lock,
  RefreshCw
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendOnline: boolean | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  backendOnline 
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'models' | 'gateways' | 'security'>('general');
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8000/api');
  const [primaryModel, setPrimaryModel] = useState('claude-3-5-sonnet');
  const [fallbackModel, setFallbackModel] = useState('gemini-2-5-flash');
  const [temperature, setTemperature] = useState('0.1');
  const [razorpayKey, setRazorpayKey] = useState('rzp_test_9A8B7C6D5E4F');
  const [simulateOutage, setSimulateOutage] = useState(false);
  const [piiMasking, setPiiMasking] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#171A21] border border-[#2A2E3A] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden p-6 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2E3A] pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2F6FED]/20 border border-[#2F6FED]/50 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4 text-[#B1C5FF]" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#E2E2E9]">
                System Infrastructure &amp; API Settings
              </h3>
              <p className="text-[11px] text-[#8C90A0]">
                Configure AI model routing, payment gateway sandbox, and security policies.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8C90A0] hover:text-[#E2E2E9] p-1.5 rounded-md hover:bg-[#282A2F] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-[#2A2E3A] pb-2 mb-4 shrink-0 font-mono text-[12px]">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-[#2F6FED] text-white font-semibold'
                : 'text-[#8C90A0] hover:text-[#E2E2E9] hover:bg-[#282A2F]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            General &amp; API
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'models'
                ? 'bg-[#2F6FED] text-white font-semibold'
                : 'text-[#8C90A0] hover:text-[#E2E2E9] hover:bg-[#282A2F]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            LLM Models
          </button>
          <button
            onClick={() => setActiveTab('gateways')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'gateways'
                ? 'bg-[#2F6FED] text-white font-semibold'
                : 'text-[#8C90A0] hover:text-[#E2E2E9] hover:bg-[#282A2F]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Gateways
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-[#2F6FED] text-white font-semibold'
                : 'text-[#8C90A0] hover:text-[#E2E2E9] hover:bg-[#282A2F]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Security &amp; PII
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-[13px] text-[#C2C6D7]">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-[#E2E2E9]">FastAPI Backend URL</label>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    backendOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {backendOnline ? 'CONNECTED (PORT 8000)' : 'LOCAL SIMULATION'}
                  </span>
                </div>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full bg-[#171A21] border border-[#2A2E3A] rounded-md px-3 py-2 font-mono text-[12px] text-[#E2E2E9] focus:border-[#2F6FED] outline-none"
                  placeholder="http://127.0.0.1:8000/api"
                />
                <p className="text-[11px] text-[#8C90A0]">
                  Target endpoint for batch processing, decision traces, and compliance rules.
                </p>
              </div>

              <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg space-y-2">
                <span className="font-semibold text-[#E2E2E9]">Operational Environment</span>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2.5 bg-[#171A21] border border-[#2F6FED] rounded-md text-[#B1C5FF] flex items-center justify-between">
                    <span>Production Sandbox</span>
                    <Check className="w-3.5 h-3.5 text-[#34D399]" />
                  </div>
                  <div className="p-2.5 bg-[#171A21] border border-[#2A2E3A] rounded-md text-[#8C90A0] opacity-60">
                    <span>Live Production (Locked)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg space-y-3">
                <label className="font-semibold text-[#E2E2E9] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FDE68A]" />
                  Primary Classification &amp; Strategy Agent
                </label>
                <select
                  value={primaryModel}
                  onChange={(e) => setPrimaryModel(e.target.value)}
                  className="w-full bg-[#171A21] border border-[#2A2E3A] rounded-md px-3 py-2 font-mono text-[12px] text-[#E2E2E9] focus:border-[#2F6FED] outline-none"
                >
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Tool Calling &amp; SHAP Weights)</option>
                  <option value="gemini-2-5-flash">Gemini 2.5 Flash (High Throughput)</option>
                  <option value="heuristic">Heuristic Rule Engine (Deterministic Offline)</option>
                </select>
                <p className="text-[11px] text-[#8C90A0]">
                  Executes the <code className="text-[#B1C5FF]">classify_failure</code> and <code className="text-[#B1C5FF]">decide_recovery_action</code> schemas.
                </p>
              </div>

              <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg space-y-3">
                <label className="font-semibold text-[#E2E2E9] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#34D399]" />
                  Secondary Fallback Model
                </label>
                <select
                  value={fallbackModel}
                  onChange={(e) => setFallbackModel(e.target.value)}
                  className="w-full bg-[#171A21] border border-[#2A2E3A] rounded-md px-3 py-2 font-mono text-[12px] text-[#E2E2E9] focus:border-[#2F6FED] outline-none"
                >
                  <option value="gemini-2-5-flash">Gemini 2.5 Flash (Rate-Limit Protection)</option>
                  <option value="heuristic">Heuristic Rule Engine (Zero Latency)</option>
                </select>
                <p className="text-[11px] text-[#8C90A0]">
                  Automatically triggered if primary LLM encounters 429 rate limits or network dropouts.
                </p>
              </div>

              <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-semibold text-[#E2E2E9] block">Sampling Temperature</span>
                  <span className="text-[11px] text-[#8C90A0]">Near-zero for consistent structured JSON responses</span>
                </div>
                <span className="font-mono text-[13px] text-[#B1C5FF] bg-[#171A21] border border-[#2A2E3A] px-3 py-1 rounded">
                  0.1 (Strict)
                </span>
              </div>
            </div>
          )}

          {activeTab === 'gateways' && (
            <div className="space-y-4">
              <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg space-y-3">
                <label className="font-semibold text-[#E2E2E9] flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#B1C5FF]" />
                  Razorpay Sandbox API Key
                </label>
                <input
                  type="text"
                  value={razorpayKey}
                  onChange={(e) => setRazorpayKey(e.target.value)}
                  className="w-full bg-[#171A21] border border-[#2A2E3A] rounded-md px-3 py-2 font-mono text-[12px] text-[#E2E2E9] focus:border-[#2F6FED] outline-none"
                />
                <p className="text-[11px] text-[#8C90A0]">
                  Target test-mode key for synthetic mandate capture retries. No real funds are debited.
                </p>
              </div>

              <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-semibold text-[#E2E2E9] block">Simulate WhatsApp Provider Outage</span>
                  <span className="text-[11px] text-[#8C90A0]">
                    Triggers autonomous fallback from WhatsApp to SMS (What Broke incident test)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulateOutage(!simulateOutage)}
                  className="text-[#2F6FED] hover:text-[#B1C5FF] cursor-pointer"
                >
                  {simulateOutage ? (
                    <ToggleRight className="w-7 h-7 text-[#EF4444]" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-[#6B7280]" />
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-semibold text-[#E2E2E9] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#A7F3D0]" />
                    Customer PII Masking &amp; Hashing
                  </span>
                  <span className="text-[11px] text-[#8C90A0]">
                    Mask phone numbers and store zero raw PII in opt-out registry
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#34D399] bg-[#1D4E26]/50 border border-[#1D4E26] px-2.5 py-1 rounded">
                  ENFORCED (SHA-256)
                </span>
              </div>

              <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg space-y-2">
                <span className="font-semibold text-[#E2E2E9]">RBAC Roles &amp; Tokens</span>
                <div className="space-y-1.5 font-mono text-[11px] text-[#8C90A0]">
                  <div className="flex justify-between p-2 bg-[#171A21] rounded border border-[#2A2E3A]">
                    <span>Admin Token:</span>
                    <span className="text-[#E2E2E9]">rc-admin-secret-key-2026</span>
                  </div>
                  <div className="flex justify-between p-2 bg-[#171A21] rounded border border-[#2A2E3A]">
                    <span>Ops Token:</span>
                    <span className="text-[#E2E2E9]">rc-ops-secret-key-2026</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#2A2E3A] flex justify-between items-center shrink-0">
          <span className="text-[11px] text-[#8C90A0]">
            All changes take effect immediately on next batch evaluation.
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-[12px] text-[#8C90A0] hover:text-[#E2E2E9] hover:bg-[#282A2F] rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-[#2F6FED] hover:bg-[#2558c4] text-white text-[12px] font-semibold px-4 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
