#!/usr/bin/env ts-node

/**
 * Security Guards - CI/CD Security Checks
 * 
 * This script enforces security baseline by failing the build if:
 * 1. Direct access to historico_vendas is found in frontend code
 * 2. Direct access to secrets tables (tiny_v3_*, integration_secrets) is found in frontend code
 * 3. Tables without RLS/FORCE RLS are detected in the database
 * 
 * Usage: ts-node scripts/security-guards.ts
 * Wire in package.json: "prebuild": "ts-node scripts/security-guards.ts"
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://tdjyfqnxvjgossuncpwm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Forbidden patterns in frontend code
const FORBIDDEN_PATTERNS = [
  {
    pattern: /\.from\(['"`]historico_vendas['"`]\)/g,
    description: 'Direct access to historico_vendas table (use RPC get_historico_vendas_masked instead)',
    severity: 'CRITICAL'
  },
  {
    pattern: /\.from\(['"`]tiny_v3_[^'"`]*['"`]\)/g,
    description: 'Direct access to tiny_v3_* secrets tables (only Edge Functions with service_role)',
    severity: 'CRITICAL'
  },
  {
    pattern: /\.from\(['"`]integration_secrets['"`]\)/g,
    description: 'Direct access to integration_secrets table (only Edge Functions with service_role)',
    severity: 'CRITICAL'
  }
];

// Directories to scan
const SCAN_DIRECTORIES = ['src'];

// Color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

interface SecurityViolation {
  file: string;
  line: number;
  column: number;
  pattern: string;
  description: string;
  severity: string;
  code: string;
}

/**
 * Recursively scan directory for files
 */
function getFiles(dir: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  const files: string[] = [];
  
  function scan(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          scan(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  if (fs.existsSync(dir)) {
    scan(dir);
  }
  
  return files;
}

/**
 * Scan file content for forbidden patterns
 */
function scanFile(filePath: string): SecurityViolation[] {
  const violations: SecurityViolation[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (const forbiddenPattern of FORBIDDEN_PATTERNS) {
      let match;
      forbiddenPattern.pattern.lastIndex = 0; // Reset regex state
      
      while ((match = forbiddenPattern.pattern.exec(content)) !== null) {
        // Find line and column
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const columnNumber = beforeMatch.split('\n').pop()?.length || 0;
        
        // Get the line content for context
        const lineContent = lines[lineNumber - 1]?.trim() || '';
        
        violations.push({
          file: filePath,
          line: lineNumber,
          column: columnNumber,
          pattern: match[0],
          description: forbiddenPattern.description,
          severity: forbiddenPattern.severity,
          code: lineContent
        });
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error reading file ${filePath}:${colors.reset}`, error);
  }
  
  return violations;
}

/**
 * Check database for tables without RLS/FORCE RLS
 */
async function checkDatabaseSecurity(): Promise<SecurityViolation[]> {
  const violations: SecurityViolation[] = [];
  
  if (!SUPABASE_SERVICE_KEY) {
    console.warn(`${colors.yellow}Warning: SUPABASE_SERVICE_ROLE_KEY not found, skipping database security check${colors.reset}`);
    return violations;
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Query for tables without RLS or FORCE RLS
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT n.nspname as schema, c.relname as table, 
               c.relrowsecurity as rls, c.relforcerowsecurity as force_rls
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND (c.relrowsecurity = false OR c.relforcerowsecurity = false)
        ORDER BY 1,2;
      `
    });
    
    if (error) {
      console.error(`${colors.red}Database security check failed:${colors.reset}`, error);
      return violations;
    }
    
    if (data && Array.isArray(data)) {
      for (const row of data) {
        violations.push({
          file: 'DATABASE',
          line: 0,
          column: 0,
          pattern: `${row.schema}.${row.table}`,
          description: `Table without ${!row.rls ? 'RLS' : 'FORCE RLS'} (security vulnerability)`,
          severity: 'CRITICAL',
          code: `RLS: ${row.rls}, FORCE RLS: ${row.force_rls}`
        });
      }
    }
  } catch (error) {
    console.error(`${colors.red}Database security check error:${colors.reset}`, error);
  }
  
  return violations;
}

/**
 * Print security violations
 */
function printViolations(violations: SecurityViolation[]) {
  if (violations.length === 0) {
    console.log(`${colors.green}${colors.bold}✅ Security scan passed - no violations found${colors.reset}`);
    return;
  }
  
  console.log(`${colors.red}${colors.bold}🚨 SECURITY VIOLATIONS DETECTED${colors.reset}\n`);
  
  const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
  const otherViolations = violations.filter(v => v.severity !== 'CRITICAL');
  
  if (criticalViolations.length > 0) {
    console.log(`${colors.red}${colors.bold}CRITICAL VIOLATIONS (${criticalViolations.length}):${colors.reset}`);
    
    for (const violation of criticalViolations) {
      console.log(`${colors.red}❌ ${violation.file}:${violation.line}:${violation.column}${colors.reset}`);
      console.log(`   ${colors.bold}Pattern:${colors.reset} ${violation.pattern}`);
      console.log(`   ${colors.bold}Issue:${colors.reset} ${violation.description}`);
      console.log(`   ${colors.bold}Code:${colors.reset} ${violation.code}`);
      console.log('');
    }
  }
  
  if (otherViolations.length > 0) {
    console.log(`${colors.yellow}${colors.bold}OTHER VIOLATIONS (${otherViolations.length}):${colors.reset}`);
    
    for (const violation of otherViolations) {
      console.log(`${colors.yellow}⚠️  ${violation.file}:${violation.line}:${violation.column}${colors.reset}`);
      console.log(`   ${colors.bold}Pattern:${colors.reset} ${violation.pattern}`);
      console.log(`   ${colors.bold}Issue:${colors.reset} ${violation.description}`);
      console.log(`   ${colors.bold}Code:${colors.reset} ${violation.code}`);
      console.log('');
    }
  }
  
  console.log(`${colors.red}${colors.bold}Build FAILED due to security violations.${colors.reset}`);
  console.log(`${colors.cyan}Fix all CRITICAL violations before proceeding.${colors.reset}\n`);
}

/**
 * Main security guard function
 */
async function runSecurityGuards(): Promise<void> {
  console.log(`${colors.cyan}${colors.bold}🛡️  Running Security Guards${colors.reset}\n`);
  
  let allViolations: SecurityViolation[] = [];
  
  // 1. Scan frontend code for forbidden patterns
  console.log(`${colors.blue}📁 Scanning frontend code...${colors.reset}`);
  
  for (const dir of SCAN_DIRECTORIES) {
    const files = getFiles(dir);
    console.log(`   Found ${files.length} files in ${dir}/`);
    
    for (const file of files) {
      const violations = scanFile(file);
      allViolations.push(...violations);
    }
  }
  
  // 2. Check database security
  console.log(`${colors.blue}🗃️  Checking database security...${colors.reset}`);
  const dbViolations = await checkDatabaseSecurity();
  allViolations.push(...dbViolations);
  
  // 3. Report results
  console.log(`${colors.blue}📊 Security scan complete${colors.reset}\n`);
  printViolations(allViolations);
  
  // 4. Exit with error if critical violations found
  const criticalViolations = allViolations.filter(v => v.severity === 'CRITICAL');
  if (criticalViolations.length > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSecurityGuards().catch((error) => {
    console.error(`${colors.red}Security guard script failed:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runSecurityGuards };