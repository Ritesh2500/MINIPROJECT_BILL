const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gwrqkipwungedlnrcptk.supabase.co';
const supabaseAnonKey = 'sb_publishable_zFfMtpiM6K24LxevN8nzXw_iDmlRRMQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing connection to Supabase:', supabaseUrl);
  try {
    const { data, error } = await supabase.from('categories').select('*').limit(5);
    if (error) {
      console.log('Supabase response info:', error.message);
      if (error.code === '42P01') {
        console.log('Note: Table "categories" does not exist yet in Supabase. The user needs to run the SQL migration in database/supabase_schema.sql via Supabase SQL Editor.');
      }
    } else {
      console.log('✓ Successfully connected to Supabase! Sample data:', data);
    }
  } catch (err) {
    console.error('Connection exception:', err.message);
  }
}

testConnection();
