const Anthropic = require('@anthropic-ai/sdk');
const { logger, farmLogger } = require('../../../utils/logger');

/**
 * Serviço Claude Vision para Análise Inteligente de Imagens Agrícolas
 * Integra com Claude 3 para interpretação visual avançada
 */
class ClaudeVisionService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    this.maxTokens = 4000;
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Analisa imagem de satélite com Claude Vision
   * @param {Buffer} imageBuffer - Buffer da imagem
   * @param {Object} farmInfo - Informações da fazenda
   * @param {Object} ndviData - Dados NDVI calculados
   * @returns {Promise<Object>} Análise completa da imagem
   */
  async analyzeSatelliteImage(imageBuffer, farmInfo, ndviData) {
    try {
      logger.info('Iniciando análise Claude Vision para imagem agrícola', {
        farmId: farmInfo.id,
        cropType: farmInfo.cropType
      });

      // Converter imagem para base64
      const base64Image = imageBuffer.toString('base64');
      
      // Construir prompt contextual
      const prompt = this._buildAgriculturalPrompt(farmInfo, ndviData);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image
              }
            }
          ]
        }]
      });

      const analysis = this._parseClaudeResponse(response.content[0].text);
      
      farmLogger.satelliteAnalysis(farmInfo.id, {
        claudeAnalysis: true,
        findings: analysis.findings?.length || 0,
        riskLevel: analysis.riskAssessment?.overallRisk
      });

      logger.info('Análise Claude Vision concluída', {
        farmId: farmInfo.id,
        findingsCount: analysis.findings?.length || 0,
        riskLevel: analysis.riskAssessment?.overallRisk
      });

      return {
        timestamp: new Date(),
        farmId: farmInfo.id,
        modelUsed: this.model,
        analysis,
        rawResponse: response.content[0].text
      };

    } catch (error) {
      logger.error('Erro na análise Claude Vision:', error);
      throw new Error(`Falha na análise Claude Vision: ${error.message}`);
    }
  }

  /**
   * Constrói prompt contextual para análise agrícola
   * @private
   */
  _buildAgriculturalPrompt(farmInfo, ndviData) {
    return `Você é um especialista em agricultura de precisão analisando imagens de satélite.

CONTEXTO DA FAZENDA:
- Nome: ${farmInfo.name}
- Tipo de Cultura: ${farmInfo.cropType}
- Área Total: ${farmInfo.totalArea} hectares
- Localização: ${farmInfo.location || 'Não especificada'}
- Época de Plantio: ${farmInfo.plantingDate || 'Não informada'}

DADOS NDVI ATUAIS:
- NDVI Médio: ${ndviData?.statistics?.average || 'N/A'}
- NDVI Mínimo: ${ndviData?.statistics?.min || 'N/A'}
- NDVI Máximo: ${ndviData?.statistics?.max || 'N/A'}
- Desvio Padrão: ${ndviData?.statistics?.std || 'N/A'}
- Vegetação Densa: ${ndviData?.zones?.dense_vegetation?.percentage || 0}%
- Solo Exposto: ${ndviData?.zones?.bare_soil?.percentage || 0}%

TAREFA:
Analise esta imagem de satélite e forneça insights específicos para agricultura. Identifique:

1. ESTADO GERAL DA CULTURA:
   - Saúde aparente da vegetação
   - Uniformidade da cobertura
   - Padrões de crescimento

2. PROBLEMAS IDENTIFICADOS:
   - Áreas de estresse hídrico
   - Possíveis pragas ou doenças
   - Falhas de plantio
   - Erosão do solo
   - Compactação

3. PADRÕES ESPACIAIS:
   - Distribuição da vegetação
   - Áreas de maior/menor vigor
   - Bordas e corredores
   - Padrões de irrigação visíveis

4. RECOMENDAÇÕES PRÁTICAS:
   - Ações imediatas necessárias
   - Áreas que precisam de atenção especial
   - Sugestões de manejo
   - Timing para próximas ações

5. AVALIAÇÃO DE RISCO:
   - Risco baixo/médio/alto para a produtividade
   - Fatores de maior preocupação
   - Urgência das intervenções necessárias

Formate sua resposta em JSON estruturado com os campos:
- "summary": resumo executivo
- "vegetationHealth": análise da saúde vegetal
- "findings": array de descobertas específicas
- "recommendations": array de recomendações práticas
- "riskAssessment": avaliação de riscos
- "confidence": nível de confiança da análise (0-100%)

Seja específico, prático e foque em insights acionáveis para o produtor rural.`;
  }

  /**
   * Parse da resposta do Claude em formato estruturado
   * @private
   */
  _parseClaudeResponse(responseText) {
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Se não houver JSON, criar estrutura baseada no texto
      return this._createStructuredAnalysis(responseText);
      
    } catch (error) {
      logger.warn('Erro ao fazer parse da resposta Claude, criando estrutura manual', error);
      return this._createStructuredAnalysis(responseText);
    }
  }

  /**
   * Cria análise estruturada quando o JSON não está disponível
   * @private
   */
  _createStructuredAnalysis(text) {
    // Análise básica por palavras-chave
    const riskKeywords = ['problema', 'estresse', 'doença', 'praga', 'falha', 'erosão'];
    const healthyKeywords = ['saudável', 'vigorosa', 'boa', 'excelente', 'uniforme'];
    
    const hasRiskIndicators = riskKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    const hasHealthyIndicators = healthyKeywords.some(keyword =>
      text.toLowerCase().includes(keyword)
    );

    let riskLevel = 'medium';
    if (hasRiskIndicators && !hasHealthyIndicators) riskLevel = 'high';
    else if (hasHealthyIndicators && !hasRiskIndicators) riskLevel = 'low';

    return {
      summary: text.substring(0, 200) + '...',
      vegetationHealth: hasHealthyIndicators ? 'Boa condição geral' : 'Requer atenção',
      findings: [
        {
          type: 'general_observation',
          description: text.substring(0, 150),
          severity: riskLevel
        }
      ],
      recommendations: [
        {
          action: 'Revisar análise completa',
          priority: 'medium',
          description: 'Consultar texto completo da análise para detalhes específicos'
        }
      ],
      riskAssessment: {
        overallRisk: riskLevel,
        factors: hasRiskIndicators ? ['Indicadores de risco identificados'] : [],
        urgency: riskLevel === 'high' ? 'immediate' : 'moderate'
      },
      confidence: 75
    };
  }

  /**
   * Análise comparativa entre duas imagens temporais
   * @param {Buffer} currentImage - Imagem atual
   * @param {Buffer} previousImage - Imagem anterior
   * @param {Object} farmInfo - Informações da fazenda
   * @returns {Promise<Object>} Análise temporal
   */
  async compareTemporalImages(currentImage, previousImage, farmInfo) {
    try {
      logger.info('Iniciando análise temporal com Claude Vision', {
        farmId: farmInfo.id
      });

      const currentBase64 = currentImage.toString('base64');
      const previousBase64 = previousImage.toString('base64');

      const prompt = `Analise estas duas imagens de satélite da fazenda ${farmInfo.name} (cultura: ${farmInfo.cropType}).

A primeira imagem é de um período anterior, a segunda é atual.

Compare e identifique:
1. Mudanças na cobertura vegetal
2. Evolução do vigor das plantas
3. Novos problemas ou melhorias
4. Tendências de desenvolvimento
5. Áreas que precisam de intervenção

Formate a resposta em JSON com campos: "changes", "trends", "alerts", "recommendations".`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: previousBase64
              }
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: currentBase64
              }
            }
          ]
        }]
      });

      const analysis = this._parseClaudeResponse(response.content[0].text);

      farmLogger.satelliteAnalysis(farmInfo.id, {
        temporalAnalysis: true,
        changesDetected: analysis.changes?.length || 0
      });

      return {
        timestamp: new Date(),
        farmId: farmInfo.id,
        analysisType: 'temporal_comparison',
        analysis,
        rawResponse: response.content[0].text
      };

    } catch (error) {
      logger.error('Erro na análise temporal Claude Vision:', error);
      throw error;
    }
  }

  /**
   * Gera relatório executivo baseado na análise
   * @param {Object} analysis - Resultado da análise Claude
   * @param {Object} farmInfo - Informações da fazenda
   * @returns {Object} Relatório executivo
   */
  generateExecutiveReport(analysis, farmInfo) {
    const report = {
      farmName: farmInfo.name,
      cropType: farmInfo.cropType,
      analysisDate: new Date(),
      overallStatus: this._determineOverallStatus(analysis),
      keyFindings: analysis.findings?.slice(0, 3) || [],
      urgentActions: this._extractUrgentActions(analysis.recommendations || []),
      riskLevel: analysis.riskAssessment?.overallRisk || 'medium',
      confidenceLevel: analysis.confidence || 75,
      summary: analysis.summary || 'Análise concluída com sucesso'
    };

    logger.info('Relatório executivo gerado', {
      farmId: farmInfo.id,
      status: report.overallStatus,
      riskLevel: report.riskLevel
    });

    return report;
  }

  /**
   * Determina status geral baseado na análise
   * @private
   */
  _determineOverallStatus(analysis) {
    const riskLevel = analysis.riskAssessment?.overallRisk;
    
    switch (riskLevel) {
      case 'high': return 'ATENÇÃO REQUERIDA';
      case 'low': return 'CONDIÇÃO BOA';
      default: return 'MONITORAMENTO REGULAR';
    }
  }

  /**
   * Extrai ações urgentes das recomendações
   * @private
   */
  _extractUrgentActions(recommendations) {
    return recommendations
      .filter(rec => rec.priority === 'high' || rec.priority === 'urgent')
      .slice(0, 3)
      .map(rec => ({
        action: rec.action,
        description: rec.description,
        priority: rec.priority
      }));
  }
}

module.exports = ClaudeVisionService;