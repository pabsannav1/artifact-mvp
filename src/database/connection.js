import pkg from 'pg';
const { Pool } = pkg;

/**
 * Configuración y manejo de la conexión a PostgreSQL/Neon
 */
export class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Inicializa la conexión con la base de datos
   */
  async connect() {
    try {
      // Configuración de conexión con Neon
      const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // máximo de conexiones en el pool
        idleTimeoutMillis: 30000, // cerrar conexiones inactivas después de 30s
        connectionTimeoutMillis: 10000, // timeout de conexión de 10s
      };

      // Configuración alternativa si se usan variables separadas
      if (!process.env.DATABASE_URL && process.env.DB_HOST) {
        config.host = process.env.DB_HOST;
        config.port = parseInt(process.env.DB_PORT) || 5432;
        config.database = process.env.DB_NAME;
        config.user = process.env.DB_USER;
        config.password = process.env.DB_PASSWORD;
        delete config.connectionString;
      }

      this.pool = new Pool(config);

      // Probar la conexión
      const client = await this.pool.connect();
      console.log('✅ Conectado a PostgreSQL/Neon exitosamente');
      client.release();

      this.isConnected = true;

      // Manejar eventos del pool
      this.pool.on('error', (err) => {
        console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
        this.isConnected = false;
      });

      this.pool.on('connect', () => {
        console.log('🔌 Nueva conexión establecida con PostgreSQL');
      });

      return this.pool;
    } catch (error) {
      console.error('❌ Error conectando a PostgreSQL:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Obtiene una conexión del pool
   */
  async getClient() {
    if (!this.pool) {
      await this.connect();
    }
    return this.pool.connect();
  }

  /**
   * Ejecuta una query con parámetros
   */
  async query(text, params = []) {
    if (!this.pool) {
      await this.connect();
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Query ejecutada:', {
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rows: result.rowCount
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error en query:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Ejecuta una transacción
   */
  async transaction(queries) {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');

      const results = [];
      for (const { text, params } of queries) {
        const result = await client.query(text, params);
        results.push(result);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cierra todas las conexiones
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Conexiones PostgreSQL cerradas');
      this.isConnected = false;
    }
  }

  /**
   * Verifica si la base de datos está disponible
   */
  async healthCheck() {
    try {
      await this.query('SELECT 1 as health_check');
      return { status: 'ok', connected: true };
    } catch (error) {
      return { status: 'error', connected: false, error: error.message };
    }
  }

  /**
   * Obtiene información sobre el estado de la conexión
   */
  getConnectionInfo() {
    if (!this.pool) {
      return { connected: false };
    }

    return {
      connected: this.isConnected,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// Instancia singleton para uso global
export const db = new DatabaseConnection();