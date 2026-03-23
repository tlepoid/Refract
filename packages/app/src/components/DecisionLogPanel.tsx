'use client';

import type { DecisionRecord } from '@refract/shared';

interface Props {
  records: DecisionRecord[];
  onNodeClick: (nodeId: string) => void;
}

export function DecisionLogPanel({ records, onNodeClick }: Props) {
  if (records.length === 0) {
    return (
      <div style={{ padding: 16, color: '#6b7280', fontSize: 13 }}>
        No decisions recorded yet. Resolve a comment thread to create a decision.
      </div>
    );
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', maxHeight: '100%' }}>
      {records
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((record) => (
          <div
            key={record.id}
            style={{
              marginBottom: 12,
              padding: 12,
              backgroundColor: '#f9fafb',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>{record.author}</span>
              <span style={{ color: '#6b7280', fontSize: 11 }}>
                {new Date(record.timestamp).toLocaleString()}
              </span>
            </div>
            <div style={{ marginBottom: 4, fontStyle: 'italic', color: '#374151' }}>
              {record.summary}
            </div>
            <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>
              {record.rationale}
            </div>
            <div>
              {record.node_ids.map((nodeId) => (
                <button
                  key={nodeId}
                  onClick={() => onNodeClick(nodeId)}
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 11,
                    marginRight: 4,
                  }}
                >
                  Go to node
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
