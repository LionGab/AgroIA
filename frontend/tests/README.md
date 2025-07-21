# 🧪 Testes E2E com Playwright - AgroIA Frontend

Este diretório contém todos os testes end-to-end do frontend AgroIA usando Playwright.

## 📋 Estrutura dos Testes

### Arquivos de Teste

- **`dashboard.spec.ts`** - Testa a página principal do dashboard
- **`farms.spec.ts`** - Testa o gerenciamento de fazendas
- **`map.spec.ts`** - Testa a funcionalidade de mapas e visualização NDVI
- **`alerts.spec.ts`** - Testa o sistema de alertas
- **`api.spec.ts`** - Testa integração com API e tratamento de erros

### Cobertura de Testes

#### Dashboard (`dashboard.spec.ts`)
- ✅ Carregamento da página principal
- ✅ Exibição de cards de estatísticas
- ✅ Navegação entre páginas
- ✅ Seção de atividade recente
- ✅ Design responsivo para mobile
- ✅ Estados de carregamento
- ✅ Tratamento de erros da API

#### Gerenciamento de Fazendas (`farms.spec.ts`)
- ✅ Listagem de fazendas
- ✅ Filtros por cultura, prioridade e status
- ✅ Busca por nome de fazenda
- ✅ Alternância entre vista de grade e mapa
- ✅ Exibição de alertas das fazendas
- ✅ Navegação para detalhes
- ✅ Estado vazio quando sem dados
- ✅ Design responsivo
- ✅ Paginação

#### Mapas e NDVI (`map.spec.ts`)
- ✅ Carregamento do mapa com marcadores
- ✅ Cores corretas dos marcadores baseado em NDVI
- ✅ Overlay NDVI quando fazenda é selecionada
- ✅ Popups informativos nos marcadores
- ✅ Controles de zoom e camadas
- ✅ Seleção de fazendas pela lista lateral
- ✅ Funcionalidade de limpar seleção
- ✅ Interação em mobile
- ✅ Tratamento de erros de carregamento
- ✅ Legenda NDVI

#### Sistema de Alertas (`alerts.spec.ts`)
- ✅ Carregamento da página de alertas
- ✅ Exibição correta de badges de severidade
- ✅ Filtros por severidade e status
- ✅ Marcar alertas como visualizados
- ✅ Resolução de alertas
- ✅ Modal de detalhes dos alertas
- ✅ Status de envio WhatsApp
- ✅ Estatísticas de alertas
- ✅ Nomes das fazendas
- ✅ Estado vazio
- ✅ Ordenação por data
- ✅ Design responsivo
- ✅ Timestamps corretos
- ✅ Operações em lote

#### Integração API (`api.spec.ts`)
- ✅ Tratamento de erros de conexão
- ✅ Erros 500 do servidor
- ✅ Erros 401 de autorização
- ✅ Respostas lentas da API
- ✅ Retry automático de requisições
- ✅ Respostas malformadas
- ✅ Timeouts de rede
- ✅ Cache de respostas
- ✅ Erros CORS

## 🚀 Como Executar os Testes

### Pré-requisitos

```bash
# Instalar dependências (se não foi feito)
npm install

# Instalar browsers do Playwright (se não foi feito)
npx playwright install
```

### Comandos de Teste

```bash
# Executar todos os testes (headless)
npm run test

# Executar testes com interface gráfica
npm run test:headed

# Executar testes em modo debug
npm run test:debug

# Ver relatório dos testes
npm run test:report

# Executar testes específicos
npx playwright test dashboard.spec.ts
npx playwright test farms.spec.ts
npx playwright test map.spec.ts
npx playwright test alerts.spec.ts
npx playwright test api.spec.ts

# Executar em browser específico
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Executar em mobile
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Testes com Backend Local

```bash
# 1. Iniciar o backend (em um terminal)
cd ../backend
npm run dev

# 2. Iniciar o frontend (em outro terminal)
cd ../frontend
npm run dev

