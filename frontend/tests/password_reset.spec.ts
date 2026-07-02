import { test, expect } from '@playwright/test';

test.describe('Password Reset Flow', () => {
  const testUsername = `reset_e2e_${Date.now()}`;
  const testPassword = 'Password123!';
  const testEmail = `${testUsername}@example.com`;
  const newPassword = 'NewPassword123!';

  test('should allow a user to reset their password and login with the new one', async ({ page }) => {
    // 1. Registrar o usuário de teste
    await page.goto('/login');
    await page.click('text=Não tem conta? Registre-se');
    await page.fill('input[placeholder="Username"]', testUsername);
    await page.fill('input[placeholder="E-mail"]', testEmail);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('button:has-text("Enviar Código")');
    await page.fill('input[placeholder="Código de 6 dígitos"]', '123456');
    await page.click('button:has-text("Confirmar Código")');

    // Confirmar que o cadastro deu certo e fomos para a tela de login
    await expect(page.locator('text=Conta criada com sucesso')).toBeVisible();

    // 2. Iniciar o fluxo de redefinição de senha
    await page.click('button:has-text("Esqueci minha senha")');
    await page.fill('input[placeholder="Seu e-mail"]', testEmail);
    await page.click('button:has-text("Enviar Código")');

    // Confirmar toast de código enviado
    await expect(page.locator('text=Se o e-mail estiver cadastrado, um código foi enviado')).toBeVisible();

    // 3. Confirmar o reset com código de testes "654321" e nova senha
    await page.fill('input[placeholder="Código de 6 dígitos"]', '654321');
    await page.fill('input[placeholder="Nova Senha"]', newPassword);
    await page.click('button:has-text("Redefinir Senha")');

    // Confirmar toast de sucesso e retorno para o login
    await expect(page.locator('text=Senha redefinida com sucesso')).toBeVisible();

    // 4. Testar login com a senha antiga (deve falhar)
    await page.fill('input[placeholder="Username ou E-mail"]', testUsername);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('form button:has-text("Entrar")');
    await expect(page.locator('text=Usuário ou senha incorretos')).toBeVisible();

    // 5. Testar login com a nova senha (deve funcionar)
    await page.fill('input[placeholder="Senha"]', newPassword);
    await page.click('form button:has-text("Entrar")');

    // Redirecionamento para a biblioteca
    await expect(page).toHaveURL(/.*\/library/);
    await expect(page.locator('h2:has-text("Minha Biblioteca")')).toBeVisible();
  });
});
