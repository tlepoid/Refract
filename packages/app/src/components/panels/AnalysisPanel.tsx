'use client';

import { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { useGraphStore } from '../../stores/graphStore';
import { useAnalysis, type AnalysisSection } from '../../hooks/useAnalysis';

function LoadingSkeleton() {
  return (
    <div style={{ padding: 16 }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <div
            style={{
              width: 120,
              height: 14,
              background: '#2D2D3F',
              borderRadius: 4,
              marginBottom: 8,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          {[1, 2, 3].map((j) => (
            <div
              key={j}
              style={{
                width: `${70 + Math.random() * 30}%`,
                height: 12,
                background: '#2D2D3F',
                borderRadius: 4,
                marginBottom: 6,
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${j * 0.2}s`,
              }}
            />
          ))}
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
          }}
        />
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, listStyleType: 'disc' }}>
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              fontSize: 13,
              color: '#CBD5E1',
              lineHeight: 1.5,
              marginBottom: 4,
            }}
          >
            <Markdown
              components={{
                p: ({ children }) => <span>{children}</span>,
              }}
            >
              {item}
            </Markdown>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionsView({ sections }: { sections: AnalysisSection }) {
  return (
    <div style={{ padding: 16 }}>
      <Section title="Strengths" items={sections.strengths} color="#4ADE80" />
      <Section title="Weaknesses" items={sections.weaknesses} color="#FB923C" />
      <Section title="Risks" items={sections.risks} color="#F87171" />
      <Section title="Recommendations" items={sections.recommendations} color="#60A5FA" />
    </div>
  );
}

export function AnalysisPanel() {
  const nodes = useGraphStore((s) => s.nodes);
  const { status, streamedText, sections, error, stale, runAnalysis, markStale } = useAnalysis();

  const prevNodeCountRef = useRef(nodes.length);
  useEffect(() => {
    if (nodes.length !== prevNodeCountRef.current && status === 'done') {
      markStale();
    }
    prevNodeCountRef.current = nodes.length;
  }, [nodes.length, status, markStale]);

  // Empty canvas
  if (nodes.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: 'center',
          color: '#64748B',
          fontSize: 14,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>&#x1f4cb;</div>
        <div>Edit the graph to see analysis</div>
      </div>
    );
  }

  return (
    <div>
      {/* Run button */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2D2D3F' }}>
        <button
          onClick={runAnalysis}
          disabled={status === 'loading'}
          style={{
            width: '100%',
            padding: '8px 16px',
            background: status === 'loading' ? '#2D2D3F' : '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {status === 'loading' ? 'Analyzing...' : 'Run Analysis'}
        </button>
        {stale && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: '#FB923C',
              textAlign: 'center',
            }}
          >
            Graph has changed since last analysis
          </div>
        )}
      </div>

      {/* Loading */}
      {status === 'loading' && <LoadingSkeleton />}

      {/* Streaming text */}
      {status === 'loading' && streamedText && (
        <div
          style={{
            padding: '0 16px 16px',
            fontSize: 13,
            color: '#94A3B8',
            lineHeight: 1.5,
          }}
        >
          <Markdown>{streamedText}</Markdown>
        </div>
      )}

      {/* Sections */}
      {status === 'done' && sections && <SectionsView sections={sections} />}

      {/* Error */}
      {status === 'error' && (
        <div style={{ padding: 16 }}>
          <div
            style={{
              padding: 12,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              color: '#F87171',
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Analysis failed</div>
            <div>{error}</div>
          </div>
          <button
            onClick={runAnalysis}
            style={{
              marginTop: 8,
              padding: '6px 12px',
              background: '#2D2D3F',
              color: '#E2E8F0',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Idle state */}
      {status === 'idle' && (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            color: '#64748B',
            fontSize: 13,
          }}
        >
          Click "Run Analysis" to analyze your design
        </div>
      )}
    </div>
  );
}
