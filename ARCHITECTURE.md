# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │NodePalette│  │  Canvas  │  │ PropertiesPanel   │ │
│  │          │  │(ReactFlow)│  │ (config/analysis) │ │
│  └──────────┘  └────┬─────┘  └───────────────────┘ │
│                     │                                │
│              ┌──────┴──────┐                         │
│              │Zustand Store│                         │
│              └──────┬──────┘                         │
│                     │                                │
│              ┌──────┴──────┐                         │
│              │  Yjs CRDT   │                         │
│              └──────┬──────┘                         │
└─────────────────────┼───────────────────────────────┘
                      │ WebSocket
┌─────────────────────┼───────────────────────────────┐
│              Express Server (port 4000)              │
│  ┌──────────┐  ┌───┴────┐  ┌──────────────────┐   │
│  │REST API  │  │Yjs WS  │  │ Anthropic Claude │   │
│  │/api/*    │  │/ws/*   │  │ /api/analyze     │   │
│  └────┬─────┘  └────────┘  └──────────────────┘   │
│       │                                             │
│  ┌────┴─────┐                                       │
│  │PostgreSQL│                                       │
│  │  (16)    │                                       │
│  └──────────┘                                       │
└─────────────────────────────────────────────────────┘
```

## Data Flow

1. **User interaction** -- a user drags a node, edits config, or draws an edge on the canvas.
2. **Zustand store** -- the local state manager applies the change immediately for responsive UI.
3. **Yjs CRDT** -- the change is encoded as a Yjs update and broadcast via WebSocket.
4. **WebSocket** -- the Express server relays the Yjs update to all other connected clients.
5. **Other clients** -- each remote browser applies the CRDT update, merging it conflict-free into their local Yjs document, which in turn updates their Zustand store and re-renders the canvas.

Persistence happens server-side: the Yjs document state is periodically snapshotted to PostgreSQL so canvases survive server restarts.

## Package Responsibilities

### `packages/app` -- Frontend

- **Canvas rendering** -- ReactFlow-based node graph with drag-and-drop, minimap, and controls
- **Node palette** -- sidebar listing all 9 node types for drag-to-add
- **Properties panel** -- per-node config editor, eval scorecard display, AI analysis results
- **State management** -- Zustand store bound to Yjs for shared state; local-only slices for UI chrome
- **Collaboration UI** -- cursor awareness, presence indicators, collaborative selection

### `packages/server` -- Backend

- **REST API** -- CRUD for canvases, evaluation triggers, AI analysis requests
- **WebSocket (Yjs sync)** -- relays Yjs document updates between clients using the y-websocket protocol
- **AI analysis** -- sends serialized graph to Anthropic Claude and returns architectural feedback
- **Persistence** -- PostgreSQL storage for canvas snapshots, user sessions, pattern library metadata

### `packages/shared` -- Shared Logic

- **Type definitions** -- `NodeType` enum, config interfaces, graph schema, API request/response types
- **Graph evaluation** -- `evaluateGraph()` scores designs on cost, latency, reliability, and complexity
- **Pattern detection** -- `identifyPatterns()` matches subgraph topologies against known agent patterns
- **Serialization** -- converts between ReactFlow internal format and a portable graph representation
- **Mermaid conversion** -- import from and export to Mermaid diagram syntax

## Key Design Decisions

### Yjs CRDT for real-time collaboration

Yjs provides conflict-free replicated data types that allow multiple users to edit the same canvas simultaneously without a central coordination server. Edits merge deterministically regardless of arrival order, eliminating the need for operational transform or manual conflict resolution.

### ReactFlow for the node-based canvas

ReactFlow handles the heavy lifting of a node-and-edge graph UI: pan/zoom, node dragging, edge routing, handles, selection, minimap, and keyboard shortcuts. Custom node components render domain-specific UI (LLM config, tool parameters, etc.) inside the ReactFlow framework.

### Zustand for local UI state with Yjs binding

Zustand provides a lightweight, hook-friendly store for local UI state (selected node, panel visibility, viewport position). Shared canvas state is kept in the Yjs document and surfaced to React through a Zustand middleware that subscribes to Yjs updates. This keeps the two concerns -- local UI and collaborative data -- cleanly separated.

### Pattern YAML files for an extensible pattern library

Each recognized agent pattern (ReAct, Plan-Execute, Reflection, Multi-Agent Chat, Handoff, Routing) is described in a YAML file specifying the required node types, edge topology, and metadata. Adding a new pattern means adding a YAML file and a detection function -- no changes to the core evaluation engine.

### Dual undo system

- **Yjs UndoManager** -- the primary undo mechanism for collaborative sessions. It tracks Yjs operations and reverses them in a way that is consistent across all connected clients.
- **Local snapshot stack** -- a fallback for offline or single-user scenarios. The store captures state snapshots on significant actions and can restore them on undo.

## API Routes

| Method | Path                 | Description                              |
| ------ | -------------------- | ---------------------------------------- |
| GET    | `/health`            | Server health check                      |
| POST   | `/api/canvas`        | Create a new canvas                      |
| GET    | `/api/canvas/:id`    | Retrieve a canvas by ID                  |
| POST   | `/api/eval`          | Evaluate a graph (returns scorecard)     |
| POST   | `/api/analyze`       | Send graph to Claude for AI analysis     |
| GET    | `/api/patterns`      | List all patterns in the pattern library |

## WebSocket

```
ws://localhost:4000/ws/canvas/:id
```

Uses the Yjs WebSocket provider protocol:

- **Document sync** -- on connect, the server sends the full Yjs document state; subsequent messages are incremental updates.
- **Awareness protocol** -- broadcasts cursor positions, selections, and user presence metadata to all connected clients.
