#!/usr/bin/env node

/**
 * CI Guard: Ban direct historico_vendas access in frontend
 * 
 * This script scans src/** for direct table access to historico_vendas
 * and fails the build if any are found.
 * 
 * Usage: node scripts/ban-historico-vendas.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const BANNED_PATTERNS = [
  /\.from\s*\(\s*['"`]historico_vendas['"`]\s*\)/g,
  /from\s+historico_vendas/g,
  /supabase\s*\.\s*from\s*\(\s*['"`]historico_vendas['"`]/g
];

const ALLOWED_PATTERNS = [
  // Allow imports and references to the RPC function
  /get_historico_vendas_masked/,
  // Allow type definitions and interfaces
  /interface.*HistoricoVenda/,
  /type.*HistoricoVenda/,
  // Allow comments
  /\/\/.*historico_vendas/,
  /\/\*[\s\S]*?historico_vendas[\s\S]*?\*\//,
];

let hasViolations = false;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  
  for (const pattern of BANNED_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      // Check if any match is in an allowed context
      const lines = content.split('\n');
      let isViolation = false;
      
      for (const match of matches) {
        const lineIndex = content.indexOf(match);
        const lineNumber = content.substring(0, lineIndex).split('\n').length;
        const line = lines[lineNumber - 1];
        
        // Check if this line matches any allowed pattern
        const isAllowed = ALLOWED_PATTERNS.some(allowedPattern => 
          allowedPattern.test(line)
        );
        
        if (!isAllowed) {
          console.error(`❌ VIOLATION: ${relativePath}:${lineNumber}`);
          console.error(`   Found: ${match.trim()}`);
          console.error(`   Line:  ${line.trim()}`);
          console.error('');
          isViolation = true;
        }
      }
      
      if (isViolation) {
        hasViolations = true;
      }
    }
  }
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.js') || entry.endsWith('.jsx')) {
      scanFile(fullPath);
    }
  }
}

console.log('🔍 Scanning for direct historico_vendas table access...');
console.log('📁 Directory:', SRC_DIR);
console.log('');

if (!fs.existsSync(SRC_DIR)) {
  console.error('❌ Source directory not found:', SRC_DIR);
  process.exit(1);
}

scanDirectory(SRC_DIR);

if (hasViolations) {
  console.error('❌ SECURITY VIOLATION DETECTED!');
  console.error('');
  console.error('Direct access to historico_vendas table is forbidden in frontend code.');
  console.error('Use the RPC function instead:');
  console.error('');
  console.error('  ✅ CORRECT:');
  console.error('    const { data } = await supabase.rpc(\'get_historico_vendas_masked\', {');
  console.error('      _start, _end, _search, _limit, _offset');
  console.error('    });');
  console.error('');
  console.error('  ❌ FORBIDDEN:');
  console.error('    const { data } = await supabase.from(\'historico_vendas\').select(\'*\');');
  console.error('');
  process.exit(1);
} else {
  console.log('✅ No direct historico_vendas access found in frontend code.');
  console.log('🔒 Security check passed!');
  process.exit(0);
}