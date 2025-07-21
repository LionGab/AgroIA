# Arquitetura do Sistema AgroIA

## 🌾 Visão Geral

O AgroIA é um sistema completo de monitoramento agrícola que combina análise de imagens de satélite, inteligência artificial e comunicação automatizada via WhatsApp para fornecer insights acionáveis aos produtores rurais.

## 🏗️ Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ARQUITETURA AGROAI                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│   FRONTEND      │    │    BACKEND      │    │  FONTES DE DADOS    │
│                 │    │                 │    │                     │
│ • Dashboard Web │◄──►│ • API REST      │◄──►│ • Sentinel-2        │
│ • Mapas NDVI    │    │ • Análise NDVI  │    │ • Claude Vision     │
│ • Relatórios    │    │ • Claude Vision │    │ • OpenAI GPT-4      │
│ • Alertas       │    │ • WhatsApp API  │    │ • PostgreSQL        │
│                 │    │ • Cron Jobs     │    │                     │
└─────────────────┘    └─────────────────┘    └─────────────────────┘
        │                        │                        │
        │                        ▼                        │
        │              ┌─────────────────┐                │
        │              │   COMUNICAÇÃO   │                │
        │              │                 │                │
        │              │ • WhatsApp      │                │
        │              │ • Alertas SMS   │                │
        │              │ • Email Reports │                │
        │              └─────────────────┘                │
        │                                                 │
        └─────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Dados Principal

### 1. Coleta de Dados (Daily Cron - 6:00 AM)
```
Sentinel-2 API → Download Imagens → Extração Bandas → Cálculo NDVI
     ▲                ▼                    ▼             ▼
[Schedule]     [Local Storage]      [Image Processing] [Analytics DB]
```

### 2. Análise com IA
```
NDVI Data + Satellite Image → Claude Vision → Analysis Results
     ▲              ▲              ▼              ▼
[Calculated]   [Downloaded]   [AI Processing]  [Structured Data]
```

### 3. Geração de Alertas
```
Analysis Results → Alert Engine → WhatsApp API → Farmer Notification
        ▲              ▼              ▼              ▼
[AI + NDVI Data]  [Rule Engine]  [Message Queue]  [Delivered]
```

### 4. Dashboard e Relatórios
```
Database → API Endpoints → Frontend → Interactive Dashboard
    ▲           ▼              ▼              ▼
[All Data]  [REST API]    [React/Next]   [User Interface]
```

## 🧩 Componentes Detalhados

### Backend Core Services

#### 1. NDVI Analysis Service
```typescript
class NDVIAnalysisService {
  // Cálculo NDVI: (NIR - Red) / (NIR + Red)
  calculateNDVI(nirBand: Buffer, redBand: Buffer): NDVIResult
  
  // Estatísticas: média, desvio, min, max
  calculateStatistics(ndviData: number[]): Statistics
  
  // Zonas: água, solo, vegetação esparsa/densa
  identifyVegetationZones(ndviData: number[]): VegetationZones
  
  // Alertas baseados em thresholds
  generateAlerts(statistics: Statistics): Alert[]
}
```

#### 2. Claude Vision Service
```typescript
class ClaudeVisionService {
  // Análise principal de imagens
  analyzeSatelliteImage(image: Buffer, farmInfo: Farm): ClaudeAnalysis
  
  // Comparação temporal
  compareTemporalImages(current: Buffer, previous: Buffer): TemporalAnalysis
  
  // Relatório executivo
  generateExecutiveReport(analysis: ClaudeAnalysis): ExecutiveReport
}
```

#### 3. Sentinel-2 Service
```typescript
class Sentinel2Service {
  // Busca por imagens em área e período
  searchImages(coordinates: BoundingBox, dateRange: DateRange): SatelliteImage[]
  
  // Download de imagens
  downloadImage(imageInfo: SatelliteImage, farmId: string): DownloadResult
  
  // Extração de bandas específicas
  extractBands(imagePath: string, bands: string[]): BandData
}
```

