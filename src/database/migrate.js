import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Ejecuta las migraciones de base de datos
 */
export class DatabaseMigrator {
  constructor() {
    this.schemaPath = join(__dirname, 'schema.sql');
  }

  /**
   * Ejecuta todas las migraciones
   */
  async migrate() {
    try {
      console.log('🚀 Iniciando migraciones de base de datos...');

      // Conectar a la base de datos
      await db.connect();

      // Leer el archivo de esquema
      const schemaSQL = readFileSync(this.schemaPath, 'utf8');

      // Dividir en sentencias individuales
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`📄 Ejecutando ${statements.length} sentencias SQL...`);

      // Ejecutar cada sentencia
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        if (statement.trim()) {
          try {
            await db.query(statement + ';');
            console.log(`✅ Sentencia ${i + 1}/${statements.length} ejecutada`);
          } catch (error) {
            // Ignorar errores de extensiones que ya existen
            if (error.message.includes('already exists') && statement.includes('CREATE EXTENSION')) {
              console.log(`⚠️ Extensión ya existe, continuando...`);
              continue;
            }
            throw error;
          }
        }
      }

      console.log('✅ Migraciones completadas exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error ejecutando migraciones:', error.message);
      throw error;
    }
  }

  /**
   * Verifica si las tablas existen
   */
  async checkTables() {
    try {
      const result = await db.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('pedidos', 'estados_historial', 'documentos')
        ORDER BY table_name
      `);

      const existingTables = result.rows.map(row => row.table_name);
      const requiredTables = ['pedidos', 'estados_historial', 'documentos'];

      const missing = requiredTables.filter(table => !existingTables.includes(table));

      return {
        allExist: missing.length === 0,
        existing: existingTables,
        missing: missing
      };

    } catch (error) {
      console.error('❌ Error verificando tablas:', error.message);
      return {
        allExist: false,
        existing: [],
        missing: ['pedidos', 'estados_historial', 'documentos'],
        error: error.message
      };
    }
  }

  /**
   * Obtiene información del esquema
   */
  async getSchemaInfo() {
    try {
      const tablesResult = await db.query(`
        SELECT
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const indexesResult = await db.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);

      const functionsResult = await db.query(`
        SELECT
          routine_name,
          routine_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        ORDER BY routine_name
      `);

      return {
        tables: tablesResult.rows,
        indexes: indexesResult.rows,
        functions: functionsResult.rows
      };

    } catch (error) {
      console.error('❌ Error obteniendo información del esquema:', error.message);
      throw error;
    }
  }

  /**
   * Limpia todas las tablas (para desarrollo)
   */
  async dropAllTables() {
    try {
      console.log('🗑️ Eliminando todas las tablas...');

      const dropStatements = [
        'DROP TABLE IF EXISTS documentos CASCADE',
        'DROP TABLE IF EXISTS estados_historial CASCADE',
        'DROP TABLE IF EXISTS pedidos CASCADE',
        'DROP FUNCTION IF EXISTS obtener_pedidos_departamento CASCADE',
        'DROP FUNCTION IF EXISTS update_fecha_actualizacion CASCADE'
      ];

      for (const statement of dropStatements) {
        await db.query(statement);
      }

      console.log('✅ Tablas eliminadas exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error eliminando tablas:', error.message);
      throw error;
    }
  }
}

// Función helper para ejecutar migraciones desde CLI
export async function runMigrations() {
  const migrator = new DatabaseMigrator();

  try {
    // Verificar estado actual
    const status = await migrator.checkTables();

    if (status.allExist) {
      console.log('ℹ️ Las tablas ya existen. Ejecute con --force para recrear.');
      return;
    }

    // Ejecutar migraciones
    await migrator.migrate();

    // Verificar resultado
    const finalStatus = await migrator.checkTables();

    if (finalStatus.allExist) {
      console.log('🎉 Base de datos configurada correctamente');
    } else {
      console.log('⚠️ Algunas tablas no se crearon:', finalStatus.missing);
    }

  } catch (error) {
    console.error('💥 Error en migraciones:', error.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes('--force');

  if (force) {
    const migrator = new DatabaseMigrator();
    await migrator.dropAllTables();
  }

  await runMigrations();
}