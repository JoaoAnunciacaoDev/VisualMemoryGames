import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Patch Notes Flow', () => {
  const adminUsername = `admin_pn_${Date.now()}`;
  const userUsername = `user_pn_${Date.now()}`;
  const testPassword = 'Password123!';
  
  const patchTitle = 'Versão 1.5.0 - Novidades Incríveis';
  const patchContent = 'Nesta atualização, corrigimos vários bugs e adicionamos a nova página de Patch Notes para manter todos informados!';
  const updatedPatchTitle = 'Versão 1.5.0 (Atualizado)';
  const updatedPatchContent = 'Conteúdo atualizado do patch note para testes.';

  test('should allow user registration, admin promotion, patch creation, unread notification for other users, edit and delete', async ({ page }) => {
    // 1. Registrar o usuário que será promovido a admin
    await page.goto('/login');
    await page.click('text=Não tem conta? Registre-se');
    await page.fill('input[placeholder="Username"]', adminUsername);
    await page.fill('input[placeholder="E-mail"]', `${adminUsername}@example.com`);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('button:has-text("Enviar Código")');
    await page.fill('input[placeholder="Código de 6 dígitos"]', '123456');
    await page.click('button:has-text("Confirmar Código")');

    // Fazer login inicial
    await page.fill('input[placeholder="Username ou E-mail"]', adminUsername);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('form button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*\/library/);

    // 2. Verificar o megafone do Header (não deve estar em alerta porque não há patches)
    const megaphone = page.locator('header button[title="Patch Notes"]');
    await expect(megaphone).toBeVisible();
    await expect(megaphone).not.toHaveClass(/hasUnread/);

    // Navegar para patch notes (deve estar vazio)
    await megaphone.click({ force: true });
    await expect(page).toHaveURL(/.*\/patch-notes/);
    await expect(page.locator('text=Nenhuma nota de atualização publicada ainda.')).toBeVisible();
    await expect(page.locator('button:has-text("Publicar Novo Patch")')).not.toBeVisible();

    // 3. Promover o usuário a Admin diretamente via script no banco de testes
    execSync(
      `poetry run python -c "import app.models.user; import app.models.tierlist; import app.models.custom_lists; import app.models.user_game; import app.models.game; import app.models.steam_account; import app.models.itch_account; from app.database import SessionLocal; from app.models.user import User; session = SessionLocal(); user = session.query(User).filter(User.username == '${adminUsername}').first(); user.is_admin = True; session.commit(); session.close()"`,
      { cwd: '..' }
    );

    // Recarregar a página para atualizar o estado do usuário na sessão
    await page.reload();
    await expect(page.locator('button:has-text("Publicar Novo Patch")')).toBeVisible();

    // 4. Criar um novo patch note
    await page.click('button:has-text("Publicar Novo Patch")');
    await expect(page.locator('h3:has-text("Nova Nota de Atualização")')).toBeVisible();
    await page.fill('input[placeholder="Ex: Versão 1.2.0 - Correções na Biblioteca"]', patchTitle);
    await page.fill('textarea[placeholder="Descreva as alterações aplicadas..."]', patchContent);
    await page.click('button[type="submit"]:has-text("Salvar Alterações")');

    // Confirmar que o patch note aparece no feed
    await expect(page.locator('text=Nota de atualização publicada com sucesso!')).toBeVisible();
    await expect(page.locator(`h2:has-text("${patchTitle}")`)).toBeVisible();
    await expect(page.locator(`text=${patchContent}`)).toBeVisible();
    await expect(page.locator(`strong:has-text("${adminUsername}")`)).toBeVisible();

    // Deslogar
    const avatarBtn = page.locator('header button[class*="avatar"]');
    await avatarBtn.click();
    await page.click('text=Sair');
    await expect(page).toHaveURL(/.*\/login/);

    // 5. Registrar um segundo usuário para testar o alerta de unread
    await page.click('text=Não tem conta? Registre-se');
    await page.fill('input[placeholder="Username"]', userUsername);
    await page.fill('input[placeholder="E-mail"]', `${userUsername}@example.com`);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('button:has-text("Enviar Código")');
    await page.fill('input[placeholder="Código de 6 dígitos"]', '123456');
    await page.click('button:has-text("Confirmar Código")');

    // Login com o segundo usuário
    await page.fill('input[placeholder="Username ou E-mail"]', userUsername);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('form button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*\/library/);

    // O megafone deve estar piscando (hasUnread) para o segundo usuário
    const userMegaphone = page.locator('header button[title="Patch Notes"]');
    await expect(userMegaphone).toBeVisible();
    await expect(userMegaphone).toHaveClass(/hasUnread/);

    // Clicar no megafone e certificar que vai para /patch-notes e o pisca apaga
    await userMegaphone.click({ force: true });
    await expect(page).toHaveURL(/.*\/patch-notes/);
    await expect(userMegaphone).not.toHaveClass(/hasUnread/);
    await expect(page.locator(`h2:has-text("${patchTitle}")`)).toBeVisible();
    await expect(page.locator('button:has-text("Publicar Novo Patch")')).not.toBeVisible();

    // Deslogar segundo usuário
    const userAvatarBtn = page.locator('header button[class*="avatar"]');
    await userAvatarBtn.click();
    await page.click('text=Sair');
    await expect(page).toHaveURL(/.*\/login/);

    // 6. Logar novamente como Admin para editar e excluir
    await page.fill('input[placeholder="Username ou E-mail"]', adminUsername);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('form button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*\/library/);

    // Navegar para patch notes
    const adminMegaphone = page.locator('header button[title="Patch Notes"]');
    await adminMegaphone.click({ force: true });
    await expect(page).toHaveURL(/.*\/patch-notes/);

    // Editar o patch note
    await page.click('button:has-text("Editar")');
    await expect(page.locator('h3:has-text("Editar Nota de Atualização")')).toBeVisible();
    await page.fill('input[placeholder="Ex: Versão 1.2.0 - Correções na Biblioteca"]', updatedPatchTitle);
    await page.fill('textarea[placeholder="Descreva as alterações aplicadas..."]', updatedPatchContent);
    await page.click('button[type="submit"]:has-text("Salvar Alterações")');

    // Confirmar toast de sucesso e novos valores
    await expect(page.locator('text=Nota de atualização editada com sucesso!')).toBeVisible();
    await expect(page.locator(`h2:has-text("${updatedPatchTitle}")`)).toBeVisible();
    await expect(page.locator(`text=${updatedPatchContent}`)).toBeVisible();
    await expect(page.locator('text=(Editado em')).toBeVisible();

    // Excluir o patch note
    await page.click('button:has-text("Excluir")');
    await expect(page.locator('h3:has-text("Excluir Nota de Atualização")')).toBeVisible();
    await page.click('div[role="dialog"] button:has-text("Excluir")');

    // Confirmar que o patch note sumiu
    await expect(page.locator('text=Nota de atualização excluída com sucesso.')).toBeVisible();
    await expect(page.locator('text=Nenhuma nota de atualização publicada ainda.')).toBeVisible();
  });
});
