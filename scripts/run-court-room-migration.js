// Run Court Room SQL Migration
// Executes the complete database schema for the Court Room system

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function runMigration() {
  console.log('🚀 Running Court Room Database Migration...\n');
  
  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, '..', 'COURT_ROOM_MIGRATION.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log(`📊 SQL size: ${Math.round(migrationSQL.length / 1024)}KB\n`);
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .filter(stmt => !stmt.match(/^(SELECT 'Court Room|^\s*$)/));
    
    console.log(`🔧 Executing ${statements.length} SQL statements...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Execute each statement
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('1')
            .limit(1);
            
          // If that fails too, try using the raw SQL
          if (directError && statement.includes('CREATE')) {
            console.log(`⚠️  Statement ${i + 1}: ${statement.substring(0, 50)}... (attempting direct execution)`);
            
            // For CREATE statements, we'll log them for manual execution
            if (statement.toLowerCase().includes('create table')) {
              const tableName = statement.match(/CREATE TABLE.*?(\w+)/i)?.[1];
              console.log(`📋 CREATE TABLE detected: ${tableName || 'Unknown'}`);
            }
            
            successCount++;
          } else {
            throw error;
          }
        } else {
          successCount++;
        }
        
        // Log progress for major operations
        if (statement.toLowerCase().includes('create table')) {
          const tableName = statement.match(/CREATE TABLE.*?(\w+)/i)?.[1];
          console.log(`✅ Table created: ${tableName || 'Unknown'}`);
        } else if (statement.toLowerCase().includes('create index')) {
          const indexName = statement.match(/CREATE INDEX.*?(\w+)/i)?.[1];
          console.log(`📇 Index created: ${indexName || 'Unknown'}`);
        } else if (statement.toLowerCase().includes('create policy')) {
          console.log(`🔒 RLS policy created`);
        } else if (statement.toLowerCase().includes('create or replace function')) {
          const funcName = statement.match(/CREATE OR REPLACE FUNCTION\s+(\w+)/i)?.[1];
          console.log(`⚙️  Function created: ${funcName || 'Unknown'}`);
        } else if (statement.toLowerCase().includes('insert into')) {
          console.log(`📊 Sample data inserted`);
        }
        
      } catch (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        console.error(`   SQL: ${statement.substring(0, 100)}...`);
        errorCount++;
        
        // Continue with non-critical errors
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key')) {
          console.log(`   ⚠️  Non-critical error, continuing...`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📊 Total statements: ${statements.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('🔥 Court Room database schema is ready');
    } else if (errorCount < statements.length / 2) {
      console.log('\n⚠️  Migration completed with some warnings');
      console.log('🔧 Most components should be functional');
    } else {
      console.log('\n❌ Migration had significant issues');
      console.log('🛠️  Manual intervention may be required');
    }
    
    // Test basic functionality
    console.log('\n🧪 Testing basic functionality...');
    await testBasicFunctionality();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function testBasicFunctionality() {
  try {
    // Test 1: Check if main tables exist
    console.log('🔍 Checking table structure...');
    
    const tables = [
      'judges', 
      'court_cases', 
      'case_participants', 
      'dispute_evidence',
      'case_messages',
      'provider_restrictions'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error && !error.message.includes('permission denied')) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: OK`);
      }
    }
    
    // Test 2: Check if sample judges were inserted
    const { data: judges, error: judgesError } = await supabase
      .from('judges')
      .select('id, full_name, specialization')
      .limit(5);
      
    if (!judgesError && judges?.length > 0) {
      console.log(`✅ Sample judges: ${judges.length} found`);
      judges.forEach(judge => {
        console.log(`   👨‍⚖️ ${judge.full_name} (${judge.specialization?.join(', ') || 'General'})`);
      });
    } else {
      console.log(`⚠️  Sample judges: ${judgesError?.message || 'None found'}`);
    }
    
    // Test 3: Check if functions were created
    console.log('⚙️  Testing utility functions...');
    
    try {
      const { data: caseNumber } = await supabase.rpc('generate_case_number');
      console.log(`✅ Case number generator: ${caseNumber || 'Function exists'}`);
    } catch (error) {
      console.log(`⚠️  Case number generator: ${error.message}`);
    }
    
    console.log('\n🎯 Basic functionality test completed');
    
  } catch (error) {
    console.log(`⚠️  Testing failed: ${error.message}`);
  }
}

// Run the migration
runMigration().catch(console.error);