import React, { useState, useEffect } from 'react';
import { X, Play, RotateCcw, CheckCircle2, Cpu, ShieldCheck, Bot, Wrench, ArrowRight } from 'lucide-react';
import { BatchEvent } from '../types';

interface ReplaySimulationModalProps {
  event: BatchEvent | null;
  onClose: () => void;
}

export const ReplaySimulationModal: React.FC<ReplaySimulationModalProps> = ({
  event,
  onClose
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const stepsCount = 5;

  useEffect(() => {
    let timer: any;
    if (isRunning && activeStep < stepsCount - 1) {
      timer = setTimeout(() => {
        setActiveStep((prev) => prev + 1);
      }, 700);
    } else if (activeStep >= stepsCount - 1) {
      setIsRunning(false);
    }
    return () => clearTimeout(timer);
  }, [isRunning, activeStep]);

  if (!event) return null;

  const steps = [
    {
      title: 'Raw Event Ingestion',
      icon: Play,
      desc: `Ingested transaction ${event.transactionId} (${event.failureCode}) for ₹${event.amount.toLocaleString()}.`
    },
    {
      title: 'Model Score Assessment',
      icon: Cpu,
      desc: `rc-v4.2-ensemble evaluated recovery probability at ${event.recoveryProbability}% with ${event.confidence} confidence.`
    },
    {
      title: 'Deterministic Policy Guardrails',
      icon: ShieldCheck,
      desc: `Evaluated ${event.allowedChecks?.length || 0} compliance checks. Velocity and spend bounds verified.`
    },
    {
      title: 'Agent Formulation',
      icon: Bot,
      desc: `Agent selected action '${event.actionTaken}'. Reasoning: "${(event.agentReasoning || '').slice(0, 100)}..."`
    },
    {
      title: 'Tool Execution & Settlement',
      icon: Wrench,
      desc: `Dispatched tool call with latency ${event.durationMs}ms. Final status: ${event.status}.`
    }
  ];

  const handleStartReplay = () => {
    setActiveStep(0);
    setIsRunning(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#171A21] border border-[#2A2E3A] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden p-6 relative">
        <div className="flex items-center justify-between border-b border-[#2A2E3A] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#2F6FED]" />
            <h3 className="text-[17px] font-bold text-[#E2E2E9]">
              Interactive Pipeline Replay: {event.id}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8C90A0] hover:text-[#E2E2E9] p-1 rounded hover:bg-[#282A2F] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[13px] text-[#8C90A0] leading-relaxed mb-6">
          Step-by-step live simulation demonstrating the bounded, explainable agent execution flow for transaction <strong className="text-[#E2E2E9]">{event.transactionId}</strong>.
        </p>

        {/* Stepper Timeline */}
        <div className="space-y-4 mb-6">
          {steps.map((step, idx) => {
            const isCompleted = activeStep > idx;
            const isCurrent = activeStep === idx;
            const isPending = activeStep < idx;

            return (
              <div 
                key={idx}
                className={`p-3.5 rounded-lg border transition-all ${
                  isCurrent
                    ? 'bg-[#0F1116] border-[#2F6FED] ring-1 ring-[#2F6FED]/50'
                    : isCompleted
                    ? 'bg-[#0F1116]/60 border-[#27AE60]/40'
                    : 'bg-[#0F1116]/30 border-[#2A2E3A] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isCompleted 
                        ? 'bg-[#1D4E26] text-[#A7F3D0]' 
                        : isCurrent 
                        ? 'bg-[#2F6FED] text-white animate-pulse' 
                        : 'bg-[#2A2E3A] text-[#8C90A0]'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span className={`text-[13px] font-bold ${isCurrent ? 'text-[#B1C5FF]' : 'text-[#E2E2E9]'}`}>
                      {step.title}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-[#8C90A0]">
                    {isCompleted ? 'Completed' : isCurrent ? 'Active Processing...' : 'Queued'}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-[#8C90A0] pl-8.5">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom Control Bar */}
        <div className="pt-4 border-t border-[#2A2E3A] flex justify-between items-center">
          <button
            onClick={handleStartReplay}
            disabled={isRunning}
            className="bg-[#2F6FED] hover:bg-[#2558c4] disabled:opacity-50 text-white text-[12px] font-semibold px-4 py-2 rounded transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isRunning ? 'Replaying Pipeline...' : 'Run Simulation Again'}</span>
          </button>

          <button
            onClick={onClose}
            className="border border-[#2A2E3A] hover:bg-[#282A2F] text-[#E2E2E9] text-[12px] font-medium px-4 py-2 rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
