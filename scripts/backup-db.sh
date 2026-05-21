#!/bin/bash
# ─────────────────────────────────────────────────────────
# Backup automatizado do banco de dados Supabase (pg_dump)
# 
# Uso: bash scripts/backup-db.sh
# Cron: 0 3 * * * cd /path/to/kromuz && bash scripts/backup-db.sh
# ─────────────────────────────────────────────────────────

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="kromuz_backup_${TIMESTAMP}.sql.gz"

# Criar diretório de backups
mkdir -p "$BACKUP_DIR"

# Carregar variáveis de ambiente
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não encontrada. Configure .env.local"
  exit 1
fi

echo "📦 Iniciando backup..."
echo "   Destino: $BACKUP_DIR/$FILENAME"

# Executar pg_dump compactado
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "$BACKUP_DIR/$FILENAME"

# Verificar tamanho
SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "✅ Backup concluído: $FILENAME ($SIZE)"

# Manter apenas os últimos 30 backups
cd "$BACKUP_DIR"
ls -t kromuz_backup_*.sql.gz | tail -n +31 | xargs -r rm
TOTAL=$(ls kromuz_backup_*.sql.gz 2>/dev/null | wc -l)
echo "📂 Total de backups mantidos: $TOTAL"

echo ""
echo "🔄 Para restaurar:"
echo "   gunzip -c $BACKUP_DIR/$FILENAME | psql \$DATABASE_URL"
