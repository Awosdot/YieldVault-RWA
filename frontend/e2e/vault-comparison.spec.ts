/**
 * Flow: Vault Comparison
 *
 * Validates navigation into the multi-strategy comparison screen and the
 * strategy selection / side-by-side comparison behavior.
 */
import { test, expect } from './fixtures';

test.describe('Vault comparison', () => {
  test('navigates to the comparison screen from the navbar', async ({ appPage: page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Compare' }).click();
    await expect(page).toHaveURL('/compare');
    await expect(page.getByRole('heading', { name: /Compare Vault Strategies/i })).toBeVisible();
  });

  test('shows a default side-by-side comparison of two strategies', async ({ appPage: page }) => {
    await page.goto('/compare');

    await expect(page.getByText('2 selected')).toBeVisible();
    await expect(page.getByText('Side-by-side comparison')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Franklin BENJI Connector' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Tokenized Treasury Ladder' })).toBeVisible();
  });

  test('selecting a third strategy adds it to the comparison table', async ({ appPage: page }) => {
    await page.goto('/compare');

    await page.getByRole('button', { name: /Private Credit Income/i }).click();
    await expect(page.getByText('3 selected')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Private Credit Income' })).toBeVisible();
  });

  test('deselecting down to one strategy shows the empty state', async ({ appPage: page }) => {
    await page.goto('/compare');

    await page.getByRole('button', { name: /Tokenized Treasury Ladder/i }).click();
    await expect(page.getByText('Select at least two strategies')).toBeVisible();

    await page.getByRole('button', { name: 'Back to vault' }).click();
    await expect(page).toHaveURL('/');
  });
});
