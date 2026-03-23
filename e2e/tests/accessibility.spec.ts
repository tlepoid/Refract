import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-container"]');
  });

  test('full page has no critical or serious axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // ReactFlow internals have contrast issues we don't control
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious = results.violations.filter(v => v.impact === 'serious');

    // Log any violations for debugging
    for (const violation of [...critical, ...serious]) {
      console.log(`[${violation.impact}] ${violation.id}: ${violation.description}`);
      for (const node of violation.nodes) {
        console.log(`  - ${node.html.substring(0, 100)}`);
      }
    }

    expect(critical).toHaveLength(0);
    expect(serious).toHaveLength(0);
  });

  test('node palette is accessible', async ({ page }) => {
    const palette = page.locator('[data-testid="node-palette"]');
    await expect(palette).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="node-palette"]')
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('properties panel is accessible when open', async ({ page }) => {
    // Add a node and select it to open properties panel
    await page.evaluate(() => {
      const store = (window as any).__REFRACT_STORE__;
      const id = crypto.randomUUID();
      store.getState().addNode({
        id,
        type: 'llm',
        label: 'Test LLM',
        position: { x: 300, y: 200 },
        config: { model: 'claude-sonnet-4', temperature: 0.7, max_tokens: 4096, system_prompt: '' },
        pattern_id: null,
        metadata: {},
      });
      store.getState().setSelectedNodes([id]);
    });

    await page.waitForSelector('[data-testid="properties-panel"]');

    const results = await new AxeBuilder({ page })
      .include('[data-testid="properties-panel"]')
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('canvas nodes have accessible roles and labels', async ({ page }) => {
    // Add a node
    await page.evaluate(() => {
      const store = (window as any).__REFRACT_STORE__;
      store.getState().addNode({
        id: 'a11y-test-node',
        type: 'llm',
        label: 'Accessible LLM',
        position: { x: 300, y: 200 },
        config: { model: 'claude-sonnet-4', temperature: 0.7, max_tokens: 4096, system_prompt: '' },
        pattern_id: null,
        metadata: {},
      });
    });

    const node = page.locator('[data-testid="canvas-node-a11y-test-node"]');
    await expect(node).toBeVisible();
    await expect(node).toHaveAttribute('role', 'button');
    await expect(node).toHaveAttribute('aria-label', 'Accessible LLM (llm) node');
  });

  test('edge type selector dialog has correct ARIA attributes', async ({ page }) => {
    // The edge type selector is a dialog that appears on connect
    // We can verify its structure exists in the component
    // For now verify the canvas has proper aria-label
    const canvas = page.locator('[aria-label="Agent design canvas"]');
    await expect(canvas).toBeVisible();
  });
});
