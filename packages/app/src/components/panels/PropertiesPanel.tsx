'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeType, type GraphNode } from '@refract/shared';
import { useGraphStore } from '../../stores/graphStore';

function LabelField({ node }: { node: GraphNode }) {
  const updateNodeLabel = useGraphStore((s) => s.updateNodeLabel);
  const [value, setValue] = useState(node.label);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setValue(node.label), [node.label]);

  const onChange = (v: string) => {
    setValue(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => updateNodeLabel(node.id, v), 300);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Label</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function ConfigField({
  node,
  field,
  label,
  type,
  options,
  step,
  min,
  max,
}: {
  node: GraphNode;
  field: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'dropdown' | 'slider' | 'json';
  options?: string[];
  step?: number;
  min?: number;
  max?: number;
}) {
  const updateNodeConfig = useGraphStore((s) => s.updateNodeConfig);
  const [localValue, setLocalValue] = useState(node.config[field]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocalValue(node.config[field]);
  }, [node.config[field]]);

  const debouncedUpdate = useCallback(
    (v: any) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => updateNodeConfig(node.id, field, v), 300);
    },
    [node.id, field, updateNodeConfig],
  );

  const immediateUpdate = useCallback(
    (v: any) => {
      updateNodeConfig(node.id, field, v);
    },
    [node.id, field, updateNodeConfig],
  );

  if (type === 'dropdown') {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{label}</label>
        <select
          value={localValue ?? ''}
          onChange={(e) => {
            setLocalValue(e.target.value);
            immediateUpdate(e.target.value);
          }}
          style={inputStyle}
        >
          {options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'slider') {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          {label}: {localValue}
        </label>
        <input
          type="range"
          value={localValue ?? 0}
          min={min ?? 0}
          max={max ?? 1}
          step={step ?? 0.1}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setLocalValue(v);
            immediateUpdate(v);
          }}
          style={{ width: '100%' }}
        />
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{label}</label>
        <textarea
          value={localValue ?? ''}
          onChange={(e) => {
            setLocalValue(e.target.value);
            debouncedUpdate(e.target.value);
          }}
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
        />
      </div>
    );
  }

  if (type === 'json') {
    const strValue = typeof localValue === 'string' ? localValue : JSON.stringify(localValue, null, 2);
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{label}</label>
        <textarea
          value={strValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateNodeConfig(node.id, field, parsed);
              } catch {
                // invalid JSON, don't update store
              }
            }, 500);
          }}
          style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
        />
      </div>
    );
  }

  if (type === 'number') {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{label}</label>
        <input
          type="number"
          value={localValue ?? ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setLocalValue(v);
            immediateUpdate(v);
          }}
          style={inputStyle}
        />
      </div>
    );
  }

  // text
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input
        value={localValue ?? ''}
        onChange={(e) => {
          setLocalValue(e.target.value);
          debouncedUpdate(e.target.value);
        }}
        style={inputStyle}
      />
    </div>
  );
}

function NodeConfigForm({ node }: { node: GraphNode }) {
  switch (node.type) {
    case NodeType.LLM:
      return (
        <>
          <ConfigField node={node} field="model" label="Model" type="dropdown"
            options={['claude-sonnet-4', 'claude-opus-4', 'gpt-4o', 'gpt-4o-mini', 'gemini-2.0-flash']} />
          <ConfigField node={node} field="temperature" label="Temperature" type="slider"
            min={0} max={2} step={0.1} />
          <ConfigField node={node} field="max_tokens" label="Max Tokens" type="number" />
          <ConfigField node={node} field="system_prompt" label="System Prompt" type="textarea" />
        </>
      );
    case NodeType.TOOL:
      return (
        <>
          <ConfigField node={node} field="name" label="Name" type="text" />
          <ConfigField node={node} field="description" label="Description" type="text" />
          <ConfigField node={node} field="input_schema" label="Input Schema" type="json" />
          <ConfigField node={node} field="timeout_ms" label="Timeout (ms)" type="number" />
        </>
      );
    case NodeType.MEMORY:
      return (
        <>
          <ConfigField node={node} field="type" label="Type" type="dropdown"
            options={['buffer', 'vector', 'kg']} />
          <ConfigField node={node} field="capacity" label="Capacity" type="number" />
          <ConfigField node={node} field="ttl" label="TTL (seconds)" type="number" />
        </>
      );
    case NodeType.ROUTER:
      return (
        <>
          <ConfigField node={node} field="strategy" label="Strategy" type="dropdown"
            options={['llm', 'rule', 'semantic']} />
          <ConfigField node={node} field="routes" label="Routes" type="json" />
        </>
      );
    case NodeType.PLANNER:
      return (
        <>
          <ConfigField node={node} field="pattern" label="Pattern" type="dropdown"
            options={['react', 'plan-execute', 'reflection']} />
          <ConfigField node={node} field="max_steps" label="Max Steps" type="number" />
        </>
      );
    case NodeType.GUARDRAIL:
      return (
        <>
          <ConfigField node={node} field="type" label="Type" type="dropdown"
            options={['input', 'output']} />
          <ConfigField node={node} field="rules" label="Rules (one per line)" type="textarea" />
          <ConfigField node={node} field="action" label="Action" type="dropdown"
            options={['block', 'warn', 'log']} />
        </>
      );
    case NodeType.HUMAN_IN_LOOP:
      return (
        <>
          <ConfigField node={node} field="approval_type" label="Approval Type" type="dropdown"
            options={['binary', 'freetext']} />
          <ConfigField node={node} field="timeout" label="Timeout (seconds)" type="number" />
          <ConfigField node={node} field="escalation_path" label="Escalation Path" type="text" />
        </>
      );
    case NodeType.INPUT:
    case NodeType.OUTPUT:
      return <div style={{ color: '#64748B', fontSize: 13 }}>No configuration fields</div>;
    default:
      return null;
  }
}

export function PropertiesPanel() {
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);
  const nodes = useGraphStore((s) => s.nodes);
  const rightPanelOpen = useGraphStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useGraphStore((s) => s.setRightPanelOpen);

  const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));

  // Auto-open when one node selected, auto-close on deselect
  useEffect(() => {
    if (selectedNodeIds.length === 1) {
      setRightPanelOpen(true);
    } else if (selectedNodeIds.length === 0) {
      setRightPanelOpen(false);
    }
  }, [selectedNodeIds.length, setRightPanelOpen]);

  if (!rightPanelOpen) return null;

  let content: React.ReactNode;

  if (selectedNodes.length === 0) {
    content = (
      <div style={{ color: '#64748B', fontSize: 14, padding: 20 }}>
        No selection
      </div>
    );
  } else if (selectedNodes.length > 1) {
    content = (
      <div style={{ color: '#64748B', fontSize: 14, padding: 20 }}>
        {selectedNodes.length} nodes selected
      </div>
    );
  } else {
    const node = selectedNodes[0];
    content = (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: '#2D2D3F',
              color: '#94A3B8',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {node.type}
          </span>
        </div>
        <LabelField node={node} />
        <div style={{ borderTop: '1px solid #2D2D3F', paddingTop: 12, marginTop: 4 }}>
          <NodeConfigForm node={node} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 320,
        height: '100%',
        background: '#1A1A2E',
        borderLeft: '1px solid #2D2D3F',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2D2D3F',
          fontSize: 14,
          fontWeight: 600,
          color: '#E2E8F0',
        }}
      >
        Properties
      </div>
      {content}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#94A3B8',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  background: '#16162A',
  border: '1px solid #2D2D3F',
  borderRadius: 6,
  color: '#E2E8F0',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};
