-- Migration 001: Initial Schema
-- Criação das tabelas principais do AgroIA
-- Data: 2025-01-21

-- Verificar se as extensões estão instaladas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        CREATE EXTENSION "uuid-ossp";
        RAISE NOTICE 'Extensão uuid-ossp criada';
    END IF;
    
    -- PostGIS é opcional - comentar se não disponível
    -- IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    --     CREATE EXTENSION "postgis";
    --     RAISE NOTICE 'Extensão postgis criada';
    -- END IF;
END $$;

-- Criação das tabelas em ordem de dependência

-- 1. Usuários
CREATE TABLE IF NOT EXISTS users (
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

-- 2. Fazendas
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    crop_type VARCHAR(100) NOT NULL,
    total_area DECIMAL(10,2) NOT NULL,
    coordinates JSONB NOT NULL,
    -- geometry GEOMETRY(POLYGON, 4326), -- Descomente se PostGIS estiver disponível
    location JSONB,
    planting_date DATE,
    harvest_expected_date DATE,
    owner_phone VARCHAR(20),
    technical_contacts JSONB,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    crop_stage VARCHAR(50),
    last_analysis_at TIMESTAMP,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Imagens de satélite
CREATE TABLE IF NOT EXISTS satellite_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    sentinel_id VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    local_path TEXT NOT NULL,
    sensing_date TIMESTAMP NOT NULL,
    cloud_coverage DECIMAL(5,2),
    image_size BIGINT,
    bands_extracted JSONB,
    processed BOOLEAN DEFAULT false,
    processing_status VARCHAR(50) DEFAULT 'pending',
    download_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Análises de satélite
CREATE TABLE IF NOT EXISTS satellite_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    image_id UUID REFERENCES satellite_images(id) ON DELETE SET NULL,
    analysis_type VARCHAR(50) DEFAULT 'daily' CHECK (analysis_type IN ('daily', 'manual', 'temporal')),
    ndvi_average DECIMAL(5,4),
    ndvi_min DECIMAL(5,4),
    ndvi_max DECIMAL(5,4),
    ndvi_std DECIMAL(5,4),
    ndvi_data JSONB,
    claude_confidence INTEGER DEFAULT 0 CHECK (claude_confidence >= 0 AND claude_confidence <= 100),
    claude_analysis JSONB,
    alerts_count INTEGER DEFAULT 0,
    image_width INTEGER,
    image_height INTEGER,
    image_date TIMESTAMP,
    analysis_summary TEXT,
    analysis_data JSONB,
    processing_time INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Alertas das fazendas
CREATE TABLE IF NOT EXISTS farm_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES satellite_analyses(id) ON DELETE SET NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    source VARCHAR(50) NOT NULL,
    metadata JSONB,
    whatsapp_sent BOOLEAN DEFAULT false,
    whatsapp_sent_at TIMESTAMP,
    viewed BOOLEAN DEFAULT false,
    viewed_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Tabelas de apoio
CREATE TABLE IF NOT EXISTS analysis_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    error_type VARCHAR(100),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    total_farms INTEGER NOT NULL DEFAULT 0,
    successful_analyses INTEGER NOT NULL DEFAULT 0,
    failed_analyses INTEGER NOT NULL DEFAULT 0,
    alerts_generated INTEGER NOT NULL DEFAULT 0,
    success_rate DECIMAL(5,2),
    execution_time INTEGER,
    report_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    message_content TEXT NOT NULL,
    sent_successfully BOOLEAN DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- Criação dos índices
DO $$ 
BEGIN
    -- Índices para farms
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_farms_owner_id') THEN
        CREATE INDEX idx_farms_owner_id ON farms(owner_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_farms_crop_type') THEN
        CREATE INDEX idx_farms_crop_type ON farms(crop_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_farms_active') THEN
        CREATE INDEX idx_farms_active ON farms(active);
    END IF;
    
    -- Índices para satellite_images
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_satellite_images_farm_id') THEN
        CREATE INDEX idx_satellite_images_farm_id ON satellite_images(farm_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_satellite_images_sensing_date') THEN
        CREATE INDEX idx_satellite_images_sensing_date ON satellite_images(sensing_date);
    END IF;
    
    -- Índices para satellite_analyses
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_satellite_analyses_farm_id') THEN
        CREATE INDEX idx_satellite_analyses_farm_id ON satellite_analyses(farm_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_satellite_analyses_created_at') THEN
        CREATE INDEX idx_satellite_analyses_created_at ON satellite_analyses(created_at);
    END IF;
    
    -- Índices para farm_alerts
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_farm_alerts_farm_id') THEN
        CREATE INDEX idx_farm_alerts_farm_id ON farm_alerts(farm_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_farm_alerts_severity') THEN
        CREATE INDEX idx_farm_alerts_severity ON farm_alerts(severity);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_farm_alerts_created_at') THEN
        CREATE INDEX idx_farm_alerts_created_at ON farm_alerts(created_at);
    END IF;
    
    RAISE NOTICE 'Índices criados com sucesso';
END $$;

-- Criação das funções e triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_farms_updated_at ON farms;
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views
CREATE OR REPLACE VIEW farms_with_latest_analysis AS
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

CREATE OR REPLACE VIEW active_alerts AS
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

-- Inserção das configurações iniciais
INSERT INTO system_config (config_key, config_value, description) VALUES
('ndvi_thresholds', '{"low": 0.2, "normal": 0.4, "high": 0.7}', 'Thresholds para classificação NDVI'),
('alert_settings', '{"whatsapp_enabled": true, "email_enabled": false, "max_daily_alerts": 5}', 'Configurações de alertas'),
('analysis_settings', '{"max_cloud_coverage": 30, "min_image_age_hours": 6}', 'Configurações de análise'),
('crop_types', '["soja", "milho", "algodao", "cana", "cafe", "citrus", "pastagem", "trigo", "arroz"]', 'Tipos de culturas suportadas')
ON CONFLICT (config_key) DO NOTHING;

-- Criar usuário admin padrão (senha: admin123 - ALTERAR EM PRODUÇÃO!)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@agroai.com', '$2b$10$rQZ1vX4ZJ8K9Z5L6W3Y8H.8mFOQJ6D.8mFOQJ6D', 'Administrador AgroIA', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Log da migração
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration 001 executada com sucesso!';
    RAISE NOTICE '📊 Schema inicial do AgroIA criado';
    RAISE NOTICE '🔧 Configurações padrão inseridas';
    RAISE NOTICE '👤 Usuário admin criado (email: admin@agroai.com)';
END $$;