#!/usr/bin/env node

/**
 * Script de Migration para AgroIA
 * Executa migrations do banco de dados PostgreSQL
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

// Configuração do banco (usando variáveis de ambiente ou defaults)
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agroai',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

/**
 * Classe para gerenciar migrations
 */
class MigrationRunner {
  constructor() {
    this.db = new Pool(dbConfig);
    this.migrationsDir = path.join(__dirname, '../migrations');
  }

  /**
   * Cria tabela de controle de migrations se não existir
   */
  async createMigrationTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64)
      );
    `;
    
    await this.db.query(query);
    console.log('✓ Tabela schema_migrations verificada');
  }

  /**
   * Lista migrations já executadas
   */
  async getExecutedMigrations() {
    try {
      const result = await this.db.query(
        'SELECT migration_name FROM schema_migrations ORDER BY id'
      );
      return result.rows.map(row => row.migration_name);
    } catch (error) {
      // Tabela ainda não existe
      return [];
    }
  }

  /**
   * Lista arquivos de migration disponíveis
   */
  async getAvailableMigrations() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      console.error('Erro ao ler diretório de migrations:', error);
      return [];
    }
  }

  /**
   * Calcula checksum de um arquivo
   */
  async calculateChecksum(filePath) {
    const crypto = require('crypto');
    const content = await fs.readFile(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Executa uma migration específica
   */
  async executeMigration(migrationFile) {
    const filePath = path.join(this.migrationsDir, migrationFile);
    
    try {
      console.log(`📄 Executando: ${migrationFile}`);
      
      const sql = await fs.readFile(filePath, 'utf8');
      const checksum = await this.calculateChecksum(filePath);
      
      // Iniciar transação
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');
        
        // Executar migration
        await client.query(sql);
        
        // Registrar migration executada
        await client.query(
          'INSERT INTO schema_migrations (migration_name, checksum) VALUES ($1, $2)',
          [migrationFile, checksum]
        );
        
        await client.query('COMMIT');
        console.log(`✅ ${migrationFile} executada com sucesso`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error(`❌ Erro ao executar ${migrationFile}:`, error.message);
      throw error;
    }
  }

  /**
   * Executa todas as migrations pendentes
   */
  async runMigrations() {
    console.log('🚀 Iniciando execução de migrations...\n');
    
    try {
      // Verificar conexão com o banco
      await this.db.query('SELECT NOW()');
      console.log('✓ Conexão com banco de dados estabelecida');
      
      // Criar tabela de controle
      await this.createMigrationTable();
      
      // Obter migrations
      const executed = await this.getExecutedMigrations();
      const available = await this.getAvailableMigrations();
      
      console.log(`📊 Migrations executadas: ${executed.length}`);
      console.log(`📋 Migrations disponíveis: ${available.length}`);
      
      // Filtrar migrations pendentes
      const pending = available.filter(migration => !executed.includes(migration));
      
      if (pending.length === 0) {
        console.log('\n✨ Todas as migrations já foram executadas!');
        return;
      }
      
      console.log(`\n⏳ ${pending.length} migration(s) pendente(s):`);
      pending.forEach(migration => console.log(`   • ${migration}`));
      console.log('');
      
      // Executar migrations pendentes
      for (const migration of pending) {
        await this.executeMigration(migration);
      }
      
      console.log('\n🎉 Todas as migrations foram executadas com sucesso!');
      
    } catch (error) {
      console.error('\n💥 Erro durante a execução de migrations:', error.message);
      process.exit(1);
    } finally {
      await this.db.end();
    }
  }

  /**
   * Mostra status das migrations
   */
  async showStatus() {
    try {
      await this.db.query('SELECT NOW()');
      console.log('✓ Conexão com banco de dados estabelecida\n');
      
      await this.createMigrationTable();
      
      const executed = await this.getExecutedMigrations();
      const available = await this.getAvailableMigrations();
      
      console.log('📊 Status das Migrations:\n');
      
      if (available.length === 0) {
        console.log('   Nenhuma migration encontrada');
        return;
      }
      
      available.forEach(migration => {
        const status = executed.includes(migration) ? '✅' : '⏳';
        console.log(`   ${status} ${migration}`);
      });
      
      const pending = available.filter(m => !executed.includes(m));
      
      console.log(`\n📈 Resumo:`);
      console.log(`   • Executadas: ${executed.length}`);
      console.log(`   • Pendentes: ${pending.length}`);
      console.log(`   • Total: ${available.length}`);
      
    } catch (error) {
      console.error('Erro ao verificar status:', error.message);
      process.exit(1);
    } finally {
      await this.db.end();
    }
  }

  /**
   * Cria uma nova migration
   */
  async createMigration(name) {
    if (!name) {
      console.error('❌ Nome da migration é obrigatório');
      console.log('Uso: npm run migrate:create <nome_da_migration>');
      return;
    }
    
    // Gerar timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:]/g, '')
      .slice(0, 14);
    
    // Nome do arquivo
    const filename = `${timestamp}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.sql`;
    const filePath = path.join(this.migrationsDir, filename);
    
    // Template da migration
    const template = `-- Migration: ${name}
-- Criado em: ${new Date().toLocaleString('pt-BR')}
-- Descrição: [Descreva o que esta migration faz]

-- ==============================
-- MUDANÇAS (UP)
-- ==============================

-- Adicione suas alterações aqui
-- Exemplo:
-- CREATE TABLE exemplo (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     nome VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT NOW()
-- );

-- ==============================
-- LOG DA MIGRATION
-- ==============================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration ${filename} executada com sucesso';
    RAISE NOTICE '📝 ${name}';
END $$;
`;
    
    try {
      await fs.writeFile(filePath, template);
      console.log(`✅ Migration criada: ${filename}`);
      console.log(`📁 Caminho: ${filePath}`);
    } catch (error) {
      console.error('❌ Erro ao criar migration:', error.message);
    }
  }
}

// Executar comando baseado nos argumentos
async function main() {
  const [,, command, ...args] = process.argv;
  const runner = new MigrationRunner();
  
  console.log('🌱 AgroIA Migration Tool\n');
  
  switch (command) {
    case 'run':
    case 'up':
      await runner.runMigrations();
      break;
      
    case 'status':
      await runner.showStatus();
      break;
      
    case 'create':
      await runner.createMigration(args[0]);
      break;
      
    default:
      console.log('Comandos disponíveis:');
      console.log('  npm run migrate:run     - Executa migrations pendentes');
      console.log('  npm run migrate:status  - Mostra status das migrations');
      console.log('  npm run migrate:create <nome> - Cria nova migration');
      console.log('');
      console.log('Exemplos:');
      console.log('  npm run migrate:run');
      console.log('  npm run migrate:create add_weather_data');
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erro inesperado:', error);
    process.exit(1);
  });
}

module.exports = { MigrationRunner };