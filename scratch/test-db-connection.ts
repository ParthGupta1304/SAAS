import dotenv from 'dotenv';
dotenv.config();

import { Client } from 'pg';

async function test() {
  console.log('Connecting with URL:', process.env.DATABASE_URL);
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connection Successful!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Connection Failed:', err);
  }
}

test();
