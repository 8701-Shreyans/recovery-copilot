import React from 'react';
import { Banknote, TrendingUp, ShieldCheck, CheckCircle, Percent, ArrowUpRight } from 'lucide-react';
import { MetricSummary, BatchEvent } from '../types';

interface RecoveriesViewProps {
  metrics: MetricSummary;
  events?: BatchEvent[];
}

export const RecoveriesView: React.FC<RecoveriesViewProps> = ({ metrics, events = [] }) => {
  // Aggregate real bank data from events if available
  const bankStats: Record<string, { recovered: number; total: number; count: number }> = {};
  const failureStats: Record<string, { recovered: number; total: number; count: number }> = {};

  events.forEach((evt) => {
    const bank = evt.issuingBank || 'Other Banks';
    if (!bankStats[bank]) bankStats[bank] = { recovered: 0, total: 0, count: 0 };
    bankStats[bank].total += evt.amount;
    bankStats[bank].count += 1;
    if (evt.status === 'Recovered') {
      bankStats[bank].recovered += evt.recoveredAmount || evt.amount;
    }

    const code = evt.failureCode || 'ERR_OTHER';
    if (!failureStats[code]) failureStats[code] = { recovered: 0, total: 0, count: 0 };
    failureStats[code].total += evt.amount;
    failureStats[code].count += 1;
    if (evt.status === 'Recovered') {
      failureStats[code].recovered += evt.recoveredAmount || evt.amount;
    }
  });

  const hasEvents = events.length > 0;

  const bankBreakdown = hasEvents
    ? Object.entries(bankStats).map(([bank, data]) => ({
        bank,
        recovered: `₹${Math.round(data.recovered).toLocaleString('en-IN')}`,
        rate: data.total > 0 ? `${((data.recovered / data.total) * 100).toFixed(1)}%` : '0.0%',
        count: `${data.count} Txns`,
        feesSaved: `₹${Math.round(data.recovered * 0.015).toLocaleString('en-IN')}`
      }))
    : [
        { bank: 'HDFC Bank', recovered: '₹14.2K', rate: '88.4%', count: '24 Txns', feesSaved: '₹1.2K' },
        { bank: 'ICICI Bank', recovered: '₹11.8K', rate: '86.1%', count: '18 Txns', feesSaved: '₹980' },
        { bank: 'State Bank of India', recovered: '₹8.9K', rate: '81.5%', count: '15 Txns', feesSaved: '₹840' },
        { bank: 'Axis Bank', recovered: '₹5.6K', rate: '87.2%', count: '12 Txns', feesSaved: '₹520' },
        { bank: 'Kotak & Others', recovered: '₹2.3K', rate: '84.0%', count: '8 Txns', feesSaved: '₹180' },
      ];

  const failureDisplayNames: Record<string, { label: string; action: string }> = {
    ERR_FUNDS: { label: 'Insufficient Funds (Payday Sync)', action: 'Smart Delay / Flow B' },
    ERR_NET: { label: 'Network & Timeout Glitches', action: 'Smart Router / Flow A' },
    ERR_TIMEOUT: { label: 'Issuer Switch Timeouts', action: 'Failover Route / Flow A' },
    ERR_LIMIT: { label: 'Daily Card Spend Limits', action: 'Soft Retry / Midnight Cooldown' },
    ERR_EXPIRED: { label: 'Expired Mandates & Cards', action: 'WhatsApp / Email Nudge' },
    ERR_AUTH: { label: 'Mandate Step-Up Challenges', action: 'Interactive WhatsApp Link' },
    ERR_FROZEN: { label: 'Regulatory Frozen Accounts', action: 'Stand Down / Gated' }
  };

  const failureRecoveries = hasEvents
    ? Object.entries(failureStats).map(([code, data]) => ({
        type: failureDisplayNames[code]?.label || code,
        rate: data.total > 0 ? `${((data.recovered / data.total) * 100).toFixed(1)}%` : '0.0%',
        recovered: `₹${Math.round(data.recovered).toLocaleString('en-IN')}`,
        action: failureDisplayNames[code]?.action || 'Auto Recovery Route'
      }))
    : [
        { type: 'Insufficient Funds (Payday Sync)', rate: '92.4%', recovered: '₹21.4K', action: 'Smart Delay / Flow B' },
        { type: 'Network & Timeout Glitches', rate: '96.8%', recovered: '₹14.1K', action: 'Smart Router / Flow A' },
        { type: 'Daily Card Spend Limits', rate: '64.2%', recovered: '₹4.8K', action: 'Escalation / Retarget' },
        { type: 'Expired Mandates & Cards', rate: '41.0%', recovered: '₹2.5K', action: 'WhatsApp / Email Nudge' },
      ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#2A2E3A] pb-4">
        <h2 className="text-[26px] font-bold text-[#E2E2E9] tracking-tight">Recoveries Financial Ledger</h2>
        <p className="text-[14px] text-[#8C90A0] mt-1">
          Comprehensive breakdown of recovered recurring subscription capital and net fee savings.
        </p>
      </div>

      {/* Headline Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[11px] text-[#8C90A0] uppercase font-bold">Total ₹ Recovered</span>
            <TrendingUp className="w-4 h-4 text-[#A7F3D0]" />
          </div>
          <div className="text-[32px] font-bold text-[#E2E2E9] mt-2 tracking-tight">{metrics.recoveredTotal}</div>
          <p className="font-mono text-[12px] text-[#A7F3D0] mt-1">
            {metrics.recoveredPercentage}% of {metrics.recoveredCeiling} recoverable ceiling
          </p>
        </div>

        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[11px] text-[#8C90A0] uppercase font-bold">Net Gateway Fee Savings</span>
            <ShieldCheck className="w-4 h-4 text-[#B1C5FF]" />
          </div>
          <div className="text-[32px] font-bold text-[#B1C5FF] mt-2 tracking-tight">
            {metrics.falsePositiveCost}
          </div>
          <p className="font-mono text-[12px] text-[#8C90A0] mt-1">Prevented redundant retries on hard declines</p>
        </div>

        <div className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-5">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[11px] text-[#8C90A0] uppercase font-bold">Model Precision</span>
            <Percent className="w-4 h-4 text-[#FDE68A]" />
          </div>
          <div className="text-[32px] font-bold text-[#E2E2E9] mt-2 tracking-tight">{metrics.precision}%</div>
          <p className="font-mono text-[12px] text-[#8C90A0] mt-1">Recall: {metrics.recall}% across active batches</p>
        </div>
      </div>

      {/* Recovery by Issuing Bank */}
      <section className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-6">
        <h3 className="text-[17px] font-semibold text-[#E2E2E9] border-b border-[#2A2E3A] pb-3 mb-4">
          Recovery Performance by Bank Rail
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-[12px]">
            <thead>
              <tr className="border-b border-[#2A2E3A] text-[#8C90A0] text-[11px]">
                <th className="py-2.5 px-3 uppercase font-bold">ISSUER BANK</th>
                <th className="py-2.5 px-3 uppercase font-bold">RECOVERED REVENUE</th>
                <th className="py-2.5 px-3 uppercase font-bold">RECOVERY RATE</th>
                <th className="py-2.5 px-3 uppercase font-bold">EVENTS PROCESSED</th>
                <th className="py-2.5 px-3 uppercase font-bold text-right">FEES SAVED</th>
              </tr>
            </thead>
            <tbody>
              {bankBreakdown.map((row) => (
                <tr key={row.bank} className="border-b border-[#2A2E3A]/60 hover:bg-[#282A2F] transition-colors">
                  <td className="py-3 px-3 text-[#E2E2E9] font-medium">{row.bank}</td>
                  <td className="py-3 px-3 text-[#A7F3D0] font-bold">{row.recovered}</td>
                  <td className="py-3 px-3 text-[#E2E2E9]">{row.rate}</td>
                  <td className="py-3 px-3 text-[#8C90A0]">{row.count}</td>
                  <td className="py-3 px-3 text-right text-[#B1C5FF] font-semibold">{row.feesSaved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recovery by Failure Code */}
      <section className="bg-[#171A21] border border-[#2A2E3A] rounded-lg p-6">
        <h3 className="text-[17px] font-semibold text-[#E2E2E9] border-b border-[#2A2E3A] pb-3 mb-4">
          Recovery Channels &amp; Intelligence Strategies
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {failureRecoveries.map((f) => (
            <div key={f.type} className="bg-[#0F1116] border border-[#2A2E3A] rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#E2E2E9] text-[13px]">{f.type}</span>
                  <span className="text-[#A7F3D0] font-mono text-[12px] font-bold">{f.rate}</span>
                </div>
                <p className="font-mono text-[11px] text-[#8C90A0] mt-1">Strategy: {f.action}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#2A2E3A] flex justify-between items-center">
                <span className="font-mono text-[11px] text-[#8C90A0]">Settled Capital</span>
                <span className="font-mono text-[14px] text-[#A7F3D0] font-bold">{f.recovered}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
