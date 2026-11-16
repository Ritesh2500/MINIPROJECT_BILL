const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

async function runMigration() {
  console.log('--- BillMate MySQL Migration Runner ---');
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'billmate_db';

  try {
    // 1. Connect without database to ensure DB exists
    const connection = await mysql.createConnection({ host, port, user, password });
    console.log(`Connected to MySQL server at ${host}:${port}`);

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✓ Database \`${database}\` verified/created.`);
    await connection.end();

    // 2. Connect to database and execute schema.sql
    const dbConnection = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true });
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    console.log('Executing database/schema.sql ...');
    await dbConnection.query(schemaSql);
    console.log('✓ Tables, indexes, and constraints created successfully.');

    // 3. Execute seed.sql
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    console.log('Executing database/seed.sql ...');
    await dbConnection.query(seedSql);
    console.log('✓ Default categories and demo data seeded successfully.');

    await dbConnection.end();
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
