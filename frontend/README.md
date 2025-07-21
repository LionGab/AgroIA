# AgroIA Frontend

Dashboard web para o sistema AgroIA - Monitoramento Agrícola Inteligente com análise de satélite, IA e alertas via WhatsApp.

## 🚀 Tecnologias

- **Framework**: Next.js 14 com TypeScript
- **Estilização**: Tailwind CSS
- **Mapas**: Leaflet com React-Leaflet
- **Estado**: React Query + Zustand
- **Ícones**: Lucide React
- **Formulários**: React Hook Form
- **Notificações**: React Hot Toast
- **Gráficos**: Recharts
- **Datas**: date-fns

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas configurações

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Configurações de desenvolvimento
NODE_ENV=development
```

### Para Produção

```bash
# API Backend (produção)
NEXT_PUBLIC_API_URL=https://sua-api.com/api

# Build settings
NODE_ENV=production
```

## 📊 Estrutura do Projeto

```
frontend/
├── components/          # Componentes reutilizáveis
│   ├── Layout.tsx      # Layout principal com navegação
│   └── MapView.tsx     # Componente de mapa com Leaflet
├── hooks/              # Custom hooks
│   ├── useFarms.ts     # Hooks para gerenciar fazendas
│   └── useAlerts.ts    # Hooks para gerenciar alertas
├── pages/              # Páginas do Next.js
│   ├── _app.tsx        # App wrapper
│   ├── _document.tsx   # Document customizado
│   ├── index.tsx       # Dashboard principal
│   └── farms/          # Páginas de fazendas
│       └── index.tsx   # Lista de fazendas
├── services/           # Serviços de API
│   └── api.ts         # Cliente HTTP para backend
├── styles/            # Estilos CSS
│   └── globals.css    # Estilos globais + Tailwind
├── types/             # Definições TypeScript
│   └── index.ts       # Tipos principais do sistema
└── utils/             # Utilitários
```

## 🎯 Funcionalidades Principais

### 1. Dashboard Executivo
- **Estatísticas em tempo real**: Total de fazendas, alertas, área monitorada
- **Visualização de fazendas**: Cards com informações resumidas
- **Atividade recente**: Log de análises, alertas e ações
- **Estatísticas por cultura**: Distribuição das culturas monitoradas
- **Links rápidos**: Acesso rápido às principais funcionalidades

### 2. Gerenciamento de Fazendas
- **Lista completa**: Visualização em grade e mapa
- **Filtros avançados**: Por cultura, prioridade, status, busca textual
- **Detalhes da fazenda**: Informações completas, análises históricas
- **Visualização no mapa**: Localização geográfica com marcadores NDVI
- **Ações rápidas**: Análise manual, visualização de detalhes

### 3. Visualização de Mapas
- **Mapa interativo**: Powered by Leaflet com camadas de satélite
- **Marcadores NDVI**: Cores baseadas na saúde da vegetação
- **Overlay NDVI**: Visualização de áreas com índice de vegetação
- **Popups informativos**: Dados da fazenda, NDVI, alertas
- **Controles customizados**: Seleção de camadas, zoom, filtros

### 4. Sistema de Alertas
- **Alertas em tempo real**: Notificações de problemas detectados
- **Níveis de severidade**: Info, baixo, médio, alto
- **Gerenciamento**: Visualizar, marcar como lido, resolver
- **Histórico**: Acompanhamento de alertas passados
- **Integração WhatsApp**: Envio automático de notificações

## 🔌 Integração com Backend

### Endpoints Principais

```typescript
// Fazendas
GET    /api/farms              // Listar fazendas
POST   /api/farms              // Criar fazenda
GET    /api/farms/:id          // Detalhes da fazenda
PUT    /api/farms/:id          // Atualizar fazenda
DELETE /api/farms/:id          // Remover fazenda

// Análise
POST   /api/farms/:id/analyze       // Analisar fazenda
GET    /api/farms/:id/analyses      // Histórico de análises
GET    /api/farms/:id/ndvi-image    // Imagem NDVI

// Alertas
GET    /api/farms/:id/alerts        // Alertas da fazenda
PUT    /api/alerts/:id/view         // Marcar como visto
PUT    /api/alerts/:id/resolve      // Resolver alerta

// Sistema
GET    /api/health                  // Status do sistema
GET    /api/dashboard/stats         // Estatísticas do dashboard
```

### Autenticação

O sistema usa JWT tokens para autenticação:

```typescript
// Configuração automática no axios
const token = localStorage.getItem('token')
if (token) {
  config.headers.Authorization = `Bearer ${token}`
}
```

## 🗺️ Mapas e Visualização NDVI

### Configuração do Leaflet

```typescript
// Camadas base disponíveis
const baseMaps = {
  "Mapa": OpenStreetMap,
  "Satélite": ArcGIS World Imagery
}

// Marcadores dinâmicos baseados em NDVI
const markerColor = analysis.ndvi_average < 0.3 
  ? '#ef4444'  // Vermelho - baixo NDVI
  : analysis.ndvi_average < 0.5 
  ? '#f59e0b'  // Amarelo - médio NDVI  
  : '#10b981'  // Verde - alto NDVI
