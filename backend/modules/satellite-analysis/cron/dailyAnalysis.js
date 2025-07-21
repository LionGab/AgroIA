const cron = require('node-cron');
const { logger, farmLogger } = require('../../../utils/logger');
const NDVIAnalysisService = require('../services/ndviAnalysisService');
const ClaudeVisionService = require('../services/claudeVisionService');
const Sentinel2Service = require('../services/sentinel2Service');
const FarmAlertService = require('../services/farmAlertService');

/**
 * Cron Job para Análise Diária Automática
 * Executa análise de satélite para todas as fazendas cadastradas
 */
class DailyAnalysisJob {
  constructor(db, whatsappService) {
    this.db = db;
    this.whatsappService = whatsappService;
    this.ndviService = new NDVIAnalysisService();
    this.claudeService = new ClaudeVisionService();
    this.sentinel2Service = new Sentinel2Service();
    this.alertService = new FarmAlertService(whatsappService, db);
    
    this.isRunning = false;
    this.lastExecution = null;
    this.statistics = {
      totalFarms: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      alertsGenerated: 0
    };
  }

  /**
   * Executa análise diária para todas as fazendas
   */
  async runDailySatelliteAnalysis() {
    if (this.isRunning) {
      logger.warn('Análise diária já está em execução, pulando...');
      return;
    }

    try {
      this.isRunning = true;
      this.lastExecution = new Date();
      
      logger.info('🚀 Iniciando análise diária automática de satélite');
      
      // Reset das estatísticas
      this.statistics = {
        totalFarms: 0,
        successfulAnalyses: 0,
        failedAnalyses: 0,
        alertsGenerated: 0
      };

      // Buscar todas as fazendas ativas
      const farms = await this._getActiveFarms();
      this.statistics.totalFarms = farms.length;
      
      logger.info(`📋 ${farms.length} fazendas encontradas para análise`);

      if (farms.length === 0) {
        logger.info('Nenhuma fazenda ativa encontrada');
        return;
      }

      // Processar fazendas em lotes para não sobrecarregar APIs
      const batchSize = 5;
      for (let i = 0; i < farms.length; i += batchSize) {
        const batch = farms.slice(i, i + batchSize);
        
        logger.info(`📊 Processando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(farms.length/batchSize)}`);
        
        await Promise.allSettled(
          batch.map(farm => this._analyzeFarmDaily(farm))
        );

        // Pausa entre lotes para evitar rate limits
        if (i + batchSize < farms.length) {
          await this._sleep(30000); // 30 segundos entre lotes
        }
      }

      // Gerar relatório final
      await this._generateDailyReport();

      logger.info('✅ Análise diária concluída com sucesso', {
        ...this.statistics,
        duration: Date.now() - this.lastExecution.getTime()
      });

    } catch (error) {
      logger.error('❌ Erro na execução da análise diária:', error);
      
      // Enviar notificação de erro para administradores
      await this._notifyAdminsError(error);
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Analisa uma fazenda individual
   * @private
   */
  async _analyzeFarmDaily(farm) {
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 Analisando fazenda: ${farm.name} (${farm.crop_type})`, {
        farmId: farm.id
      });

      // Verificar se análise recente já existe (últimas 24h)
      const recentAnalysis = await this._hasRecentAnalysis(farm.id, 24);
      
      if (recentAnalysis && !this._shouldForceAnalysis(farm)) {
        logger.info(`⏭️  Análise recente encontrada para ${farm.name}, pulando...`);
        return;
      }

      // Buscar imagem de satélite mais recente
      const latestImage = await this.sentinel2Service.getLatestImage(
        farm.coordinates,
        7 // Últimos 7 dias
      );

      if (!latestImage) {
        logger.warn(`📡 Nenhuma imagem recente disponível para ${farm.name}`);
        return;
      }

      // Download da imagem
      const imageFile = await this.sentinel2Service.downloadImage(latestImage, farm.id);
      
      // Análise NDVI (mock para demonstração)
      const ndviAnalysis = this._generateMockNDVIAnalysis(farm);
      
      // Análise Claude Vision
      const imageBuffer = await this._prepareImageForAnalysis(imageFile.localPath);
      const claudeAnalysis = await this.claudeService.analyzeSatelliteImage(
        imageBuffer,
        farm,
        ndviAnalysis
      );

      // Processar alertas
      const alerts = await this.alertService.processAnalysisAlerts(
        farm,
        ndviAnalysis,
        claudeAnalysis
      );

      // Salvar análise
      await this._saveAnalysisResult(farm.id, {
        ndviAnalysis,
        claudeAnalysis,
        imageInfo: latestImage,
        alertsCount: alerts.length
      });

      this.statistics.successfulAnalyses++;
      this.statistics.alertsGenerated += alerts.length;

      const duration = Date.now() - startTime;
      
      farmLogger.farmActivity(farm.id, 'daily_analysis_completed', {
        duration,
        alertsGenerated: alerts.length,
        ndviAverage: ndviAnalysis.statistics?.average
      });

      logger.info(`✅ Análise concluída: ${farm.name}`, {
        farmId: farm.id,
        duration,
        alerts: alerts.length
      });

    } catch (error) {
      this.statistics.failedAnalyses++;
      
      logger.error(`❌ Erro na análise da fazenda ${farm.name}:`, {
        farmId: farm.id,
        error: error.message
      });

      // Salvar erro no banco para debug
      await this._saveAnalysisError(farm.id, error);
    }
  }

  /**
   * Busca fazendas ativas no banco
   * @private
   */
  async _getActiveFarms() {
    try {
      const query = `
        SELECT 
          id, name, crop_type, coordinates, total_area,
          owner_phone, technical_contacts, created_at,
          last_analysis_at
        FROM farms 
        WHERE active = true
        ORDER BY last_analysis_at ASC NULLS FIRST
      `;

      const result = await this.db.query(query);
      return result.rows.map(farm => ({
        ...farm,
        coordinates: typeof farm.coordinates === 'string' 
          ? JSON.parse(farm.coordinates) 
          : farm.coordinates
      }));

    } catch (error) {
      logger.error('Erro ao buscar fazendas ativas:', error);
      return [];
    }
  }

  /**
   * Verifica se fazenda tem análise recente
   * @private
   */
  async _hasRecentAnalysis(farmId, hours) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM satellite_analyses 
        WHERE farm_id = $1 
        AND created_at > NOW() - INTERVAL '${hours} hours'
      `;

      const result = await this.db.query(query, [farmId]);
      return parseInt(result.rows[0].count) > 0;

    } catch (error) {
      logger.error('Erro ao verificar análises recentes:', error);
      return false;
    }
  }

  /**
   * Determina se deve forçar nova análise
   * @private
   */
  _shouldForceAnalysis(farm) {
    // Forçar análise se:
    // - Fazenda crítica (alto valor)
    // - Período de safra importante
    // - Alertas anteriores de alto risco
    
    return farm.priority === 'high' || 
           farm.crop_stage === 'critical' ||
           farm.last_risk_level === 'high';
  }

  /**
   * Gera análise NDVI mock baseada na fazenda
   * @private
   */
  _generateMockNDVIAnalysis(farm) {
    // Simular variações baseadas no tipo de cultura e época
    const baseNDVI = this._getBaseNDVIForCrop(farm.crop_type);
    const seasonalVariation = this._getSeasonalVariation();
    const randomVariation = (Math.random() - 0.5) * 0.1;
    
    const average = Math.max(0, Math.min(1, baseNDVI + seasonalVariation + randomVariation));

    return {
      timestamp: new Date(),
      statistics: {
        average: parseFloat(average.toFixed(3)),
        min: Math.max(0, average - 0.3),
        max: Math.min(1, average + 0.2),
        std: 0.1 + Math.random() * 0.1
      },
      zones: this._generateMockZones(average),
      alerts: this._generateNDVIAlerts(average)
    };
  }

  /**
   * Obtém NDVI base por tipo de cultura
   * @private
   */
  _getBaseNDVIForCrop(cropType) {
    const baseValues = {
      'soja': 0.7,
      'milho': 0.65,
      'algodao': 0.6,
      'cana': 0.75,
      'cafe': 0.8,
      'citrus': 0.75,
      'pastagem': 0.5
    };

    return baseValues[cropType?.toLowerCase()] || 0.6;
  }

  /**
   * Calcula variação sazonal
   * @private
   */
  _getSeasonalVariation() {
    const month = new Date().getMonth();
    
    // Hemisfério Sul - variações sazonais
    if (month >= 3 && month <= 8) { // Outono/Inverno
      return -0.1;
    } else { // Primavera/Verão
      return 0.1;
    }
  }

  /**
   * Gera zonas mock baseadas no NDVI médio
   * @private
   */
  _generateMockZones(averageNDVI) {
    return {
      water: { count: 50, percentage: 1 },
      bare_soil: { count: averageNDVI < 0.3 ? 800 : 200, percentage: averageNDVI < 0.3 ? 16 : 4 },
      sparse_vegetation: { count: 500, percentage: 10 },
      moderate_vegetation: { count: 1500, percentage: 30 },
      dense_vegetation: { count: Math.round(2950 * averageNDVI), percentage: Math.round(59 * averageNDVI) }
    };
  }

  /**
   * Gera alertas baseados no NDVI
   * @private
   */
  _generateNDVIAlerts(averageNDVI) {
    const alerts = [];

    if (averageNDVI < 0.3) {
      alerts.push({
        type: 'LOW_VEGETATION_INDEX',
        severity: 'high',
        message: `NDVI crítico (${averageNDVI}). Possível problema severo na cultura.`,
        recommendation: 'Inspeção de campo urgente necessária.'
      });
    } else if (averageNDVI < 0.5) {
      alerts.push({
        type: 'MODERATE_STRESS',
        severity: 'medium',
        message: `NDVI abaixo do esperado (${averageNDVI}). Monitoramento recomendado.`,
        recommendation: 'Verificar irrigação e nutrição das plantas.'
      });
    } else if (averageNDVI > 0.7) {
      alerts.push({
        type: 'HEALTHY_VEGETATION',
        severity: 'info',
        message: `Excelente condição da cultura (NDVI: ${averageNDVI}).`,
        recommendation: 'Manter práticas atuais de manejo.'
      });
    }

    return alerts;
  }

  /**
   * Prepara imagem para análise (mock)
   * @private
   */
  async _prepareImageForAnalysis(imagePath) {
    // Em implementação real, extrair preview RGB da imagem Sentinel-2
    // Por ora, gerar buffer mock
    return Buffer.from('mock-satellite-image-data');
  }

  /**
   * Salva resultado da análise
   * @private
   */
  async _saveAnalysisResult(farmId, analysisData) {
    try {
      const query = `
        INSERT INTO satellite_analyses (
          farm_id, ndvi_average, claude_confidence, alerts_count,
          analysis_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      const values = [
        farmId,
        analysisData.ndviAnalysis?.statistics?.average || 0,
        analysisData.claudeAnalysis?.analysis?.confidence || 75,
        analysisData.alertsCount || 0,
        JSON.stringify(analysisData),
        new Date()
      ];

      await this.db.query(query, values);

      // Atualizar timestamp da última análise na fazenda
      await this.db.query(
        'UPDATE farms SET last_analysis_at = NOW() WHERE id = $1',
        [farmId]
      );

    } catch (error) {
      logger.error('Erro ao salvar análise:', error);
    }
  }

  /**
   * Salva erro de análise
   * @private
   */
  async _saveAnalysisError(farmId, error) {
    try {
      const query = `
        INSERT INTO analysis_errors (farm_id, error_message, stack_trace, created_at)
        VALUES ($1, $2, $3, $4)
      `;

      await this.db.query(query, [
        farmId,
        error.message,
        error.stack,
        new Date()
      ]);

    } catch (dbError) {
      logger.error('Erro ao salvar erro de análise:', dbError);
    }
  }

  /**
   * Gera relatório diário
   * @private
   */
  async _generateDailyReport() {
    try {
      const report = {
        date: new Date().toISOString().split('T')[0],
        ...this.statistics,
        duration: Date.now() - this.lastExecution.getTime(),
        successRate: this.statistics.totalFarms > 0 
          ? (this.statistics.successfulAnalyses / this.statistics.totalFarms * 100).toFixed(2)
          : 0
      };

      // Salvar relatório no banco
      await this.db.query(
        'INSERT INTO daily_reports (date, report_data, created_at) VALUES ($1, $2, $3)',
        [report.date, JSON.stringify(report), new Date()]
      );

      // Log do relatório
      logger.info('📊 Relatório diário gerado', report);

      // Enviar relatório para administradores se configurado
      if (process.env.ADMIN_REPORTS_ENABLED === 'true') {
        await this._sendAdminReport(report);
      }

    } catch (error) {
      logger.error('Erro ao gerar relatório diário:', error);
    }
  }

  /**
   * Envia relatório para administradores
   * @private
   */
  async _sendAdminReport(report) {
    try {
      const adminContacts = process.env.ADMIN_WHATSAPP_CONTACTS?.split(',') || [];
      
      if (adminContacts.length === 0) return;

      const message = `📊 *Relatório Diário AgroIA*\n\n` +
        `📅 Data: ${report.date}\n` +
        `🏭 Fazendas analisadas: ${report.successfulAnalyses}/${report.totalFarms}\n` +
        `📈 Taxa de sucesso: ${report.successRate}%\n` +
        `🚨 Alertas gerados: ${report.alertsGenerated}\n` +
        `⏱️ Duração: ${Math.round(report.duration/1000/60)} min\n\n` +
        `✅ Sistema funcionando normalmente`;

      for (const contact of adminContacts) {
        await this.whatsappService.sendMessage(contact.trim(), message);
      }

    } catch (error) {
      logger.error('Erro ao enviar relatório admin:', error);
    }
  }

  /**
   * Notifica administradores sobre erros
   * @private
   */
  async _notifyAdminsError(error) {
    try {
      const adminContacts = process.env.ADMIN_WHATSAPP_CONTACTS?.split(',') || [];
      
      if (adminContacts.length === 0) return;

      const message = `🚨 *Erro na Análise Diária AgroIA*\n\n` +
        `⚠️ A análise automática apresentou falhas\n` +
        `🕐 Timestamp: ${new Date().toLocaleString('pt-BR')}\n` +
        `❌ Erro: ${error.message}\n\n` +
        `🔧 Verificar logs do sistema para mais detalhes`;

      for (const contact of adminContacts) {
        await this.whatsappService.sendMessage(contact.trim(), message);
      }

    } catch (notifyError) {
      logger.error('Erro ao notificar admins:', notifyError);
    }
  }

  /**
   * Utilitário para sleep
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retorna status atual do job
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastExecution: this.lastExecution,
      statistics: this.statistics
    };
  }
}

// Instância global do job
let dailyAnalysisJob = null;

/**
 * Inicializa o cron job diário
 * @param {Object} db - Pool de conexão PostgreSQL
 * @param {Object} whatsappService - Serviço WhatsApp
 */
function initializeDailyAnalysis(db, whatsappService) {
  dailyAnalysisJob = new DailyAnalysisJob(db, whatsappService);
  
  // Configurar cron para executar todos os dias às 6:00
  const cronSchedule = process.env.ANALYSIS_CRON_SCHEDULE || '0 6 * * *';
  
  cron.schedule(cronSchedule, async () => {
    logger.info('⏰ Cron job ativado - iniciando análise diária');
    await dailyAnalysisJob.runDailySatelliteAnalysis();
  }, {
    timezone: "America/Sao_Paulo"
  });

  logger.info(`⚙️  Cron job configurado: ${cronSchedule} (America/Sao_Paulo)`);
}

/**
 * Executa análise manual (chamada via API ou comando)
 */
async function runDailySatelliteAnalysis() {
  if (!dailyAnalysisJob) {
    throw new Error('Cron job não inicializado');
  }
  
  return await dailyAnalysisJob.runDailySatelliteAnalysis();
}

/**
 * Obtém status do cron job
 */
function getAnalysisStatus() {
  return dailyAnalysisJob ? dailyAnalysisJob.getStatus() : null;
}

module.exports = {
  initializeDailyAnalysis,
  runDailySatelliteAnalysis,
  getAnalysisStatus,
  DailyAnalysisJob
};