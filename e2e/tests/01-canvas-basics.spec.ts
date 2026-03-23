import { test, expect } from '../fixtures/canvas.fixture';

const ALL_NODE_TYPES = [
  'llm',
  'tool',
  'memory',
  'router',
  'planner',
  'guardrail',
  'human_in_loop',
  'input',
  'output',
] as const;

test.describe('Canvas Basics', () => {
  test('drag LLM and Tool from palette, verify 2 nodes appear', async ({ canvasPage }) => {
    // Drag an LLM node from the palette onto the canvas.
    await canvasPage.dragNodeFromPalette('llm');
    await expect
      .poll(() => canvasPage.getNodeCount(), { timeout: 5_000, message: 'LLM node did not appear' })
      .toBe(1);

    // Drag a Tool node from the palette onto the canvas.
    await canvasPage.dragNodeFromPalette('tool');
    await expect
      .poll(() => canvasPage.getNodeCount(), { timeout: 5_000, message: 'Tool node did not appear' })
      .toBe(2);

    // Verify both nodes are visible in the DOM with the correct data-node-type attribute.
    const llmNodes = canvasPage.page.locator('[data-node-type="llm"]');
    await expect(llmNodes).toHaveCount(1);

    const toolNodes = canvasPage.page.locator('[data-node-type="tool"]');
    await expect(toolNodes).toHaveCount(1);
  });

  test('connect two nodes and verify edge', async ({ canvasPage }) => {
    // Add LLM and Tool nodes programmatically to bypass drag-drop flakiness.
    const llmId = await canvasPage.addNodeProgrammatically('llm', { x: 200, y: 200 });
    const toolId = await canvasPage.addNodeProgrammatically('tool', { x: 500, y: 200 });
    expect(await canvasPage.getNodeCount()).toBe(2);

    // Connect the LLM's tool_calls output to the Tool's tool_call input.
    await canvasPage.addEdgeProgrammatically(
      llmId,
      toolId,
      'data_flow',
      'tool_calls',
      'tool_call',
    );

    const snapshot = await canvasPage.getGraphSnapshot();
    expect(snapshot.edges).toHaveLength(1);
    expect(snapshot.edges[0].source).toBe(llmId);
    expect(snapshot.edges[0].target).toBe(toolId);
    expect(snapshot.edges[0].source_handle).toBe('tool_calls');
    expect(snapshot.edges[0].target_handle).toBe('tool_call');
  });

  test('click node opens properties panel, edit label', async ({ canvasPage }) => {
    const nodeId = await canvasPage.addNodeProgrammatically('llm', { x: 300, y: 300 });

    // Select the node by clicking it.
    await canvasPage.clickNode(nodeId);
    await canvasPage.waitForPropertiesPanel();

    // The properties panel should be visible.
    const propertiesPanel = canvasPage.page.locator('[data-testid="properties-panel"]');
    await expect(propertiesPanel).toBeVisible();

    // Edit the label.
    const labelInput = canvasPage.page.locator('[data-testid="prop-label-input"]');
    await labelInput.clear();
    await labelInput.fill('My Custom LLM');

    // Wait for the debounced update to propagate to the store (300ms debounce + margin).
    await canvasPage.page.waitForTimeout(500);

    // Verify the store reflects the label change.
    const snapshot = await canvasPage.getGraphSnapshot();
    const updatedNode = snapshot.nodes.find((n: { id: string }) => n.id === nodeId);
    expect(updatedNode).toBeDefined();
    expect(updatedNode!.label).toBe('My Custom LLM');
  });

  test('node palette shows all 9 node types', async ({ canvasPage }) => {
    const palette = canvasPage.page.locator('[data-testid="node-palette"]');
    await expect(palette).toBeVisible();

    for (const nodeType of ALL_NODE_TYPES) {
      const item = canvasPage.page.locator(`[data-testid="palette-node-${nodeType}"]`);
      await expect(item).toBeVisible({ timeout: 3_000 });
    }
  });
});
