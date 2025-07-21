import { test, expect } from '@playwright/test';

test.describe('Sistema de Alertas', () => {
  test.beforeEach(async ({ page }) => {
    // Mock alerts data
    await page.route('**/api/alerts**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '1',
              farm_id: '1',
              severity: 'high',
              title: 'Estresse Hídrico Crítico',
              description: 'NDVI muito baixo detectado na região norte da fazenda',
              recommendation: 'Verificar sistema de irrigação imediatamente',
              source: 'ndvi',
              whatsapp_sent: true,
              viewed: false,
              resolved: false,
              created_at: new Date().toISOString()
            },
            {
              id: '2',
              farm_id: '2',
              severity: 'medium',
              title: 'Possível Deficiência Nutricional',
              description: 'Claude detectou sinais de deficiência nutricional',
              recommendation: 'Realizar análise de solo na região afetada',
              source: 'claude',
              whatsapp_sent: true,
              viewed: true,
              resolved: false,
              created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '3',
              farm_id: '1',
              severity: 'low',
              title: 'NDVI Abaixo da Média',
              description: 'Índice de vegetação ligeiramente baixo',
              recommendation: 'Monitorar região nos próximos dias',
              source: 'ndvi',
              whatsapp_sent: false,
              viewed: true,
              resolved: false,
              created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 3,
            total_pages: 1
          }
        })
      });
    });

    // Mock farms data
    await page.route('**/api/farms**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '1',
              name: 'Fazenda São José',
              crop_type: 'soja'
            },
            {
              id: '2',
              name: 'Fazenda Santa Maria',
              crop_type: 'milho'
            }
          ]
        })
      });
    });
  });

  test('should load alerts page correctly', async ({ page }) => {
    await page.goto('/alerts');
    
    // Verificar título da página
    await expect(page.locator('h1')).toContainText('Alertas');
    
    // Verificar se os alertas são exibidos
    await expect(page.locator('text=Estresse Hídrico Crítico')).toBeVisible();
    await expect(page.locator('text=Possível Deficiência Nutricional')).toBeVisible();
    await expect(page.locator('text=NDVI Abaixo da Média')).toBeVisible();
  });

  test('should display alert severity badges correctly', async ({ page }) => {
    await page.goto('/alerts');
    
    // Verificar badges de severidade
    await expect(page.locator('[data-testid="alert-badge-high"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-badge-medium"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-badge-low"]')).toBeVisible();
    
    // Verificar cores dos badges
    const highBadge = page.locator('[data-testid="alert-badge-high"]');
    await expect(highBadge).toHaveClass(/bg-red/);
    
    const mediumBadge = page.locator('[data-testid="alert-badge-medium"]');
    await expect(mediumBadge).toHaveClass(/bg-yellow/);
    
    const lowBadge = page.locator('[data-testid="alert-badge-low"]');
    await expect(lowBadge).toHaveClass(/bg-green/);
  });

  test('should filter alerts by severity', async ({ page }) => {
    await page.goto('/alerts');
    
    // Filtrar por alertas de alta severidade
    await page.selectOption('[data-testid="severity-filter"]', 'high');
    
    // Verificar se apenas alertas high são exibidos
    await expect(page.locator('text=Estresse Hídrico Crítico')).toBeVisible();
    await expect(page.locator('text=Possível Deficiência Nutricional')).not.toBeVisible();
  });

  test('should filter alerts by resolved status', async ({ page }) => {
    await page.goto('/alerts');
    
    // Filtrar por alertas não resolvidos
    await page.selectOption('[data-testid="status-filter"]', 'unresolved');
    
    // Todos os alertas mocados são não resolvidos, então devem estar visíveis
    await expect(page.locator('text=Estresse Hídrico Crítico')).toBeVisible();
    await expect(page.locator('text=Possível Deficiência Nutricional')).toBeVisible();
  });

  test('should mark alert as viewed', async ({ page }) => {
    // Mock da API de update
    await page.route('**/api/alerts/*/view', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: '1',
            viewed: true,
            viewed_at: new Date().toISOString()
          }
        })
      });
    });

    await page.goto('/alerts');
    
    // Clicar no botão de marcar como visto
    await page.click('[data-testid="mark-viewed-1"]');
    
    // Verificar se o alerta foi marcado como visto
    await expect(page.locator('[data-testid="alert-1"]')).toHaveClass(/viewed/);
  });

  test('should resolve alert', async ({ page }) => {
    // Mock da API de resolução
    await page.route('**/api/alerts/*/resolve', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: '1',
            resolved: true,
            resolved_at: new Date().toISOString()
          }
        })
      });
    });

    await page.goto('/alerts');
    
    // Clicar no botão de resolver
    await page.click('[data-testid="resolve-alert-1"]');
    
    // Confirmar na modal se aparecer
    if (await page.locator('[data-testid="confirm-resolve"]').isVisible()) {
      await page.click('[data-testid="confirm-resolve"]');
    }
    
    // Verificar se alerta foi removido da lista (ou marcado como resolvido)
    await expect(page.locator('[data-testid="alert-1"]')).not.toBeVisible();
  });

  test('should show alert details in modal', async ({ page }) => {
    await page.goto('/alerts');
    
    // Clicar no alerta para abrir detalhes
    await page.click('[data-testid="alert-1"]');
    
    // Verificar se modal de detalhes abriu
    await expect(page.locator('[data-testid="alert-modal"]')).toBeVisible();
    await expect(page.locator('text=Estresse Hídrico Crítico')).toBeVisible();
    await expect(page.locator('text=Verificar sistema de irrigação')).toBeVisible();
  });

  test('should show WhatsApp status correctly', async ({ page }) => {
    await page.goto('/alerts');
    
    // Verificar status de envio WhatsApp
    await expect(page.locator('[data-testid="whatsapp-sent-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="whatsapp-not-sent-3"]')).toBeVisible();
    
    // Verificar ícones ou textos indicativos
    await expect(page.locator('text=Enviado')).toHaveCount({ min: 2 });
    await expect(page.locator('text=Não enviado')).toBeVisible();
  });

  test('should display alert statistics', async ({ page }) => {
    await page.goto('/alerts');
    
    // Verificar cards de estatísticas
    await expect(page.locator('[data-testid="alerts-stats"]')).toBeVisible();
    await expect(page.locator('text=Total: 3')).toBeVisible();
    await expect(page.locator('text=Alta: 1')).toBeVisible();
    await expect(page.locator('text=Média: 1')).toBeVisible();
    await expect(page.locator('text=Baixa: 1')).toBeVisible();
  });

  test('should show farm name for each alert', async ({ page }) => {
    await page.goto('/alerts');
    
    // Verificar se nome das fazendas aparecem nos alertas
    await expect(page.locator('text=Fazenda São José')).toBeVisible();
    await expect(page.locator('text=Fazenda Santa Maria')).toBeVisible();
  });

  test('should handle empty alerts state', async ({ page }) => {
    // Mock resposta vazia
    await page.route('**/api/alerts**', route => {
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
    
    await page.goto('/alerts');
    
    // Verificar estado vazio
    await expect(page.locator('text=Nenhum alerta encontrado')).toBeVisible();
    await expect(page.locator('[data-testid="empty-alerts"]')).toBeVisible();
  });

  test('should sort alerts by date', async ({ page }) => {
    await page.goto('/alerts');
    
    // Verificar se alertas estão ordenados por data (mais recente primeiro)
    const alerts = page.locator('[data-testid^="alert-"]');
    const firstAlert = alerts.first();
    
    // O primeiro alerta deve ser o mais recente
    await expect(firstAlert).toContainText('Estresse Hídrico Crítico');
  });

  test('should handle mobile responsive design for alerts', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/alerts');
    
    // Verificar se cards de alerta se ajustam ao mobile
    await expect(page.locator('[data-testid^="alert-"]')).toBeVisible();
    
    // Verificar se filtros funcionam em mobile
    await expect(page.locator('[data-testid="severity-filter"]')).toBeVisible();
    
    // Verificar se estatísticas são visíveis em mobile
    await expect(page.locator('[data-testid="alerts-stats"]')).toBeVisible();
  });

  test('should show alert timestamps correctly', async ({ page }) => {
    await page.goto('/alerts');
    
    // Verificar se timestamps aparecem nos alertas
    await expect(page.locator('text=agora')).toBeVisible(); // Alerta recente
    await expect(page.locator('text=2 horas atrás')).toBeVisible(); // Alerta de 2h
    await expect(page.locator('text=1 dia atrás')).toBeVisible(); // Alerta de 1 dia
  });

  test('should handle bulk operations', async ({ page }) => {
    await page.goto('/alerts');
    
    // Verificar se checkboxes estão presentes para seleção múltipla
    if (await page.locator('[data-testid="alert-checkbox"]').isVisible()) {
      // Selecionar múltiplos alertas
      await page.check('[data-testid="alert-checkbox-1"]');
      await page.check('[data-testid="alert-checkbox-2"]');
      
      // Verificar se ações em lote aparecem
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      await expect(page.locator('text=Marcar como visto')).toBeVisible();
      await expect(page.locator('text=Resolver selecionados')).toBeVisible();
    }
  });
});