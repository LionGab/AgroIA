const sharp = require('sharp');
const { logger, farmLogger } = require('../../../utils/logger');

/**
 * Serviço de Análise NDVI para Monitoramento Agrícola
 * Calcula Índice de Vegetação por Diferença Normalizada
 */
class NDVIAnalysisService {
  constructor() {
    this.thresholds = {
      low: parseFloat(process.env.NDVI_THRESHOLD_LOW) || 0.2,
      normal: parseFloat(process.env.NDVI_THRESHOLD_NORMAL) || 0.4,
      high: parseFloat(process.env.NDVI_THRESHOLD_HIGH) || 0.7
    };
  }

  /**
   * Calcula NDVI a partir de bandas NIR e Red
   * NDVI = (NIR - Red) / (NIR + Red)
   * @param {Buffer} nirBand - Banda Near Infrared
   * @param {Buffer} redBand - Banda Red
   * @returns {Promise<Object>} Resultado da análise NDVI
   */
  async calculateNDVI(nirBand, redBand) {
    try {
      logger.info('Iniciando cálculo NDVI...');

      // Processar imagens com Sharp
      const nirImage = sharp(nirBand);
      const redImage = sharp(redBand);

      const nirMeta = await nirImage.metadata();
      const redMeta = await redImage.metadata();

      // Verificar compatibilidade das imagens
      if (nirMeta.width !== redMeta.width || nirMeta.height !== redMeta.height) {
        throw new Error('Dimensões das bandas NIR e Red não coincidem');
      }

      // Extrair dados raw das bandas
      const nirData = await nirImage.raw().toBuffer();
      const redData = await redImage.raw().toBuffer();

      // Calcular NDVI pixel por pixel
      const ndviData = this._computeNDVIPixels(nirData, redData);
      
      // Gerar estatísticas
      const statistics = this._calculateStatistics(ndviData);
      
      // Identificar áreas de interesse
      const zones = this._identifyVegetationZones(ndviData, nirMeta.width, nirMeta.height);
      
      // Gerar alertas baseados nos valores
      const alerts = this._generateAlerts(statistics, zones);

      logger.info('Cálculo NDVI concluído', {
        averageNDVI: statistics.average,
        zonesCount: zones.length,
        alertsCount: alerts.length
      });

      return {
        timestamp: new Date(),
        dimensions: {
          width: nirMeta.width,
          height: nirMeta.height
        },
        statistics,
        zones,
        alerts,
        ndviData: this._normalizeNDVIData(ndviData)
      };

    } catch (error) {
      logger.error('Erro no cálculo NDVI:', error);
      throw error;
    }
  }

  /**
   * Computa NDVI para cada pixel
   * @private
   */
  _computeNDVIPixels(nirData, redData) {
    const ndviData = [];
    
    for (let i = 0; i < nirData.length; i += 1) {
      const nir = nirData[i] / 255.0; // Normalizar para 0-1
      const red = redData[i] / 255.0;
      
      // Calcular NDVI evitando divisão por zero
      const denominator = nir + red;
      const ndvi = denominator !== 0 ? (nir - red) / denominator : 0;
      
      ndviData.push(ndvi);
    }
    
    return ndviData;
  }

  /**
   * Calcula estatísticas do NDVI
   * @private
   */
  _calculateStatistics(ndviData) {
    const validValues = ndviData.filter(val => !isNaN(val) && val >= -1 && val <= 1);
    
    if (validValues.length === 0) {
      return { average: 0, min: 0, max: 0, std: 0 };
    }

    const sum = validValues.reduce((acc, val) => acc + val, 0);
    const average = sum / validValues.length;
    
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    
    // Desvio padrão
    const variance = validValues.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / validValues.length;
    const std = Math.sqrt(variance);

    return {
      average: parseFloat(average.toFixed(4)),
      min: parseFloat(min.toFixed(4)),
      max: parseFloat(max.toFixed(4)),
      std: parseFloat(std.toFixed(4)),
      validPixels: validValues.length,
      totalPixels: ndviData.length
    };
  }

