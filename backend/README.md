# AgroIA Backend

Backend do sistema AgroIA - Monitoramento Agrícola Inteligente com análise de satélite, IA e alertas via WhatsApp.

## 🚀 Tecnologias

- **Node.js** 18+ com Express
- **PostgreSQL** com extensões UUID e PostGIS (opcional)
- **APIs de IA**: Claude Vision, OpenAI GPT-4
- **Satélite**: Sentinel-2 via Copernicus Open Access Hub
- **Comunicação**: WhatsApp Business API
- **Análise**: NDVI, Machine Learning, Computer Vision

## 📦 Instalação Rápida

```bash
# Clone e configure
git clone <repo>
cd backend

# Instalar dependências e configurar banco
npm run setup

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# Iniciar servidor
npm run dev
```

## ⚙️ Configuração Detalhada

### 1. Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/agroai

# APIs de IA
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# Satélite Copernicus
COPERNICUS_USERNAME=your_username
COPERNICUS_PASSWORD=your_password

# Análise
NDVI_THRESHOLD_LOW=0.2
NDVI_THRESHOLD_NORMAL=0.4
NDVI_THRESHOLD_HIGH=0.7
```

### 2. Banco de Dados PostgreSQL

```bash
# Instalar PostgreSQL
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# Criar banco
sudo -u postgres createdb agroai

# Executar migrations
npm run db:migrate

# Verificar status
npm run db:migrate:status
```

### 3. APIs Externas

#### Claude Vision (Anthropic)
```bash
# Obter chave em: https://console.anthropic.com/
export ANTHROPIC_API_KEY="sk-ant-..."
```

#### OpenAI GPT-4
```bash
# Obter chave em: https://platform.openai.com/
export OPENAI_API_KEY="sk-..."
```

#### Copernicus (Sentinel-2)
```bash
# Registro gratuito: https://scihub.copernicus.eu/
export COPERNICUS_USERNAME="seu_usuario"
export COPERNICUS_PASSWORD="sua_senha"
```

#### WhatsApp Business API
```bash
# Configurar via Meta Business: https://business.facebook.com/
export WHATSAPP_ACCESS_TOKEN="your_token"
export WHATSAPP_PHONE_NUMBER_ID="phone_id"
```

## 🔧 Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev          # Servidor com reload automático
npm start           # Servidor produção
npm test            # Executar testes
```

### Banco de Dados
```bash
npm run db:migrate        # Executar migrations
npm run db:migrate:status # Status das migrations
npm run db:migrate:create add_table # Criar nova migration
```

### Análise de Satélite
```bash
npm run satellite:daily   # Executar análise diária manual
npm run satellite:analyze # Analisar fazenda específica
```

## 📊 Estrutura do Projeto

```
backend/
├── api/                    # Rotas da API
├── modules/                # Módulos funcionais
│   ├── satellite-analysis/ # Core do sistema
│   │   ├── controllers/    # Controllers REST
│   │   ├── services/       # Lógica de negócio
│   │   ├── models/         # Modelos de dados
│   │   ├── routes/         # Rotas específicas
│   │   └── cron/          # Jobs automáticos
│   └── farm-management/    # Gestão de fazendas
├── services/               # Serviços compartilhados
│   └── whatsapp.js        # Integração WhatsApp
├── utils/                  # Utilitários
│   └── logger.js          # Sistema de logs
├── database/               # Schema e migrations
├── scripts/                # Scripts utilitários
└── storage/               # Armazenamento local
```

## 🤖 Funcionalidades Principais

### 1. Análise NDVI Automática
- Download automático de imagens Sentinel-2
- Cálculo de NDVI (Normalized Difference Vegetation Index)
- Identificação de zonas de vegetação
- Detecção de problemas de irrigação/nutrição

### 2. IA com Claude Vision
- Análise visual inteligente de imagens de satélite
- Identificação de padrões agrícolas
- Detecção de pragas, doenças e estresse hídrico
- Relatórios executivos automáticos

