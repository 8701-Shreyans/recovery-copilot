import React, { useState } from 'react';
import { X, Download, FileText, Database, Check } from 'lucide-react';
import { BatchEvent } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: BatchEvent[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  events
}) => {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportCSV = () => {
    const headers = ['Event_ID', 'Transaction_ID', 'Failure_Code', 'Amount', 'Action_Taken', 'Status', 'Recovered_Amount', 'Probability', 'Confidence', 'Bank', 'Method', 'Duration_MS'];
    const rows = events.map(e => [
      e.id,
      e.transactionId,
      e.failureCode,
      e.amount,
      e.actionTaken,
      e.status,
      e.recoveredAmount || 0,
      `${e.recoveryProbability}%`,
      e.confidence,
      e.issuingBank,
      e.paymentMethod,
      e.durationMs
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `recovery_copilot_batch_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    setDownloadedFormat('CSV');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const exportJSONL = () => {
    const jsonlContent = events.map(e => JSON.stringify(e)).join('\n');
    const blob = new Blob([jsonlContent], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recovery_copilot_audit_trace_${new Date().toISOString().slice(0, 10)}.jsonl`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setDownloadedFormat('JSONL');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#171A21] border border-[#2A2E3A] rounded-xl max-w-md w-full shadow-2xl overflow-hidden p-6 relative">
        <div className="flex items-center justify-between border-b border-[#2A2E3A] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[#2F6FED]" />
            <h3 className="text-[17px] font-bold text-[#E2E2E9]">Export Audit Records</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8C90A0] hover:text-[#E2E2E9] p-1 rounded hover:bg-[#282A2F] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[13px] text-[#8C90A0] leading-relaxed mb-5">
          Download complete diagnostic logs, SHAP feature attributions, and policy evaluations for compliance and merchant reporting.
        </p>

        <div className="space-y-3">
          {/* CSV Export Option */}
          <button
            onClick={exportCSV}
            className="w-full flex items-center justify-between p-3.5 bg-[#0F1116] border border-[#2A2E3A] hover:border-[#2F6FED] rounded-lg transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#B1C5FF] group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[13px] font-bold text-[#E2E2E9]">Batch CSV Spreadsheet</h4>
                <p className="font-mono text-[11px] text-[#8C90A0]">Standard financial reconciliation export</p>
              </div>
            </div>
            {downloadedFormat === 'CSV' ? (
              <Check className="w-4 h-4 text-[#A7F3D0]" />
            ) : (
              <span className="font-mono text-[11px] text-[#2F6FED] group-hover:underline">.CSV</span>
            )}
          </button>

          {/* JSONL Export Option */}
          <button
            onClick={exportJSONL}
            className="w-full flex items-center justify-between p-3.5 bg-[#0F1116] border border-[#2A2E3A] hover:border-[#2F6FED] rounded-lg transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-[#A7F3D0] group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[13px] font-bold text-[#E2E2E9]">Full JSONL Audit Stream</h4>
                <p className="font-mono text-[11px] text-[#8C90A0]">Line-delimited JSON with feature vectors</p>
              </div>
            </div>
            {downloadedFormat === 'JSONL' ? (
              <Check className="w-4 h-4 text-[#A7F3D0]" />
            ) : (
              <span className="font-mono text-[11px] text-[#A7F3D0] group-hover:underline">.JSONL</span>
            )}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-[#2A2E3A] flex justify-between items-center text-[11px] text-[#8C90A0] font-mono">
          <span>Batch Size: {events.length} records</span>
          <button
            onClick={onClose}
            className="text-[#E2E2E9] hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
