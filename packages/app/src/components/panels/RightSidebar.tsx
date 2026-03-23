'use client';

import { useEffect } from 'react';
import { useGraphStore, type UIState } from '../../stores/graphStore';
import { PropertiesPanel } from './PropertiesPanel';
import { AnalysisPanel } from './AnalysisPanel';
import { EvalPanel } from './EvalPanel';
import { ChatPanel } from './ChatPanel';

type Tab = UIState['rightPanelTab'];

const tabs: { id: Tab; label: string }[] = [
  { id: 'properties', label: 'Properties' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'eval', label: 'Eval' },
  { id: 'chat', label: 'Chat' },
];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid #2D2D3F',
        background: '#16162A',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            padding: '10px 4px',
            background: 'transparent',
            border: 'none',
            borderBottom: active === tab.id ? '2px solid #3B82F6' : '2px solid transparent',
            color: active === tab.id ? '#E2E8F0' : '#64748B',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'properties':
      return <PropertiesContent />;
    case 'analysis':
      return <AnalysisPanel />;
    case 'eval':
      return <EvalPanel />;
    case 'chat':
      return <ChatPanel />;
    default:
      return null;
  }
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
      {label} panel coming soon
    </div>
  );
}

function PropertiesContent() {
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);
  const nodes = useGraphStore((s) => s.nodes);
  const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));

  if (selectedNodes.length === 0) {
    return (
      <div style={{ color: '#64748B', fontSize: 14, padding: 20 }}>
        No selection
      </div>
    );
  }

  if (selectedNodes.length > 1) {
    return (
      <div style={{ color: '#64748B', fontSize: 14, padding: 20 }}>
        {selectedNodes.length} nodes selected
      </div>
    );
  }

  // Delegate to full PropertiesPanel content
  return <PropertiesPanel embedded node={selectedNodes[0]} />;
}

export function RightSidebar() {
  const rightPanelOpen = useGraphStore((s) => s.rightPanelOpen);
  const rightPanelTab = useGraphStore((s) => s.rightPanelTab);
  const setRightPanelOpen = useGraphStore((s) => s.setRightPanelOpen);
  const setRightPanelTab = useGraphStore((s) => s.setRightPanelTab);
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);

  // Auto-open on node selection, switch to properties tab
  useEffect(() => {
    if (selectedNodeIds.length === 1) {
      setRightPanelOpen(true);
      setRightPanelTab('properties');
    }
  }, [selectedNodeIds.length, setRightPanelOpen, setRightPanelTab]);

  if (!rightPanelOpen) return null;

  return (
    <div
      style={{
        width: 340,
        height: '100%',
        background: '#1A1A2E',
        borderLeft: '1px solid #2D2D3F',
        overflowY: 'auto',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TabBar
        active={rightPanelTab as Tab}
        onChange={(t) => setRightPanelTab(t as any)}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <TabContent tab={rightPanelTab as Tab} />
      </div>
    </div>
  );
}