### 3. Alertas Inteligentes via WhatsApp
- Notificações automáticas para fazendeiros
- Alertas baseados em severidade
- Recomendações práticas personalizadas
- Relatórios de status regulares

### 4. Cron Jobs Automatizados
- Análise diária às 6:00 AM
- Verificação de novas imagens
- Processamento em lote
- Relatórios administrativos

## 🔌 Endpoints da API

### Fazendas
```
GET    /api/farms              # Listar fazendas
POST   /api/farms              # Criar fazenda
GET    /api/farms/:id          # Detalhes da fazenda
PUT    /api/farms/:id          # Atualizar fazenda
DELETE /api/farms/:id          # Remover fazenda
```

### Análise de Satélite
```
POST   /api/farms/:id/analyze       # Analisar fazenda
GET    /api/farms/:id/analyses      # Histórico de análises
GET    /api/farms/:id/ndvi-image    # Imagem NDVI
POST   /api/farms/:id/compare       # Comparação temporal
```

### Alertas
```
GET    /api/farms/:id/alerts        # Alertas da fazenda
PUT    /api/alerts/:id/view         # Marcar como visto
PUT    /api/alerts/:id/resolve      # Resolver alerta
```

### Sistema
```
GET    /api/health                  # Status do sistema
GET    /api/system/status           # Status dos serviços
GET    /api/system/reports          # Relatórios do sistema
```

## 🚨 Monitoramento e Logs

### Logs do Sistema
```bash
# Logs em tempo real
tail -f logs/combined.log

# Apenas erros
tail -f logs/error.log

# Atividades das fazendas
tail -f logs/farm-activity.log
```

### Saúde do Sistema
```bash
# Verificar status via API
curl http://localhost:3001/health

# Status detalhado
curl http://localhost:3001/api/system/status
```

## 🔐 Segurança

- ✅ Validação de entrada com Joi
- ✅ Rate limiting configurável
- ✅ Logs de auditoria completos
- ✅ Conexões SSL/TLS para APIs
- ✅ Sanitização de dados
- ⚠️ Configurar JWT em produção
- ⚠️ Alterar senhas padrão

## 🌍 Deploy em Produção

### Docker (Recomendado)
```bash
# Build da imagem
docker build -t agroai-backend .

# Executar container
docker run -p 3001:3001 --env-file .env agroai-backend
```

### PM2 (Node.js)
```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start index.js --name agroai-backend

# Monitorar
pm2 logs agroai-backend
```

### Variáveis de Produção
```bash
NODE_ENV=production
LOG_LEVEL=info
DATABASE_SSL=true
ADMIN_WHATSAPP_CONTACTS=+5511999999999
ADMIN_REPORTS_ENABLED=true
```

## 🐛 Troubleshooting

### Problemas Comuns

**Erro de conexão PostgreSQL**
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
psql -h localhost -U postgres -d agroai
```

**Erro de API Sentinel-2**
```bash
# Verificar credenciais Copernicus
curl -u username:password https://apihub.copernicus.eu/apihub/
```

**Erro WhatsApp API**
```bash
# Verificar token
curl -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
     https://graph.facebook.com/v18.0/me
```

**Alto uso de CPU**
```bash
# Verificar análises em execução
curl http://localhost:3001/api/system/status

# Logs de performance
tail -f logs/combined.log | grep "processing_time"
```

## 📈 Métricas e Performance

- **Análise NDVI**: ~30-60 segundos por fazenda
- **Claude Vision**: ~10-20 segundos por imagem
- **Download Sentinel-2**: ~2-5 minutos por imagem
- **Throughput**: ~50 fazendas por hora
- **Armazenamento**: ~100-500MB por fazenda/mês

## 🤝 Contribuição

1. Fork o projeto
2. Crie feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abra Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Email**: suporte@agroai.com
- **Documentação**: [docs.agroai.com](https://docs.agroai.com)
- **Issues**: [GitHub Issues](https://github.com/agroai/backend/issues)