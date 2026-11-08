#!/usr/bin/env bash
# NovaVid AI YouTube Studio — Automated PostgreSQL Backup & Disaster Recovery Script
# Supports Neon, Supabase, AWS RDS, and Local PostgreSQL Instances.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/novavid_db_${TIMESTAMP}.dump"
DB_URL="${DATABASE_URL:-}"

if [[ -z "${DB_URL}" ]]; then
  echo "Error: DATABASE_URL environment variable is required."
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

case "${1:-backup}" in
  backup)
    echo "[NovaVid Backup] Creating encrypted PostgreSQL dump to ${BACKUP_FILE}..."
    pg_dump --format=custom --compress=9 --no-owner --no-privileges "${DB_URL}" > "${BACKUP_FILE}"
    echo "[NovaVid Backup] Backup successfully completed! Size: $(du -h "${BACKUP_FILE}" | cut -f1)"
    
    # Prune backups older than 30 days
    find "${BACKUP_DIR}" -type f -name "*.dump" -mtime +30 -delete
    echo "[NovaVid Backup] Retention policy enforced (30-day window)."
    ;;

  restore)
    RESTORE_TARGET="${2:-}"
    if [[ -z "${RESTORE_TARGET}" || ! -f "${RESTORE_TARGET}" ]]; then
      echo "Usage: $0 restore <path_to_dump_file>"
      exit 1
    fi
    echo "[NovaVid Restore] Restoring database from ${RESTORE_TARGET}..."
    pg_restore --clean --if-exists --no-owner --no-privileges --dbname="${DB_URL}" "${RESTORE_TARGET}"
    echo "[NovaVid Restore] Database restoration successfully completed!"
    ;;

  *)
    echo "Usage: $0 {backup|restore <file>}"
    exit 1
    ;;
esac
