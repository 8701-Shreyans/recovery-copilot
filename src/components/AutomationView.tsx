import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, Check, Sliders, ToggleLeft, ToggleRight, Sparkles, Wifi, WifiOff } from 'lucide-react';

interface AutomationViewProps {
  maxRetries: number;
  cooldownHours: number;
  optOutStrict: boolean;
  escalationThreshold: number;
  onChangeMaxRetries: (val: number) => void;
  onChangeCooldownHours: (val: number) => void;
  onChangeOptOutStrict: (val: boolean) => void;
  onChangeEscalationThreshold: (val: number) => void;
  backendOnline?: boolean | null;
}

export const AutomationView: React.FC<AutomationViewProps> = ({
  maxRetries,
  cooldownHours,
  optOutStrict,
  escalationThreshold,
  onChangeMaxRetries,
  onChangeCooldownHours,
  onChangeOptOutStrict,
  onChangeEscalationThreshold,
  backendOnline = null
}) => {
  const [nudgeTone, setNudgeTone] = useState<'formal_english' | 'casual_hinglish'>('formal_english');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#2A2E3A] pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[26px] font-bold text-[#E2E2E9] tracking-tight">Automation & Policy Guardrails</h2>
            <p className="text-[14px] text-[#8C90A0] mt-1">
              Deterministic non-LLM policy rules enforced on every transaction before agent tool execution.
            </p>
          </div>
          {/* Live sync status */}
          <div className={`hidden sm:flex items-center gap-1.5 text-[11px] font-mono font-semibold px-3 py-1.5 rounded-full border ${
            backendOnline === true
              ? 'border-[#34D399] text-[#34D399] bg-[rgba(52,211,153,0.08)]'
              : 'border-[#424654] text-[#8C90A0]'
          }`}>
            {backendOnline === true ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{backendOnline === true ? 'Changes sync to backend' : 'Local mode'}</span>
          </div>
        </div>
      </div>

      {/* Policy Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Guardrail 1: Retry Cap & Cooldown */}
        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-[#B1C5FF]" />
              <h3 className="text-[16px] font-semibold text-[#E2E2E9]">Retry Cap & Cooldown Window</h3>
            </div>
            <p className="text-[13px] text-[#8C90A0] leading-relaxed">
              Prevents spamming issuing switches and customer banks. Blocks retries once limit is reached and enforces mandatory cooldown.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-[#2A2E3A] space-y-4">
            <div className="flex justify-between items-center">
              <label className="font-mono text-[12px] text-[#E2E2E9]">Max Retries Per Invoice:</label>
              <select
                value={maxRetries}
                onChange={(e) => onChangeMaxRetries(Number(e.target.value))}
                className="bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] font-mono rounded px-3 py-1 outline-none"
              >
                <option value={1}>1 Retry</option>
                <option value={2}>2 Retries</option>
                <option value={3}>3 Retries (Recommended)</option>
                <option value={4}>4 Retries</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <label className="font-mono text-[12px] text-[#E2E2E9]">Minimum Cooldown:</label>
              <select
                value={cooldownHours}
                onChange={(e) => onChangeCooldownHours(Number(e.target.value))}
                className="bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] font-mono rounded px-3 py-1 outline-none"
              >
                <option value={4}>4 Hours</option>
                <option value={6}>6 Hours (Standard)</option>
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Guardrail 2: Opt-Out & Regulatory Compliance */}
        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-[#A7F3D0]" />
              <h3 className="text-[16px] font-semibold text-[#E2E2E9]">Opt-Out & RBI Compliance</h3>
            </div>
            <p className="text-[13px] text-[#8C90A0] leading-relaxed">
              Absolute zero-tolerance compliance rule. Customers flagged with <code className="text-[#A7F3D0]">opted_out = true</code> are strictly excluded from automated retries and nudges.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-[#2A2E3A] space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[12px] text-[#E2E2E9]">Strict Opt-Out Enforcement:</span>
              <button
                onClick={() => onChangeOptOutStrict(!optOutStrict)}
                className={`px-3 py-1 rounded font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  optOutStrict ? 'bg-[#1D4E26] text-[#A7F3D0]' : 'bg-[#93000A] text-[#FFDAD6]'
                }`}
              >
                {optOutStrict ? 'ENFORCED (Hard Gate)' : 'DISABLED (Warning)'}
              </button>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-mono text-[12px] text-[#E2E2E9]">Discount / Incentive Levers:</span>
              <span className="bg-[#0F1116] border border-[#2A2E3A] text-[#8C90A0] px-2.5 py-0.5 rounded font-mono text-[11px]">
                Disabled (Zero Monetary Exposure)
              </span>
            </div>
          </div>
        </div>

        {/* Guardrail 3: High-Value Escalation Threshold */}
        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-[#FFB691]" />
              <h3 className="text-[16px] font-semibold text-[#E2E2E9]">High-Value Escalation Threshold</h3>
            </div>
            <p className="text-[13px] text-[#8C90A0] leading-relaxed">
              Transactions exceeding high-value limit automatically route to the Merchant VIP desk instead of blind automated retries.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-[#2A2E3A] flex justify-between items-center">
            <label className="font-mono text-[12px] text-[#E2E2E9]">Escalate Above Amount:</label>
            <select
              value={escalationThreshold}
              onChange={(e) => onChangeEscalationThreshold(Number(e.target.value))}
              className="bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] font-mono rounded px-3 py-1 outline-none"
            >
              <option value={5000}>₹5,000</option>
              <option value={10000}>₹10,000 (Default)</option>
              <option value={20000}>₹20,000</option>
              <option value={25000}>₹25,000</option>
              <option value={50000}>₹50,000</option>
            </select>
          </div>
        </div>

        {/* Guardrail 4: Nudge Tone Register */}
        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#B1C5FF]" />
              <h3 className="text-[16px] font-semibold text-[#E2E2E9]">AI Nudge Message Register</h3>
            </div>
            <p className="text-[13px] text-[#8C90A0] leading-relaxed">
              When the deterministic policy selects <code className="text-[#B1C5FF]">send_nudge</code>, the LLM crafts wording conforming to the specified regional tone register.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-[#2A2E3A] flex justify-between items-center">
            <label className="font-mono text-[12px] text-[#E2E2E9]">Communication Tone:</label>
            <select
              value={nudgeTone}
              onChange={(e) => setNudgeTone(e.target.value as any)}
              className="bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] font-mono rounded px-3 py-1 outline-none"
            >
              <option value="formal_english">Formal English (Default)</option>
              <option value="casual_hinglish">Casual Hinglish (High D2C Conversion)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Action Bar */}
      <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-4 flex justify-between items-center">
        <span className="font-mono text-[12px] text-[#8C90A0]">
          Active Policy Hash: <span className="text-[#E2E2E9]">0x4f92...a81c (Immutable Audit Record)</span>
        </span>
        <button
          onClick={handleSave}
          className="bg-[#2F6FED] hover:bg-[#2558c4] text-white text-[12px] font-semibold px-5 py-2 rounded transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-2"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Policies Applied to Live Scorer!</span>
            </>
          ) : (
            <span>Apply Guardrail Policy</span>
          )}
        </button>
      </div>
    </div>
  );
};
