'use client';

import { useCallback, useState } from 'react';
import { graphToMermaid, mermaidToGraph } from '@refract/shared';
import { useGraphStore } from '../../stores/graphStore';

function ExportView({ onClose }: { onClose: () => void }) {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const [copied, setCopied] = useState(false);

  const mermaid = graphToMermaid(nodes, edges);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(mermaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mermaid]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#E2E8F0' }}>Export Mermaid</h3>
        <button onClick={onClose} style={closeButtonStyle}>X</button>
      </div>
      <textarea
        readOnly
        value={mermaid}
        style={{
          ...textareaStyle,
          minHeight: 200,
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={handleCopy} style={primaryButtonStyle}>
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#64748B' }}>
        Paste this into mermaid.live to preview
      </div>
    </div>
  );
}

function ImportView({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const loadGraph = useGraphStore((s) => s.loadGraph);

  const handleImport = useCallback(() => {
    try {
      const { nodes, edges } = mermaidToGraph(input);
      if (nodes.length === 0) {
        setError('No nodes found in Mermaid text');
        return;
      }
      loadGraph(nodes, edges);
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to parse Mermaid');
    }
  }, [input, loadGraph, onClose]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#E2E8F0' }}>Import Mermaid</h3>
        <button onClick={onClose} style={closeButtonStyle}>X</button>
      </div>
      <textarea
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(null);
        }}
        placeholder={'flowchart TD\n  A("LLM Agent") --> B[["Search Tool"]]\n  A --> C{"Router"}'}
        style={{
          ...textareaStyle,
          minHeight: 200,
        }}
      />
      {error && (
        <div style={{ color: '#F87171', fontSize: 12, marginTop: 4 }}>{error}</div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={handleImport}
          disabled={!input.trim()}
          style={{
            ...primaryButtonStyle,
            opacity: input.trim() ? 1 : 0.5,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Import
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#64748B' }}>
        Paste Mermaid flowchart syntax above. Shapes will be mapped to node types.
      </div>
    </div>
  );
}

export function MermaidModal({
  mode,
  onClose,
}: {
  mode: 'export' | 'import';
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 520,
          maxHeight: '80vh',
          background: '#1A1A2E',
          borderRadius: 12,
          border: '1px solid #2D2D3F',
          padding: 20,
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {mode === 'export' ? (
          <ExportView onClose={onClose} />
        ) : (
          <ImportView onClose={onClose} />
        )}
      </div>
    </div>
  );
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#16162A',
  border: '1px solid #2D2D3F',
  borderRadius: 8,
  color: '#E2E8F0',
  fontSize: 12,
  fontFamily: 'monospace',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#3B82F6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#64748B',
  fontSize: 16,
  cursor: 'pointer',
  padding: '4px 8px',
};
