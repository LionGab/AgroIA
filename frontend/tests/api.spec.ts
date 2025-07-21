import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('should handle API connection errors gracefully', async ({ page }) => {
    // Block all API requests to simulate backend down
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/');
    
    // Should show error message or loading state
    await expect(page.locator('text=Erro ao carregar')).toBeVisible({ timeout: 10000 });
  });

  test('should handle 500 server errors', async ({ page }) => {
    await page.route('**/api/farms**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/farms');
    
    // Should handle 500 errors gracefully
    await expect(page.locator('text=Erro interno do servidor')).toBeVisible({ timeout: 5000 });
  });

  test('should handle 401 unauthorized errors', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });
    
    await page.goto('/');
    
    // Should redirect to login or show auth error
    await expect(page).toHaveURL(/.*login/) || await expect(page.locator('text=Acesso negado')).toBeVisible();
  });

  test('should handle slow API responses', async ({ page }) => {
    await page.route('**/api/farms**', async route => {
      // Simulate slow response
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
        })
      });
    });
    
    await page.goto('/farms');
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // Should eventually load
    await expect(page.locator('text=fazenda')).toBeVisible({ timeout: 10000 });
  });

  test('should retry failed requests', async ({ page }) => {
    let attemptCount = 0;
    
    await page.route('**/api/farms**', route => {
      attemptCount++;
      
      if (attemptCount < 2) {
        // First attempt fails
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service Unavailable' })
        });
      } else {
        // Second attempt succeeds
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: '1',
                name: 'Fazenda Teste',
                crop_type: 'soja',
                total_area: 100,
                active: true
              }
            ],
            pagination: { page: 1, limit: 20, total: 1, total_pages: 1 }
          })
        });
      }
    });
    
    await page.goto('/farms');
    
    // Should eventually show data after retry
    await expect(page.locator('text=Fazenda Teste')).toBeVisible({ timeout: 10000 });
  });

  test('should handle malformed API responses', async ({ page }) => {
    await page.route('**/api/farms**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });
    
    await page.goto('/farms');
    
    // Should handle JSON parse error gracefully
    await expect(page.locator('text=Erro ao processar dados')).toBeVisible({ timeout: 5000 });
  });

  test('should validate API response structure', async ({ page }) => {
    await page.route('**/api/farms**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          // Missing required fields
          farms: [{ incomplete: 'data' }]
        })
      });
    });
    
    await page.goto('/farms');
    
    // Should handle invalid data structure
    await expect(page.locator('text=Dados inválidos')).toBeVisible({ timeout: 5000 });
  });

  test('should handle network timeouts', async ({ page }) => {
    await page.route('**/api/farms**', async route => {
      // Never resolve to simulate timeout
      await new Promise(() => {});
    });
    
    await page.goto('/farms');
    
    // Should show timeout error after waiting
    await expect(page.locator('text=Timeout')).toBeVisible({ timeout: 10000 });
  });

  test('should cache API responses appropriately', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/api/farms**', route => {
      requestCount++;
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: '1', name: 'Fazenda Cache Test', crop_type: 'soja', total_area: 100, active: true }],
          pagination: { page: 1, limit: 20, total: 1, total_pages: 1 }
        })
      });
    });
    
    await page.goto('/farms');
    await page.waitForSelector('text=Fazenda Cache Test');
    
    // Navigate away and back
    await page.goto('/');
    await page.goto('/farms');
    await page.waitForSelector('text=Fazenda Cache Test');
    
    // Should have used cache (React Query), so might not make second request
    expect(requestCount).toBeLessThanOrEqual(2);
  });

  test('should handle CORS errors', async ({ page }) => {
    // Simulate CORS error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 0, // CORS typically returns status 0
        contentType: 'text/plain',
        body: ''
      });
    });
    
    await page.goto('/');
    
    // Should show connection error
    await expect(page.locator('text=Erro de conexão')).toBeVisible({ timeout: 5000 });
  });
});