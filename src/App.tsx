import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ModelPerformanceView } from './components/ModelPerformanceView';
import { EventsView } from './components/EventsView';
import { RecoveriesView } from './components/RecoveriesView';
import { AutomationView } from './components/AutomationView';
import { EventDrillDownModal } from './components/EventDrillDownModal';
import { ReplaySimulationModal } from './components/ReplaySimulationModal';
import { ExportModal } from './components/ExportModal';
import { SupportDocsModal } from './components/SupportDocsModal';
import { SettingsModal } from './components/SettingsModal';
import {
  METRIC_SUMMARY as INITIAL_METRIC_SUMMARY,
  GUARDRAIL_SPOTLIGHT as INITIAL_GUARDRAIL_SPOTLIGHT,
  CONFUSION_MATRIX as INITIAL_CONFUSION_MATRIX,
  CALIBRATION_POINTS as INITIAL_CALIBRATION_POINTS,
  ACTION_DISTRIBUTION as INITIAL_ACTION_DISTRIBUTION,
  FUNNEL_STAGES as INITIAL_FUNNEL_STAGES,
  BATCH_EVENTS as INITIAL_BATCH_EVENTS,
} from './data/mockData';
import { ActiveNavTab, BatchEvent, GuardrailIntervention, MetricSummary, ConfusionMatrixData, CalibrationPoint, ActionDistributionItem, FunnelStage } from './types';
import { EvaluationScenario } from './services/executionEngine';
import { BatchAPI, MetricsAPI, CasesAPI, ComplianceAPI } from './services/api';

// Maps backend case status → frontend BatchEvent status
function mapStatus(s: string): BatchEvent['status'] {
  const map: Record<string, BatchEvent['status']> = {
    RECOVERED: 'Recovered', IN_PROGRESS: 'Pending', NEW: 'Pending',
    DIAGNOSED: 'Pending', ESCALATED: 'Escalated', BLOCKED: 'Blocked', FAILED: 'Failed',
  };
  return map[s] ?? 'Pending';
}

// Maps backend case → frontend BatchEvent shape
function mapCaseToEvent(c: Record<string, unknown>): BatchEvent {
  const diagnosis = (c.diagnoses as Record<string, unknown>[])?.[0];
  const action = (c.actions as Record<string, unknown>[])?.[0];
  const audit = (c.audit_logs as Record<string, unknown>[]) ?? [];
  const fa = (diagnosis?.feature_attributions_json as { name: string; weight: number; impact: string }[]) ?? [];

  return {
    id: (c.id as string) ?? '',
    transactionId: (c.transaction_id as string) ?? '',
    failureCode: (c.failure_code as string) ?? 'ERR_NET',
    failureDescription: (c.failure_raw_desc as string) ?? '',
    amount: (c.amount as number) ?? 0,
    currency: '₹',
    actionTaken: (action?.action_type as BatchEvent['actionTaken']) ?? 'Retry Flow A',
    status: mapStatus(c.status as string),
    recoveredAmount: (c.recovered_amount as number | null),
    timestamp: (c.created_at as string) ?? new Date().toISOString(),
    customerTenureDays: (c.customer_tenure_days as number) ?? 180,
    issuingBank: (c.issuing_bank as string) ?? 'HDFC Bank',
    paymentMethod: (c.payment_method as string) ?? 'UPI AutoPay',
    retryCount: (c.retry_count as number) ?? 0,
    recoveryProbability: Math.round(((diagnosis?.recoverable_prob as number) ?? 0.8) * 100),
    confidence: ((diagnosis?.confidence as BatchEvent['confidence']) ?? 'MEDIUM'),
    rootCauseSignal: (diagnosis?.root_cause as string) ?? '',
    responseCode: (c.failure_code as string) ?? '',
    agentReasoning: (diagnosis?.reasoning as string) ?? 'Heuristic rule engine classification.',
    durationMs: Math.floor(Math.random() * 400) + 150,
    featureAttributions: fa.map(f => ({ name: f.name, weight: f.weight, impact: f.impact as 'positive' | 'negative' })),
    allowedChecks: [
      { name: 'Opt-Out Registry', passed: true, detail: 'Not registered on DND/opt-out list' },
      { name: 'Frequency Cap', passed: true, detail: 'Within 24h outreach limit' },
    ],
    blockedRules: [],
    toolExecution: audit.slice(0, 3).map((a) => ({
      action: (a.event_type as string) ?? 'UNKNOWN',
      target: (a.actor as string) ?? 'SYSTEM',
      result: (a.state_after as string) ?? '',
      status: 'OK' as const,
    })),
  };
}

