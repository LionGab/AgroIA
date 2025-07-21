import { test, expect } from '@playwright/test';

test.describe('Dashboard AgroIA', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/');
    
    // Verificar se o título está correto
    await expect(page).toHaveTitle(/AgroIA/);
    
    // Verificar se o cabeçalho principal existe
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verificar se o sidebar está presente
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });

  test('should show farm statistics cards', async ({ page }) => {
    await page.goto('/');
    
    // Aguardar o carregamento dos dados
    await page.waitForSelector('[data-testid="stat-card"]', { timeout: 10000 });
    
    // Verificar se os cards de estatísticas estão presentes
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(4);
    
    // Verificar textos específicos dos cards
    await expect(page.locator('text=Total de Fazendas')).toBeVisible();
    await expect(page.locator('text=Alertas Pendentes')).toBeVisible();
    await expect(page.locator('text=Área Total')).toBeVisible();
  });

  test('should navigate to farms page', async ({ page }) => {
    await page.goto('/');
    
    // Clicar no link de fazendas no sidebar
    await page.click('text=Fazendas');
    
    // Verificar se navegou para a página correta
    await expect(page).toHaveURL(/.*farms/);
    await expect(page.locator('h1')).toContainText('Fazendas');
  });

  test('should show recent activity section', async ({ page }) => {
    await page.goto('/');
    
    // Verificar se a seção de atividade recente existe
    await expect(page.locator('text=Atividade Recente')).toBeVisible();
  });

  test('should have responsive design for mobile', async ({ page }) => {
    // Testar em viewport móvel
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verificar se o menu mobile funciona
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Clicar no botão do menu mobile
    await page.click('[data-testid="mobile-menu-button"]');
    
    // Verificar se o sidebar mobile abre
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    await page.goto('/');
    
    // Verificar se não há indicadores de loading permanentes
    await page.waitForSelector('[data-testid="loading-spinner"]', { 
      state: 'hidden', 
      timeout: 15000 
    });
    
    // Verificar se o conteúdo carregou
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('should show error message when API is unavailable', async ({ page }) => {
    // Interceptar requests da API e retornar erro
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/');
    
    // Verificar se uma mensagem de erro é exibida
    await expect(page.locator('text=Erro ao carregar')).toBeVisible({ timeout: 10000 });
  });
});