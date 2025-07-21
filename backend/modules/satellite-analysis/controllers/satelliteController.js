const { logger, farmLogger } = require('../../../utils/logger');
const NDVIAnalysisService = require('../services/ndviAnalysisService');
const ClaudeVisionService = require('../services/claudeVisionService');
const Sentinel2Service = require('../services/sentinel2Service');
const FarmAlertService = require('../services/farmAlertService');

/**
 * Controller para Análise de Satélite
 * Orquestra todos os serviços de análise agrícola
 */
class SatelliteController {
  constructor() {
    this.ndviService = new NDVIAnalysisService();
    this.claudeService = new ClaudeVisionService();
    this.sentinel2Service = new Sentinel2Service();
    // FarmAlertService será inicializado quando necessário com dependências
  }

  /**
   * Executa análise completa para uma fazenda
   * POST /api/farms/:farmId/analyze
   */
  async analyzeFarm(req, res) {
    try {
      const { farmId } = req.params;
      const { forceDownload = false } = req.query;

      logger.info('Iniciando análise completa da fazenda', { farmId });

      // Buscar informações da fazenda
      const farmInfo = await this._getFarmInfo(req.app.locals.db, farmId);
      if (!farmInfo) {
        return res.status(404).json({ error: 'Fazenda não encontrada' });
      }

      // Buscar imagem de satélite mais recente
      const latestImage = await this.sentinel2Service.getLatestImage(
        farmInfo.coordinates, 
        30 // 30 dias atrás
      );

      if (!latestImage) {
        return res.status(404).json({ 
          error: 'Nenhuma imagem de satélite disponível para a fazenda',
          farmId 
        });
      }

      // Download da imagem se necessário
      const imageFile = await this.sentinel2Service.downloadImage(latestImage, farmId);

      // Extrair bandas NIR e Red para análise NDVI
      const bands = await this.sentinel2Service.extractBands(imageFile.localPath, ['B08', 'B04']);

      // Executar análise NDVI
      let ndviAnalysis = null;
      if (bands.B08.extracted && bands.B04.extracted) {
        // Em implementação real, carregar as bandas extraídas
        // ndviAnalysis = await this.ndviService.calculateNDVI(nirBuffer, redBuffer);
        ndviAnalysis = this._getMockNDVIAnalysis(); // Mock para demonstração
      }

      // Executar análise Claude Vision
      const satelliteImageBuffer = await this._loadImageForVision(imageFile.localPath);
      const claudeAnalysis = await this.claudeService.analyzeSatelliteImage(
        satelliteImageBuffer,
        farmInfo,
        ndviAnalysis
      );

      // Processar alertas
      const alertService = new FarmAlertService(null, req.app.locals.db); // WhatsApp service seria injetado
      const alerts = await alertService.processAnalysisAlerts(
        farmInfo,
        ndviAnalysis,
        claudeAnalysis
      );

      // Salvar análise no banco
      const analysisRecord = await this._saveAnalysisResult(
        req.app.locals.db,
        farmId,
        {
          ndviAnalysis,
          claudeAnalysis,
          imageInfo: latestImage,
          alerts: alerts.length
        }
      );

      farmLogger.satelliteAnalysis(farmId, {
        success: true,
        analysisId: analysisRecord.id,
        alertsGenerated: alerts.length
      });

      res.json({
        success: true,
        analysisId: analysisRecord.id,
        farm: {
          id: farmInfo.id,
          name: farmInfo.name,
          cropType: farmInfo.cropType
        },
        image: {
          id: latestImage.id,
          sensingDate: latestImage.sensingDate,
          cloudCoverage: latestImage.cloudCoverage
        },
        results: {
          ndvi: ndviAnalysis,
          aiAnalysis: claudeAnalysis.analysis,
          alerts: alerts
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Erro na análise da fazenda:', error);
      res.status(500).json({
        error: 'Falha na análise da fazenda',
        message: error.message
      });
    }
  }

  /**
   * Obtém histórico de análises de uma fazenda
   * GET /api/farms/:farmId/analyses
   */
  async getAnalysisHistory(req, res) {
    try {
      const { farmId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      const query = `
        SELECT 
          id, created_at, ndvi_average, claude_confidence, 
          alerts_count, image_date, analysis_summary
        FROM satellite_analyses 
        WHERE farm_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;

      const result = await req.app.locals.db.query(query, [farmId, limit, offset]);

      res.json({
        success: true,
        farmId,
        analyses: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rowCount
        }
      });

    } catch (error) {
      logger.error('Erro ao buscar histórico de análises:', error);
      res.status(500).json({
        error: 'Falha ao buscar histórico',
        message: error.message
      });
    }
  }

  /**
   * Gera imagem NDVI para visualização
   * GET /api/farms/:farmId/ndvi-image/:analysisId
   */
  async generateNDVIImage(req, res) {
    try {
      const { farmId, analysisId } = req.params;

      // Buscar dados da análise
      const analysis = await this._getAnalysisById(req.app.locals.db, analysisId);
      
      if (!analysis || analysis.farm_id !== farmId) {
        return res.status(404).json({ error: 'Análise não encontrada' });
      }

      // Gerar imagem NDVI
      const ndviImageBuffer = await this.ndviService.generateNDVIImage(
        analysis.ndvi_data,
        analysis.image_width,
        analysis.image_height
      );

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': ndviImageBuffer.length,
        'Cache-Control': 'public, max-age=3600'
      });

      res.send(ndviImageBuffer);

    } catch (error) {
      logger.error('Erro ao gerar imagem NDVI:', error);
      res.status(500).json({
        error: 'Falha ao gerar imagem NDVI',
        message: error.message
      });
    }
  }

  /**
   * Compara análises temporais
   * POST /api/farms/:farmId/compare
   */
  async compareTemporalAnalysis(req, res) {
    try {
      const { farmId } = req.params;
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Datas de início e fim são obrigatórias'
        });
      }

      // Buscar análises no período
      const query = `
        SELECT * FROM satellite_analyses 
        WHERE farm_id = $1 
        AND created_at BETWEEN $2 AND $3
        ORDER BY created_at ASC
      `;

      const result = await req.app.locals.db.query(query, [
        farmId, 
        new Date(startDate), 
        new Date(endDate)
      ]);

      if (result.rows.length < 2) {
        return res.status(400).json({
          error: 'Pelo menos 2 análises são necessárias para comparação'
        });
      }

      const analyses = result.rows;
      const comparison = this._generateTemporalComparison(analyses);

      res.json({
        success: true,
        farmId,
        period: { startDate, endDate },
        comparison,
        analysesCount: analyses.length
      });

    } catch (error) {
      logger.error('Erro na comparação temporal:', error);
      res.status(500).json({
        error: 'Falha na comparação temporal',
        message: error.message
      });
    }
  }

  /**
   * Análise manual de imagem enviada pelo usuário
   * POST /api/farms/:farmId/analyze-upload
   */
  async analyzeUploadedImage(req, res) {
    try {
      const { farmId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'Imagem não fornecida' });
      }

      const farmInfo = await this._getFarmInfo(req.app.locals.db, farmId);
      if (!farmInfo) {
        return res.status(404).json({ error: 'Fazenda não encontrada' });
      }

      // Analisar imagem enviada com Claude Vision
      const claudeAnalysis = await this.claudeService.analyzeSatelliteImage(
        req.file.buffer,
        farmInfo,
        null // Sem dados NDVI para imagem manual
      );

      // Gerar relatório executivo
      const executiveReport = this.claudeService.generateExecutiveReport(
        claudeAnalysis.analysis,
        farmInfo
      );

      res.json({
        success: true,
        farmId,
        uploadedFile: {
          filename: req.file.originalname,
          size: req.file.size
        },
        analysis: claudeAnalysis.analysis,
        report: executiveReport,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Erro na análise de imagem enviada:', error);
      res.status(500).json({
        error: 'Falha na análise da imagem',
        message: error.message
      });
    }
  }

  // Métodos auxiliares privados

  /**
   * Busca informações da fazenda no banco
   * @private
   */
  async _getFarmInfo(db, farmId) {
    const query = 'SELECT * FROM farms WHERE id = $1';
    const result = await db.query(query, [farmId]);
    return result.rows[0] || null;
  }

  /**
   * Carrega imagem para análise Claude Vision
   * @private
   */
  async _loadImageForVision(imagePath) {
    // Em implementação real, extrair preview da imagem Sentinel-2
    // Por ora, retorna buffer mock
    return Buffer.from('mock-image-data');
  }

  /**
   * Análise NDVI mock para demonstração
   * @private
   */
  _getMockNDVIAnalysis() {
    return {
      timestamp: new Date(),
      statistics: {
        average: 0.65,
        min: 0.1,
        max: 0.9,
        std: 0.15
      },
      zones: {
        water: { count: 100, percentage: 2 },
        bare_soil: { count: 500, percentage: 10 },
        sparse_vegetation: { count: 1000, percentage: 20 },
        moderate_vegetation: { count: 2000, percentage: 40 },
        dense_vegetation: { count: 1400, percentage: 28 }
      },
      alerts: [
        {
          type: 'HEALTHY_VEGETATION',
          severity: 'info',
          message: 'NDVI médio excelente (0.65). Cultura em boa condição.',
          recommendation: 'Manter práticas atuais de manejo.'
        }
      ]
    };
  }

  /**
   * Salva resultado da análise no banco
   * @private
   */
  async _saveAnalysisResult(db, farmId, analysisData) {
    const query = `
      INSERT INTO satellite_analyses (
        farm_id, ndvi_average, claude_confidence, alerts_count,
        analysis_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [
      farmId,
      analysisData.ndviAnalysis?.statistics?.average || 0,
      analysisData.claudeAnalysis?.analysis?.confidence || 0,
      analysisData.alerts || 0,
      JSON.stringify(analysisData),
      new Date()
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Busca análise por ID
   * @private
   */
  async _getAnalysisById(db, analysisId) {
    const query = 'SELECT * FROM satellite_analyses WHERE id = $1';
    const result = await db.query(query, [analysisId]);
    return result.rows[0] || null;
  }

  /**
   * Gera comparação temporal
   * @private
   */
  _generateTemporalComparison(analyses) {
    const first = analyses[0];
    const last = analyses[analyses.length - 1];

    return {
      ndvi: {
        initial: first.ndvi_average,
        final: last.ndvi_average,
        change: ((last.ndvi_average - first.ndvi_average) / first.ndvi_average * 100).toFixed(2),
        trend: last.ndvi_average > first.ndvi_average ? 'improving' : 'declining'
      },
      confidence: {
        average: analyses.reduce((sum, a) => sum + a.claude_confidence, 0) / analyses.length
      },
      alerts: {
        total: analyses.reduce((sum, a) => sum + a.alerts_count, 0),
        average: analyses.reduce((sum, a) => sum + a.alerts_count, 0) / analyses.length
      }
    };
  }
}

module.exports = SatelliteController;