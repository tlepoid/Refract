import { test, expect } from '../fixtures/canvas.fixture';

test.describe('What-If Fork Mode', () => {
  test('create fork, modify, verify fork is independent from main', async ({
    canvasPage,
    page,
  }) => {
    // Add an LLM node (defaults to model='claude-sonnet-4')
    const nodeId = await canvasPage.addNodeProgrammatically('llm', { x: 300, y: 300 });
    expect(await canvasPage.getNodeCount()).toBe(1);

    // Capture baseline snapshot on main
    const mainSnapshotBefore = await canvasPage.getGraphSnapshot();
    const mainModelBefore = mainSnapshotBefore.nodes[0]?.config?.model;
    expect(mainModelBefore).toBe('claude-sonnet-4');

    // --- Create a fork ---
    await page.click('[data-testid="fork-button"]');
    await page.waitForSelector('[data-testid="fork-indicator"]', { state: 'visible' });

    // Update the LLM model config inside the fork
    await page.evaluate(
      ({ id }) => {
        const store = (window as any).__REFRACT_STORE__;
        store.getState().updateNodeConfig(id, 'model', 'claude-opus-4');
      },
      { id: nodeId },
    );

    // Verify the fork reflects the new model
    const forkSnapshot = await canvasPage.getGraphSnapshot();
    const forkModel = forkSnapshot.nodes.find((n: any) => n.id === nodeId)?.config?.model;
    expect(forkModel).toBe('claude-opus-4');

    // --- Return to main ---
    await page.click('[data-testid="fork-return-main"]');
    await expect(page.locator('[data-testid="fork-indicator"]')).not.toBeVisible();

    // Verify main still has the original model
    const mainSnapshotAfter = await canvasPage.getGraphSnapshot();
    const mainModelAfter = mainSnapshotAfter.nodes.find((n: any) => n.id === nodeId)?.config?.model;
    expect(mainModelAfter).toBe('claude-sonnet-4');
  });

  test('fork preserves node count independently', async ({ canvasPage, page }) => {
    // Add 2 nodes on main
    await canvasPage.addNodeProgrammatically('input', { x: 100, y: 300 });
    await canvasPage.addNodeProgrammatically('llm', { x: 350, y: 300 });
    expect(await canvasPage.getNodeCount()).toBe(2);

    // Create fork
    await page.click('[data-testid="fork-button"]');
    await page.waitForSelector('[data-testid="fork-indicator"]', { state: 'visible' });

    // Add a 3rd node inside the fork
    await canvasPage.addNodeProgrammatically('output', { x: 600, y: 300 });
    expect(await canvasPage.getNodeCount()).toBe(3);

    // Switch back to main -- should still have only 2 nodes
    await page.click('[data-testid="fork-return-main"]');
    await page.waitForTimeout(300);
    expect(await canvasPage.getNodeCount()).toBe(2);
  });
});
