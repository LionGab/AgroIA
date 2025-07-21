const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../../../utils/logger');

/**
 * Serviço de Integração com Sentinel-2 via Copernicus Open Access Hub
 * Responsável por download e processamento de imagens de satélite
 */
class Sentinel2Service {
  constructor() {
    this.baseUrl = 'https://apihub.copernicus.eu/apihub';
    this.username = process.env.COPERNICUS_USERNAME;
    this.password = process.env.COPERNICUS_PASSWORD;
    this.downloadPath = process.env.IMAGES_STORAGE_PATH || './storage/satellite-images';
    
    // Verificar credenciais
    if (!this.username || !this.password) {
      logger.warn('Credenciais Copernicus não configuradas. Algumas funcionalidades podem não funcionar.');
    }
    
    this._ensureDownloadDirectory();
  }

  /**
   * Busca imagens Sentinel-2 para uma área específica
   * @param {Object} coordinates - Coordenadas da área de interesse
   * @param {Date} startDate - Data inicial
   * @param {Date} endDate - Data final
   * @param {number} cloudCoverage - Cobertura de nuvem máxima (%)
   * @returns {Promise<Array>} Lista de imagens disponíveis
   */
  async searchImages(coordinates, startDate, endDate, cloudCoverage = 30) {
    try {
      logger.info('Buscando imagens Sentinel-2', {
        coordinates,
        dateRange: `${startDate.toISOString()} - ${endDate.toISOString()}`,
        maxCloudCoverage: cloudCoverage
      });

      // Construir consulta OpenSearch
      const query = this._buildSearchQuery(coordinates, startDate, endDate, cloudCoverage);
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { q: query },
        auth: {
          username: this.username,
          password: this.password
        },
        headers: {
          'Accept': 'application/json'
        }
      });

      const images = this._parseSearchResponse(response.data);
      
      logger.info(`Encontradas ${images.length} imagens Sentinel-2`, {
        searchArea: coordinates,
        imagesFound: images.length
      });

