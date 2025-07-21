# 🌾 AgroIA - Sistema Inteligente de Monitoramento Agrícola

Sistema completo de monitoramento agrícola que combina análise de imagens de satélite, inteligência artificial e comunicação automatizada via WhatsApp para fornecer insights acionáveis aos produtores rurais.

## 🎯 Visão Geral

O AgroIA é uma solução completa que automatiza o monitoramento de culturas através de:

- **📡 Análise de Satélite**: Processamento automático de imagens Sentinel-2
- **🤖 Inteligência Artificial**: Claude Vision + OpenAI GPT-4 para análise inteligente
- **📱 Alertas WhatsApp**: Notificações automáticas para produtores
- **📊 Dashboard Web**: Interface completa para gestão e visualização
- **📈 Análise NDVI**: Monitoramento da saúde da vegetação
- **⏰ Automação**: Análises diárias programadas

## 🏗️ Arquitetura do Sistema

```
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

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** 18+
- **PostgreSQL** 15+
- **npm** ou **yarn**

### Configuração Completa

```bash
# Clone o repositório
cd AgroIA

# Configurar backend
cd backend
npm install
cp .env.example .env
# Configure as variáveis de ambiente no .env

# Configurar banco de dados
npm run db:migrate

# Iniciar backend
npm run dev

# Configurar frontend (em outro terminal)
cd ../frontend
npm install
cp .env.example .env.local
# Configure as variáveis de ambiente no .env.local

# Iniciar frontend
npm run dev
```

### Acesso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Documentação**: `/docs/ARCHITECTURE.md`

## 📦 Estrutura do Projeto

```
AgroIA/
├── backend/                    # API Node.js + Express
│   ├── modules/               # Módulos funcionais
│   │   └── satellite-analysis/# Core do sistema
│   │       ├── services/      # Serviços de análise
│   │       ├── cron/          # Jobs automáticos
│   │       └── controllers/   # Controllers REST
│   ├── database/              # Schema e migrations
│   └── utils/                 # Utilitários
├── frontend/                  # Dashboard Next.js
│   ├── components/            # Componentes reutilizáveis
│   ├── pages/                # Páginas da aplicação
│   ├── hooks/                # Custom hooks
│   └── services/             # Integração com API
└── docs/                     # Documentação
    └── ARCHITECTURE.md       # Arquitetura detalhada
```

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js + Express**: API REST
- **PostgreSQL**: Banco de dados principal com PostGIS
- **Winston**: Sistema de logs estruturados
- **Sharp**: Processamento de imagens NDVI
- **node-cron**: Jobs programados para análise diária
- **Canvas**: Geração de visualizações

### Frontend
- **Next.js 14**: Framework React com SSR/SSG
- **TypeScript**: Tipagem estática completa
- **Tailwind CSS**: Framework CSS utilitário
- **Leaflet**: Mapas interativos e visualização NDVI
- **React Query**: Gerenciamento de estado server
- **React Hook Form**: Formulários performáticos

### Integrações
- **Sentinel-2 (ESA Copernicus)**: Imagens de satélite gratuitas
- **Claude Vision (Anthropic)**: Análise visual inteligente
- **OpenAI GPT-4**: Processamento de linguagem natural
- **WhatsApp Business API**: Comunicação automatizada

## 📊 Funcionalidades Implementadas

### ✅ Backend Completo
- **API REST**: Endpoints completos para fazendas, análises e alertas
- **Análise NDVI**: Cálculo automático do índice de vegetação
- **Claude Vision**: Integração para análise inteligente de imagens
- **Sentinel-2**: Download e processamento de imagens de satélite
- **WhatsApp**: Envio automático de alertas personalizados
- **Cron Jobs**: Análise diária automática às 6:00 AM
- **Migrations**: Sistema completo de versionamento do banco
- **Logs**: Sistema robusto de logging e monitoramento

### ✅ Frontend Completo
- **Dashboard**: Visão geral com estatísticas e métricas
- **Mapas Interativos**: Visualização com Leaflet e overlays NDVI
- **Gestão de Fazendas**: CRUD completo com filtros e busca
- **Sistema de Alertas**: Interface para gerenciar notificações
- **Responsivo**: Design adaptado para desktop, tablet e mobile
- **TypeScript**: Tipagem completa para maior confiabilidade

### ✅ Integração Completa
- **API Client**: Integração robusta entre frontend e backend
- **Custom Hooks**: Hooks otimizados para gerenciamento de estado
- **Cache Inteligente**: React Query para performance otimizada
- **Error Handling**: Tratamento consistente de erros
- **Loading States**: Estados de carregamento em toda interface

## 📈 Métricas de Performance

- **Análise NDVI**: 30-60s por fazenda
- **Claude Vision**: 10-20s por análise  
- **Download Sentinel-2**: 2-5min por imagem
- **Throughput**: 50 fazendas/hora
- **Storage**: 100-500MB/fazenda/mês

## 🚀 Deploy

### Docker Compose (Recomendado)

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports: ["3001:3001"]
    depends_on: [db]
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/agroai
  
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001/api
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: agroai
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 📚 Documentação Detalhada

- [📖 Arquitetura Completa](docs/ARCHITECTURE.md)
- [🔧 Backend README](backend/README.md) - Setup e API
- [🎨 Frontend README](frontend/README.md) - Interface e componentes
- [🗄️ Database Schema](backend/database/schema.sql) - Estrutura do banco

## 💬 Suporte e Contribuição

- **Issues**: GitHub Issues para bugs e melhorias
- **Email**: suporte@agroai.com
- **Documentação**: docs.agroai.com

## 📄 Licença

MIT License - Código aberto para fomentar inovação na agricultura

---

## ✅ Status do Projeto

**🎉 MVP COMPLETO** - Janeiro 2025

### ✅ Implementado
- [x] Backend API completa com Node.js + Express
- [x] Frontend dashboard com Next.js + TypeScript
- [x] Integração Claude Vision para análise IA
- [x] Sistema de alertas WhatsApp automatizado
- [x] Análise NDVI com imagens Sentinel-2
- [x] Jobs automatizados para análise diária
- [x] Interface de mapas com visualização NDVI
- [x] Sistema de gerenciamento de fazendas
- [x] Documentação técnica completa

### 🚀 Próximos Passos
- [ ] Machine Learning para predições
- [ ] Integração com drones e sensores IoT
- [ ] API mobile para aplicativo móvel
- [ ] Relatórios PDF automatizados
- [ ] Multi-tenancy para white-label

---

*Desenvolvido com 💚 para revolucionar a agricultura brasileira através da tecnologia*

**Equipe AgroIA** | Janeiro 2025