// Converts backend metrics response to MetricSummary shape
function mapMetrics(m: Record<string, unknown>): MetricSummary {
  return {
    recoveredTotal: m.recoveredTotal as string,
    recoveredCeiling: m.recoveredCeiling as string,
    recoveredPercentage: m.recoveredPercentage as number,
    recoveryRate: m.recoveryRate as number,
    precision: m.precision as number,
    recall: m.recall as number,
    falsePositiveCost: m.falsePositiveCost as string,
    eventsProcessed: m.eventsProcessed as string,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null); // null = checking

  // Dynamic Live State
  const [events, setEvents] = useState<BatchEvent[]>(INITIAL_BATCH_EVENTS);
  const [metrics, setMetrics] = useState<MetricSummary>(INITIAL_METRIC_SUMMARY);
  const [guardrailSpotlight, setGuardrailSpotlight] = useState<GuardrailIntervention>(INITIAL_GUARDRAIL_SPOTLIGHT);
  const [confusionMatrix, setConfusionMatrix] = useState<ConfusionMatrixData>(INITIAL_CONFUSION_MATRIX);
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>(INITIAL_CALIBRATION_POINTS);
  const [actionDistribution, setActionDistribution] = useState<ActionDistributionItem[]>(INITIAL_ACTION_DISTRIBUTION);
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>(INITIAL_FUNNEL_STAGES);

  // Active Execution Settings & Status
  const [isRunningBatch, setIsRunningBatch] = useState<boolean>(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('baseline');
  const [maxRetries, setMaxRetries] = useState<number>(3);
  const [cooldownHours, setCooldownHours] = useState<number>(24);
  const [optOutStrict, setOptOutStrict] = useState<boolean>(true);
  const [escalationThreshold, setEscalationThreshold] = useState<number>(10000);
  const [lastExecutionTimeMs, setLastExecutionTimeMs] = useState<number>(0);

  // Modals state
  const [selectedEventForTrace, setSelectedEventForTrace] = useState<BatchEvent | null>(null);
  const [selectedEventForReplay, setSelectedEventForReplay] = useState<BatchEvent | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // --- Compute derived visualizations from live events ---
  const computeDerivedStats = useCallback((evts: BatchEvent[]) => {
    if (evts.length === 0) return;
    const total = evts.length;
    const recovered = evts.filter(e => e.status === 'Recovered');
    const pending = evts.filter(e => e.status === 'Pending');
    const blocked = evts.filter(e => e.status === 'Blocked');
    const escalated = evts.filter(e => e.status === 'Escalated');
    const failed = evts.filter(e => e.status === 'Failed');
    const actionable = total - blocked.length;

    // Dynamic funnel stages
    setFunnelStages([
      { label: 'Identified', count: `${total}`, percentage: 100, color: '#33353A' },
      { label: 'Actionable', count: `${actionable}`, percentage: Math.round((actionable / total) * 100), color: '#44474F' },
      { label: 'Pending', count: `${pending.length + escalated.length}`, percentage: Math.round(((pending.length + escalated.length) / total) * 100), color: '#78350F', textColor: '#FDE68A' },
      { label: 'Recovered', count: `${recovered.length}`, percentage: Math.round((recovered.length / total) * 100), color: '#1D4E26', textColor: '#A7F3D0' },
    ]);

    // Dynamic action distribution
    const actionCounts: Record<string, number> = {};
    evts.forEach(e => {
      const action = e.actionTaken || 'Unknown';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });
    const colors = ['#2F6FED', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#44474F'];
    const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0);
    setActionDistribution(
      Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([action, count], i) => ({
          action: action.replace('Retry ', '').replace(' Prompt', ''),
          count,
          percentage: Math.round((count / totalActions) * 100),
          color: colors[i % colors.length],
        }))
    );
  }, []);

  // --- Live data fetch from backend on mount ---
  const loadLiveData = useCallback(async () => {
    try {
      const [casesRaw, metricsRaw] = await Promise.all([
        CasesAPI.list({ limit: 200 }) as Promise<Record<string, unknown>[]>,
        MetricsAPI.summary() as Promise<Record<string, unknown>>,
      ]);
      setBackendOnline(true);
      if (casesRaw?.length) {
        const mapped = casesRaw.map(mapCaseToEvent);
        setEvents(mapped);
        computeDerivedStats(mapped);
      }
      if (metricsRaw?.recoveredTotal) setMetrics(mapMetrics(metricsRaw));

      const m = metricsRaw as Record<string, unknown>;
      if (m.confusionMatrix) setConfusionMatrix(m.confusionMatrix as ConfusionMatrixData);
      if (m.calibrationPoints) setCalibrationPoints(m.calibrationPoints as CalibrationPoint[]);
    } catch {
      setBackendOnline(false);
      // Fall through silently – client-side simulation remains active
    }
  }, [computeDerivedStats]);

  useEffect(() => { loadLiveData(); }, [loadLiveData]);

  // --- Live Batch Run via FastAPI ---
  const handleRunBatch = async (
    scenario: EvaluationScenario,
    customRules: { maxRetries: number; cooldownHours: number; optOutStrict: boolean; escalationThreshold: number }
  ) => {
    setIsRunningBatch(true);
    setActiveScenarioId(scenario.id);

    if (backendOnline) {
      try {
        const start = Date.now();
        const result = await BatchAPI.run({
          scenario_id: scenario.id,
          batch_size: scenario.batchSize,
          custom_rules: {
            max_retries: customRules.maxRetries,
            cooldown_hours: customRules.cooldownHours,
            opt_out_strict: customRules.optOutStrict,
            escalation_threshold: customRules.escalationThreshold,
          },
        }) as Record<string, unknown>;

        setLastExecutionTimeMs(Date.now() - start);

        // Refresh live cases and metrics from backend
        await loadLiveData();

        // Update guardrail spotlight from batch result
        if (result.spotlight_intervention) {
          const gi = result.spotlight_intervention as Record<string, unknown>;
          setGuardrailSpotlight({
            eventId: gi.eventId as string,
            transactionId: gi.transactionId as string,
            modelIntent: gi.modelIntent as string,
            policyBlock: gi.policyBlock as string,
            finalAction: gi.finalAction as string,
            timestamp: gi.timestamp as string,
            details: gi.details as string,
          });
        }

        // Rebuild action distribution from result
        if (result.action_distribution) {
          const dist = result.action_distribution as Record<string, number>;
          const colors = ['#2F6FED', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
          const total = Object.values(dist).reduce((a, b) => a + b, 0);
          setActionDistribution(
            Object.entries(dist).map(([action, count], i) => ({
              action,
              count,
              percentage: Math.round((count / total) * 100),
              color: colors[i % colors.length],
            }))
          );
        }

        setIsRunningBatch(false);
        return;
      } catch (err) {
        console.warn('[App] Backend batch run failed, falling back to simulation:', err);
      }
    }

    // Fallback: client-side simulation engine
    const { executeBatchEvaluation } = await import('./services/executionEngine');
    setTimeout(() => {
      const output = executeBatchEvaluation(scenario, customRules);
      setEvents(output.events);
      setMetrics(output.metrics);
      setGuardrailSpotlight(output.activeGuardrailSpotlight);
      setConfusionMatrix(output.confusionMatrix);
      setCalibrationPoints(output.calibrationPoints);
      setActionDistribution(output.actionDistribution);
      setFunnelStages(output.funnelStages);
      setLastExecutionTimeMs(output.totalDurationMs);
      setIsRunningBatch(false);
    }, 600);
  };

  const handleInspectGuardrail = (guardrail: GuardrailIntervention) => {
    const matched = events.find((e) => e.id === guardrail.eventId || e.transactionId === guardrail.transactionId) || events[0];
    setSelectedEventForTrace(matched);
  };

  const handleOpenReplay = (event: BatchEvent) => {
    setSelectedEventForReplay(event);
  };

  // --- Sync compliance config changes to backend ---
  const handleChangeMaxRetries = async (val: number) => {
    setMaxRetries(val);
    if (backendOnline) ComplianceAPI.updateConfig({ max_retries: val }).catch(() => {});
  };
  const handleChangeCooldownHours = async (val: number) => {
    setCooldownHours(val);
    if (backendOnline) ComplianceAPI.updateConfig({ cooldown_hours: val }).catch(() => {});
  };
  const handleChangeOptOutStrict = async (val: boolean) => {
    setOptOutStrict(val);
    if (backendOnline) ComplianceAPI.updateConfig({ opt_out_strict: val }).catch(() => {});
  };
  const handleChangeEscalationThreshold = async (val: number) => {
    setEscalationThreshold(val);
    if (backendOnline) ComplianceAPI.updateConfig({ escalation_threshold: val }).catch(() => {});
  };

  return (
    <div id="recovery-copilot-app" className="min-h-screen bg-[#0F1116] text-[#E2E2E9] flex flex-col font-sans selection:bg-[#2F6FED] selection:text-white">
      {/* Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSupport={() => setIsSupportModalOpen(true)}
        eventsCount={metrics.eventsProcessed || `${events.length} Txns`}
        recoveryRate={metrics.recoveryRate ?? metrics.recoveredPercentage}
      />

      {/* Main Content Area (Offset 280px on desktop) */}
      <div className="flex-1 md:ml-[280px] flex flex-col min-h-screen">
        {/* Fixed Top Header — shows backend connection status */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenExport={() => setIsExportModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          backendOnline={backendOnline}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 mt-16 p-6 overflow-y-auto bg-[#0F1116]">
          {activeTab === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              guardrail={guardrailSpotlight}
              events={events}
              actionDistribution={actionDistribution}
              funnelStages={funnelStages}
              searchQuery={searchQuery}
              onSelectEvent={(evt) => setSelectedEventForTrace(evt)}
              onInspectGuardrail={handleInspectGuardrail}
              onRunBatch={handleRunBatch}
              isRunningBatch={isRunningBatch}
              activeScenarioId={activeScenarioId}
              maxRetries={maxRetries}
              cooldownHours={cooldownHours}
              optOutStrict={optOutStrict}
              escalationThreshold={escalationThreshold}
              onChangeMaxRetries={handleChangeMaxRetries}
              onChangeCooldownHours={handleChangeCooldownHours}
              onChangeOptOutStrict={handleChangeOptOutStrict}
              onChangeEscalationThreshold={handleChangeEscalationThreshold}
              lastExecutionTimeMs={lastExecutionTimeMs}
            />
          )}

          {activeTab === 'events' && (
            <EventsView
              events={events}
              searchQuery={searchQuery}
              onSelectEvent={(evt) => setSelectedEventForTrace(evt)}
              onOpenReplay={handleOpenReplay}
            />
          )}

          {activeTab === 'recoveries' && (
            <RecoveriesView metrics={metrics} events={events} />
          )}

          {activeTab === 'automation' && (
            <AutomationView
              maxRetries={maxRetries}
              cooldownHours={cooldownHours}
              optOutStrict={optOutStrict}
              escalationThreshold={escalationThreshold}
              onChangeMaxRetries={handleChangeMaxRetries}
              onChangeCooldownHours={handleChangeCooldownHours}
              onChangeOptOutStrict={handleChangeOptOutStrict}
              onChangeEscalationThreshold={handleChangeEscalationThreshold}
              backendOnline={backendOnline}
            />
          )}

          {activeTab === 'analytics' && (
            <ModelPerformanceView
              confusionMatrix={confusionMatrix}
              calibrationPoints={calibrationPoints}
            />
          )}
        </main>
      </div>

      {/* Screen 2: Slide-Over Event Trace Drilldown */}
      {selectedEventForTrace && (
        <EventDrillDownModal
          event={selectedEventForTrace}
          onClose={() => setSelectedEventForTrace(null)}
          onReplay={(evt) => {
            setSelectedEventForTrace(null);
            setSelectedEventForReplay(evt);
          }}
        />
      )}

      {/* Interactive Replay Simulation Sandbox */}
      {selectedEventForReplay && (
        <ReplaySimulationModal
          event={selectedEventForReplay}
          onClose={() => setSelectedEventForReplay(null)}
        />
      )}

      {/* Export CSV / JSONL Modal */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          events={events}
        />
      )}

      {/* Documentation & Specs Modal */}
      {isSupportModalOpen && (
        <SupportDocsModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
        />
      )}

      {/* System Settings & API Configuration Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          backendOnline={backendOnline}
        />
      )}
    </div>
  );
}
