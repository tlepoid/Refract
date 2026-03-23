import { test as base, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Default node configs -- mirrors packages/app/src/components/canvas/nodeRegistry.ts
// ---------------------------------------------------------------------------

const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  llm: { model: 'claude-sonnet-4', temperature: 0.7, max_tokens: 4096, system_prompt: '' },
  tool: { name: '', description: '', input_schema: {}, timeout_ms: 30000 },
  memory: { type: 'buffer', capacity: 100, ttl: 3600 },
  router: { strategy: 'llm', routes: [] },
  planner: { pattern: 'react', max_steps: 10 },
  guardrail: { type: 'input', rules: [], action: 'block' },
  human_in_loop: { approval_type: 'binary', timeout: 300, escalation_path: '' },
  input: { description: '' },
  output: { description: '' },
};

// ---------------------------------------------------------------------------
// CanvasPage -- page-object helper used by every test
// ---------------------------------------------------------------------------

export class CanvasPage {
  constructor(public readonly page: Page) {}

  /** Navigate to the root canvas and wait for ReactFlow to mount. */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForSelector('[data-testid="canvas-container"]', { timeout: 15_000 });
    await this.page.waitForSelector('.react-flow__pane', { timeout: 10_000 });
  }

  /** Return the number of nodes currently in the store. */
  async getNodeCount(): Promise<number> {
    return this.page.evaluate(() => {
      const store = (window as any).__REFRACT_STORE__;
      if (!store) throw new Error('Store not exposed on window.__REFRACT_STORE__');
      return store.getState().nodes.length;
    });
  }

  /** Return all node IDs from the store. */
  async getNodeIds(): Promise<string[]> {
    return this.page.evaluate(() => {
      const store = (window as any).__REFRACT_STORE__;
      if (!store) throw new Error('Store not exposed on window.__REFRACT_STORE__');
      return store.getState().nodes.map((n: any) => n.id);
    });
  }

  /**
   * Add a node via the Zustand store (bypasses drag-and-drop UI).
   *
   * When `config` is provided its keys are merged on top of the built-in
   * defaults for the given node type so callers only need to specify the
   * fields they care about.
   *
   * Returns the generated node ID.
   */
  async addNodeProgrammatically(
    type: string,
    position: { x: number; y: number } = { x: 400, y: 300 },
    config?: Record<string, unknown>,
  ): Promise<string> {
    return this.page.evaluate(
      ({ type, position, mergedConfig, label }) => {
        const store = (window as any).__REFRACT_STORE__;
        if (!store) throw new Error('Store not exposed on window.__REFRACT_STORE__');
        const id = crypto.randomUUID();
        store.getState().addNode({
          id,
          type,
          label,
          position,
          config: mergedConfig,
          pattern_id: null,
          metadata: {},
        });
        return id;
      },
      {
        type,
        position,
        mergedConfig: { ...(DEFAULT_CONFIGS[type] ?? {}), ...(config ?? {}) },
        label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
      },
    );
  }

  /**
   * Add an edge via the Zustand store (bypasses the edge-type-selector UI).
   * Returns the generated edge ID.
   */
  async addEdgeProgrammatically(
    source: string,
    target: string,
    type: string = 'data_flow',
    sourceHandle: string = 'output',
    targetHandle: string = 'input',
  ): Promise<string> {
    return this.page.evaluate(
      ({ source, target, type, sourceHandle, targetHandle }) => {
        const store = (window as any).__REFRACT_STORE__;
        if (!store) throw new Error('Store not exposed on window.__REFRACT_STORE__');
        const id = crypto.randomUUID();
        store.getState().addEdge({
          id,
          source,
          target,
          source_handle: sourceHandle,
          target_handle: targetHandle,
          type,
          label: null,
        });
        return id;
      },
      { source, target, type, sourceHandle, targetHandle },
    );
  }

  /** Click a node on the canvas (triggers selection and opens properties). */
  async clickNode(nodeId: string): Promise<void> {
    const nodeLocator = this.page.locator(`[data-testid="canvas-node-${nodeId}"]`);
    await nodeLocator.waitFor({ state: 'visible', timeout: 5_000 });
    await nodeLocator.click();
  }

  /** Wait for the properties panel to become visible. */
  async waitForPropertiesPanel(): Promise<void> {
    await this.page.locator('[data-testid="properties-panel"]').waitFor({
      state: 'visible',
      timeout: 5_000,
    });
  }

  /** Remove all nodes and edges by loading an empty graph. */
  async clearCanvas(): Promise<void> {
    await this.page.evaluate(() => {
      const store = (window as any).__REFRACT_STORE__;
      if (!store) throw new Error('Store not exposed on window.__REFRACT_STORE__');
      store.getState().loadGraph([], []);
    });
  }

  /** Return a deep-clone snapshot of { nodes, edges } from the store. */
  async getGraphSnapshot(): Promise<{ nodes: any[]; edges: any[] }> {
    return this.page.evaluate(() => {
      const store = (window as any).__REFRACT_STORE__;
      if (!store) throw new Error('Store not exposed on window.__REFRACT_STORE__');
      return store.getState().getGraphSnapshot();
    });
  }

  /**
   * Simulate dragging a node from the palette onto the canvas centre.
   *
   * The Canvas component listens for `onDrop` on the wrapper div around
   * ReactFlow and reads `application/refract-node-type` from DataTransfer.
   * We synthesise DragEvent instances with a real DataTransfer object so the
   * handler picks up the node type correctly.
   */
  async dragNodeFromPalette(nodeType: string): Promise<void> {
    const paletteItem = this.page.locator(`[data-testid="palette-node-${nodeType}"]`);
    await paletteItem.waitFor({ state: 'visible', timeout: 5_000 });

    const pane = this.page.locator('.react-flow__pane').first();
    await pane.waitFor({ state: 'visible', timeout: 5_000 });

    const paneBox = await pane.boundingBox();
    if (!paneBox) throw new Error('Could not obtain bounding box for canvas pane');

    const targetX = paneBox.x + paneBox.width / 2;
    const targetY = paneBox.y + paneBox.height / 2;

    // Dispatch synthetic drag events with DataTransfer containing the node type.
    // ReactFlow attaches onDrop/onDragOver to its own wrapper element (.react-flow).
    await this.page.evaluate(
      ({ nodeType, targetX, targetY }) => {
        // The .react-flow element is the ReactFlow wrapper that has onDrop/onDragOver
        const dropTarget = document.querySelector('.react-flow');
        if (!dropTarget) throw new Error('ReactFlow wrapper not found');

        const dataTransfer = new DataTransfer();
        dataTransfer.setData('application/refract-node-type', nodeType);

        dropTarget.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        );

        dropTarget.dispatchEvent(
          new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        );
      },
      { nodeType, targetX, targetY },
    );
  }
}

// ---------------------------------------------------------------------------
// Extend the base Playwright test with our custom fixture
// ---------------------------------------------------------------------------

type CanvasFixtures = {
  canvasPage: CanvasPage;
};

export const test = base.extend<CanvasFixtures>({
  canvasPage: async ({ page }, use) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.goto();
    await use(canvasPage);
  },
});

export { expect };
