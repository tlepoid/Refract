'use client';

import { useCallback, useRef, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { streamSSE, type SSEEvent } from './useSSE';

export interface AnalysisSection {
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendations: string[];
}

export interface AnalysisState {
  status: 'idle' | 'loading' | 'done' | 'error';
  streamedText: string;
  sections: AnalysisSection | null;
  error: string | null;
  stale: boolean;
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    streamedText: '',
    sections: null,
    error: null,
    stale: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  const runAnalysis = useCallback(() => {
    const { nodes, edges } = useGraphStore.getState();

    if (nodes.length === 0) return;

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      status: 'loading',
      streamedText: '',
      sections: null,
      error: null,
      stale: false,
    });

    let text = '';

    streamSSE(
      `${SERVER_URL}/api/analyze`,
      {
        graph: { nodes, edges },
        message: 'Analyze this agent architecture and call the analyze_tradeoffs tool.',
      },
      (event: SSEEvent) => {
        if (event.type === 'text') {
          text += event.content ?? '';
          setState((s) => ({ ...s, streamedText: text }));
        }

        if (event.type === 'done') {
          // Extract analyze_tradeoffs result from tool_results
          const tradeoffs = event.tool_results?.find(
            (r) => r.tool === 'analyze_tradeoffs',
          );

          const sections: AnalysisSection = tradeoffs
            ? {
                strengths: (tradeoffs.input as any).strengths ?? [],
                weaknesses: (tradeoffs.input as any).weaknesses ?? [],
                risks: (tradeoffs.input as any).risks ?? [],
                recommendations: (tradeoffs.input as any).recommendations ?? [],
              }
            : { strengths: [], weaknesses: [], risks: [], recommendations: [] };

          setState((s) => ({
            ...s,
            status: 'done',
            sections,
          }));
        }

        if (event.type === 'error') {
          setState((s) => ({
            ...s,
            status: 'error',
            error: event.content ?? 'Unknown error',
          }));
        }
      },
      controller.signal,
    ).catch((err) => {
      if (err.name === 'AbortError') return;
      setState((s) => ({
        ...s,
        status: 'error',
        error: err.message ?? 'Failed to connect',
      }));
    });
  }, []);

  const markStale = useCallback(() => {
    setState((s) => {
      if (s.status === 'done') return { ...s, stale: true };
      return s;
    });
  }, []);

  return { ...state, runAnalysis, markStale };
}
