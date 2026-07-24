import { test, expect } from '@playwright/test';

test.describe('Feedback Flow', () => {
  const testUsername = `feedback_e2e_${Date.now()}`;
  const testPassword = 'Password123!';
  const testEmail = `${testUsername}@example.com`;

  test('should allow user registration, opening feedback modal, submitting with confirmation, and sending email', async ({ page }) => {
    // 1. Registrar o usuário de teste
    await page.goto('/login');
    await page.click('text=Não tem conta? Registre-se');
    await page.fill('input[placeholder="Username"]', testUsername);
    await page.fill('input[placeholder="E-mail"]', testEmail);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('button:has-text("Enviar Código")');
    await page.fill('input[placeholder="Código de 6 dígitos"]', '123456');
    await page.click('button:has-text("Confirmar Código")');

    // Confirmar cadastro e fazer login
    await expect(page.locator('text=Conta criada com sucesso')).toBeVisible();
    await page.fill('input[placeholder="Username ou E-mail"]', testUsername);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('form button:has-text("Entrar")');

    // Confirmar que entrou na aplicação
    await expect(page).toHaveURL(/.*\/library/);

    // 2. Clicar no botão de Feedback no footer
    await page.click('button:has-text("Feedback")');

    // Confirmar que o modal abriu
    await expect(page.locator('h2:has-text("Enviar Feedback")')).toBeVisible();

    // 3. Preencher formulário de feedback
    await page.fill('input[placeholder="Ex: Sugestão para novas listas, Erro de login"]', 'Sugestão de E2E');
    await page.fill('textarea[placeholder="Descreva seu feedback em detalhes..."]', 'Esta é uma mensagem de feedback enviada por um teste automatizado E2E.');

    // Clicar em enviar
    await page.click('button:has-text("Enviar")');

    // Confirmar no confirmModal
    await expect(page.locator('text=Deseja realmente enviar este feedback?')).toBeVisible();
    await page.click('button:has-text("Sim, enviar")');

    // Confirmar toast de sucesso
    await expect(page.locator('text=Feedback enviado com sucesso')).toBeVisible();

    // Confirmar que modal fechou
    await expect(page.locator('h2:has-text("Enviar Feedback")')).not.toBeVisible();
  });
});
