require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const cron = require('node-cron');
const { logger } = require('./utils/logger');
const apiRoutes = require('./api/routes');
const { connectWhatsApp } = require('./services/whatsapp');
const { processFarmMessage } = require('./modules/farm-management/controllers/controller');
const { runDailySatelliteAnalysis } = require('./modules/satellite-analysis/cron/dailyAnalysis');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3001;

// Pool de conexões PostgreSQL
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/agroai',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Disponibilizar pool de DB globalmente
app.locals.db = db;

// Rotas da API
app.use('/api', apiRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bem-vindo à API do AgroIA - Sistema de Monitoramento Agrícola',
    version: '1.0.0',
    services: ['WhatsApp', 'Análise de Satélite', 'Claude Vision', 'NDVI']
  });
});

// Rota de health check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      services: {
        whatsapp: 'active',
        satellite: 'monitoring',
        ai: 'ready'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// Tratamento de erros
app.use((err, req, res, next) => {
  logger.error('Erro na aplicação:', err);
  res.status(500).json({ error: 'Erro interno do servidor', message: err.message });
});

// Configurar Cron Jobs para análise automática
cron.schedule('0 6 * * *', () => {
  logger.info('Iniciando análise diária de satélite...');
  runDailySatelliteAnalysis().catch(error => {
    logger.error('Erro na análise diária:', error);
  });
}, {
  timezone: "America/Sao_Paulo"
});

// Conectar ao PostgreSQL e iniciar servidor
async function startServer() {
  try {
    // Testar conexão com banco
    // await db.query('SELECT NOW()');
    // logger.info('Conectado ao PostgreSQL com sucesso');
    
    // Iniciar o servidor
    app.listen(PORT, () => {
      logger.info(`Servidor AgroIA rodando na porta ${PORT}`);
      
      // Iniciar conexão com WhatsApp
      try {
        connectWhatsApp(processFarmMessage)
          .then(client => {
            logger.info('WhatsApp conectado - Pronto para receber mensagens de fazendeiros');
          })
          .catch(error => {
            logger.error('Falha ao conectar WhatsApp:', error);
          });
      } catch (error) {
        logger.error('Erro ao iniciar WhatsApp:', error);
      }
    });
    
  } catch (error) {
    logger.error('Erro ao conectar ao PostgreSQL:', error);
    process.exit(1);
  }
}

// Tratamento de encerramento gracioso
process.on('SIGINT', () => {
  logger.info('Encerrando AgroIA...');
  db.end(() => {
    logger.info('Conexão com PostgreSQL fechada');
    process.exit(0);
  });
});

// Iniciar aplicação
startServer();

module.exports = app;