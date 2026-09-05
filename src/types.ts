export type EventStatus = 'Recovered' | 'Pending' | 'Failed' | 'Escalated' | 'Blocked';
export type ActionType = 'Retry Flow A' | 'Retry Flow B' | 'Soft Retry' | 'Email Prompt' | 'Escalate' | 'Stand Down' | 'Force Charge' | 'Halted';

export interface BatchEvent {
  id: string;
  transactionId: string;
  failureCode: string;
  failureDescription?: string;
  amount: number;
  currency: string;
  actionTaken: ActionType;
  status: EventStatus;
  recoveredAmount: number | null;
  timestamp: string;
  customerTenureDays: number;
  issuingBank: string;
  paymentMethod: string;
  retryCount: number;
  recoveryProbability: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rootCauseSignal: string;
  responseCode: string;
  agentReasoning: string;
  durationMs: number;
  featureAttributions: {
    name: string;
    weight: number;
    impact: 'positive' | 'negative';
  }[];
  allowedChecks: {
    name: string;
    passed: boolean;
    detail: string;
  }[];
  blockedRules: {
    rule: string;
    reason: string;
    override?: string;
    active: boolean;
  }[];
  toolExecution: {
    action: string;
    target: string;
    result: string;
    status: 'OK' | 'FAILED' | 'PENDING';
  }[];
}

export interface MetricSummary {
  recoveredTotal: string;
  recoveredCeiling: string;
  recoveredPercentage: number;
  recoveryRate: number;
  precision: number;
  recall: number;
  falsePositiveCost: string;
  eventsProcessed: string;
}

export interface GuardrailIntervention {
  eventId: string;
  transactionId: string;
  modelIntent: string;
  policyBlock: string;
  finalAction: string;
  timestamp: string;
  details: string;
}

export interface ConfusionMatrixData {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface CalibrationPoint {
  pred: number;
  actual: number;
  count: number;
}

export interface ActionDistributionItem {
  action: string;
  percentage: number;
  count: number;
  color: string;
}

export interface FunnelStage {
  label: string;
  count: string;
  percentage: number;
  color: string;
  textColor?: string;
}

export type ActiveNavTab = 'dashboard' | 'events' | 'recoveries' | 'automation' | 'analytics';
