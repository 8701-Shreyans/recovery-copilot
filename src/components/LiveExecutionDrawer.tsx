import React, { useState } from 'react';
import { Play, Sparkles, Sliders, ShieldCheck, RefreshCw, Activity, Cpu, Layers, AlertCircle } from 'lucide-react';
import { EVAL_SCENARIOS, EvaluationScenario } from '../services/executionEngine';

interface LiveExecutionDrawerProps {
  onRunBatch: (scenario: EvaluationScenario, customRules: { maxRetries: number; cooldownHours: number; optOutStrict: boolean; escalationThreshold: number }) => void;
  isRunning: boolean;
  activeScenarioId: string;
  maxRetries: number;
  cooldownHours: number;
  optOutStrict: boolean;
  escalationThreshold: number;
  onChangeMaxRetries: (val: number) => void;
  onChangeCooldownHours: (val: number) => void;
  onChangeOptOutStrict: (val: boolean) => void;
  onChangeEscalationThreshold: (val: number) => void;
}

export const LiveExecutionDrawer: React.FC<LiveExecutionDrawerProps> = ({
  onRunBatch,
  isRunning,
  activeScenarioId,
  maxRetries,
  cooldownHours,
  optOutStrict,
  escalationThreshold,
  onChangeMaxRetries,
  onChangeCooldownHours,
  onChangeOptOutStrict,
  onChangeEscalationThreshold
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(activeScenarioId || 'baseline');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  const selectedScenario = EVAL_SCENARIOS.find(s => s.id === selectedScenarioId) || EVAL_SCENARIOS[0];

  const handleExecute = () => {
    onRunBatch(selectedScenario, {
      maxRetries,
      cooldownHours,
      optOutStrict,
      escalationThreshold
    });
  };

  return (
    <div className="bg-[#171A21] border border-[#2A2E3A] rounded-xl p-5 shadow-lg relative overflow-hidden mb-6">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#2F6FED]/10 to-transparent pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
        {/* Left Info & Title */}
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-[#2F6FED]/20 text-[#B1C5FF] border border-[#2F6FED]/40 font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED] animate-ping"></span>
              Live ML Model & Guardrail Engine
            </span>
            <span className="font-mono text-[11px] text-[#8C90A0]">Model: rc-v4.2-ensemble</span>
          </div>

          <h3 className="text-[18px] font-bold text-[#E2E2E9] tracking-tight">
            Active Batch Evaluation & Live Ingestion Runner
          </h3>
          <p className="text-[13px] text-[#8C90A0] leading-relaxed">
            Trigger real-time model inference, SHAP attribution scoring, and deterministic guardrail filtering across live synthetic traffic scenarios.
          </p>
        </div>

        {/* Right Interactive Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Scenario Selector */}
          <div className="flex flex-col">
            <label className="font-mono text-[10px] text-[#8C90A0] uppercase mb-1">Traffic Pattern</label>
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] font-mono rounded px-3 py-2 outline-none focus:border-[#2F6FED] min-w-[220px]"
            >
              {EVAL_SCENARIOS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Settings / Config Toggle */}
          <div className="flex flex-col">
            <label className="font-mono text-[10px] text-transparent select-none mb-1">Config</label>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded border text-[12px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                showConfig
                  ? 'bg-[#2F6FED]/20 border-[#2F6FED] text-[#B1C5FF]'
                  : 'bg-[#0F1116] border-[#2A2E3A] text-[#8C90A0] hover:text-[#E2E2E9]'
              }`}
              title="Configure Dynamic Guardrails"
            >
              <Sliders className="w-4 h-4" />
              <span>Guardrail Bounds</span>
            </button>
          </div>

          {/* Run Batch CTA */}
          <div className="flex flex-col">
            <label className="font-mono text-[10px] text-transparent select-none mb-1">Action</label>
            <button
              onClick={handleExecute}
              disabled={isRunning}
              className="bg-[#2F6FED] hover:bg-[#2558c4] disabled:opacity-50 text-white font-semibold text-[13px] px-5 py-2 rounded transition-all cursor-pointer flex items-center gap-2 shadow-md active:scale-95"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Evaluating Live Model...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Batch Model Scorer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Briefing */}
      <div className="mt-3 pt-3 border-t border-[#2A2E3A]/60 flex items-center justify-between text-[11px] font-mono text-[#8C90A0]">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#A7F3D0]" />
          <span>Selected: {selectedScenario.description}</span>
        </div>
        <span className="text-[#B1C5FF]">{selectedScenario.batchSize} synthetic recurring events</span>
      </div>

      {/* Expandable Guardrail Tweaks */}
      {showConfig && (
        <div className="mt-4 pt-4 border-t border-[#2A2E3A] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#0F1116]/80 p-4 rounded-lg animate-in fade-in duration-200">
          <div>
            <label className="font-mono text-[11px] text-[#8C90A0] block mb-1">Max Retry Velocity Cap</label>
            <select
              value={maxRetries}
              onChange={(e) => onChangeMaxRetries(Number(e.target.value))}
              className="w-full bg-[#171A21] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] font-mono rounded px-2.5 py-1.5 outline-none"
            >
              <option value={1}>1 Retry (Strict)</option>
              <option value={2}>2 Retries</option>
              <option value={3}>3 Retries (Standard)</option>
              <option value={4}>4 Retries (Aggressive)</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] text-[#8C90A0] block mb-1">Mandatory Cooldown</label>
            <select
              value={cooldownHours}
              onChange={(e) => onChangeCooldownHours(Number(e.target.value))}
              className="w-full bg-[#171A21] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] font-mono rounded px-2.5 py-1.5 outline-none"
            >
              <option value={2}>2 Hours</option>
              <option value={6}>6 Hours (Standard)</option>
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] text-[#8C90A0] block mb-1">High-Value VIP Threshold</label>
            <select
              value={escalationThreshold}
              onChange={(e) => onChangeEscalationThreshold(Number(e.target.value))}
              className="w-full bg-[#171A21] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] font-mono rounded px-2.5 py-1.5 outline-none"
            >
              <option value={5000}>₹5,000</option>
              <option value={10000}>₹10,000 (Standard)</option>
              <option value={20000}>₹20,000</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] text-[#8C90A0] block mb-1">RBI Strict Opt-Out Filter</label>
            <button
              onClick={() => onChangeOptOutStrict(!optOutStrict)}
              className={`w-full py-1.5 px-3 rounded font-mono text-[12px] text-center border transition-colors cursor-pointer ${
                optOutStrict 
                  ? 'bg-[#1D4E26] border-[#27AE60] text-[#A7F3D0]' 
                  : 'bg-[#93000A]/30 border-[#EF4444] text-[#FFDAD6]'
              }`}
            >
              {optOutStrict ? 'Hard Filter (Active)' : 'Permissive (Bypass)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
