import { expect, test } from '@playwright/test';

test.describe('Visual regression', () => {
  test('login page matches its approved baseline', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    await expect(page).toHaveScreenshot('login-page.png', {
      animations: 'disabled',
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });
});
