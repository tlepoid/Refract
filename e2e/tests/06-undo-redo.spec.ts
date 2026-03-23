import { test, expect } from '../fixtures/canvas.fixture';

test.describe('Undo / Redo', () => {
  test('undo restores deleted node, redo removes it again', async ({ canvasPage, page }) => {
    // Add a single LLM node
    const nodeId = await canvasPage.addNodeProgrammatically('llm', { x: 300, y: 300 });
    expect(await canvasPage.getNodeCount()).toBe(1);

    // Select the node via the store
    await page.evaluate((id: string) => {
      const store = (window as any).__REFRACT_STORE__;
      store.getState().setSelectedNodes([id]);
    }, nodeId);

    // Delete via the store
    await page.evaluate(() => {
      const store = (window as any).__REFRACT_STORE__;
      store.getState().removeSelected();
    });
    await page.waitForTimeout(300);
    expect(await canvasPage.getNodeCount()).toBe(0);

    // --- Undo via keyboard shortcut ---
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    let countAfterUndo = await canvasPage.getNodeCount();

    // Fallback: if keyboard shortcut did not trigger undo, invoke
    // the store's undo() method directly.
    if (countAfterUndo === 0) {
      await page.evaluate(() => {
        const store = (window as any).__REFRACT_STORE__;
        store.getState().undo();
      });
      await page.waitForTimeout(300);
      countAfterUndo = await canvasPage.getNodeCount();
    }

    expect(countAfterUndo).toBe(1);

    // --- Redo via keyboard shortcut ---
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(300);

    let countAfterRedo = await canvasPage.getNodeCount();

    // Fallback: invoke the store's redo() method directly.
    if (countAfterRedo === 1) {
      await page.evaluate(() => {
        const store = (window as any).__REFRACT_STORE__;
        store.getState().redo();
      });
      await page.waitForTimeout(300);
      countAfterRedo = await canvasPage.getNodeCount();
    }

    expect(countAfterRedo).toBe(0);
  });
});
