#!/usr/bin/env python3
"""
NovaVid AI Studio 2.0 — Automated SQLite Database Backup Engine
Performs live atomic SQLite backups with integrity checks and automatic retention rotation.
"""

import os
import sys
import sqlite3
import datetime
import glob
import json
import argparse

def get_default_db_path():
    appdata = os.environ.get("APPDATA")
    if not appdata:
        appdata = os.path.expanduser("~")
    return os.path.join(appdata, "com.aiyoutubestudio.app", "ai_youtube_studio.db")

def perform_backup(db_path=None, backup_dir=None, max_retention=5):
    if not db_path:
        db_path = get_default_db_path()

    if not os.path.exists(db_path):
        return {
            "success": False,
            "error": f"Database file not found: {db_path}"
        }

    if not backup_dir:
        backup_dir = os.path.join(os.path.dirname(db_path), "backups")

    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"ai_youtube_studio_backup_{timestamp}.db"
    backup_path = os.path.join(backup_dir, backup_filename)

    # 1. Atomic live backup using SQLite backup API
    source_conn = sqlite3.connect(db_path)
    dest_conn = sqlite3.connect(backup_path)

    try:
        with dest_conn:
            source_conn.backup(dest_conn, pages=100)
    finally:
        dest_conn.close()
        source_conn.close()

    # 2. Integrity check on newly created backup
    check_conn = sqlite3.connect(backup_path)
    try:
        cursor = check_conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        integrity_row = cursor.fetchone()
        integrity_status = integrity_row[0] if integrity_row else "unknown"
    finally:
        check_conn.close()

    if integrity_status != "ok":
        return {
            "success": False,
            "error": f"Backup integrity check failed: {integrity_status}",
            "backup_path": backup_path
        }

    backup_size = os.path.getsize(backup_path)

    # 3. Retention policy: Keep the newest N backups, prune older ones
    pattern = os.path.join(backup_dir, "ai_youtube_studio_backup_*.db")
    existing_backups = sorted(glob.glob(pattern), key=os.path.getmtime)

    pruned = []
    while len(existing_backups) > max_retention:
        oldest = existing_backups.pop(0)
        try:
            os.remove(oldest)
            pruned.append(os.path.basename(oldest))
        except Exception as e:
            pass

    return {
        "success": True,
        "backup_path": backup_path,
        "backup_filename": backup_filename,
        "backup_size_bytes": backup_size,
        "integrity": integrity_status,
        "timestamp": timestamp,
        "retained_count": len(existing_backups),
        "pruned_backups": pruned
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NovaVid 2.0 SQLite Database Backup Engine")
    parser.add_argument("--db", dest="db_path", help="Path to source SQLite database")
    parser.add_argument("--out-dir", dest="backup_dir", help="Target directory for backups")
    parser.add_argument("--retention", type=int, default=5, help="Number of backups to retain")
    args = parser.parse_args()

    result = perform_backup(args.db_path, args.backup_dir, args.retention)
    print(json.dumps(result, indent=2))
    if not result.get("success"):
        sys.exit(1)