#### 4. Farm Alert Service
```typescript
class FarmAlertService {
  // Processamento de alertas combinados
  processAnalysisAlerts(farm: Farm, ndvi: NDVIResult, claude: ClaudeResult): Alert[]
  
  // Envio via WhatsApp
  sendWhatsAppAlerts(farm: Farm, alerts: Alert[]): void
  
  // Histórico e gestão
  getAlertHistory(farmId: string, days: number): Alert[]
}
```

### Database Schema

#### Core Tables
```sql
farms              -- Fazendas cadastradas
├── id (UUID)
├── name
├── crop_type
├── coordinates (JSONB)
├── owner_phone
└── technical_contacts (JSONB)

satellite_analyses -- Análises realizadas
├── farm_id
├── ndvi_average
├── claude_confidence
├── alerts_count
└── analysis_data (JSONB)

farm_alerts       -- Alertas gerados
├── farm_id
├── alert_type
├── severity
├── description
├── recommendation
└── whatsapp_sent

satellite_images  -- Cache de imagens
├── farm_id
├── sentinel_id
├── sensing_date
└── local_path
```

## ⚡ Performance e Escalabilidade

### Métricas Atuais
- **Análise NDVI**: 30-60s por fazenda
- **Claude Vision**: 10-20s por análise  
- **Download Sentinel-2**: 2-5min por imagem
- **Throughput**: 50 fazendas/hora
- **Storage**: 100-500MB/fazenda/mês

### Otimizações Implementadas
1. **Cache Inteligente**: Imagens reutilizadas entre fazendas próximas
2. **Processing em Lotes**: Até 5 fazendas simultâneas
3. **Rate Limiting**: Respeita limites das APIs externas
4. **Índices de DB**: Otimizado para consultas temporais
5. **Compressão**: Imagens NDVI compactadas

### Escalabilidade Horizontal
```
Load Balancer → Multiple Backend Instances → Shared PostgreSQL
      │                    │                        │
      │              Queue System              Redis Cache
      │                    │                        │
      └─────────────── Monitoring ──────────────────┘
```

## 🔐 Segurança

### Autenticação e Autorização
- **JWT Tokens**: Para autenticação de usuários
- **API Keys**: Para integração com APIs externas
- **Role-Based Access**: Admin, Fazendeiro, Técnico

### Proteção de Dados
- **Encryption**: Dados sensíveis criptografados
- **Rate Limiting**: Proteção contra ataques
- **Input Validation**: Sanitização com Joi
- **SQL Injection**: Queries parametrizadas
- **Audit Logs**: Log completo de atividades

### Compliance
- **LGPD**: Conformidade com proteção de dados
- **API Security**: HTTPS obrigatório
- **Data Retention**: Política de retenção configurável

## 🚀 APIs Externas Integradas

### 1. Sentinel-2 (ESA Copernicus)
```javascript
// Configuração
BASE_URL: 'https://apihub.copernicus.eu/apihub'
AUTH: 'Basic authentication'
RATE_LIMIT: '2 requests/second'

// Endpoints utilizados
GET /search          // Buscar imagens
GET /odata/Products  // Download de imagens
```

### 2. Claude Vision (Anthropic)
```javascript
// Configuração
MODEL: 'claude-3-5-sonnet-20241022'
MAX_TOKENS: 4000
RATE_LIMIT: '5 requests/minute'

// Capacidades
- Análise visual de imagens agrícolas
- Detecção de anomalias e padrões
- Geração de relatórios estruturados
- Comparação temporal de imagens
```

### 3. OpenAI GPT-4
```javascript
// Configuração
MODEL: 'gpt-4-turbo-preview'
RATE_LIMIT: '10 requests/minute'

// Uso
- Processamento de texto complementar
- Geração de recomendações
- Análise de dados históricos
```

