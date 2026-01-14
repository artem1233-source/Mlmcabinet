#!/bin/bash
# Bulk replace script for kv.get -> kvGet in index.tsx

# This script safely replaces all instances of "kv.get(" with "kvGet(" 
# and "kv.getByPrefix(" with "kvGetByPrefix(" in index.tsx

cd /supabase/functions/server

# Backup the file
cp index.tsx index.tsx.backup

# Perform the replacements (excluding already replaced ones)
sed -i 's/await kv\.get(/await kvGet(/g' index.tsx
sed -i 's/await kv\.getByPrefix(/await kvGetByPrefix(/g' index.tsx

echo "✅ Bulk replacement complete!"
echo "📋 Changes:"
echo "   - kv.get() → kvGet()"
echo "   - kv.getByPrefix() → kvGetByPrefix()"
echo ""
echo "💾 Backup saved to: index.tsx.backup"
