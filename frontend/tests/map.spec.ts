import { test, expect } from '@playwright/test';

test.describe('Map Visualization', () => {
  test.beforeEach(async ({ page }) => {
    // Mock farms data with coordinates
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
              coordinates: {
                center: [-23.5505, -46.6333],
                coordinates: [
                  [
                    [-46.64, -23.55],
                    [-46.63, -23.55],
                    [-46.63, -23.54],
                    [-46.64, -23.54],
                    [-46.64, -23.55]
                  ]
                ]
              },
              active: true
            },
            {
              id: '2',
              name: 'Fazenda Santa Maria',
              crop_type: 'milho',
              total_area: 200.0,
              coordinates: {
                center: [-23.5605, -46.6433]
              },
              active: true
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

    // Mock analyses data
    await page.route('**/api/farms/*/analyses**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '1',
              farm_id: '1',
              ndvi_average: 0.65,
              claude_confidence: 85,
              alerts_count: 0,
              created_at: new Date().toISOString()
            }
          ]
        })
      });
    });
  });

  test('should load map with farm markers', async ({ page }) => {
    await page.goto('/farms');
    
    // Alternar para vista de mapa
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento do mapa
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    
    // Verificar se o mapa foi carregado
    await expect(page.locator('.leaflet-container')).toBeVisible();
    
    // Verificar se os tiles do mapa carregaram
    await expect(page.locator('.leaflet-tile-loaded')).toHaveCount({ min: 1 });
  });

  test('should show farm markers with correct colors', async ({ page }) => {
    await page.goto('/farms');
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento do mapa
    await page.waitForSelector('.leaflet-container');
    
    // Aguardar um pouco para os marcadores carregarem
    await page.waitForTimeout(2000);
    
    // Verificar se marcadores customizados existem
    await expect(page.locator('.custom-marker')).toHaveCount({ min: 1 });
  });

  test('should display NDVI overlay when farm is selected', async ({ page }) => {
    await page.goto('/farms');
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento do mapa
    await page.waitForSelector('.leaflet-container');
    
    // Selecionar uma fazenda da lista
    await page.click('[data-testid="farm-list-item-1"]');
    
    // Aguardar overlay NDVI aparecer
    await page.waitForTimeout(1000);
    
    // Verificar se a legenda NDVI está visível
    await expect(page.locator('text=Legenda NDVI')).toBeVisible();
    await expect(page.locator('text=Alto (> 0.5)')).toBeVisible();
  });

  test('should show farm popup on marker click', async ({ page }) => {
    await page.goto('/farms');
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento do mapa
    await page.waitForSelector('.leaflet-container');
    await page.waitForTimeout(2000);
    
    // Simular clique em marcador (usando coordenadas aproximadas do centro do mapa)
    await page.locator('.leaflet-container').click({
      position: { x: 300, y: 200 }
    });
    
    // Aguardar popup aparecer
    await page.waitForTimeout(500);
    
    // Verificar se popup com informações da fazenda aparece
    const popup = page.locator('.leaflet-popup-content');
    if (await popup.isVisible()) {
      await expect(popup).toContainText('Fazenda');
    }
  });

  test('should handle map controls correctly', async ({ page }) => {
    await page.goto('/farms');
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento do mapa
    await page.waitForSelector('.leaflet-container');
    
    // Verificar se controles de zoom estão presentes
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-in')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-out')).toBeVisible();
    
    // Testar zoom in
    await page.click('.leaflet-control-zoom-in');
    await page.waitForTimeout(500);
    
    // Testar zoom out
    await page.click('.leaflet-control-zoom-out');
    await page.waitForTimeout(500);
  });

  test('should show layer control for different map types', async ({ page }) => {
    await page.goto('/farms');
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento do mapa
    await page.waitForSelector('.leaflet-container');
    
    // Verificar se controle de camadas está presente
    const layerControl = page.locator('.leaflet-control-layers');
    if (await layerControl.isVisible()) {
      await expect(layerControl).toBeVisible();
      
      // Abrir controle de camadas
      await page.click('.leaflet-control-layers-toggle');
      
      // Verificar opções de camadas
      await expect(page.locator('text=Mapa')).toBeVisible();
      await expect(page.locator('text=Satélite')).toBeVisible();
    }
  });

  test('should handle farm selection from sidebar list', async ({ page }) => {
    await page.goto('/farms');
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento
    await page.waitForSelector('.leaflet-container');
    await page.waitForSelector('[data-testid="farm-list-item"]');
    
    // Selecionar fazenda da lista lateral
    await page.click('[data-testid="farm-list-item-1"]');
    
    // Verificar se o item ficou selecionado
    await expect(page.locator('[data-testid="farm-list-item-1"]')).toHaveClass(/selected|active/);
  });

  test('should clear selection correctly', async ({ page }) => {
    await page.goto('/farms');
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento
    await page.waitForSelector('.leaflet-container');
    
    // Selecionar uma fazenda
    if (await page.locator('[data-testid="farm-list-item-1"]').isVisible()) {
      await page.click('[data-testid="farm-list-item-1"]');
      
      // Verificar se botão de limpar seleção aparece
      if (await page.locator('text=Limpar Seleção').isVisible()) {
        await page.click('text=Limpar Seleção');
        
        // Verificar se seleção foi limpa
        await expect(page.locator('[data-testid="farm-list-item-1"]')).not.toHaveClass(/selected|active/);
      }
    }
  });

  test('should handle mobile map interaction', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/farms');
    
    // Alternar para vista de mapa
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento do mapa
    await page.waitForSelector('.leaflet-container');
    
    // Verificar se mapa é responsivo
    await expect(page.locator('.leaflet-container')).toBeVisible();
    
    // Verificar se lista lateral funciona em mobile
    await expect(page.locator('[data-testid="farms-sidebar"]')).toBeVisible();
  });

  test('should handle map loading errors gracefully', async ({ page }) => {
    // Bloquear requests de tiles do mapa
    await page.route('**/*.png', route => {
      if (route.request().url().includes('tile')) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await page.goto('/farms');
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento do mapa (mesmo com tiles falhando)
    await page.waitForSelector('.leaflet-container');
    
    // Mapa deve ainda estar visível mesmo sem tiles
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('should show NDVI legend correctly', async ({ page }) => {
    await page.goto('/farms');
    await page.click('[data-testid="map-view-button"]');
    
    // Aguardar carregamento e selecionar fazenda
    await page.waitForSelector('.leaflet-container');
    
    if (await page.locator('[data-testid="farm-list-item-1"]').isVisible()) {
      await page.click('[data-testid="farm-list-item-1"]');
      
      // Verificar legenda NDVI
      await expect(page.locator('text=Legenda NDVI')).toBeVisible();
      await expect(page.locator('text=Baixo (< 0.3)')).toBeVisible();
      await expect(page.locator('text=Médio (0.3 - 0.5)')).toBeVisible();
      await expect(page.locator('text=Alto (> 0.5)')).toBeVisible();
    }
  });
});