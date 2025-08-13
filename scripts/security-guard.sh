#!/usr/bin/env bash
set -e
echo "🔎 Security guard: verificando SELECT direto em profiles…"

# Lista ocorrências de from('profiles') com select sem marcação de whitelist
violations=$(grep -RIn "from(['\"]profiles['\"]).*select" src \
  | grep -v "ALLOW_SELF_PROFILE_QUERY" || true)

if [ -n "$violations" ]; then
  echo "❌ SELECT direto na tabela profiles encontrado (sem whitelist):"
  echo "$violations"
  exit 1
fi

echo "✅ Guard OK"