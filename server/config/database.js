const mysql = require('mysql2/promise');

// Database connection configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'innostart_db_2',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  connectionLimit: 20,
  acquireTimeout: 30000,
});

// Initialize MySQL database
const initializeDatabase = async () => {
  try {
    // Create tables if they don't exist
    await createTables();

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const createTables = async () => {
  // Users table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      location VARCHAR(100) DEFAULT 'Musanze',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Business ideas table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS business_ideas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      industry VARCHAR(100) NOT NULL,
      target_market TEXT,
      initial_investment DECIMAL(12,2),
      expected_revenue DECIMAL(12,2),
      success_probability DECIMAL(5,2),
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Business plans table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS business_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      business_idea_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      executive_summary TEXT,
      market_analysis TEXT,
      financial_projections JSON,
      marketing_strategy TEXT,
      operations_plan TEXT,
      risk_analysis TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (business_idea_id) REFERENCES business_ideas(id) ON DELETE CASCADE
    )
  `);

  // Local knowledge documents table (for RAG)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      document_type VARCHAR(100) NOT NULL,
      source VARCHAR(255),
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chat conversations table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      business_idea_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (business_idea_id) REFERENCES business_ideas(id) ON DELETE SET NULL
    )
  `);

  // Chat messages table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      role ENUM('user', 'assistant') NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  await pool.execute(`CREATE INDEX IF NOT EXISTS idx_business_ideas_user_id ON business_ideas(user_id)`);
  await pool.execute(`CREATE INDEX IF NOT EXISTS idx_business_ideas_industry ON business_ideas(industry)`);
  await pool.execute(`CREATE INDEX IF NOT EXISTS idx_knowledge_documents_type ON knowledge_documents(document_type)`);
  await pool.execute(`CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id)`);
};

// Database query helper functions
const query = async (text, params) => {
  const start = Date.now();
  try {
    const [rows, fields] = await pool.execute(text, params);
    const duration = Date.now() - start;
    
    // MySQL2 execute() returns [rows, fields]
    // For SELECT: rows is array of row objects
    // For INSERT/UPDATE/DELETE: rows is ResultSetHeader object with insertId, affectedRows, etc.
    const isSelectQuery = text.trim().toUpperCase().startsWith('SELECT');
    const isInsertQuery = text.trim().toUpperCase().startsWith('INSERT');
    
    if (isSelectQuery) {
      // For SELECT queries, rows is an array of row objects
      console.log('Executed SELECT query', { text: text.substring(0, 50), duration, rows: rows.length });
      return { rows: Array.isArray(rows) ? rows : [], rowCount: Array.isArray(rows) ? rows.length : 0 };
    } else if (isInsertQuery) {
      // For INSERT queries, rows is a ResultSetHeader object
      const insertId = rows?.insertId || null;
      const affectedRows = rows?.affectedRows || 0;
      console.log('Executed INSERT query', { text: text.substring(0, 50), duration, insertId, affectedRows });
      return { rows: [], rowCount: affectedRows, insertId: insertId };
    } else {
      // For UPDATE, DELETE queries, rows is a ResultSetHeader object
      const affectedRows = rows?.affectedRows || 0;
      console.log('Executed query', { text: text.substring(0, 50), duration, affectedRows });
      return { rows: [], rowCount: affectedRows, insertId: rows?.insertId || null };
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

const getClient = async () => {
  return await pool.getConnection();
};

module.exports = {
  pool,
  query,
  getClient,
  initializeDatabase
};

