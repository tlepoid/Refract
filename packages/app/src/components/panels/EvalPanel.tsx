'use client';

import { useGraphStore } from '../../stores/graphStore';
import { useEval } from '../../hooks/useEval';
import { Sparkline } from './Sparkline';
import type { Scorecard } from '@refract/shared';

function getColor(metric: string, value: number): string {
  switch (metric) {
    case 'reliability':
      if (value >= 0.95) return '#4ADE80';
      if (value >= 0.9) return '#FB923C';
      return '#F87171';
    case 'complexity':
      if (value <= 5) return '#4ADE80';
      if (value <= 10) return '#FB923C';
      return '#F87171';
    case 'cost':
      if (value <= 0.01) return '#4ADE80';
      if (value <= 0.05) return '#FB923C';
      return '#F87171';
    case 'latency':
      if (value <= 3000) return '#4ADE80';
      if (value <= 8000) return '#FB923C';
      return '#F87171';
    default:
      return '#94A3B8';
  }
}

function MetricRow({
  label,
  value,
  unit,
  metric,
  sparkData,
}: {
  label: string;
  value: string;
  unit: string;
  metric: string;
  sparkData: number[];
}) {
  const numVal = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
  const color = getColor(metric, numVal);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid #2D2D3F',
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 2 }}>
          {value}
          <span style={{ fontSize: 11, fontWeight: 400, color: '#64748B', marginLeft: 4 }}>{unit}</span>
        </div>
      </div>
      <Sparkline data={sparkData} color={color} />
    </div>
  );
}

export function EvalPanel() {
  const nodes = useGraphStore((s) => s.nodes);
  const { scorecard, history } = useEval();

  if (nodes.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 14 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>&#x1f4ca;</div>
        <div>Add nodes to see evaluation scores</div>
      </div>
    );
  }

  if (!scorecard) return null;

  const costHistory = history.map((s) => s.cost.median);
  const latencyP50History = history.map((s) => s.latency_p50_ms);
  const latencyP99History = history.map((s) => s.latency_p99_ms);
  const reliabilityHistory = history.map((s) => s.reliability);
  const complexityHistory = history.map((s) => s.complexity);

  return (
    <div style={{ padding: 16 }}>
      <MetricRow
        label="Cost (median)"
        value={`$${scorecard.cost.median.toFixed(4)}`}
        unit="USD"
        metric="cost"
        sparkData={costHistory}
      />
      <div style={{ fontSize: 11, color: '#64748B', padding: '4px 0' }}>
        Range: ${scorecard.cost.min.toFixed(4)} – ${scorecard.cost.max.toFixed(4)}
      </div>
      <MetricRow
        label="Latency p50"
        value={`${scorecard.latency_p50_ms}`}
        unit="ms"
        metric="latency"
        sparkData={latencyP50History}
      />
      <MetricRow
        label="Latency p99"
        value={`${scorecard.latency_p99_ms}`}
        unit="ms"
        metric="latency"
        sparkData={latencyP99History}
      />
      <MetricRow
        label="Reliability"
        value={`${(scorecard.reliability * 100).toFixed(2)}%`}
        unit=""
        metric="reliability"
        sparkData={reliabilityHistory}
      />
      <MetricRow
        label="Complexity"
        value={`${scorecard.complexity}`}
        unit="score"
        metric="complexity"
        sparkData={complexityHistory}
      />
    </div>
  );
}