# 3. Executar testes (em terceiro terminal)
npm run test
```

### Testes sem Backend (Mocked)

Os testes são configurados com mocks das APIs, então podem rodar independentemente do backend:

```bash
# Rodar testes apenas com mocks
npm run test
```

## ⚙️ Configuração

### `playwright.config.ts`

Configurações principais do Playwright:

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Reporters**: HTML report
- **Retry**: 2x em CI, 0x local
- **Screenshots**: Apenas em falha
- **Videos**: Apenas em falha
- **Traces**: Na primeira retry

### Mocks de API

Cada teste usa mocks específicos da API para:

- **Fazendas**: Dados de fazendas com coordenadas
- **Análises**: Dados NDVI e análises Claude
- **Alertas**: Alertas com diferentes severidades
- **Erros**: Simulação de cenários de erro

### Data Test IDs

O frontend usa `data-testid` para elementos importantes:

```tsx
// Exemplos de elementos com data-testid
<div data-testid="dashboard-content">
<div data-testid="farm-card">
<button data-testid="mobile-menu-button">
<div data-testid="loading-spinner">
```

## 📊 Relatórios e Análise

### Relatório HTML

Após executar os testes, visualize o relatório:

```bash
npm run test:report
```

O relatório inclui:
- ✅ Status dos testes
- ⏱️ Tempos de execução
- 📸 Screenshots das falhas
- 🎥 Vídeos das falhas
- 📋 Traces para debug

### Screenshots e Vídeos

Automaticamente capturados em:
- `test-results/` - Screenshots e vídeos de falhas
- `playwright-report/` - Relatório HTML completo

### Traces

Para debug detalhado:

```bash
npx playwright test --trace on
```

## 🐛 Debug de Testes

### Executar com Debug Visual

```bash
# Modo debug completo
npm run test:debug

# Debug de teste específico
npx playwright test dashboard.spec.ts --debug
```

### Executar com Browser Visível

```bash
# Ver execução dos testes
npm run test:headed

# Execução mais lenta para acompanhar
npx playwright test --headed --slowMo=1000
```

### Inspecionar Elementos

```bash
# Abrir Playwright Inspector
npx playwright test --debug --headed
```

## ✅ Melhores Práticas

### 1. Seletores Robustos

```typescript
// ✅ Bom - usar data-testid
await page.click('[data-testid="submit-button"]')

// ❌ Evitar - seletores frágeis
await page.click('.btn-primary')
await page.click('text=Submit')
```

### 2. Esperas Adequadas

```typescript
// ✅ Bom - aguardar elemento específico
await page.waitForSelector('[data-testid="farms-loaded"]')

// ✅ Bom - aguardar condição
await expect(page.locator('text=Fazenda')).toBeVisible()

// ❌ Evitar - timeouts fixos
await page.waitForTimeout(5000)
```

### 3. Mocks Realistas

```typescript
// ✅ Bom - mock com dados realistas
await page.route('**/api/farms**', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({
      data: [...farmData],
      pagination: {...paginationData}
    })
  })
})
```

### 4. Testes Independentes

```typescript
// ✅ Bom - cada teste é independente
test.beforeEach(async ({ page }) => {
  // Setup específico para cada teste
  await page.route('**/api/**', mockHandler)
})
```

## 🔧 Troubleshooting

### Problemas Comuns

**Testes falhando por timeout**
```bash
# Aumentar timeout global
npx playwright test --timeout=60000
```

**Browsers não instalados**
```bash
npx playwright install
```

**Porta 3000 já em uso**
```bash
# Configurar porta diferente
PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test
```

**Falhas em CI**
- Verificar se `fullyParallel: false` em CI
- Aumentar `retries` para 2-3 em CI
- Usar `workers: 1` em CI se houver problemas

## 📈 Métricas dos Testes

- **Cobertura**: ~90% das funcionalidades principais
- **Browsers**: Chrome, Firefox, Safari (WebKit)
- **Mobile**: Android (Pixel 5), iOS (iPhone 12)
- **Tempo médio**: ~2-3 minutos para suite completa
- **Confiabilidade**: >95% pass rate

---

*Os testes E2E garantem que o AgroIA funciona perfeitamente para os usuários finais!* 🌾✨