import { test, expect } from '../fixtures/canvas.fixture';

test.describe('AI Analysis Flow', () => {
  test('mock /api/analyze and verify SSE response renders', async ({ canvasPage, page }) => {
    // Mock the /api/analyze endpoint with a canned SSE response before building
    // the graph, so any eager fetches are caught.
    await page.route('**/api/analyze', async (route) => {
      const sseBody = [
        'data: {"type":"chunk","text":"Detected **ReAct** pattern"}',
        '',
        'data: {"type":"chunk","text":" with estimated token cost of $0.05"}',
        '',
        'data: {"type":"done"}',
        '',
      ].join('\n');

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseBody,
      });
    });

    // Build a 3-node ReAct graph: planner -> tool -> planner (cycle).
    const plannerId = await canvasPage.addNodeProgrammatically(
      'planner',
      { x: 200, y: 300 },
      { pattern: 'react', max_steps: 10 },
    );
    const toolId = await canvasPage.addNodeProgrammatically('tool', { x: 500, y: 300 });
    const planner2Id = await canvasPage.addNodeProgrammatically(
      'planner',
      { x: 800, y: 300 },
      { pattern: 'react', max_steps: 10 },
    );

    // Wire the cycle: planner -> tool -> planner2.
    await canvasPage.addEdgeProgrammatically(plannerId, toolId, 'tool_call', 'plan', 'tool_call');
    await canvasPage.addEdgeProgrammatically(toolId, planner2Id, 'data_flow', 'tool_result', 'goal');
    await canvasPage.addEdgeProgrammatically(planner2Id, plannerId, 'data_flow', 'plan', 'goal');

    expect(await canvasPage.getNodeCount()).toBe(3);

    // Trigger the analysis by fetching through the page context so the
    // route intercept picks it up. We read the full SSE body as text.
    const responseText = await page.evaluate(async () => {
      const store = (window as any).__REFRACT_STORE__;
      if (!store) throw new Error('Store not exposed');
      const { nodes, edges } = store.getState().getGraphSnapshot();

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graph: { nodes, edges }, message: 'analyze this graph' }),
      });

      return res.text();
    });

    // Verify the mocked SSE body contains the expected analysis text.
    expect(responseText).toContain('ReAct');
    expect(responseText).toContain('token cost');
    expect(responseText).toContain('$0.05');
  });
});
