-- Schema do Banco de Dados AgroIA
-- Sistema de Monitoramento Agrícola com IA
-- PostgreSQL Database

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- Para dados geoespaciais

-- =================
-- TABELAS PRINCIPAIS
-- =================

-- Usuários do sistema
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'farmer' CHECK (role IN ('admin', 'farmer', 'technician')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Fazendas
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    crop_type VARCHAR(100) NOT NULL, -- soja, milho, algodao, cana, etc.
    total_area DECIMAL(10,2) NOT NULL, -- hectares
    coordinates JSONB NOT NULL, -- {north, south, east, west} bounding box
    geometry GEOMETRY(POLYGON, 4326), -- Geometria da fazenda (PostGIS)
    location JSONB, -- {city, state, country, address}
    planting_date DATE,
    harvest_expected_date DATE,
    owner_phone VARCHAR(20), -- WhatsApp principal
    technical_contacts JSONB, -- Array de contatos técnicos
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    crop_stage VARCHAR(50), -- plantio, desenvolvimento, maturacao, colheita
    last_analysis_at TIMESTAMP,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para fazendas
CREATE INDEX idx_farms_owner_id ON farms(owner_id);
CREATE INDEX idx_farms_crop_type ON farms(crop_type);
CREATE INDEX idx_farms_active ON farms(active);
CREATE INDEX idx_farms_geometry ON farms USING GIST(geometry);

-- Imagens de satélite
CREATE TABLE satellite_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    sentinel_id VARCHAR(255) NOT NULL, -- ID da imagem no Sentinel-2
    filename VARCHAR(500) NOT NULL,
    local_path TEXT NOT NULL,
    sensing_date TIMESTAMP NOT NULL, -- Data de captura pelo satélite
    cloud_coverage DECIMAL(5,2), -- Porcentagem de cobertura de nuvem
    image_size BIGINT, -- Tamanho do arquivo em bytes
    bands_extracted JSONB, -- Informações das bandas extraídas
    processed BOOLEAN DEFAULT false,
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, error
    download_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_satellite_images_farm_id ON satellite_images(farm_id);
CREATE INDEX idx_satellite_images_sensing_date ON satellite_images(sensing_date);
CREATE INDEX idx_satellite_images_processed ON satellite_images(processed);

-- Análises de satélite
CREATE TABLE satellite_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    image_id UUID REFERENCES satellite_images(id) ON DELETE SET NULL,
    analysis_type VARCHAR(50) DEFAULT 'daily' CHECK (analysis_type IN ('daily', 'manual', 'temporal')),
    ndvi_average DECIMAL(5,4), -- NDVI médio da fazenda
    ndvi_min DECIMAL(5,4),
    ndvi_max DECIMAL(5,4),
    ndvi_std DECIMAL(5,4), -- Desvio padrão
    ndvi_data JSONB, -- Dados detalhados do NDVI (zonas, estatísticas)
    claude_confidence INTEGER DEFAULT 0 CHECK (claude_confidence >= 0 AND claude_confidence <= 100),
    claude_analysis JSONB, -- Resultado completo da análise Claude Vision
    alerts_count INTEGER DEFAULT 0,
    image_width INTEGER,
    image_height INTEGER,
    image_date TIMESTAMP, -- Data da imagem analisada
    analysis_summary TEXT,
    analysis_data JSONB, -- Todos os dados da análise
    processing_time INTEGER, -- Tempo de processamento em segundos
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_satellite_analyses_farm_id ON satellite_analyses(farm_id);
CREATE INDEX idx_satellite_analyses_created_at ON satellite_analyses(created_at);
CREATE INDEX idx_satellite_analyses_ndvi_average ON satellite_analyses(ndvi_average);

-- Alertas das fazendas
CREATE TABLE farm_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES satellite_analyses(id) ON DELETE SET NULL,
    alert_type VARCHAR(100) NOT NULL, -- LOW_VEGETATION_INDEX, PEST_RISK, etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    source VARCHAR(50) NOT NULL, -- ndvi_analysis, claude_vision, weather, manual
    metadata JSONB, -- Dados específicos do alerta
    whatsapp_sent BOOLEAN DEFAULT false,
    whatsapp_sent_at TIMESTAMP,
    viewed BOOLEAN DEFAULT false,
    viewed_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_farm_alerts_farm_id ON farm_alerts(farm_id);
CREATE INDEX idx_farm_alerts_severity ON farm_alerts(severity);
CREATE INDEX idx_farm_alerts_created_at ON farm_alerts(created_at);
CREATE INDEX idx_farm_alerts_resolved ON farm_alerts(resolved);

-- ============================
-- TABELAS DE APOIO E HISTÓRICO
-- ============================

-- Erros de análise (para debug)
CREATE TABLE analysis_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    error_type VARCHAR(100),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB, -- Contexto adicional do erro
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analysis_errors_farm_id ON analysis_errors(farm_id);
CREATE INDEX idx_analysis_errors_resolved ON analysis_errors(resolved);

-- Relatórios diários do sistema
CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    total_farms INTEGER NOT NULL DEFAULT 0,
    successful_analyses INTEGER NOT NULL DEFAULT 0,
    failed_analyses INTEGER NOT NULL DEFAULT 0,
    alerts_generated INTEGER NOT NULL DEFAULT 0,
    success_rate DECIMAL(5,2),
    execution_time INTEGER, -- em segundos
    report_data JSONB, -- Dados detalhados do relatório
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_reports_date ON daily_reports(date);

-- Configurações do sistema
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Logs de atividade WhatsApp
CREATE TABLE whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- alert, report, status
    message_content TEXT NOT NULL,
    sent_successfully BOOLEAN DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_logs_farm_id ON whatsapp_logs(farm_id);
CREATE INDEX idx_whatsapp_logs_sent_at ON whatsapp_logs(sent_at);

-- =================
-- VIEWS ÚTEIS
-- =================

-- View para dashboard - fazendas com última análise
CREATE VIEW farms_with_latest_analysis AS
SELECT 
    f.id,
    f.name,
    f.crop_type,
    f.total_area,
    f.owner_phone,
    f.active,
    sa.id as latest_analysis_id,
    sa.ndvi_average,
    sa.claude_confidence,
    sa.alerts_count,
    sa.created_at as last_analysis_date,
    (SELECT COUNT(*) FROM farm_alerts fa WHERE fa.farm_id = f.id AND fa.resolved = false) as pending_alerts
FROM farms f
LEFT JOIN satellite_analyses sa ON sa.id = (
    SELECT id FROM satellite_analyses 
    WHERE farm_id = f.id 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- View para alertas ativos
CREATE VIEW active_alerts AS
SELECT 
    fa.*,
    f.name as farm_name,
    f.crop_type,
    f.owner_phone
FROM farm_alerts fa
JOIN farms f ON f.id = fa.farm_id
WHERE fa.resolved = false
ORDER BY 
    CASE fa.severity 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
    END,
    fa.created_at DESC;

-- =================
-- FUNÇÕES E TRIGGERS
-- =================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular geometria da fazenda a partir de coordenadas
CREATE OR REPLACE FUNCTION update_farm_geometry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.coordinates IS NOT NULL THEN
        NEW.geometry = ST_GeomFromText(
            FORMAT('POLYGON((%s %s, %s %s, %s %s, %s %s, %s %s))',
                NEW.coordinates->>'west', NEW.coordinates->>'south',
                NEW.coordinates->>'east', NEW.coordinates->>'south',
                NEW.coordinates->>'east', NEW.coordinates->>'north',
                NEW.coordinates->>'west', NEW.coordinates->>'north',
                NEW.coordinates->>'west', NEW.coordinates->>'south'
            ), 4326
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_farm_geometry_trigger 
    BEFORE INSERT OR UPDATE ON farms 
    FOR EACH ROW EXECUTE FUNCTION update_farm_geometry();

-- =================
-- DADOS INICIAIS
-- =================

-- Configurações padrão do sistema
INSERT INTO system_config (config_key, config_value, description) VALUES
('ndvi_thresholds', '{"low": 0.2, "normal": 0.4, "high": 0.7}', 'Thresholds para classificação NDVI'),
('alert_settings', '{"whatsapp_enabled": true, "email_enabled": false, "max_daily_alerts": 5}', 'Configurações de alertas'),
('analysis_settings', '{"max_cloud_coverage": 30, "min_image_age_hours": 6}', 'Configurações de análise'),
('crop_types', '["soja", "milho", "algodao", "cana", "cafe", "citrus", "pastagem", "trigo", "arroz"]', 'Tipos de culturas suportadas');

-- =================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =================

COMMENT ON TABLE farms IS 'Fazendas cadastradas no sistema AgroIA';
COMMENT ON TABLE satellite_images IS 'Imagens de satélite baixadas e processadas';
COMMENT ON TABLE satellite_analyses IS 'Análises NDVI e IA realizadas nas imagens';
COMMENT ON TABLE farm_alerts IS 'Alertas gerados automaticamente pelo sistema';
COMMENT ON TABLE daily_reports IS 'Relatórios diários de execução do sistema';

COMMENT ON COLUMN farms.coordinates IS 'Bounding box da fazenda em formato {north, south, east, west}';
COMMENT ON COLUMN farms.geometry IS 'Geometria PostGIS da fazenda para consultas espaciais';
COMMENT ON COLUMN satellite_analyses.ndvi_average IS 'NDVI médio da fazenda na análise';
COMMENT ON COLUMN farm_alerts.severity IS 'Gravidade do alerta: info, low, medium, high';

-- Fim do Schema