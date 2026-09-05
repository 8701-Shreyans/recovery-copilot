import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ChevronDown, 
  ArrowUpRight, 
  ShieldCheck, 
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { BatchEvent, MetricSummary, GuardrailIntervention, ActionDistributionItem, FunnelStage } from '../types';
import { LiveExecutionDrawer } from './LiveExecutionDrawer';
import { EvaluationScenario } from '../services/executionEngine';

interface DashboardViewProps {
  metrics: MetricSummary;
  guardrail: GuardrailIntervention;
  events: BatchEvent[];
  actionDistribution: ActionDistributionItem[];
  funnelStages: FunnelStage[];
  searchQuery: string;
  onSelectEvent: (event: BatchEvent) => void;
  onInspectGuardrail: (guardrail: GuardrailIntervention) => void;
  onRunBatch: (scenario: EvaluationScenario, customRules: { maxRetries: number; cooldownHours: number; optOutStrict: boolean; escalationThreshold: number }) => void;
  isRunningBatch: boolean;
  activeScenarioId: string;
  maxRetries: number;
  cooldownHours: number;
  optOutStrict: boolean;
  escalationThreshold: number;
  onChangeMaxRetries: (val: number) => void;
  onChangeCooldownHours: (val: number) => void;
  onChangeOptOutStrict: (val: boolean) => void;
  onChangeEscalationThreshold: (val: number) => void;
  lastExecutionTimeMs?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  guardrail,
  events,
  actionDistribution,
  funnelStages,
  searchQuery,
  onSelectEvent,
  onInspectGuardrail,
  onRunBatch,
  isRunningBatch,
  activeScenarioId,
  maxRetries,
  cooldownHours,
  optOutStrict,
  escalationThreshold,
  onChangeMaxRetries,
  onChangeCooldownHours,
  onChangeOptOutStrict,
  onChangeEscalationThreshold,
  lastExecutionTimeMs
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All Statuses');

