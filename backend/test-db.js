require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function test() {
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();

    const result = await client.query('SELECT NOW()');

    console.log('SUCCESS: PostgreSQL connection works!');
    console.log('Database time:', result.rows[0].now);
  } catch (error) {
    console.error('CONNECTION FAILED');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

test();