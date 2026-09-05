import { BatchEvent, MetricSummary, GuardrailIntervention, ConfusionMatrixData, CalibrationPoint, ActionDistributionItem, FunnelStage, ActionType, EventStatus } from '../types';

export interface EvaluationScenario {
  id: string;
  name: string;
  description: string;
  issuerHealth: 'normal' | 'degraded_hdfc' | 'upi_outage' | 'salary_weekend';
  policyStrictness: 'standard' | 'aggressive' | 'conservative';
  batchSize: number;
}

export const EVAL_SCENARIOS: EvaluationScenario[] = [
  {
    id: 'baseline',
    name: 'Standard Production Traffic (100 Txns)',
    description: 'Realistic production distribution with balanced failure modes, diverse issuer banks, and standard retry policies.',
    issuerHealth: 'normal',
    policyStrictness: 'standard',
    batchSize: 100
  },
  {
    id: 'salary_weekend',
    name: 'Payday / 1st of Month Spike (150 Txns)',
    description: 'High volume of insufficient funds (ERR_FUNDS). High recovery probability via flow delay/smart scheduler.',
    issuerHealth: 'salary_weekend',
    policyStrictness: 'standard',
    batchSize: 150
  },
  {
    id: 'hdfc_degraded',
    name: 'HDFC Switch Latency & Timeout Surge (120 Txns)',
    description: 'Surge in ERR_TIMEOUT and ERR_NET. High recoverable percentage when routed to backup switch.',
    issuerHealth: 'degraded_hdfc',
    policyStrictness: 'standard',
    batchSize: 120
  },
  {
    id: 'upi_outage',
    name: 'National UPI Switch Glitch (120 Txns)',
    description: 'Broad UPI mandate failure wave. Model identifies network vs hard card blocks.',
    issuerHealth: 'upi_outage',
    policyStrictness: 'conservative',
    batchSize: 120
  },
  {
    id: 'strict_compliance',
    name: 'Strict RBI Velocity & Account Guardrails (100 Txns)',
    description: 'Conservative thresholds. Simulates high guardrail interception rate on suspected frozen/opted-out mandates.',
    issuerHealth: 'normal',
    policyStrictness: 'conservative',
    batchSize: 100
  }
];

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Federal Bank'];
const PAYMENT_METHODS = ['UPI AutoPay', 'Visa Credit Card', 'Mastercard Debit', 'eNACH Mandate', 'Amex Corporate'];
const FAILURE_CODES = [
  { code: 'ERR_FUNDS', desc: 'Insufficient Funds on Account', baseRecoverability: 0.88 },
  { code: 'ERR_NET', desc: 'Gateway Switch Network Error', baseRecoverability: 0.94 },
  { code: 'ERR_TIMEOUT', desc: 'Issuer Switch Handshake Timeout', baseRecoverability: 0.91 },
  { code: 'ERR_AUTH', desc: 'Recurring Mandate Auth Challenge', baseRecoverability: 0.65 },
  { code: 'ERR_FROZEN', desc: 'Regulatory Hard Lock / Account Frozen', baseRecoverability: 0.04 },
  { code: 'ERR_EXPIRED', desc: 'Card Expired / Token Revoked', baseRecoverability: 0.35 },
  { code: 'ERR_LIMIT', desc: 'Daily Transaction Velocity Limit', baseRecoverability: 0.72 }
];

