import React from 'react';
import { X, BookOpen, ShieldCheck, CheckCircle2, FileText, ExternalLink } from 'lucide-react';

interface SupportDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportDocsModal: React.FC<SupportDocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#171A21] border border-[#2A2E3A] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden p-6 relative max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#2A2E3A] pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#2F6FED]" />
            <h3 className="text-[17px] font-bold text-[#E2E2E9]">
              Recovery Copilot Documentation & System Specs
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8C90A0] hover:text-[#E2E2E9] p-1 rounded hover:bg-[#282A2F] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-[13px] text-[#C2C6D7] leading-relaxed">
          <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg">
            <h4 className="text-[14px] font-bold text-[#E2E2E9] mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#A7F3D0]" />
              Bounded & Gated Architecture
            </h4>
            <p className="text-[12px] text-[#8C90A0]">
              The LLM Agent has no permission to act outside the deterministic policy-filtered action set. All monetary exposure (discounts/incentives) is strictly eliminated from the action space.
            </p>
          </div>

          <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg">
            <h4 className="text-[14px] font-bold text-[#E2E2E9] mb-1">
              Razorpay AI Revenue Recovery Track Mapping
            </h4>
            <ul className="font-mono text-[11px] space-y-1.5 text-[#8C90A0] mt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A7F3D0]" />
                <span>Measured ₹ Recovered: See Dashboard for live recovery metrics</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A7F3D0]" />
                <span>Compliant Stopping Rules: 3 retries max, 6h minimum cooldown</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A7F3D0]" />
                <span>Escalation Paths: High-value (&gt; ₹10k) routed to VIP desk</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A7F3D0]" />
                <span>Audit Trail: Append-only event trace with SHAP weights</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A7F3D0]" />
                <span>Graceful Failures: Backoff queue retry without double-billing</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#0F1116] border border-[#2A2E3A] p-4 rounded-lg">
            <h4 className="text-[14px] font-bold text-[#E2E2E9] mb-1">
              Model Diagnostic Details
            </h4>
            <p className="font-mono text-[11px] text-[#8C90A0]">
              Classifier: Claude 3.5 Sonnet Tool-Calling + Heuristic Fallback | Precision & Recall computed per batch | ECE: 0.024
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#2A2E3A] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-[#2F6FED] hover:bg-[#2558c4] text-white text-[12px] font-semibold px-4 py-1.5 rounded transition-all cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
