const winston = require('winston');

/**
 * Configura o logger para AgroIA
 * @returns {winston.Logger} Instância configurada do logger
 */
const setupLogger = () => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { 
      service: 'agroai',
      version: '1.0.0'
    },
    transports: [
      // Logs de erro - críticos para monitoramento agrícola
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      // Logs combinados - inclui análises de satélite e alertas
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 10
      }),
      // Log específico para atividades de fazenda
      new winston.transports.File({
        filename: 'logs/farm-activity.log',
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(info => {
            if (info.farmId || info.satelliteAnalysis || info.whatsappAlert) {
              return `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`;
            }
            return null;
          })
        ),
        filter: info => !!(info.farmId || info.satelliteAnalysis || info.whatsappAlert)
      })
    ],
  });

  // Console logging para desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(info => 
          `${info.timestamp} [${info.level}] ${info.message}`
        )
      ),
    }));
  }

  return logger;
};

// Funções específicas para logging agrícola
const farmLogger = {
  satelliteAnalysis: (farmId, analysisResult) => {
    logger.info('Análise de satélite concluída', { 
      farmId, 
      satelliteAnalysis: true,
      ndvi: analysisResult.ndvi,
      alerts: analysisResult.alerts?.length || 0
    });
  },
  
  whatsappAlert: (farmId, alertType, recipient) => {
    logger.info('Alerta WhatsApp enviado', {
      farmId,
      whatsappAlert: true,
      alertType,
      recipient
    });
  },
  
  farmActivity: (farmId, activity, details = {}) => {
    logger.info(`Atividade da fazenda: ${activity}`, {
      farmId,
      activity,
      ...details
    });
  }
};

const logger = setupLogger();

module.exports = {
  setupLogger,
  logger,
  farmLogger
};