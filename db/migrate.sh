#!/bin/bash
# Run all migrations in order against PostgreSQL
# Usage: DATABASE_URL=postgresql://... sh migrate.sh

DB_URL="${DATABASE_URL:-postgresql://ddnsuser:password@localhost:5432/ddns}"

for f in migrations/*.sql; do
  echo "Running $f..."
  psql "$DB_URL" -f "$f"
done

echo "All migrations applied."