  // Filter events based on status dropdown and search query
  const filteredEvents = events.filter((evt) => {
    const matchesStatus =
      selectedStatusFilter === 'All Statuses' ||
      evt.status.toLowerCase() === selectedStatusFilter.toLowerCase();

    const matchesSearch =
      searchQuery === '' ||
      evt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.failureCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.actionTaken.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Recovered':
        return (
          <span className="bg-[#1D4E26] text-[#A7F3D0] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A7F3D0]"></span>
            Recovered
          </span>
        );
      case 'Pending':
        return (
          <span className="bg-[#78350F] text-[#FDE68A] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FDE68A] animate-pulse"></span>
            Pending
          </span>
        );
      case 'Failed':
        return (
          <span className="bg-[#93000A] text-[#FFDAD6] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB4AB]"></span>
            Failed
          </span>
        );
      case 'Blocked':
        return (
          <span className="bg-[#93000A] text-[#FFDAD6] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFDAD6]"></span>
            Blocked
          </span>
        );
      case 'Escalated':
        return (
          <span className="bg-[#D9822B]/20 text-[#FFB691] border border-[#D9822B]/40 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB691]"></span>
            Escalated
          </span>
        );
      default:
        return (
          <span className="bg-[#33353A] text-[#C2C6D7] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('Retry Flow A') || action.includes('Retry Flow B')) {
      return (
        <span className="bg-[#2F6FED] text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
          {action}
        </span>
      );
    }
    if (action === 'Halted' || action === 'Force Charge') {
      return (
        <span className="bg-[#93000A] text-[#FFDAD6] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
          {action}
        </span>
      );
    }
    return (
      <span className="bg-[#33353A] border border-[#424654] text-[#E2E2E9] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12 animate-in fade-in duration-200">
      {/* Live Model Execution & Traffic Simulator Bar */}
      <LiveExecutionDrawer
        onRunBatch={onRunBatch}
        isRunning={isRunningBatch}
        activeScenarioId={activeScenarioId}
        maxRetries={maxRetries}
        cooldownHours={cooldownHours}
        optOutStrict={optOutStrict}
        escalationThreshold={escalationThreshold}
        onChangeMaxRetries={onChangeMaxRetries}
        onChangeCooldownHours={onChangeCooldownHours}
        onChangeOptOutStrict={onChangeOptOutStrict}
        onChangeEscalationThreshold={onChangeEscalationThreshold}
      />

      {/* 1. Top Metrics Row (5 Bento Cards matching design) */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1: Recovered ₹ */}
        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-4 flex flex-col justify-between hover:border-[#424654] transition-colors">
          <span className="font-mono text-[11px] font-bold text-[#8C90A0] uppercase tracking-wider">
            ₹ RECOVERED
          </span>
          <div className="mt-2">
            <div className="text-[26px] font-bold text-[#E2E2E9] tracking-tight">
              {metrics.recoveredTotal}
            </div>
            <div className="font-mono text-[11px] text-[#8C90A0] mt-0.5">
              of {metrics.recoveredCeiling}
            </div>
          </div>
        </div>

        {/* Card 2: Recovery Rate */}
        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-4 flex flex-col justify-between hover:border-[#424654] transition-colors">
          <span className="font-mono text-[11px] font-bold text-[#8C90A0] uppercase tracking-wider">
            RECOVERY RATE
          </span>
          <div className="mt-2">
            <div className="text-[26px] font-bold text-[#B1C5FF] tracking-tight">
              {metrics.recoveryRate}%
            </div>
            <div className="font-mono text-[11px] text-[#A7F3D0] mt-0.5 flex items-center gap-1">
              <span>↑ 4.2%</span> vs unassisted
            </div>
          </div>
        </div>

        {/* Card 3: Precision / Recall */}
        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-4 flex flex-col justify-between hover:border-[#424654] transition-colors">
          <span className="font-mono text-[11px] font-bold text-[#8C90A0] uppercase tracking-wider">
            PRECISION / RECALL
          </span>
          <div className="mt-2">
            <div className="text-[26px] font-bold text-[#E2E2E9] tracking-tight">
              {metrics.precision}% <span className="text-[#8C90A0] text-[18px] font-normal">/</span> {metrics.recall}%
            </div>
            <div className="font-mono text-[11px] text-[#8C90A0] mt-0.5">
              Model: rc-v4.2
            </div>
          </div>
        </div>

        {/* Card 4: False-Positive Cost */}
        <div className="bg-[#171A21] border border-[#93000A]/60 rounded-lg p-4 flex flex-col justify-between relative overflow-hidden group hover:border-[#FFB4AB]/80 transition-colors">
          <div className="absolute inset-0 bg-[#93000A]/5 pointer-events-none"></div>
          <span className="font-mono text-[11px] font-bold text-[#FFB4AB] uppercase tracking-wider relative z-10">
            FALSE-POSITIVE COST
          </span>
          <div className="mt-2 relative z-10">
            <div className="text-[26px] font-bold text-[#FFB4AB] tracking-tight">
              {metrics.falsePositiveCost}
            </div>
            <div className="font-mono text-[11px] text-[#8C90A0] mt-0.5">
              Saved ~₹380K in fees
            </div>
          </div>
        </div>

        {/* Card 5: Events Processed */}
        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-4 flex flex-col justify-between hover:border-[#424654] transition-colors">
          <span className="font-mono text-[11px] font-bold text-[#8C90A0] uppercase tracking-wider">
            EVENTS PROCESSED
          </span>
          <div className="mt-2">
            <div className="text-[26px] font-bold text-[#E2E2E9] tracking-tight">
              {metrics.eventsProcessed}
            </div>
            <div className="font-mono text-[11px] text-[#8C90A0] mt-0.5">
              Current active batch
            </div>
          </div>
        </div>
      </section>

      {/* 2. Guardrail Spotlight Section (High-priority compliance callout) */}
      <section 
        id="guardrail-spotlight-banner"
        className="bg-[#171A21] border border-[#93000A]/80 rounded-lg p-4 flex items-start gap-4 relative overflow-hidden shadow-sm"
      >
        <div className="absolute inset-0 bg-[#93000A]/5 pointer-events-none"></div>
        <div className="mt-0.5 text-[#FFB4AB] shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-bold text-[#FFB4AB] uppercase tracking-wider">
              GUARDRAIL INTERVENTION
            </span>
            <span className="font-mono text-[11px] bg-[#0F1116] border border-[#2A2E3A] px-2 py-0.5 rounded text-[#E2E2E9]">
              {guardrail.eventId}
            </span>
            <button
              onClick={() => onInspectGuardrail(guardrail)}
              className="ml-auto text-[11px] font-medium text-[#B1C5FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect Guardrail Trace</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[13px] text-[#C2C6D7] leading-relaxed">
            Model intent <strong className="text-[#FFFFFF] font-semibold">{guardrail.modelIntent}</strong> conflicted with policy block <strong className="text-[#FFFFFF] font-semibold">{guardrail.policyBlock}</strong>.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-[#8C90A0]">Final Action:</span>
            <span className="bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] px-2 py-0.5 rounded font-mono text-[11px]">
              {guardrail.finalAction}
            </span>
            <span className="text-[10px] text-[#8C90A0] ml-2">
              (Prevented double-debit compliance breach)
            </span>
          </div>
        </div>
      </section>

      {/* 3. Two Column Layout: Left (Batch Events Table 8 cols), Right (Stacked Charts 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Batch Events Table */}
        <section className="lg:col-span-8 bg-[#171A21] border border-[#2A2E3A] rounded-lg flex flex-col overflow-hidden">
          {/* Table Header & Filter Bar */}
          <div className="p-4 border-b border-[#2A2E3A] flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-semibold text-[#E2E2E9]">Batch Events</h3>
              <span className="text-[11px] font-mono bg-[#0F1116] border border-[#2A2E3A] px-2 py-0.5 rounded text-[#8C90A0]">
                {filteredEvents.length} records
              </span>
            </div>
            
            {/* Filter Dropdown */}
            <div className="relative">
              <select
                id="status-filter-dropdown"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="appearance-none bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[12px] font-medium rounded pl-3 pr-8 py-1.5 focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED] outline-none cursor-pointer"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Recovered">Recovered</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Escalated">Escalated</option>
                <option value="Blocked">Blocked</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C90A0] pointer-events-none" />
            </div>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2A2E3A] bg-[#0F1116]/40">
                  <th className="py-2.5 px-4 font-mono text-[11px] font-medium text-[#8C90A0] uppercase tracking-wider">
                    EVENT ID
                  </th>
                  <th className="py-2.5 px-4 font-mono text-[11px] font-medium text-[#8C90A0] uppercase tracking-wider">
                    FAILURE CODE
                  </th>
                  <th className="py-2.5 px-4 font-mono text-[11px] font-medium text-[#8C90A0] uppercase tracking-wider text-right">
                    AMOUNT
                  </th>
                  <th className="py-2.5 px-4 font-mono text-[11px] font-medium text-[#8C90A0] uppercase tracking-wider">
                    ACTION TAKEN
                  </th>
                  <th className="py-2.5 px-4 font-mono text-[11px] font-medium text-[#8C90A0] uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="py-2.5 px-4 font-mono text-[11px] font-medium text-[#8C90A0] uppercase tracking-wider text-right">
                    RECOVERED
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-[12px]">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#8C90A0] text-[13px]">
                      No events found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className="border-b border-[#2A2E3A] hover:bg-[#282A2F] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-[#E2E2E9] font-medium group-hover:text-[#B1C5FF] flex items-center gap-1.5">
                        <span>{evt.id}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#B1C5FF]" />
                      </td>
                      <td className="py-3 px-4 text-[#C2C6D7]">
                        {evt.failureCode}
                      </td>
                      <td className="py-3 px-4 text-[#E2E2E9] text-right font-medium">
                        ₹{evt.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {getActionBadge(evt.actionTaken)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(evt.status)}
                      </td>
                      <td className="py-3 px-4 text-[#E2E2E9] text-right font-medium">
                        {evt.recoveredAmount !== null && evt.recoveredAmount > 0
                          ? `₹${evt.recoveredAmount.toLocaleString()}`
                          : evt.status === 'Pending'
                          ? '-'
                          : '₹0'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Stats */}
          <div className="p-3 border-t border-[#2A2E3A] bg-[#0F1116]/40 flex justify-between items-center text-[11px] text-[#8C90A0]">
            <span>Click any event row to inspect full end-to-end decision trace</span>
            <span>Batch ID: BATCH_2023_OCT_A</span>
          </div>
        </section>

        {/* Right Column: Stacked Visualizations */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          {/* Action Distribution Chart Card */}
          <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-[#E2E2E9]">Action Distribution</h3>
              <span className="text-[10px] text-[#8C90A0] font-mono">{metrics.eventsProcessed} Total</span>
            </div>

            {/* Custom Bar Visualization matching design */}
            <div className="flex-1 flex flex-col justify-end gap-2 relative min-h-[160px] pt-4">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between border-l border-b border-[#2A2E3A] pointer-events-none pb-6">
                <div className="border-t border-[#2A2E3A]/40 w-full h-0"></div>
                <div className="border-t border-[#2A2E3A]/40 w-full h-0"></div>
                <div className="border-t border-[#2A2E3A]/40 w-full h-0"></div>
              </div>

              {/* Bars */}
              <div className="flex justify-around items-end h-full z-10 pb-1 px-4">
                {/* Bar 1: Flow A */}
                <div 
                  className="w-10 bg-[#2F6FED] rounded-t flex flex-col justify-end items-center relative group cursor-pointer transition-all hover:brightness-110" 
                  style={{ height: `${Math.max(5, actionDistribution[0]?.percentage ?? 0)}%` }}
                >
                  <div className="absolute -top-7 bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono pointer-events-none shadow-md">
                    {actionDistribution[0]?.percentage ?? 0}% ({actionDistribution[0]?.count ?? 0})
                  </div>
                </div>

                {/* Bar 2: Soft */}
                <div 
                  className="w-10 bg-[#44474F] border border-[#2A2E3A] border-b-0 rounded-t flex flex-col justify-end items-center relative group cursor-pointer transition-all hover:brightness-110" 
                  style={{ height: `${Math.max(5, actionDistribution[1]?.percentage ?? 0)}%` }}
                >
                  <div className="absolute -top-7 bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono pointer-events-none shadow-md">
                    {actionDistribution[1]?.percentage ?? 0}% ({actionDistribution[1]?.count ?? 0})
                  </div>
                </div>

                {/* Bar 3: Email */}
                <div 
                  className="w-10 bg-[#33353A] border border-[#2A2E3A] border-b-0 rounded-t flex flex-col justify-end items-center relative group cursor-pointer transition-all hover:brightness-110" 
                  style={{ height: `${Math.max(5, actionDistribution[2]?.percentage ?? 0)}%` }}
                >
                  <div className="absolute -top-7 bg-[#0F1116] border border-[#2A2E3A] text-[#E2E2E9] text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono pointer-events-none shadow-md">
                    {actionDistribution[2]?.percentage ?? 0}% ({actionDistribution[2]?.count ?? 0})
                  </div>
                </div>
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-around items-center pt-2 border-t border-[#2A2E3A] z-10 text-[11px] font-medium text-[#8C90A0]">
                <span>Flow A</span>
                <span>Soft</span>
                <span>Email</span>
              </div>
            </div>
          </div>

          {/* Recovery Funnel Card */}
          <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-[#E2E2E9]">Recovery Funnel</h3>
              <span className="text-[10px] text-[#A7F3D0] font-mono">Conversion: {metrics.recoveredPercentage}%</span>
            </div>

            <div className="flex-1 flex flex-col gap-3 justify-center py-2">
              {funnelStages.map((stage) => (
                <div key={stage.label} className="flex items-center gap-3">
                  <div className="w-20 text-right text-[11px] font-medium text-[#8C90A0]">
                    {stage.label}
                  </div>
                  <div className="flex-1 h-6 bg-[#0F1116] border border-[#2A2E3A]/80 rounded overflow-hidden">
                    <div 
                      className="h-full relative rounded flex items-center justify-end px-2"
                      style={{ 
                        width: `${stage.percentage}%`, 
                        backgroundColor: stage.color 
                      }}
                    >
                      <span 
                        className="font-mono text-[10px] font-bold"
                        style={{ color: stage.textColor || '#E2E2E9' }}
                      >
                        {stage.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-[#2A2E3A] flex justify-between text-[11px] text-[#8C90A0]">
              <span>Zero-touch Automation</span>
              <span className="text-[#A7F3D0] font-mono">{metrics.recoveredTotal} Settled</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
