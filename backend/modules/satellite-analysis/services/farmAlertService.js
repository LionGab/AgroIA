const { logger, farmLogger } = require('../../../utils/logger');

/**
 * Serviço de Alertas Agrícolas Inteligentes
 * Gerencia alertas automáticos baseados em análises de satélite e IA
 */
class FarmAlertService {
  constructor(whatsappService, db) {
    this.whatsappService = whatsappService;
    this.db = db;
    this.alertTypes = {
      NDVI_LOW: { priority: 'high', template: 'ndvi_low' },
      NDVI_VARIABILITY: { priority: 'medium', template: 'ndvi_variability' },
      VEGETATION_STRESS: { priority: 'high', template: 'vegetation_stress' },
      SOIL_EXPOSURE: { priority: 'medium', template: 'soil_exposure' },
      PEST_DISEASE_RISK: { priority: 'high', template: 'pest_disease' },
      IRRIGATION_NEEDED: { priority: 'high', template: 'irrigation_alert' },
      HEALTHY_CROP: { priority: 'info', template: 'healthy_status' },
      WEATHER_WARNING: { priority: 'high', template: 'weather_warning' }
    };
  }

  /**
   * Processa alertas baseados em análise NDVI e Claude Vision
   * @param {Object} farmInfo - Informações da fazenda
   * @param {Object} ndviAnalysis - Resultado da análise NDVI
   * @param {Object} claudeAnalysis - Resultado da análise Claude Vision
   * @returns {Promise<Array>} Alertas processados
   */
  async processAnalysisAlerts(farmInfo, ndviAnalysis, claudeAnalysis) {
    try {
      logger.info('Processando alertas para fazenda', {
        farmId: farmInfo.id,
        farmName: farmInfo.name
      });

      const alerts = [];
      
      // Combinar alertas NDVI e Claude Vision
      const ndviAlerts = this._processNDVIAlerts(ndviAnalysis, farmInfo);
      const claudeAlerts = this._processClaudeAlerts(claudeAnalysis, farmInfo);
      
      alerts.push(...ndviAlerts, ...claudeAlerts);
      
      // Filtrar e priorizar alertas
      const prioritizedAlerts = this._prioritizeAlerts(alerts);
      
      // Salvar alertas no banco de dados
      const savedAlerts = await this._saveAlerts(farmInfo.id, prioritizedAlerts);
      
      // Enviar notificações WhatsApp se habilitado
      if (process.env.ALERT_WHATSAPP_ENABLED === 'true') {
        await this._sendWhatsAppAlerts(farmInfo, prioritizedAlerts);
      }

      farmLogger.farmActivity(farmInfo.id, 'alerts_processed', {
        totalAlerts: savedAlerts.length,
        highPriority: savedAlerts.filter(a => a.severity === 'high').length
      });

      logger.info('Alertas processados com sucesso', {
        farmId: farmInfo.id,
        alertsGenerated: savedAlerts.length
      });

      return savedAlerts;

    } catch (error) {
      logger.error('Erro ao processar alertas:', error);
      throw error;
    }
  }

  /**
   * Processa alertas baseados em análise NDVI
   * @private
   */
  _processNDVIAlerts(ndviAnalysis, farmInfo) {
    const alerts = [];
    
    if (!ndviAnalysis?.alerts) return alerts;

    ndviAnalysis.alerts.forEach(ndviAlert => {
      const alert = {
        farmId: farmInfo.id,
        type: ndviAlert.type,
        severity: ndviAlert.severity,
        title: this._generateAlertTitle(ndviAlert.type, farmInfo.cropType),
        message: ndviAlert.message,
        recommendation: ndviAlert.recommendation,
        source: 'ndvi_analysis',
        data: {
          ndviAverage: ndviAnalysis.statistics?.average,
          ndviStd: ndviAnalysis.statistics?.std,
          zones: ndviAnalysis.zones
        },
        timestamp: new Date()
      };
      
      alerts.push(alert);
    });

    return alerts;
  }