  /**
   * Identifica zonas de vegetação baseadas no NDVI
   * @private
   */
  _identifyVegetationZones(ndviData, width, height) {
    const zones = {
      water: { count: 0, percentage: 0 }, // NDVI < 0
      bare_soil: { count: 0, percentage: 0 }, // 0 <= NDVI < 0.2
      sparse_vegetation: { count: 0, percentage: 0 }, // 0.2 <= NDVI < 0.4
      moderate_vegetation: { count: 0, percentage: 0 }, // 0.4 <= NDVI < 0.7
      dense_vegetation: { count: 0, percentage: 0 } // NDVI >= 0.7
    };

    ndviData.forEach(ndvi => {
      if (ndvi < 0) zones.water.count++;
      else if (ndvi < this.thresholds.low) zones.bare_soil.count++;
      else if (ndvi < this.thresholds.normal) zones.sparse_vegetation.count++;
      else if (ndvi < this.thresholds.high) zones.moderate_vegetation.count++;
      else zones.dense_vegetation.count++;
    });

    const totalPixels = ndviData.length;
    Object.keys(zones).forEach(zone => {
      zones[zone].percentage = parseFloat((zones[zone].count / totalPixels * 100).toFixed(2));
    });

    return zones;
  }

  /**
   * Gera alertas baseados na análise NDVI
   * @private
   */
  _generateAlerts(statistics, zones) {
    const alerts = [];

    // Alerta para NDVI médio baixo (possível estresse da cultura)
    if (statistics.average < this.thresholds.low) {
      alerts.push({
        type: 'LOW_VEGETATION_INDEX',
        severity: 'high',
        message: `NDVI médio muito baixo (${statistics.average}). Possível estresse da cultura ou problema de irrigação.`,
        recommendation: 'Verificar sistema de irrigação e estado nutricional das plantas.'
      });
    }

    // Alerta para alta variabilidade (indicador de problemas localizados)
    if (statistics.std > 0.2) {
      alerts.push({
        type: 'HIGH_VARIABILITY',
        severity: 'medium',
        message: `Alta variabilidade no NDVI (σ=${statistics.std}). Possível desuniformidade na cultura.`,
        recommendation: 'Investigar áreas com baixo NDVI para identificar problemas específicos.'
      });
    }

    // Alerta para muita área de solo exposto
    if (zones.bare_soil.percentage > 30) {
      alerts.push({
        type: 'EXCESSIVE_BARE_SOIL',
        severity: 'medium',
        message: `${zones.bare_soil.percentage}% da área com solo exposto.`,
        recommendation: 'Avaliar cobertura vegetal e considerar replantio em áreas descobertas.'
      });
    }

    // Alerta positivo para boa vegetação
    if (statistics.average > this.thresholds.high) {
      alerts.push({
        type: 'HEALTHY_VEGETATION',
        severity: 'info',
        message: `Excelente índice de vegetação (NDVI=${statistics.average}).`,
        recommendation: 'Manter práticas atuais de manejo.'
      });
    }

    return alerts;
  }

  /**
   * Normaliza dados NDVI para visualização
   * @private
   */
  _normalizeNDVIData(ndviData) {
    return ndviData.map(value => {
      // Converter NDVI (-1 a 1) para escala 0-255
      return Math.round((value + 1) * 127.5);
    });
  }

  /**
   * Gera imagem NDVI colorizada para visualização
   * @param {Array} ndviData - Dados NDVI normalizados
   * @param {number} width - Largura da imagem
   * @param {number} height - Altura da imagem
   * @returns {Promise<Buffer>} Imagem PNG colorizada
   */
  async generateNDVIImage(ndviData, width, height) {
    try {
      // Aplicar paleta de cores NDVI
      const colorizedData = this._applyNDVIColorPalette(ndviData);
      
      // Criar imagem RGB
      const rgbBuffer = Buffer.from(colorizedData);
      
      const image = await sharp(rgbBuffer, {
        raw: {
          width,
          height,
          channels: 3
        }
      })
      .png()
      .toBuffer();

      logger.info('Imagem NDVI gerada com sucesso');
      return image;

    } catch (error) {
      logger.error('Erro ao gerar imagem NDVI:', error);
      throw error;
    }
  }

  /**
   * Aplica paleta de cores específica para NDVI
   * @private
   */
  _applyNDVIColorPalette(ndviData) {
    const colorizedData = [];
    
    ndviData.forEach(value => {
      // Converter valor normalizado de volta para NDVI (-1 a 1)
      const ndvi = (value / 127.5) - 1;
      
      let r, g, b;
      
      if (ndvi < -0.1) {
        // Água - Azul
        r = 0; g = 0; b = 255;
      } else if (ndvi < 0.1) {
        // Solo exposto - Marrom
        r = 139; g = 69; b = 19;
      } else if (ndvi < 0.3) {
        // Vegetação esparsa - Amarelo
        r = 255; g = 255; b = 0;
      } else if (ndvi < 0.6) {
        // Vegetação moderada - Verde claro
        r = 144; g = 238; b = 144;
      } else {
        // Vegetação densa - Verde escuro
        r = 0; g = 100; b = 0;
      }
      
      colorizedData.push(r, g, b);
    });
    
    return colorizedData;
  }
}

module.exports = NDVIAnalysisService;