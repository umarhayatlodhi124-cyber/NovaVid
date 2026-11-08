# NovaVid AI YouTube Studio — Backup & Disaster Recovery Guide
## Automated SQLite Snapshots, Cloud PostgreSQL Dumps & Recovery Verification

**Brand:** LODHI TECHX  

---

## 1. Dual-Layer Backup Strategy

NovaVid AI implements an offline-resilient dual-layer backup architecture:
1. **Local Desktop Layer (SQLite):**
   - Automatically takes a timestamped snapshot of the local database before applying schema migrations or major updates.
   - Preserves user projects in `%APPDATA%/com.aiyoutubestudio.app/databases/backup/`.
   - Never deletes user projects during application updates.
2. **Cloud SaaS Layer (PostgreSQL):**
   - Automated custom-format compressed dumps using [cloud/backup_restore.sh](file:///G:/Nova%20Vid/cloud/backup_restore.sh).
   - Encrypted with AES-256 and stored off-site.
   - Enforces a 30-day retention window.

---

## 2. Backup & Restore Runbooks

### Creating a Cloud Database Backup:
```bash
export DATABASE_URL="postgresql://user:pass@host/novavid"
bash cloud/backup_restore.sh backup
```

### Restoring Cloud Database from Dump:
```bash
export DATABASE_URL="postgresql://user:pass@host/novavid_staging"
bash cloud/backup_restore.sh restore ./backups/postgres/novavid_db_20261107_140000.dump
```

### Recovery Time Objective (RTO) & Recovery Point Objective (RPO):
- **Target RTO:** Under 15 minutes to complete restore.
- **Target RPO:** Maximum 1 hour (daily automated snapshots + transaction logs).