      return images;

    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Credenciais Copernicus inválidas');
      }
      
      logger.error('Erro ao buscar imagens Sentinel-2:', error);
      throw new Error(`Falha na busca de imagens: ${error.message}`);
    }
  }

  /**
   * Baixa uma imagem específica do Sentinel-2
   * @param {Object} imageInfo - Informações da imagem
   * @param {string} farmId - ID da fazenda
   * @returns {Promise<Object>} Informações do arquivo baixado
   */
  async downloadImage(imageInfo, farmId) {
    try {
      logger.info('Iniciando download de imagem Sentinel-2', {
        imageId: imageInfo.id,
        farmId,
        filename: imageInfo.filename
      });

      // Criar diretório específico da fazenda
      const farmDir = path.join(this.downloadPath, farmId);
      await this._ensureDirectory(farmDir);

      // Nome do arquivo local
      const localFilename = `${imageInfo.sensingDate}_${imageInfo.id}.zip`;
      const localPath = path.join(farmDir, localFilename);

      // Verificar se já existe
      if (await this._fileExists(localPath)) {
        logger.info('Imagem já existe localmente', { localPath });
        return {
          localPath,
          filename: localFilename,
          size: await this._getFileSize(localPath),
          cached: true
        };
      }

      // Download da imagem
      const downloadUrl = `${this.baseUrl}/odata/v1/Products('${imageInfo.id}')/$value`;
      
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        auth: {
          username: this.username,
          password: this.password
        },
        responseType: 'stream',
        timeout: 300000 // 5 minutos
      });

      // Salvar arquivo
      const writer = require('fs').createWriteStream(localPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const fileSize = await this._getFileSize(localPath);
      
      logger.info('Download concluído', {
        imageId: imageInfo.id,
        localPath,
        fileSize: `${(fileSize / 1024 / 1024).toFixed(2)} MB`
      });

      return {
        localPath,
        filename: localFilename,
        size: fileSize,
        cached: false
      };

    } catch (error) {
      logger.error('Erro no download da imagem:', error);
      throw new Error(`Falha no download: ${error.message}`);
    }
  }

  /**
   * Extrai bandas específicas de uma imagem Sentinel-2
   * @param {string} imagePath - Caminho para a imagem
   * @param {Array} bands - Bandas a extrair ['B04', 'B08'] para NDVI
   * @returns {Promise<Object>} Caminhos das bandas extraídas
   */
  async extractBands(imagePath, bands = ['B04', 'B08']) {
    try {
      logger.info('Extraindo bandas da imagem Sentinel-2', {
        imagePath,
        bands
      });

      // Esta é uma implementação simplificada
      // Em produção, seria necessário usar bibliotrias como GDAL
      // ou processar os arquivos .jp2 dentro do ZIP
      
      const extractedBands = {};
      
      // Simular extração (implementação real requereria GDAL)
      for (const band of bands) {
        const bandPath = imagePath.replace('.zip', `_${band}.tif`);
        
        // Aqui você implementaria a extração real usando:
        // - Unzip do arquivo Sentinel-2
        // - Localizar arquivos .jp2 das bandas
        // - Converter para formato apropriado
        // - Aplicar correções atmosféricas se necessário
        
        extractedBands[band] = {
          path: bandPath,
          band: band,
          resolution: band === 'B08' ? '10m' : '10m', // NIR e Red são 10m
          extracted: false // Marcar como não extraído nesta implementação demo
        };
      }

      logger.info('Bandas identificadas para extração', {
        bands: Object.keys(extractedBands)
      });

      return extractedBands;

    } catch (error) {
      logger.error('Erro na extração de bandas:', error);
      throw error;
    }
  }

  /**
   * Obtém imagem mais recente para uma fazenda
   * @param {Object} farmCoordinates - Coordenadas da fazenda
   * @param {number} maxDaysBack - Máximo de dias para buscar no passado
   * @returns {Promise<Object|null>} Imagem mais recente ou null
   */
  async getLatestImage(farmCoordinates, maxDaysBack = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - maxDaysBack);

      const images = await this.searchImages(farmCoordinates, startDate, endDate, 50);
      
      if (images.length === 0) {
        logger.info('Nenhuma imagem recente encontrada', {
          coordinates: farmCoordinates,
          daysSearched: maxDaysBack
        });
        return null;
      }

      // Ordenar por data de captura (mais recente primeiro)
      images.sort((a, b) => new Date(b.sensingDate) - new Date(a.sensingDate));
      
      const latestImage = images[0];
      
      logger.info('Imagem mais recente encontrada', {
        imageId: latestImage.id,
        sensingDate: latestImage.sensingDate,
        cloudCoverage: latestImage.cloudCoverage
      });

      return latestImage;

    } catch (error) {
      logger.error('Erro ao buscar imagem mais recente:', error);
      throw error;
    }
  }

  /**
   * Constrói query de busca para OpenSearch API
   * @private
   */
  _buildSearchQuery(coordinates, startDate, endDate, cloudCoverage) {
    const { north, south, east, west } = coordinates;
    
    const footprint = `footprint:"Intersects(POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south})))"`;
    const platform = 'platformname:Sentinel-2';
    const productType = 'producttype:S2MSI1C';
    const dateRange = `beginPosition:[${startDate.toISOString()} TO ${endDate.toISOString()}]`;
    const cloudFilter = `cloudcoverpercentage:[0 TO ${cloudCoverage}]`;

    return `${footprint} AND ${platform} AND ${productType} AND ${dateRange} AND ${cloudFilter}`;
  }

  /**
   * Processa resposta da busca
   * @private
   */
  _parseSearchResponse(responseData) {
    const images = [];
    
    // Parse do XML/JSON response do Copernicus
    // Esta é uma implementação simplificada
    if (responseData.feed && responseData.feed.entry) {
      const entries = Array.isArray(responseData.feed.entry) 
        ? responseData.feed.entry 
        : [responseData.feed.entry];

      entries.forEach(entry => {
        images.push({
          id: entry.id,
          title: entry.title,
          filename: entry.title + '.SAFE',
          sensingDate: entry.date || entry.str?.find(s => s.name === 'beginposition')?.content,
          cloudCoverage: parseFloat(entry.double?.find(d => d.name === 'cloudcoverpercentage')?.content || 0),
          size: entry.str?.find(s => s.name === 'size')?.content,
          footprint: entry.str?.find(s => s.name === 'footprint')?.content
        });
      });
    }

    return images;
  }

  /**
   * Garante que o diretório de download existe
   * @private
   */
  async _ensureDownloadDirectory() {
    try {
      await fs.access(this.downloadPath);
    } catch {
      await fs.mkdir(this.downloadPath, { recursive: true });
      logger.info(`Diretório de download criado: ${this.downloadPath}`);
    }
  }

  /**
   * Garante que um diretório específico existe
   * @private
   */
  async _ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Verifica se arquivo existe
   * @private
   */
  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém tamanho do arquivo
   * @private
   */
  async _getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Lista imagens baixadas para uma fazenda
   * @param {string} farmId - ID da fazenda
   * @returns {Promise<Array>} Lista de imagens locais
   */
  async listLocalImages(farmId) {
    try {
      const farmDir = path.join(this.downloadPath, farmId);
      
      if (!await this._fileExists(farmDir)) {
        return [];
      }

      const files = await fs.readdir(farmDir);
      const images = [];

      for (const file of files) {
        if (file.endsWith('.zip')) {
          const filePath = path.join(farmDir, file);
          const stats = await fs.stat(filePath);
          
          images.push({
            filename: file,
            path: filePath,
            size: stats.size,
            modifiedDate: stats.mtime
          });
        }
      }

      return images.sort((a, b) => b.modifiedDate - a.modifiedDate);

    } catch (error) {
      logger.error('Erro ao listar imagens locais:', error);
      return [];
    }
  }
}

module.exports = Sentinel2Service;