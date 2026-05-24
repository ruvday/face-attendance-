import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function initDB() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running database migrations...');
    await pool.query(schema);
    console.log('Database schema created successfully.');
    
    // Check if super admin exists
    const res = await pool.query(`
      SELECT id FROM users 
      WHERE role_id = (SELECT id FROM roles WHERE name = 'super_admin') 
      LIMIT 1
    `);
    
    if (res.rows.length === 0) {
      console.log('Creating default super admin...');
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('Rudvay@16042026', 10);
      
      await pool.query(`
        INSERT INTO users (role_id, email, password_hash, full_name, is_active)
        VALUES ((SELECT id FROM roles WHERE name = 'super_admin'), $1, $2, $3, true)
      `, ['face.rudvay@gmail.com', hash, 'Super Admin']);
      
      console.log('Super admin created: face.rudvay@gmail.com / Rudvay@16042026');
    }

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initDB();
}
