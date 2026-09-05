import React, { useState } from 'react';
import { 
  RotateCw, 
  Search, 
  Filter, 
  ArrowUpRight, 
  SlidersHorizontal, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Play,
  Download
} from 'lucide-react';
import { BatchEvent } from '../types';

interface EventsViewProps {
  events: BatchEvent[];
  searchQuery: string;
  onSelectEvent: (event: BatchEvent) => void;
  onOpenReplay: (event: BatchEvent) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  searchQuery,
  onSelectEvent,
  onOpenReplay
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [failureFilter, setFailureFilter] = useState<string>('ALL');

  const filtered = events.filter((e) => {
    const matchesStatus = statusFilter === 'ALL' || e.status.toUpperCase() === statusFilter.toUpperCase();
    const matchesBank = bankFilter === 'ALL' || e.issuingBank.toLowerCase().includes(bankFilter.toLowerCase());
    const matchesFailure = failureFilter === 'ALL' || e.failureCode.toUpperCase() === failureFilter.toUpperCase();
    const matchesSearch =
      searchQuery === '' ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.failureCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.issuingBank.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesBank && matchesFailure && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-[#2A2E3A] pb-4">
        <div>
          <h2 className="text-[26px] font-bold text-[#E2E2E9] tracking-tight">Events Explorer</h2>
          <p className="text-[14px] text-[#8C90A0] mt-1">
            Realtime audit log of {events.length} ingested recurring payment transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] bg-[#171A21] border border-[#2A2E3A] px-3 py-1.5 rounded text-[#B1C5FF]">
            Active Batch: {events.length} transactions
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#8C90A0] uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] rounded px-3 py-1.5 outline-none focus:border-[#2F6FED]"
            >
              <option value="ALL">All Statuses</option>
              <option value="RECOVERED">Recovered</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="BLOCKED">Blocked</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>

          {/* Bank Filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#8C90A0] uppercase">Issuer Bank:</span>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] rounded px-3 py-1.5 outline-none focus:border-[#2F6FED]"
            >
              <option value="ALL">All Issuing Banks</option>
              <option value="HDFC">HDFC Bank</option>
              <option value="ICICI">ICICI Bank</option>
              <option value="SBI">State Bank of India</option>
              <option value="Axis">Axis Bank</option>
              <option value="Kotak">Kotak Mahindra</option>
            </select>
          </div>

          {/* Failure Filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#8C90A0] uppercase">Failure:</span>
            <select
              value={failureFilter}
              onChange={(e) => setFailureFilter(e.target.value)}
              className="bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] rounded px-3 py-1.5 outline-none focus:border-[#2F6FED]"
            >
              <option value="ALL">All Failure Codes</option>
              <option value="ERR_FUNDS">ERR_FUNDS</option>
              <option value="ERR_NET">ERR_NET</option>
              <option value="ERR_AUTH">ERR_AUTH</option>
              <option value="ERR_TIMEOUT">ERR_TIMEOUT</option>
              <option value="ERR_FROZEN">ERR_FROZEN</option>
            </select>
          </div>
        </div>

        <div className="text-[12px] font-mono text-[#8C90A0]">
          Showing {filtered.length} matching events
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-[12px]">
            <thead>
              <tr className="border-b border-[#2A2E3A] bg-[#0F1116]/60 text-[11px] text-[#8C90A0]">
                <th className="py-3 px-4 font-semibold uppercase">EVENT ID</th>
                <th className="py-3 px-4 font-semibold uppercase">TRANSACTION</th>
                <th className="py-3 px-4 font-semibold uppercase">ISSUER / METHOD</th>
                <th className="py-3 px-4 font-semibold uppercase">FAILURE CODE</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">AMOUNT</th>
                <th className="py-3 px-4 font-semibold uppercase">SCORE</th>
                <th className="py-3 px-4 font-semibold uppercase">STATUS</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((evt) => (
                <tr
                  key={evt.id}
                  className="border-b border-[#2A2E3A] hover:bg-[#282A2F] transition-colors cursor-pointer group"
                  onClick={() => onSelectEvent(evt)}
                >
                  <td className="py-3.5 px-4 text-[#B1C5FF] font-semibold flex items-center gap-1">
                    <span>{evt.id}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                  <td className="py-3.5 px-4 text-[#E2E2E9]">{evt.transactionId}</td>
                  <td className="py-3.5 px-4 text-[#C2C6D7]">
                    <div>{evt.issuingBank}</div>
                    <div className="text-[10px] text-[#8C90A0]">{evt.paymentMethod}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-[#0F1116] border border-[#2A2E3A] px-2 py-0.5 rounded text-[11px] text-[#FFB4AB]">
                      {evt.failureCode}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-[#E2E2E9]">
                    ₹{evt.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className={evt.recoveryProbability >= 70 ? 'text-[#A7F3D0] font-bold' : evt.recoveryProbability >= 40 ? 'text-[#FDE68A]' : 'text-[#FFB4AB]'}>
                        {evt.recoveryProbability}%
                      </span>
                      <div className="w-12 bg-[#0F1116] h-1.5 rounded overflow-hidden">
                        <div 
                          className={`h-full rounded ${evt.recoveryProbability >= 70 ? 'bg-[#27AE60]' : evt.recoveryProbability >= 40 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}
                          style={{ width: `${evt.recoveryProbability}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      evt.status === 'Recovered' ? 'bg-[#1D4E26] text-[#A7F3D0]' :
                      evt.status === 'Pending' ? 'bg-[#78350F] text-[#FDE68A]' :
                      evt.status === 'Escalated' ? 'bg-[#D9822B]/20 text-[#FFB691]' :
                      'bg-[#93000A] text-[#FFDAD6]'
                    }`}>
                      {evt.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenReplay(evt)}
                      className="bg-[#2F6FED]/20 hover:bg-[#2F6FED] text-[#B1C5FF] hover:text-white px-2.5 py-1 rounded text-[11px] transition-all flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Replay</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