```

### Legenda NDVI

- **Vermelho** (&lt; 0.3): Vegetação com estresse ou solo nu
- **Amarelo** (0.3 - 0.5): Vegetação moderada
- **Verde** (&gt; 0.5): Vegetação saudável e densa

## 📱 Responsividade

O frontend é totalmente responsivo:

- **Desktop**: Layout completo com sidebar fixa
- **Tablet**: Layout adaptado com navegação colapsível
- **Mobile**: Interface otimizada para touch

### Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Tablets */
md: 768px   /* Tablets landscape */
lg: 1024px  /* Desktop */
xl: 1280px  /* Desktop large */
```

## 🎨 Sistema de Design

### Cores Principais

```scss
// Primary (Verde agricultura)
primary-50:  #f0f9f3
primary-500: #2d9f5a  
primary-600: #1e7e47

// Secondary (Amarelo/Dourado)
secondary-500: #e59400
secondary-600: #c67100

// Alertas
alert-info:   #3b82f6  // Azul
alert-low:    #10b981  // Verde
alert-medium: #f59e0b  // Amarelo
alert-high:   #ef4444  // Vermelho
```

### Componentes Base

```typescript
// Botões
.btn-primary: Botão principal verde
.btn-secondary: Botão secundário cinza

// Campos de input
.input-field: Campo padrão com focus ring

// Alertas
.alert-badge-{severity}: Badges com cores por severidade
```

## 📈 Performance

### Otimizações Implementadas

1. **React Query**: Cache inteligente de dados da API
2. **Next.js Image**: Otimização automática de imagens
3. **Code Splitting**: Carregamento lazy de componentes
4. **Memoization**: Hooks otimizados para evitar re-renders
5. **Virtual Scrolling**: Para listas grandes de fazendas

### Métricas

- **First Load**: < 3s
- **Subsequent Navigation**: < 500ms
- **Map Rendering**: < 2s para 100 fazendas
- **NDVI Overlay**: < 1s para visualização

## 🔐 Segurança

### Medidas Implementadas

- **CSP Headers**: Content Security Policy configurado
- **XSS Protection**: Sanitização de inputs
- **CSRF Protection**: Tokens CSRF em formulários
- **Environment Variables**: Configurações sensíveis em .env
- **Input Validation**: Validação client-side com esquemas
- **Error Handling**: Tratamento seguro de erros da API

## 🧪 Testes

### Estratégia de Testes

```bash
# Rodar testes
npm test

# Testes com coverage
npm run test:coverage

# Testes E2E
npm run test:e2e
```

### Tipos de Teste

1. **Unit Tests**: Hooks, utilitários, componentes isolados
2. **Integration Tests**: Fluxos completos de usuário
3. **E2E Tests**: Testes end-to-end com Cypress
4. **Visual Tests**: Screenshots de componentes

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# Deploy automático
vercel

# Deploy com configurações específicas
vercel --prod
```

### Netlify

```bash
# Build e deploy
npm run build
npm run export
netlify deploy --prod --dir=out
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Scripts Disponíveis

```bash
npm run dev          # Servidor desenvolvimento
npm run build        # Build produção
npm start           # Servidor produção
npm run lint        # Linting ESLint
npm run type-check  # Verificação TypeScript
npm run export      # Export estático
```

## 🔧 Customização

### Adicionando Novas Páginas

1. Criar arquivo em `pages/nova-pagina.tsx`
2. Usar o componente `Layout` como wrapper
3. Adicionar link na navegação em `components/Layout.tsx`

### Novos Tipos de Alerta

1. Adicionar tipo em `types/index.ts`
2. Atualizar componente de badge em `AlertBadge.tsx`
3. Configurar cores em `tailwind.config.js`

### Integração com Novos Mapas

1. Adicionar provider em `MapView.tsx`
2. Configurar credenciais em `.env.local`
3. Atualizar controles de camadas

## 🐛 Troubleshooting

### Problemas Comuns

**Mapa não carrega**
```bash
# Verificar se Leaflet CSS está importado
# Verificar conexão com CDN do Leaflet
# Verificar se o componente está renderizando no client-side
```

**Erro de hidratação Next.js**
```bash
# Garantir que componentes de mapa só renderizam no client
# Usar useState para isClient
# Verificar compatibilidade SSR
```

**API não conecta**
```bash
# Verificar NEXT_PUBLIC_API_URL
# Verificar CORS no backend
# Verificar se backend está rodando
```

**Performance lenta**
```bash
# Verificar cache do React Query
# Otimizar queries pesadas
# Implementar paginação adequada
```

## 📊 Monitoramento

### Analytics

O sistema pode ser integrado com:
- **Google Analytics**: Para métricas de uso
- **Sentry**: Para monitoramento de erros
- **LogRocket**: Para sessões de usuário

### Performance Monitoring

```typescript
// Web Vitals
import { reportWebVitals } from 'next/web-vitals'

reportWebVitals((metric) => {
  console.log(metric)
})
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abra Pull Request

### Padrões de Código

- **ESLint**: Configuração Airbnb
- **Prettier**: Formatação automática
- **Conventional Commits**: Padrão de commit
- **TypeScript**: Tipagem estrita

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Email**: suporte@agroai.com
- **Documentação**: [docs.agroai.com](https://docs.agroia.com)
- **Issues**: [GitHub Issues](https://github.com/agroai/frontend/issues)
- **Discord**: [Comunidade AgroIA](https://discord.gg/agroai)

---

*Desenvolvido com 💚 pela equipe AgroIA*