import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const testUsername = `user_${Date.now()}`;
  const testPassword = 'Password123!';
  const testEmail = `${testUsername}@example.com`;

  test('should allow a new user to register and login', async ({ page }) => {
    // Navigate to the app
    await page.goto('/login');

    // Go to registration page
    await page.click('text=Não tem conta? Registre-se');

    // Fill registration form
    await page.fill('input[placeholder="Username"]', testUsername);
    await page.fill('input[placeholder="E-mail"]', testEmail);
    await page.fill('input[placeholder="Senha"]', testPassword);

    // Submit registration
    await page.click('button:has-text("Registrar")');

    // Verify registration success (assuming a toast appears)
    const successToast = page.locator('text=Conta criada com sucesso');
    await expect(successToast).toBeVisible();

    // Now attempt to login
    await page.click('text=Já tem conta? Faça login');
    await page.fill('input[placeholder="Username ou E-mail"]', testUsername);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('form button:has-text("Entrar")');

    // Should be redirected to library
    try {
      await expect(page).toHaveURL(/.*\/library/);
    } catch (e) {
      const texts = await page.locator('p').allInnerTexts();
      console.log('Timeout on /library! Paragraph texts:', texts);
      throw e;
    }
    
    // Verify auth state
    await expect(page.locator('h2:has-text("Minha Biblioteca")')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login'); 

    await page.fill('input[placeholder="Username ou E-mail"]', 'invalid_user');
    await page.fill('input[placeholder="Senha"]', 'wrongpassword');
    await page.click('form button:has-text("Entrar")');

    // Assuming there is some error message displayed
    const errorMessage = page.locator('p', { hasText: /Ocorreu um erro no servidor|Credenciais inválidas|Usuário ou senha incorretos/i });
    await expect(errorMessage).toBeVisible();
  });
});
