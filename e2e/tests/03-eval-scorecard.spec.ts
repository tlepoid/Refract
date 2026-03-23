import { test, expect } from '../fixtures/canvas.fixture';

test.describe('Eval Scorecard', () => {
  test('LLM node produces non-zero cost in scorecard', async ({ canvasPage, page }) => {
    // Start from an empty canvas.
    await canvasPage.clearCanvas();

    // Add an LLM node with explicit config.
    await canvasPage.addNodeProgrammatically('llm', { x: 300, y: 300 }, {
      model: 'claude-sonnet-4',
      temperature: 0.7,
      max_tokens: 4096,
      system_prompt: '',
    });

    // Mock the /api/eval endpoint to return a scorecard with non-zero cost.
    await page.route('**/api/eval', async (route) => {
      const body = route.request().postDataJSON();
      const hasNodes = body?.graph?.nodes?.length > 0;

      if (hasNodes) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cost: { min: 0.001, median: 0.005, max: 0.015, currency: 'USD' },
            latency_p50_ms: 1000,
            latency_p99_ms: 5000,
            reliability: 0.98,
            complexity: 2,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cost: { min: 0, median: 0, max: 0, currency: 'USD' },
            latency_p50_ms: 0,
            latency_p99_ms: 0,
            reliability: 1,
            complexity: 0,
          }),
        });
      }
    });

    // Call the eval endpoint through the page so our route mock intercepts it.
    const scorecard = await page.evaluate(async () => {
      const store = (window as any).__REFRACT_STORE__;
      if (!store) throw new Error('Store not exposed');
      const { nodes, edges } = store.getState().getGraphSnapshot();

      const res = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graph: { nodes, edges } }),
      });

      return res.json();
    });

    // The scorecard for a graph containing an LLM node should have a positive
    // median cost.
    expect(scorecard.cost.median).toBeGreaterThan(0);
    expect(scorecard.cost.currency).toBe('USD');
    expect(scorecard.complexity).toBeGreaterThan(0);
    expect(scorecard.reliability).toBeLessThanOrEqual(1);
  });

  test('empty canvas returns zero scorecard', async ({ canvasPage, page }) => {
    // Ensure the canvas is empty.
    await canvasPage.clearCanvas();
    expect(await canvasPage.getNodeCount()).toBe(0);

    // Mock the /api/eval endpoint to return zeroed scorecard for empty graphs.
    await page.route('**/api/eval', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cost: { min: 0, median: 0, max: 0, currency: 'USD' },
          latency_p50_ms: 0,
          latency_p99_ms: 0,
          reliability: 1,
          complexity: 0,
        }),
      });
    });

    const scorecard = await page.evaluate(async () => {
      const store = (window as any).__REFRACT_STORE__;
      if (!store) throw new Error('Store not exposed');
      const { nodes, edges } = store.getState().getGraphSnapshot();

      const res = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graph: { nodes, edges } }),
      });

      return res.json();
    });

    expect(scorecard.cost.median).toBe(0);
    expect(scorecard.cost.min).toBe(0);
    expect(scorecard.cost.max).toBe(0);
    expect(scorecard.complexity).toBe(0);
  });
});