### 4. WhatsApp Business API
```javascript
// Configuração
BASE_URL: 'https://graph.facebook.com/v18.0'
AUTH: 'Bearer token'

// Funcionalidades
- Envio de mensagens de texto
- Envio de imagens (NDVI visualizations)
- Templates de mensagem
- Status de entrega
```

## 📊 Monitoramento e Observabilidade

### Logs Estruturados
```javascript
// Levels: error, warn, info, debug
logger.info('Análise iniciada', {
  farmId: 'uuid',
  cropType: 'soja',
  imageDate: '2025-01-21'
});

// Logs específicos
farmLogger.satelliteAnalysis(farmId, results);
farmLogger.whatsappAlert(farmId, alertType, recipient);
farmLogger.farmActivity(farmId, activity, metadata);
```

### Métricas Coletadas
- **Sistema**: CPU, memória, disk I/O
- **API**: Response time, error rate, throughput
- **Negócio**: Fazendas analisadas, alertas enviados
- **Qualidade**: NDVI médio, confiança Claude

### Alertas do Sistema
- **Alta prioridade**: Falhas na análise diária
- **Média prioridade**: APIs indisponíveis
- **Baixa prioridade**: Performance degradada

## 🧪 Testes e Qualidade

### Estratégia de Testes
```
Unit Tests (Jest)
├── Services (NDVI, Claude, Sentinel-2)
├── Controllers (API endpoints)
├── Utilities (Logger, validators)
└── Models (Database queries)

Integration Tests
├── API endpoints end-to-end
├── Database operations
├── External API mocking
└── WhatsApp integration

Performance Tests
├── Load testing (50+ concurrent farms)
├── Memory usage profiling
├── Database query optimization
└── API response time benchmarks
```

### Quality Gates
- **Code Coverage**: > 80%
- **ESLint**: Zero violations
- **Security**: OWASP compliance
- **Performance**: < 2min analysis time

## 🔄 Deployment e DevOps

### Ambientes
```
Development  → Local development
Staging      → Pre-production testing  
Production   → Live system
```

### CI/CD Pipeline
```
Git Push → Tests → Security Scan → Build → Deploy → Health Check
    │        │         │           │        │         │
  [GitHub] [Jest]   [Snyk]     [Docker]  [PM2]   [Monitoring]
```

### Infrastructure as Code
```yaml
# docker-compose.yml
services:
  agroai-backend:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## 🎯 Roadmap e Evoluções

### Fase 1 (MVP) ✅ Concluída
- [x] Análise NDVI básica
- [x] Integração Claude Vision
- [x] Alertas WhatsApp
- [x] Dashboard web
- [x] Cron jobs automáticos

### Fase 2 (Em Desenvolvimento)
- [ ] Machine Learning para predição
- [ ] Integração com drones
- [ ] API mobile (React Native)
- [ ] Relatórios PDF automáticos

### Fase 3 (Planejado)
- [ ] Marketplace de insights
- [ ] Integração IoT (sensores)
- [ ] Multi-tenancy (white-label)
- [ ] Blockchain para rastreabilidade

## 🤝 Contribuição e Desenvolvimento

### Setup do Ambiente
```bash
# Clone do repositório
git clone https://github.com/agroai/sistema

# Setup completo
cd backend
npm run setup

# Desenvolvimento
npm run dev
```

### Padrões de Código
- **ESLint**: Airbnb config
- **Prettier**: Formatação automática
- **Commits**: Conventional commits
- **Branching**: GitFlow

### Arquitetura de Contribuição
```
Feature Branch → PR → Code Review → Tests → Merge → Deploy
      │           │       │          │        │        │
   [Developer]  [Team]  [Senior]   [CI]   [Master]  [Prod]
```

---

*Documento atualizado em: Janeiro 2025*
*Versão: 1.0*
*Autor: Equipe AgroIA*