  /**
   * Processa alertas baseados em análise Claude Vision
   * @private
   */
  _processClaudeAlerts(claudeAnalysis, farmInfo) {
    const alerts = [];
    
    if (!claudeAnalysis?.analysis?.findings) return alerts;

    claudeAnalysis.analysis.findings.forEach(finding => {
      const severity = this._mapClaudeSeverity(finding.severity);
      
      const alert = {
        farmId: farmInfo.id,
        type: finding.type || 'GENERAL_OBSERVATION',
        severity: severity,
        title: `Observação IA: ${finding.type || 'Análise Geral'}`,
        message: finding.description,
        recommendation: this._extractRecommendationForFinding(
          finding.type, 
          claudeAnalysis.analysis.recommendations
        ),
        source: 'claude_vision',
        data: {
          confidence: claudeAnalysis.analysis.confidence,
          riskLevel: claudeAnalysis.analysis.riskAssessment?.overallRisk,
          finding: finding
        },
        timestamp: new Date()
      };
      
      alerts.push(alert);
    });

    // Adicionar alerta geral de risco se necessário
    if (claudeAnalysis.analysis.riskAssessment?.overallRisk === 'high') {
      alerts.push({
        farmId: farmInfo.id,
        type: 'HIGH_RISK_IDENTIFIED',
        severity: 'high',
        title: 'Alto Risco Identificado pela IA',
        message: claudeAnalysis.analysis.summary || 'A análise de IA identificou condições de alto risco na fazenda.',
        recommendation: 'Ação imediata recomendada. Consulte as recomendações específicas.',
        source: 'claude_vision',
        data: claudeAnalysis.analysis.riskAssessment,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * Prioriza e filtra alertas
   * @private
   */
  _prioritizeAlerts(alerts) {
    // Remover duplicatas baseadas no tipo
    const uniqueAlerts = this._removeDuplicateAlerts(alerts);
    
    // Ordenar por prioridade
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1, 'info': 0 };
    
    return uniqueAlerts.sort((a, b) => {
      return priorityOrder[b.severity] - priorityOrder[a.severity];
    });
  }

  /**
   * Remove alertas duplicados
   * @private
   */
  _removeDuplicateAlerts(alerts) {
    const seen = new Set();
    return alerts.filter(alert => {
      const key = `${alert.type}-${alert.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Salva alertas no banco de dados
   * @private
   */
  async _saveAlerts(farmId, alerts) {
    const savedAlerts = [];

    for (const alert of alerts) {
      try {
        const query = `
          INSERT INTO farm_alerts (
            farm_id, alert_type, severity, title, description, 
            recommendation, source, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        
        const values = [
          farmId,
          alert.type,
          alert.severity,
          alert.title,
          alert.message,
          alert.recommendation,
          alert.source,
          JSON.stringify(alert.data),
          alert.timestamp
        ];

        const result = await this.db.query(query, values);
        savedAlerts.push(result.rows[0]);

      } catch (error) {
        logger.error('Erro ao salvar alerta:', error);
      }
    }

    return savedAlerts;
  }

  /**
   * Envia alertas via WhatsApp
   * @private
   */
  async _sendWhatsAppAlerts(farmInfo, alerts) {
    try {
      // Filtrar apenas alertas de alta prioridade para WhatsApp
      const urgentAlerts = alerts.filter(alert => 
        alert.severity === 'high' && 
        alert.type !== 'HEALTHY_CROP'
      );

      if (urgentAlerts.length === 0) {
        // Enviar mensagem positiva se não houver alertas urgentes
        await this._sendPositiveUpdate(farmInfo, alerts);
        return;
      }

      const message = this._buildWhatsAppMessage(farmInfo, urgentAlerts);
      
      // Enviar para proprietário da fazenda
      if (farmInfo.ownerPhone) {
        await this.whatsappService.sendMessage(farmInfo.ownerPhone, message);
        
        farmLogger.whatsappAlert(farmInfo.id, 'urgent_alerts', farmInfo.ownerPhone);
      }

      // Enviar para responsáveis técnicos se configurado
      if (farmInfo.technicalContacts?.length) {
        for (const contact of farmInfo.technicalContacts) {
          await this.whatsappService.sendMessage(contact.phone, message);
        }
      }

    } catch (error) {
      logger.error('Erro ao enviar alertas WhatsApp:', error);
    }
  }

  /**
   * Envia atualização positiva quando não há problemas críticos
   * @private
   */
  async _sendPositiveUpdate(farmInfo, alerts) {
    const healthyAlerts = alerts.filter(a => a.type === 'HEALTHY_CROP');
    
    if (healthyAlerts.length > 0 && farmInfo.ownerPhone) {
      const message = `🌱 *Fazenda ${farmInfo.name}*\n\n✅ Boas notícias! Sua plantação de ${farmInfo.cropType} está com boa saúde.\n\n📊 Análise de hoje:\n${healthyAlerts[0].message}\n\n💡 ${healthyAlerts[0].recommendation}\n\n_Análise automática - AgroIA_`;
      
      await this.whatsappService.sendMessage(farmInfo.ownerPhone, message);
      
      farmLogger.whatsappAlert(farmInfo.id, 'positive_update', farmInfo.ownerPhone);
    }
  }

  /**
   * Constrói mensagem WhatsApp para alertas
   * @private
   */
  _buildWhatsAppMessage(farmInfo, alerts) {
    const severity = alerts.some(a => a.severity === 'high') ? '🚨' : '⚠️';
    
    let message = `${severity} *Alerta - Fazenda ${farmInfo.name}*\n\n`;
    message += `📅 ${new Date().toLocaleDateString('pt-BR')}\n`;
    message += `🌾 Cultura: ${farmInfo.cropType}\n\n`;

    // Adicionar alertas principais
    alerts.slice(0, 3).forEach((alert, index) => {
      const icon = this._getAlertIcon(alert.severity);
      message += `${icon} *${alert.title}*\n`;
      message += `${alert.message}\n\n`;
      
      if (alert.recommendation) {
        message += `💡 *Recomendação:* ${alert.recommendation}\n\n`;
      }
    });

    if (alerts.length > 3) {
      message += `📊 +${alerts.length - 3} alertas adicionais disponíveis no dashboard.\n\n`;
    }

    message += `🤖 _Análise automática gerada por AgroIA_\n`;
    message += `📱 Acesse o dashboard para mais detalhes.`;

    return message;
  }

  /**
   * Obtém ícone apropriado para o alerta
   * @private
   */
  _getAlertIcon(severity) {
    switch (severity) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '⚡';
      default: return 'ℹ️';
    }
  }

  /**
   * Gera título apropriado para o alerta
   * @private
   */
  _generateAlertTitle(alertType, cropType) {
    const titles = {
      'LOW_VEGETATION_INDEX': `Baixo Vigor Vegetativo - ${cropType}`,
      'HIGH_VARIABILITY': `Desuniformidade na Cultura`,
      'EXCESSIVE_BARE_SOIL': `Solo Exposto Detectado`,
      'VEGETATION_STRESS': `Estresse Vegetal Identificado`,
      'IRRIGATION_NEEDED': `Necessidade de Irrigação`,
      'PEST_DISEASE_RISK': `Risco de Pragas/Doenças`,
      'HEALTHY_VEGETATION': `Cultura Saudável`
    };

    return titles[alertType] || `Alerta - ${alertType}`;
  }

  /**
   * Mapeia severidade do Claude para sistema interno
   * @private
   */
  _mapClaudeSeverity(claudeSeverity) {
    const mapping = {
      'critical': 'high',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'info': 'info'
    };

    return mapping[claudeSeverity] || 'medium';
  }

  /**
   * Extrai recomendação específica para um finding
   * @private
   */
  _extractRecommendationForFinding(findingType, recommendations) {
    if (!recommendations?.length) return null;
    
    // Procurar recomendação relacionada ao finding
    const related = recommendations.find(rec => 
      rec.action?.toLowerCase().includes(findingType?.toLowerCase()) ||
      rec.description?.toLowerCase().includes(findingType?.toLowerCase())
    );
    
    return related?.description || recommendations[0]?.description || null;
  }

  /**
   * Obtém histórico de alertas para uma fazenda
   * @param {string} farmId - ID da fazenda
   * @param {number} days - Número de dias para buscar
   * @returns {Promise<Array>} Histórico de alertas
   */
  async getAlertHistory(farmId, days = 30) {
    try {
      const query = `
        SELECT * FROM farm_alerts 
        WHERE farm_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
      `;

      const result = await this.db.query(query, [farmId]);
      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar histórico de alertas:', error);
      throw error;
    }
  }

  /**
   * Marca alerta como visualizado
   * @param {string} alertId - ID do alerta
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async markAlertAsViewed(alertId) {
    try {
      const query = `
        UPDATE farm_alerts 
        SET viewed_at = NOW() 
        WHERE id = $1
      `;

      await this.db.query(query, [alertId]);
      return true;

    } catch (error) {
      logger.error('Erro ao marcar alerta como visualizado:', error);
      return false;
    }
  }
}

module.exports = FarmAlertService;