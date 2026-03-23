import { test, expect } from '../fixtures/canvas.fixture';

test.describe('Mermaid Round-Trip', () => {
  test('export and reimport preserves node count', async ({ canvasPage, page }) => {
    // Build a small graph: input -> llm -> output
    const inputId = await canvasPage.addNodeProgrammatically('input', { x: 100, y: 300 });
    const llmId = await canvasPage.addNodeProgrammatically('llm', { x: 350, y: 300 });
    const outputId = await canvasPage.addNodeProgrammatically('output', { x: 600, y: 300 });

    await canvasPage.addEdgeProgrammatically(inputId, llmId, 'data_flow');
    await canvasPage.addEdgeProgrammatically(llmId, outputId, 'data_flow');

    expect(await canvasPage.getNodeCount()).toBe(3);

    // --- Export ---
    await page.click('[data-testid="export-mermaid-btn"]');
    await page.waitForSelector('[data-testid="mermaid-modal"]', { state: 'visible' });

    const mermaidText = await page.locator('[data-testid="mermaid-textarea"]').inputValue();
    expect(mermaidText.length).toBeGreaterThan(0);

    // Close the export modal
    await page.click('[data-testid="mermaid-close-btn"]');
    await page.waitForSelector('[data-testid="mermaid-modal"]', { state: 'hidden' });

    // --- Clear canvas ---
    await canvasPage.clearCanvas();
    await page.waitForTimeout(300);
    expect(await canvasPage.getNodeCount()).toBe(0);

    // --- Import the stored mermaid text ---
    await page.click('[data-testid="import-mermaid-btn"]');
    await page.waitForSelector('[data-testid="mermaid-modal"]', { state: 'visible' });

    await page.locator('[data-testid="mermaid-textarea"]').fill(mermaidText);
    await page.click('[data-testid="mermaid-import-btn"]');

    // Wait for the modal to close (indicates import completed)
    await page.waitForSelector('[data-testid="mermaid-modal"]', { state: 'hidden' });

    // Verify node count matches the original graph
    expect(await canvasPage.getNodeCount()).toBe(3);

    // Verify edges were restored
    const snapshot = await canvasPage.getGraphSnapshot();
    expect(snapshot.edges).toHaveLength(2);
  });
});
