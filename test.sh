#!/bin/bash

# Quick test script for sort_cache system
# Usage: ./test.sh [bootstrap|init|load|status]

set -e

CONTAINER="sort_cache_api-1"
DB_CONTAINER="sort_cache"

case "$1" in
  bootstrap)
    echo "🧪 Running Bootstrap Test..."
    echo "Setting TEST_MODE=bootstrap, MOCK_DYNAMIC_DATES=true"

    # Update docker-compose (manual for now, could use sed)
    echo "⚠️  Edit docker-compose.yaml:"
    echo "   TEST_MODE: \"bootstrap\""
    echo "   MOCK_DYNAMIC_DATES: \"true\""
    echo ""
    read -p "Press enter when ready..."

    docker compose down -v
    docker compose up -d

    echo "⏳ Waiting 15 seconds for bootstrap..."
    sleep 15

    echo "📊 Checking logs..."
    docker logs --tail 50 $CONTAINER | grep "\[SUCCESS\]"

    echo ""
    echo "🔍 Testing cache query..."
    curl -s http://localhost:3000/cache/BOOT001 | jq

    echo ""
    echo "📈 Database counts:"
    docker exec -it $DB_CONTAINER psql -U sort_cache -d sort_cache_db -c "
    SELECT
      (SELECT COUNT(*) FROM job_queue) as jobs,
      (SELECT COUNT(*) FROM ingest_raw) as raw,
      (SELECT COUNT(*) FROM ingest_acc) as acc,
      (SELECT COUNT(*) FROM sort_map) as sortmap,
      (SELECT COUNT(*) FROM derived_cache) as cache;
    "

    echo "✅ Bootstrap test complete!"
    ;;

  init)
    echo "🧪 Running Init Test..."
    echo "First creating baseline with bootstrap..."

    echo "⚠️  Edit docker-compose.yaml:"
    echo "   TEST_MODE: \"bootstrap\""
    echo "   MOCK_DYNAMIC_DATES: \"true\""
    echo "   BOOTSTRAP_HOURS_BACK: \"3\""
    read -p "Press enter when ready..."

    docker compose down -v
    docker compose up -d
    sleep 15
    docker compose down

    echo "Now testing init mode (should catch up 2 hours)..."
    echo "⚠️  Edit docker-compose.yaml:"
    echo "   TEST_MODE: \"init\""
    read -p "Press enter when ready..."

    docker compose up -d
    sleep 20

    echo "📊 Job queue:"
    docker exec -it $DB_CONTAINER psql -U sort_cache -d sort_cache_db -c "
    SELECT id, type, data->>'dateFrom' as date_from, data->>'dateTo' as date_to
    FROM job_queue
    ORDER BY id;
    "

    echo ""
    echo "📈 Checking scheduler logs..."
    docker logs $CONTAINER | grep "scheduler"

    echo "✅ Init test complete!"
    ;;

  load)
    echo "🧪 Running Load Test (600 requests)..."

    if ! command -v hey &> /dev/null; then
      echo "⚠️  'hey' not found. Using curl loop instead."
      echo "Install hey for better load testing: go install github.com/rakyll/hey@latest"

      echo "Running 600 requests at 10 req/sec..."
      for i in {1..600}; do
        barcode=$(echo -e "BOOT001\nBOOT002\nSPAN001\nINVALID123" | shuf -n 1)
        curl -s http://localhost:3000/cache/$barcode > /dev/null &

        if (( $i % 10 == 0 )); then
          wait
          echo "Progress: $i/600"
        fi
      done
      wait
    else
      echo "Using hey for load test..."
      hey -z 60s -q 10 http://localhost:3000/cache/BOOT001
    fi

    echo ""
    echo "📊 Scan log stats:"
    docker exec -it $DB_CONTAINER psql -U sort_cache -d sort_cache_db -c "
    SELECT
      port,
      COUNT(*) as scans,
      ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM scan_log) * 100, 1) as percent
    FROM scan_log
    GROUP BY port
    ORDER BY scans DESC;
    "

    echo ""
    echo "🔍 Checking for errors..."
    error_count=$(docker logs $CONTAINER | grep "\[FAILURE\]" | wc -l)
    echo "Error count: $error_count"

    if [ $error_count -eq 0 ]; then
      echo "✅ Load test passed - no errors!"
    else
      echo "❌ Found errors in logs"
      docker logs $CONTAINER | grep "\[FAILURE\]" | tail -10
    fi
    ;;

  status)
    echo "📊 System Status"
    echo ""
    echo "Container status:"
    docker ps --filter "name=sort_cache"

    echo ""
    echo "Database counts:"
    docker exec -it $DB_CONTAINER psql -U sort_cache -d sort_cache_db -c "
    SELECT
      (SELECT COUNT(*) FROM job_queue) as jobs,
      (SELECT COUNT(*) FROM ingest_raw) as raw,
      (SELECT COUNT(*) FROM ingest_acc) as acc,
      (SELECT COUNT(*) FROM sort_map) as sortmap,
      (SELECT COUNT(*) FROM derived_cache) as cache,
      (SELECT COUNT(*) FROM scan_log) as scans;
    "

    echo ""
    echo "Recent logs:"
    docker logs --tail 20 $CONTAINER

    echo ""
    echo "Test cache query:"
    curl -s http://localhost:3000/cache/BOOT001 | jq
    ;;

  *)
    echo "Usage: ./test.sh [bootstrap|init|load|status]"
    echo ""
    echo "Commands:"
    echo "  bootstrap - Test bootstrap + full transform pipeline"
    echo "  init      - Test initIngest catch-up + timer"
    echo "  load      - Run 600 cache queries"
    echo "  status    - Check system status"
    exit 1
    ;;
esac
