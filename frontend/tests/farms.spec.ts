import { test, expect } from '@playwright/test';

test.describe('Fazendas Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock da API de fazendas para testes
    await page.route('**/api/farms**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '1',
              name: 'Fazenda São José',
              crop_type: 'soja',
              total_area: 150.5,
              owner_phone: '+55 11 99999-9999',
              priority: 'high',
              active: true,
              coordinates: {
                center: [-23.5505, -46.6333]
              },
              last_analysis_at: new Date().toISOString()
            },
            {
              id: '2',
              name: 'Fazenda Santa Maria',
              crop_type: 'milho',
              total_area: 200.0,
              owner_phone: '+55 11 88888-8888',
              priority: 'medium',
              active: true,
              coordinates: {
                center: [-23.5605, -46.6433]
              }
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            total_pages: 1
          }
        })
      });
    });

    await page.route('**/api/farms/*/alerts**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '1',
              severity: 'high',
              title: 'Estresse Hídrico Detectado',
              description: 'NDVI baixo detectado na região norte da fazenda'
            }
          ]
        })
      });
    });
  });

  test('should load farms list', async ({ page }) => {
    await page.goto('/farms');
    
    // Verificar título da página
    await expect(page.locator('h1')).toContainText('Fazendas');
    
    // Verificar se as fazendas são exibidas
    await expect(page.locator('text=Fazenda São José')).toBeVisible();
    await expect(page.locator('text=Fazenda Santa Maria')).toBeVisible();
    
    // Verificar informações das fazendas
    await expect(page.locator('text=150.5 hectares')).toBeVisible();
    await expect(page.locator('text=soja')).toBeVisible();
  });

  test('should filter farms by crop type', async ({ page }) => {
    await page.goto('/farms');
    
    // Aguardar carregamento
    await page.waitForSelector('text=Fazenda São José');
    
    // Filtrar por soja
    await page.selectOption('[data-testid="crop-filter"]', 'soja');
    
    // Verificar se apenas fazendas de soja são exibidas
    await expect(page.locator('text=Fazenda São José')).toBeVisible();
    await expect(page.locator('text=soja')).toBeVisible();
  });

  test('should search farms by name', async ({ page }) => {
    await page.goto('/farms');
    
    // Aguardar carregamento
    await page.waitForSelector('text=Fazenda São José');
    
    // Buscar por nome
    await page.fill('[placeholder="Buscar fazendas..."]', 'São José');
    
    // Verificar resultado da busca
    await expect(page.locator('text=Fazenda São José')).toBeVisible();
    await expect(page.locator('text=Fazenda Santa Maria')).not.toBeVisible();
  });

  test('should toggle between grid and map view', async ({ page }) => {
    await page.goto('/farms');
    
    // Aguardar carregamento
    await page.waitForSelector('text=Fazenda São José');
    
    // Verificar vista em grade (padrão)
    await expect(page.locator('[data-testid="farms-grid"]')).toBeVisible();
    
    // Alternar para vista de mapa
    await page.click('[data-testid="map-view-button"]');
    
    // Verificar se a vista mudou para mapa
    await expect(page.locator('[data-testid="farms-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="farms-grid"]')).not.toBeVisible();
  });

  test('should display farm alerts', async ({ page }) => {
    await page.goto('/farms');
    
    // Aguardar carregamento
    await page.waitForSelector('text=Fazenda São José');
    
    // Verificar se o badge de alerta é exibido
    await expect(page.locator('[data-testid="alert-badge"]')).toBeVisible();
    await expect(page.locator('text=1')).toBeVisible(); // Contador de alertas
  });

  test('should navigate to farm details', async ({ page }) => {
    await page.goto('/farms');
    
    // Aguardar carregamento
    await page.waitForSelector('text=Fazenda São José');
    
    // Clicar no botão de detalhes
    await page.click('[data-testid="farm-details-link"]');
    
    // Verificar navegação
    await expect(page).toHaveURL(/.*farms\/1/);
  });

  test('should show empty state when no farms', async ({ page }) => {
    // Mock resposta vazia
    await page.route('**/api/farms**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            total_pages: 0
          }
        })
      });
    });
    
    await page.goto('/farms');
    
    // Verificar estado vazio
    await expect(page.locator('text=Nenhuma fazenda encontrada')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  });

  test('should handle mobile responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/farms');
    
    // Aguardar carregamento
    await page.waitForSelector('text=Fazenda São José');
    
    // Verificar se os cards se ajustam ao mobile
    await expect(page.locator('[data-testid="farm-card"]')).toHaveCount(2);
    
    // Verificar se o filtro funciona em mobile
    await expect(page.locator('[data-testid="filters-section"]')).toBeVisible();
  });

  test('should show pagination when there are multiple pages', async ({ page }) => {
    // Mock com múltiplas páginas
    await page.route('**/api/farms**', route => {
      const url = new URL(route.request().url());
      const page_num = parseInt(url.searchParams.get('page') || '1');
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: `${page_num}`,
              name: `Fazenda Page ${page_num}`,
              crop_type: 'soja',
              total_area: 100,
              priority: 'medium',
              active: true
            }
          ],
          pagination: {
            page: page_num,
            limit: 1,
            total: 3,
            total_pages: 3
          }
        })
      });
    });
    
    await page.goto('/farms');
    
    // Verificar se a paginação é exibida
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    await expect(page.locator('text=3')).toBeVisible(); // Total de páginas
    
    // Testar navegação para próxima página
    await page.click('[data-testid="page-2"]');
    
    // Verificar se navegou para a página 2
    await expect(page.locator('text=Fazenda Page 2')).toBeVisible();
  });
});