export interface RawTransactionPayload {
  txnId: string;
  amount: number;
  bank: string;
  paymentMethod: string;
  failureCode: string;
  customerTenureDays: number;
  priorFailures: number;
  historicalSuccessRate: number;
  timeSinceLastAttemptHours: number;
  isAccountFrozen: boolean;
  optedOut: boolean;
  mccRiskTier: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * 1. SYNTHETIC BATCH GENERATOR
 */
export function generateSyntheticBatch(scenario: EvaluationScenario): RawTransactionPayload[] {
  const payloads: RawTransactionPayload[] = [];

  for (let i = 0; i < scenario.batchSize; i++) {
    const txnNum = 1000 + i;
    const txnId = `TXN-${txnNum}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Select bank & failure based on scenario
    let bank = BANKS[Math.floor(Math.random() * BANKS.length)];
    if (scenario.issuerHealth === 'degraded_hdfc' && Math.random() < 0.6) {
      bank = 'HDFC Bank';
    }

    let failure = FAILURE_CODES[Math.floor(Math.random() * FAILURE_CODES.length)];
    if (scenario.issuerHealth === 'salary_weekend' && Math.random() < 0.65) {
      failure = FAILURE_CODES.find(f => f.code === 'ERR_FUNDS')!;
    } else if (scenario.issuerHealth === 'degraded_hdfc' && bank === 'HDFC Bank' && Math.random() < 0.7) {
      failure = Math.random() < 0.5 
        ? FAILURE_CODES.find(f => f.code === 'ERR_TIMEOUT')! 
        : FAILURE_CODES.find(f => f.code === 'ERR_NET')!;
    } else if (scenario.issuerHealth === 'upi_outage' && Math.random() < 0.6) {
      failure = FAILURE_CODES.find(f => f.code === 'ERR_NET')!;
    }

    let paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
    if (scenario.issuerHealth === 'upi_outage' && Math.random() < 0.75) {
      paymentMethod = 'UPI AutoPay';
    }

    const tenure = Math.floor(Math.random() * 700) + 15;
    const priorFailures = Math.floor(Math.random() * 4);
    const historicalSuccessRate = Math.min(0.99, Math.max(0.40, 0.95 - (priorFailures * 0.12) + (Math.random() * 0.1 - 0.05)));
    const timeSinceLastAttemptHours = priorFailures === 0 ? 0 : Math.floor(Math.random() * 48) + 2;

    // Amounts (₹199 to ₹25,000)
    const amounts = [499, 999, 1250, 1999, 2499, 4999, 8500, 12500, 18000, 24500];
    const amount = amounts[Math.floor(Math.random() * amounts.length)];

    const isAccountFrozen = failure.code === 'ERR_FROZEN' || (Math.random() < 0.03);
    const optedOut = Math.random() < (scenario.policyStrictness === 'conservative' ? 0.06 : 0.02);
    const mccRiskTier: 'LOW' | 'MEDIUM' | 'HIGH' = amount > 15000 ? 'HIGH' : amount > 3000 ? 'MEDIUM' : 'LOW';

    payloads.push({
      txnId,
      amount,
      bank,
      paymentMethod,
      failureCode: failure.code,
      customerTenureDays: tenure,
      priorFailures,
      historicalSuccessRate,
      timeSinceLastAttemptHours,
      isAccountFrozen,
      optedOut,
      mccRiskTier
    });
  }

  return payloads;
}

/**
 * 2. LIVE ML SCORING ENGINE (Simulates Ensemble Model rc-v4.2)
 * Computes calibrated recovery probabilities and SHAP feature attributions
 */
export interface ScoredResult {
  recoveryProbability: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  featureAttributions: { name: string; weight: number; impact: 'positive' | 'negative' }[];
  modelProposedAction: ActionType;
  modelConfidenceScore: number;
}

export function scoreTransactionWithModel(raw: RawTransactionPayload): ScoredResult {
  let score = 0.50;

  // Base failure code prior
  const failureDef = FAILURE_CODES.find(f => f.code === raw.failureCode);
  const basePrior = failureDef ? failureDef.baseRecoverability : 0.60;
  score = (score * 0.3) + (basePrior * 0.7);

  // Historical Auth Rate factor (+-0.25)
  const authDiff = (raw.historicalSuccessRate - 0.75) * 0.6;
  score += authDiff;

  // Customer Tenure factor (High tenure = higher recovery)
  const tenureFactor = Math.min(0.12, (raw.customerTenureDays / 500) * 0.12);
  score += tenureFactor;

  // Prior retry penalty
  const retryPenalty = raw.priorFailures * 0.14;
  score -= retryPenalty;

  // Time spacing bonus (exponential recovery if cooldown was respected)
  if (raw.timeSinceLastAttemptHours >= 12) {
    score += 0.08;
  } else if (raw.timeSinceLastAttemptHours > 0 && raw.timeSinceLastAttemptHours < 4) {
    score -= 0.15;
  }

  // Hard Account Freeze dampener (unless model is naive)
  if (raw.isAccountFrozen) {
    // Model might mistakenly predict moderate chance on frozen accounts if user was high-value,
    // this creates the perfect guardrail test case!
    score = raw.historicalSuccessRate > 0.9 ? 0.68 : 0.10;
  }

  // Bounds
  const probability = Math.min(99.4, Math.max(2.1, Math.round(score * 1000) / 10));

  // SHAP Feature Attribution Calculation
  const featureAttributions = [
    {
      name: 'historical_auth_rate',
      weight: parseFloat(((raw.historicalSuccessRate - 0.5) * 0.8).toFixed(2)),
      impact: raw.historicalSuccessRate >= 0.75 ? ('positive' as const) : ('negative' as const)
    },
    {
      name: 'failure_code_prior',
      weight: parseFloat(((basePrior - 0.5) * 0.7).toFixed(2)),
      impact: basePrior >= 0.6 ? ('positive' as const) : ('negative' as const)
    },
    {
      name: 'customer_tenure_signal',
      weight: parseFloat(((raw.customerTenureDays / 365) * 0.25).toFixed(2)),
      impact: raw.customerTenureDays > 120 ? ('positive' as const) : ('negative' as const)
    },
    {
      name: 'retry_velocity_penalty',
      weight: parseFloat((-raw.priorFailures * 0.18).toFixed(2)),
      impact: 'negative' as const
    }
  ].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (probability >= 80 || probability <= 20) confidence = 'HIGH';
  else if (probability < 45 || probability > 70) confidence = 'MEDIUM';
  else confidence = 'LOW';

  // Model proposed action based purely on ML score
  let modelProposedAction: ActionType = 'Soft Retry';
  if (raw.isAccountFrozen && probability > 50) {
    modelProposedAction = 'Force Charge'; // Unsafe model intent caught by guardrail
  } else if (probability >= 82) {
    modelProposedAction = raw.failureCode === 'ERR_FUNDS' ? 'Retry Flow B' : 'Retry Flow A';
  } else if (probability >= 60) {
    modelProposedAction = 'Soft Retry';
  } else if (probability >= 35) {
    modelProposedAction = 'Email Prompt';
  } else {
    modelProposedAction = 'Stand Down';
  }

  return {
    recoveryProbability: probability,
    confidence,
    featureAttributions,
    modelProposedAction,
    modelConfidenceScore: score
  };
}

/**
 * 3. DETERMINISTIC POLICY GUARDRAILS & AGENT DISPATCHER
 * Strictly filters unsafe model actions (e.g. Force Charge on frozen account, Max retry violations)
 */
export interface EvaluationBatchOutput {
  events: BatchEvent[];
  metrics: MetricSummary;
  confusionMatrix: ConfusionMatrixData;
  calibrationPoints: CalibrationPoint[];
  actionDistribution: ActionDistributionItem[];
  funnelStages: FunnelStage[];
  guardrailInterventions: GuardrailIntervention[];
  activeGuardrailSpotlight: GuardrailIntervention;
  totalDurationMs: number;
}

export function executeBatchEvaluation(
  scenario: EvaluationScenario,
  customRules: { maxRetries: number; cooldownHours: number; optOutStrict: boolean; escalationThreshold: number }
): EvaluationBatchOutput {
  const startTime = Date.now();
  const rawPayloads = generateSyntheticBatch(scenario);

  const events: BatchEvent[] = [];
  const guardrailInterventions: GuardrailIntervention[] = [];

  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  let totalAmountAttempted = 0;
  let totalAmountRecovered = 0;
  let fpCostINR = 0;

  const actionCounts: Record<ActionType, number> = {
    'Retry Flow A': 0,
    'Retry Flow B': 0,
    'Soft Retry': 0,
    'Email Prompt': 0,
    'Escalate': 0,
    'Stand Down': 0,
    'Force Charge': 0,
    'Halted': 0
  };

  rawPayloads.forEach((payload, index) => {
    const evtId = `EV-${10200 + index}`;
    const failureDef = FAILURE_CODES.find(f => f.code === payload.failureCode);
    const scoreResult = scoreTransactionWithModel(payload);
    totalAmountAttempted += payload.amount;

    // --- Deterministic Policy Guardrail Check ---
    const allowedChecks = [
      {
        name: `Velocity_Limit (Prior < ${customRules.maxRetries})`,
        passed: payload.priorFailures < customRules.maxRetries,
        detail: `Current retries: ${payload.priorFailures}/${customRules.maxRetries}`
      },
      {
        name: `Cooldown_Elapsed (T >= ${customRules.cooldownHours}h)`,
        passed: payload.priorFailures === 0 || payload.timeSinceLastAttemptHours >= customRules.cooldownHours,
        detail: payload.priorFailures === 0 ? 'First failure event' : `Elapsed ${payload.timeSinceLastAttemptHours}h`
      },
      {
        name: `Opt_Out_Check (opted_out = false)`,
        passed: !payload.optedOut,
        detail: payload.optedOut ? 'Customer invoked explicit DND' : 'Consent active'
      },
      {
        name: `Account_Frozen_Safety`,
        passed: !payload.isAccountFrozen,
        detail: payload.isAccountFrozen ? 'Regulatory Hard Lock (Code 402)' : 'Account active'
      }
    ];

    const blockedRules = [];
    let isIntervenedByGuardrail = false;
    let guardrailReason = '';
    let finalAction: ActionType = scoreResult.modelProposedAction;
    let finalStatus: EventStatus = 'Pending';
    let recoveredAmount: number | null = null;

    // RULE 1: Account Frozen Hard Gate
    if (payload.isAccountFrozen) {
      if (scoreResult.modelProposedAction === 'Force Charge' || scoreResult.recoveryProbability > 50) {
        isIntervenedByGuardrail = true;
        guardrailReason = 'Account Frozen (Code 402)';
        finalAction = 'Halted';
        finalStatus = 'Blocked';
        blockedRules.push({
          rule: 'Hard_Regulatory_Gate: Account_Frozen',
          reason: 'Autonomous retry suppressed on frozen mandate to protect against double-debit exposure.',
          active: true
        });
      }
    }

    // RULE 2: Opt-Out Gate
    if (!isIntervenedByGuardrail && payload.optedOut && customRules.optOutStrict) {
      isIntervenedByGuardrail = true;
      guardrailReason = 'RBI Opt-Out Mandate';
      finalAction = 'Stand Down';
      finalStatus = 'Blocked';
      blockedRules.push({
        rule: 'RBI_OptOut_Compliance',
        reason: 'Customer opted out of dunning notifications.',
        active: true
      });
    }

    // RULE 3: Max Retries Exceeded
    if (!isIntervenedByGuardrail && payload.priorFailures >= customRules.maxRetries) {
      isIntervenedByGuardrail = true;
      guardrailReason = `Max Retry Cap Reached (${customRules.maxRetries})`;
      finalAction = 'Escalate';
      finalStatus = 'Escalated';
      blockedRules.push({
        rule: 'Max_Retry_Velocity_Cap',
        reason: `Exceeded ${customRules.maxRetries} attempt threshold. Routed to VIP Desk.`,
        active: true
      });
    }

    // RULE 4: High Value Threshold
    if (!isIntervenedByGuardrail && payload.amount >= customRules.escalationThreshold) {
      finalAction = 'Escalate';
      finalStatus = 'Escalated';
      blockedRules.push({
        rule: 'High_Value_Escalation_Policy',
        reason: `Amount ₹${payload.amount} >= ₹${customRules.escalationThreshold}. Requires human oversight.`,
        active: true
      });
    }

    if (isIntervenedByGuardrail) {
      guardrailInterventions.push({
        eventId: evtId,
        transactionId: payload.txnId,
        modelIntent: scoreResult.modelProposedAction,
        policyBlock: guardrailReason,
        finalAction: finalAction,
        timestamp: new Date().toISOString(),
        details: `Autonomous model scheduled '${scoreResult.modelProposedAction}' with score ${scoreResult.recoveryProbability}%. Policy engine intercepted execution and enforced '${finalAction}'.`
      });
    }

    // Determine actual ground-truth recovery outcome simulation
    // Simulating whether payment clears based on true probability + action appropriateness
    const trueOutcomeProbability = payload.isAccountFrozen ? 0.01 : payload.optedOut ? 0.05 : (scoreResult.recoveryProbability / 100);
    const isActuallyRecoverable = trueOutcomeProbability > 0.50;

    let toolExecStatus: 'OK' | 'FAILED' | 'PENDING' = 'OK';
    const duration = Math.floor(Math.random() * 380) + 120;

    if (finalAction === 'Halted' || finalAction === 'Stand Down') {
      finalStatus = 'Blocked';
      if (!isActuallyRecoverable) {
        trueNegatives++;
      } else {
        falseNegatives++;
      }
    } else if (finalAction === 'Escalate') {
      finalStatus = 'Escalated';
      recoveredAmount = Math.random() < 0.7 ? payload.amount : null;
      if (recoveredAmount) {
        totalAmountRecovered += recoveredAmount;
        truePositives++;
      } else {
        falsePositives++;
      }
    } else {
      // Retried / Prompted
      const roll = Math.random();
      if (roll < trueOutcomeProbability) {
        finalStatus = 'Recovered';
        recoveredAmount = payload.amount;
        totalAmountRecovered += payload.amount;
        truePositives++;
      } else {
        finalStatus = 'Failed';
        toolExecStatus = 'FAILED';
        falsePositives++;
        fpCostINR += 18; // Gateway retry penalty fee ₹18
      }
    }

    actionCounts[finalAction] = (actionCounts[finalAction] || 0) + 1;

    // Build Agent Reasoning Trace
    let reasoning = `Ingested ${payload.txnId} (${payload.failureCode}) from ${payload.bank}. Model scored ${scoreResult.recoveryProbability}% recovery likelihood. `;
    if (isIntervenedByGuardrail) {
      reasoning += `[GUARDRAIL TRIGGERED]: Policy rule intervened against model intent '${scoreResult.modelProposedAction}' due to '${guardrailReason}'. Overriding action to '${finalAction}'.`;
    } else {
      reasoning += `Passed all deterministic safety bounds. Executing '${finalAction}' with estimated confidence ${scoreResult.confidence}.`;
    }

    const toolExecution = [
      {
        action: finalAction === 'Halted' ? 'policy_halt' : finalAction === 'Escalate' ? 'route_to_vip_desk' : 'dispatch_gateway_retry',
        target: `${payload.bank} (${payload.paymentMethod})`,
        result: finalStatus === 'Recovered' ? 'HTTP 200: AUTH_APPROVED' : finalStatus === 'Blocked' ? 'HALTED_BY_POLICY' : 'HTTP 402: ISSUER_DECLINE',
        status: toolExecStatus
      }
    ];

    events.push({
      id: evtId,
      transactionId: payload.txnId,
      failureCode: payload.failureCode,
      failureDescription: failureDef?.desc || 'Payment Failure',
      amount: payload.amount,
      currency: '₹',
      actionTaken: finalAction,
      status: finalStatus,
      recoveredAmount,
      timestamp: new Date(Date.now() - (scenario.batchSize - index) * 60000).toISOString(),
      customerTenureDays: payload.customerTenureDays,
      issuingBank: payload.bank,
      paymentMethod: payload.paymentMethod,
      retryCount: payload.priorFailures + 1,
      recoveryProbability: scoreResult.recoveryProbability,
      confidence: scoreResult.confidence,
      rootCauseSignal: payload.failureCode === 'ERR_FUNDS' ? 'PAYDAY_ALIGNMENT_REQUIRED' : 'NETWORK_ROUTER_LATENCY',
      responseCode: finalStatus === 'Recovered' ? 'APPROVED_00' : 'DECLINED_05',
      agentReasoning: reasoning,
      durationMs: duration,
      featureAttributions: scoreResult.featureAttributions,
      allowedChecks,
      blockedRules,
      toolExecution
    });
  });

  const totalEvaluated = events.length;
  const totalPositives = truePositives + falsePositives;
  const totalNegatives = trueNegatives + falseNegatives;

  const precision = totalPositives > 0 ? parseFloat(((truePositives / totalPositives) * 100).toFixed(1)) : 98.0;
  const recall = (truePositives + falseNegatives) > 0 ? parseFloat(((truePositives / (truePositives + falseNegatives)) * 100).toFixed(1)) : 92.0;
  const recoveryRate = totalEvaluated > 0 ? parseFloat(((events.filter(e => e.status === 'Recovered').length / totalEvaluated) * 100).toFixed(1)) : 85.6;

  // Format currency helpers
  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  const metrics: MetricSummary = {
    recoveredTotal: formatINR(totalAmountRecovered),
    recoveredCeiling: `${formatINR(totalAmountAttempted)} ceiling`,
    recoveredPercentage: totalAmountAttempted > 0 ? parseFloat(((totalAmountRecovered / totalAmountAttempted) * 100).toFixed(1)) : 85.6,
    recoveryRate,
    precision,
    recall,
    falsePositiveCost: `₹${(fpCostINR).toLocaleString()}`,
    eventsProcessed: `${totalEvaluated} txns`
  };

  const confusionMatrix: ConfusionMatrixData = {
    tn: trueNegatives,
    fp: falsePositives,
    fn: falseNegatives,
    tp: truePositives
  };

  // Calibration curve bins (0.0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0)
  const bins = [
    { pred: 0.1, count: 0, actualRecovered: 0 },
    { pred: 0.3, count: 0, actualRecovered: 0 },
    { pred: 0.5, count: 0, actualRecovered: 0 },
    { pred: 0.7, count: 0, actualRecovered: 0 },
    { pred: 0.9, count: 0, actualRecovered: 0 },
  ];

  events.forEach(e => {
    const p = e.recoveryProbability / 100;
    const binIdx = Math.min(4, Math.floor(p * 5));
    bins[binIdx].count++;
    if (e.status === 'Recovered') {
      bins[binIdx].actualRecovered++;
    }
  });

  const calibrationPoints: CalibrationPoint[] = bins.map(b => ({
    pred: b.pred,
    actual: b.count > 0 ? parseFloat((b.actualRecovered / b.count).toFixed(2)) : b.pred,
    count: b.count
  }));

  const actionDistribution: ActionDistributionItem[] = [
    { action: 'Retry Flow A', count: actionCounts['Retry Flow A'], percentage: Math.round((actionCounts['Retry Flow A'] / totalEvaluated) * 100), color: '#2F6FED' },
    { action: 'Retry Flow B', count: actionCounts['Retry Flow B'], percentage: Math.round((actionCounts['Retry Flow B'] / totalEvaluated) * 100), color: '#5B8DEF' },
    { action: 'Soft Retry', count: actionCounts['Soft Retry'], percentage: Math.round((actionCounts['Soft Retry'] / totalEvaluated) * 100), color: '#8BAEFA' },
    { action: 'Email / WhatsApp', count: actionCounts['Email Prompt'], percentage: Math.round((actionCounts['Email Prompt'] / totalEvaluated) * 100), color: '#B1C5FF' },
    { action: 'Escalate / VIP Desk', count: actionCounts['Escalate'], percentage: Math.round((actionCounts['Escalate'] / totalEvaluated) * 100), color: '#FFB691' },
    { action: 'Halted by Guardrail', count: actionCounts['Halted'] + actionCounts['Stand Down'], percentage: Math.round(((actionCounts['Halted'] + actionCounts['Stand Down']) / totalEvaluated) * 100), color: '#FFB4AB' }
  ].filter(a => a.count > 0);

  const actionableCount = events.filter(e => e.actionTaken !== 'Halted' && e.actionTaken !== 'Stand Down').length;
  const pendingCount = events.filter(e => e.status === 'Pending' || e.status === 'Escalated').length;
  const recoveredCount = events.filter(e => e.status === 'Recovered').length;

  const funnelStages: FunnelStage[] = [
    { label: 'Ingested Failures', count: `${totalEvaluated}`, percentage: 100, color: '#424654', textColor: '#E2E2E9' },
    { label: 'Policy Approved', count: `${actionableCount}`, percentage: Math.round((actionableCount / totalEvaluated) * 100), color: '#1B3B6F', textColor: '#E2E2E9' },
    { label: 'Active In Flight', count: `${pendingCount}`, percentage: Math.round((pendingCount / totalEvaluated) * 100), color: '#2357A6', textColor: '#E2E2E9' },
    { label: 'Recovered Revenue', count: `${recoveredCount}`, percentage: Math.round((recoveredCount / totalEvaluated) * 100), color: '#2F6FED', textColor: '#FFFFFF' }
  ];

  const defaultGuardrailSpotlight: GuardrailIntervention = guardrailInterventions[0] || {
    eventId: 'EVT-992-ALPHA',
    transactionId: 'TXN-9021-BLK',
    modelIntent: 'Force Charge',
    policyBlock: 'Account Frozen (Code 402)',
    finalAction: 'Halted',
    timestamp: new Date().toISOString(),
    details: 'Autonomous model scheduled instantaneous third-party retry despite hard regulatory block and frozen status on account. Policy engine intercepted execution and prevented double-debit exposure.'
  };

  return {
    events,
    metrics,
    confusionMatrix,
    calibrationPoints,
    actionDistribution,
    funnelStages,
    guardrailInterventions,
    activeGuardrailSpotlight: defaultGuardrailSpotlight,
    totalDurationMs: Date.now() - startTime
  };
}
