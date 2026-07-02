import { test, expect } from '@playwright/test';

test.describe('Profile & Settings Flow', () => {
  const testUsername = `user_prof_${Date.now()}`;
  const testPassword = 'Password123!';
  const testEmail = `${testUsername}@example.com`;
  const updatedUsername = `upd_${testUsername}`;
  const newPassword = 'NewPassword123!';

  test('should allow account registration, username/password change, deactivation, and reactivation', async ({ page }) => {
    // 1. Registrar o usuário de teste
    await page.goto('/login');
    await page.click('text=Não tem conta? Registre-se');
    await page.fill('input[placeholder="Username"]', testUsername);
    await page.fill('input[placeholder="E-mail"]', testEmail);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('button:has-text("Enviar Código")');
    await page.fill('input[placeholder="Código de 6 dígitos"]', '123456');
    await page.click('button:has-text("Confirmar Código")');

    // Realizar login inicial
    await page.fill('input[placeholder="Username ou E-mail"]', testUsername);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('form button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*\/library/);

    // 2. Verificar que o avatar está visível no Header usando o seletor da classe
    const avatarBtn = page.locator('header button[class*="avatar"]');
    await expect(avatarBtn).toBeVisible();

    // 3. Navegar para a página de perfil e verificar estatísticas vazias iniciais
    await avatarBtn.click();
    await page.click('text=Ver Perfil');
    await expect(page).toHaveURL(/.*\/profile/);
    await expect(page.locator('h1', { hasText: testUsername })).toBeVisible();
    await expect(page.locator('text=Jogos na Biblioteca')).toBeVisible();
    await expect(page.locator('text=0').first()).toBeVisible(); // 0 jogos

    // 4. Abrir Configurações e alterar nome de usuário
    await avatarBtn.click();
    await page.click('text=Configurações');
    await expect(page.locator('h3', { hasText: 'Configurações de Conta' })).toBeVisible();

    await page.fill('input[placeholder="Ex: novo_usuario"]', updatedUsername);
    await page.click('button:has-text("Salvar Alterações")');

    // Confirmar toast de sucesso e atualização do avatar/nome
    await expect(page.locator('text=Nome de usuário alterado com sucesso')).toBeVisible();
    await expect(avatarBtn).toBeVisible();

    // 5. Mudar a senha nas configurações
    await avatarBtn.click();
    await page.click('text=Configurações');
    await page.click('button:has-text("Alterar Senha")');
    await page.fill('input[placeholder="Sua senha atual"]', testPassword);
    await page.fill('input[placeholder="Nova senha forte"]', newPassword);
    await page.fill('input[placeholder="Repita a nova senha"]', newPassword);
    await page.click('button[type="submit"]:has-text("Alterar Senha")');
    await expect(page.locator('text=Senha alterada com sucesso')).toBeVisible();

    // Testar logout
    await avatarBtn.click();
    await page.click('text=Sair');
    await expect(page).toHaveURL(/.*\/login/);

    // 6. Testar login com a nova senha
    await page.fill('input[placeholder="Username ou E-mail"]', updatedUsername);
    await page.fill('input[placeholder="Senha"]', newPassword);
    await page.click('form button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*\/library/);

    // 7. Solicitar exclusão de conta
    await avatarBtn.click();
    await page.click('text=Configurações');
    await page.click('button:has-text("Excluir Conta")');
    await page.fill('input[placeholder="Sua senha"]', newPassword);
    await page.click('button:has-text("Solicitar Exclusão de Conta")');

    // Deve deslogar e ir para a tela de login
    await expect(page.locator('text=Conta desativada')).toBeVisible();
    await expect(page).toHaveURL(/.*\/login/);

    // 8. Tentar logar com a conta desativada (deve reativar e entrar com sucesso)
    await page.fill('input[placeholder="Username ou E-mail"]', updatedUsername);
    await page.fill('input[placeholder="Senha"]', newPassword);
    await page.click('form button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*\/library/);
  });
});
