import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Play, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Cpu, 
  ShieldCheck, 
  Bot, 
  Wrench, 
  FileCode,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { BatchEvent } from '../types';

interface EventDrillDownModalProps {
  event: BatchEvent | null;
  onClose: () => void;
  onReplay: (event: BatchEvent) => void;
}

export const EventDrillDownModal: React.FC<EventDrillDownModalProps> = ({
  event,
  onClose,
  onReplay
}) => {
  const [copiedJSON, setCopiedJSON] = useState(false);

  if (!event) return null;

  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(event, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `event_trace_${event.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  return (
    <div 
      id="event-drilldown-slideover"
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      {/* Background Overlay */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Slide-over Content Panel (Full Height, Right-Aligned max-w-4xl) */}
      <div 
        className="relative w-full max-w-4xl bg-[#0F1116] border-l border-[#2A2E3A] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300 overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2E3A] bg-[#171A21] shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-[#8C90A0] hover:text-[#E2E2E9] p-1.5 rounded-md hover:bg-[#282A2F] transition-colors cursor-pointer"
              aria-label="Close trace view"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-[20px] font-bold text-[#E2E2E9] tracking-tight">
                Event Trace: {event.id === 'EV-10293' ? 'EVT-992-811A' : event.id}
              </h2>
              <p className="font-mono text-[11px] text-[#8C90A0] mt-0.5">
                TS: {event.timestamp}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="border border-[#2A2E3A] hover:bg-[#282A2F] text-[#E2E2E9] text-[12px] font-medium px-3.5 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#8C90A0]" />
              <span>{copiedJSON ? 'Exported!' : 'Export JSON'}</span>
            </button>

            <button
              onClick={() => onReplay(event)}
              className="bg-[#2F6FED] hover:bg-[#2558c4] text-white text-[12px] font-semibold px-4 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Replay Event</span>
            </button>
          </div>
        </div>

        {/* Scrollable Timeline Content */}
        <div className="flex-1 overflow-y-auto p-6 relative pb-12 bg-[#0F1116]">
          {/* Vertical Continuous Timeline Line */}
          <div className="absolute top-10 bottom-10 left-[43px] w-[2px] bg-[#2A2E3A] z-0"></div>

          <div className="flex flex-col gap-6 relative z-10 pl-[52px]">
            {/* Step 1: Raw Event Ingestion */}
            <div className="relative group">
              {/* Timeline Indicator Dot */}
              <div className="absolute -left-[41px] top-4 w-3 h-3 rounded-full bg-[#2A2E3A] border-2 border-[#0F1116] z-10 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#8C90A0]"></div>
              </div>

              <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileCode className="w-4 h-4 text-[#8C90A0]" />
                  <h3 className="text-[15px] font-semibold text-[#E2E2E9]">Raw Event Ingestion</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-[#2A2E3A] rounded bg-[#0F1116] p-4">
                  <div>
                    <p className="font-mono text-[10px] text-[#8C90A0] uppercase tracking-wider mb-1">
                      TRANSACTION ID
                    </p>
                    <p className="font-mono text-[12px] text-[#E2E2E9] font-medium">
                      {event.transactionId}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-[#8C90A0] uppercase tracking-wider mb-1">
                      RESPONSE CODE
                    </p>
                    <p className="font-mono text-[12px] text-[#FFB4AB] font-bold">
                      {event.responseCode}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-[#8C90A0] uppercase tracking-wider mb-1">
                      AMOUNT
                    </p>
                    <p className="font-mono text-[12px] text-[#E2E2E9] font-medium">
                      ${event.amount > 1000 ? (event.amount * 11.4).toLocaleString(undefined, { minimumFractionDigits: 2 }) : (event.amount * 10).toFixed(2)} USD
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-[#8C90A0] uppercase tracking-wider mb-1">
                      ROOT CAUSE SIGNAL
                    </p>
                    <p className="font-mono text-[12px] text-[#E2E2E9] font-medium">
                      {event.rootCauseSignal}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Model Score Assessment */}
            <div className="relative group">
              {/* Timeline Indicator Dot */}
              <div className="absolute -left-[41px] top-4 w-3 h-3 rounded-full bg-[#2F6FED] border-2 border-[#0F1116] z-10 ring-2 ring-[#2F6FED]/30"></div>

              <div className="bg-[#171A21] border border-[#2F6FED]/40 shadow-[0_0_15px_rgba(47,111,237,0.08)] rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#B1C5FF]" />
                    <h3 className="text-[15px] font-semibold text-[#E2E2E9]">Model Score Assessment</h3>
                  </div>
                  <span className="font-mono text-[11px] text-[#8C90A0]">
                    Model: rc-v4.2-ensemble
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Score Card */}
                  <div className="border border-[#2A2E3A] bg-[#0F1116] rounded p-4 flex flex-col items-center justify-center text-center">
                    <p className="font-mono text-[10px] text-[#8C90A0] uppercase tracking-wider mb-1">
                      RECOVERY PROBABILITY
                    </p>
                    <div className="text-[28px] font-bold text-[#A7F3D0] tracking-tight mb-0.5">
                      {event.recoveryProbability}%
                    </div>
                    <p className="font-mono text-[11px] text-[#8C90A0]">
                      Confidence: <span className="text-[#E2E2E9] font-bold">{event.confidence}</span>
                    </p>
                  </div>

                  {/* Feature Attributions (SHAP weights) */}
                  <div className="md:col-span-2 border border-[#2A2E3A] bg-[#0F1116] rounded p-4 flex flex-col justify-center">
                    <p className="font-mono text-[10px] text-[#8C90A0] uppercase tracking-wider mb-3">
                      TOP FEATURE ATTRIBUTIONS
                    </p>
                    <div className="space-y-2.5">
                      {event.featureAttributions.map((feat) => (
                        <div key={feat.name}>
                          <div className="flex justify-between font-mono text-[11px] mb-1">
                            <span className="text-[#E2E2E9]">{feat.name}</span>
                            <span className={feat.impact === 'positive' ? 'text-[#A7F3D0] font-bold' : 'text-[#FFB4AB] font-bold'}>
                              {feat.impact === 'positive' ? `+${feat.weight}` : `-${feat.weight}`}
                            </span>
                          </div>
                          <div className="w-full bg-[#171A21] h-1.5 rounded overflow-hidden flex">
                            {feat.impact === 'positive' ? (
                              <div 
                                className="bg-[#27AE60] h-full rounded" 
                                style={{ width: `${Math.min(100, Math.abs(feat.weight) * 150)}%` }}
                              ></div>
                            ) : (
                              <div 
                                className="bg-[#C0392B] h-full rounded ml-auto" 
                                style={{ width: `${Math.min(100, Math.abs(feat.weight) * 150)}%` }}
                              ></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Policy Evaluation */}
            <div className="relative group">
              {/* Timeline Indicator Dot */}
              <div className="absolute -left-[41px] top-4 w-3 h-3 rounded-full bg-[#2A2E3A] border-2 border-[#0F1116] z-10 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#8C90A0]"></div>
              </div>

              <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-[#8C90A0]" />
                  <h3 className="text-[15px] font-semibold text-[#E2E2E9]">Policy Evaluation</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Allowed Checks */}
                  <div className="border border-[#2A2E3A] rounded bg-[#0F1116] p-3">
                    <div className="px-2 py-1 mb-2 border-b border-[#2A2E3A] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#A7F3D0]" />
                      <span className="font-mono text-[11px] uppercase font-bold text-[#E2E2E9]">
                        ALLOWED CHECKS
                      </span>
                    </div>
                    <ul className="space-y-2 p-1.5">
                      {event.allowedChecks.map((chk, idx) => (
                        <li key={idx} className="flex items-start gap-2 font-mono text-[11px] text-[#C2C6D7]">
                          <Check className="w-3.5 h-3.5 text-[#A7F3D0] shrink-0 mt-0.5" />
                          <span>{chk.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Blocks / Overrides */}
                  <div className="border border-[#2A2E3A] rounded bg-[#0F1116] p-3">
                    <div className="px-2 py-1 mb-2 border-b border-[#2A2E3A] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-[#FFB4AB]" />
                      <span className="font-mono text-[11px] uppercase font-bold text-[#E2E2E9]">
                        BLOCKS / OVERRIDES
                      </span>
                    </div>
                    <ul className="space-y-2.5 p-1.5 font-mono text-[11px]">
                      {event.blockedRules.length === 0 ? (
                        <li className="text-[#8C90A0] italic">No active policy blocks.</li>
                      ) : (
                        event.blockedRules.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            {rule.active ? (
                              <X className="w-3.5 h-3.5 text-[#FFB4AB] shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-3.5 h-3.5 text-[#B1C5FF] shrink-0 mt-0.5" />
                            )}
                            <div>
                              <span className={rule.active ? 'text-[#E2E2E9] font-bold block' : 'text-[#B1C5FF] font-bold block'}>
                                {rule.rule}
                              </span>
                              <span className="text-[#8C90A0] text-[10px]">{rule.reason}</span>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Agent Formulation */}
            <div className="relative group">
              {/* Timeline Indicator Dot */}
              <div className="absolute -left-[41px] top-4 w-3 h-3 rounded-full bg-[#2A2E3A] border-2 border-[#0F1116] z-10 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#8C90A0]"></div>
              </div>

              <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#8C90A0]" />
                    <h3 className="text-[15px] font-semibold text-[#E2E2E9]">Agent Formulation</h3>
                  </div>
                  <span className="bg-[#1D4E26] text-[#A7F3D0] px-3 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider">
                    PROCEEDING
                  </span>
                </div>

                <div className="bg-[#0F1116] border-l-2 border-[#2F6FED] p-4 rounded-r">
                  <p className="font-mono text-[12px] text-[#E2E2E9] leading-relaxed">
                    "{event.agentReasoning}"
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5: Tool Execution */}
            <div className="relative group">
              {/* Timeline Indicator Dot */}
              <div className="absolute -left-[41px] top-4 w-3 h-3 rounded-full bg-[#27AE60] border-2 border-[#0F1116] z-10 shadow-[0_0_8px_rgba(39,174,96,0.6)]"></div>

              <div className="bg-[#171A21] border border-[#27AE60]/40 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#A7F3D0]" />
                    <h3 className="text-[15px] font-semibold text-[#E2E2E9]">Tool Execution</h3>
                  </div>
                  <span className="font-mono text-[11px] text-[#8C90A0]">
                    Duration: {event.durationMs}ms
                  </span>
                </div>

                <div className="border border-[#2A2E3A] bg-[#0F1116] rounded overflow-hidden">
                  <table className="w-full text-left border-collapse font-mono text-[11px]">
                    <thead className="bg-[#171A21] border-b border-[#2A2E3A]">
                      <tr>
                        <th className="py-2 px-3 text-[#8C90A0] font-bold uppercase">ACTION</th>
                        <th className="py-2 px-3 text-[#8C90A0] font-bold uppercase">TARGET</th>
                        <th className="py-2 px-3 text-[#8C90A0] font-bold uppercase text-right">RESULT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {event.toolExecution.map((tool, idx) => (
                        <tr key={idx} className="border-b border-[#2A2E3A]/60 hover:bg-[#171A21] transition-colors">
                          <td className="py-2 px-3 text-[#E2E2E9] font-semibold">{tool.action}</td>
                          <td className="py-2 px-3 text-[#8C90A0]">{tool.target}</td>
                          <td className="py-2 px-3 text-right text-[#A7F3D0] font-bold">{tool.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="p-3 bg-[#0F1116] border-t border-[#2A2E3A] flex justify-between items-center">
                    <span className="font-mono text-[11px] text-[#8C90A0] uppercase font-bold">
                      FINAL RECOVERY STATUS
                    </span>
                    <span className="bg-[#1D4E26] text-[#A7F3D0] px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {event.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
