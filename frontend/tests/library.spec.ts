import { test, expect } from '@playwright/test';

test.describe('Library Management', () => {
  const testUsername = `libuser_${Date.now()}`;
  const testPassword = 'Password123!';
  const testEmail = `${testUsername}@example.com`;
  const gameTitle = 'O Jogo Teste do Playwright';

  test.beforeEach(async ({ page }) => {
    // Register and login before each test
    await page.goto('/login');
    await page.click('text=Não tem conta? Registre-se');
    await page.fill('input[placeholder="Username"]', testUsername);
    await page.fill('input[placeholder="E-mail"]', testEmail);
    await page.fill('input[placeholder="Senha"]', testPassword);
    
    // Submit initiation
    await page.click('button:has-text("Enviar Código")');
    // Fill verification code
    await page.fill('input[placeholder="Código de 6 dígitos"]', '123456');
    // Confirm registration
    await page.click('button:has-text("Confirmar Código")');
    
    await expect(page.getByText(/Conta criada com sucesso/i)).toBeVisible();
    
    await page.fill('input[placeholder="Username ou E-mail"]', testUsername);
    await page.fill('input[placeholder="Senha"]', testPassword);
    await page.click('form button:has-text("Entrar")');
    try {
      await expect(page).toHaveURL(/.*\/library/);
    } catch (e) {
      const texts = await page.locator('p').allInnerTexts();
      console.log('Timeout on /library! Paragraph texts:', texts);
      throw e;
    }
  });

  test('should allow adding a game manually, changing status, and removing it', async ({ page }) => {
    // Navigate to "Pesquisar / Adicionar" tab
    await page.click('role=tab[name="Pesquisar / Adicionar"]');

    // Click the Add manual game button
    await page.click('button:has-text("+ Adicionar Manualmente")');

    // Fill the manual game form
    await page.fill('input[placeholder="Nome do jogo"]', gameTitle);
    await page.fill('input[placeholder="Ex: 2024"]', '2025');
    // Select platform using autocomplete
    await page.fill('input[placeholder="Pesquisar ou adicionar plataforma..."]', 'PC');
    await page.click('button:has-text("PC")');
    
    // Select standard genre using autocomplete
    await page.fill('input[placeholder="Pesquisar ou adicionar gênero..."]', 'Ação');
    await page.click('button:has-text("Ação")');
    
    // Add custom genre using autocomplete
    await page.fill('input[placeholder="Pesquisar ou adicionar gênero..."]', 'Metroidvania');
    await page.click('button:has-text("Metroidvania")');

    // Submit
    await page.click('button:has-text("Adicionar à Biblioteca")');

    // Verify success toast
    await expect(page.getByText(/Jogo adicionado à biblioteca/i)).toBeVisible();

    // After adding, it should be in the library tab.
    await page.click('role=tab[name="Meus Jogos"]');

    // Click the game card to open edit modal
    await page.click(`h3:has-text("${gameTitle}")`);

    // Change status from Quero Jogar (or whatever default) to Zerado
    await page.click('button:has-text("Zerado")');
    
    // Save
    await page.click('button:has-text("Salvar")');
    await expect(page.getByText(/Jogo atualizado com sucesso/i)).toBeVisible();

    // Click the game card again to remove it
    await page.click(`h3:has-text("${gameTitle}")`);

    // Remove
    await page.click('button:has-text("Remover da Biblioteca")');
    
    // Confirm removal modal
    await page.click('button:has-text("Sim, remover")');
    
    await expect(page.getByText(/Jogo removido da biblioteca/i)).toBeVisible();
    
    // Verify it is no longer in the list
    await expect(page.locator(`h3:has-text("${gameTitle}")`)).not.toBeVisible();
  });
});
