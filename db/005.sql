-- Function: accumulate_ingest
CREATE OR REPLACE FUNCTION accumulate_ingest(p_job_id INTEGER) RETURNS VOID AS $$
DECLARE
    acc_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM ingest_acc LIMIT 1) INTO acc_exists;
    
    -- Use WITH to avoid "no destination" error
    WITH latest_data AS (
        SELECT DISTINCT ON (barcode)
            ir.id,
            ir.barcode,
            ir.location_id,
            ir.created_at
        FROM ingest_raw ir
        WHERE ir.job_ref = p_job_id
        ORDER BY barcode, id DESC
    )
    INSERT INTO ingest_acc (raw_ref, barcode, location_id, created_at)
    SELECT id, barcode, location_id, created_at
    FROM latest_data
    ON CONFLICT (barcode) DO UPDATE SET
        raw_ref = EXCLUDED.raw_ref,
        location_id = EXCLUDED.location_id,
        created_at = EXCLUDED.created_at;
    
    IF acc_exists THEN
        DELETE FROM ingest_acc 
        WHERE created_at < NOW() - INTERVAL '7 days';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_accumulate() RETURNS TRIGGER AS $$
DECLARE
    latest_job_id INTEGER;
BEGIN
    -- Get the job_ref
    SELECT job_ref INTO latest_job_id
    FROM ingest_raw
    ORDER BY id DESC
    LIMIT 1;
    
    -- Log what we found
    RAISE NOTICE 'Trigger fired! Found job_id: %', latest_job_id;
    
    -- Call accumulation
    PERFORM accumulate_ingest(latest_job_id);
    
    RAISE NOTICE 'Accumulation completed for job_id: %', latest_job_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER ingest_raw_accumulate
AFTER INSERT ON ingest_raw
FOR EACH STATEMENT EXECUTE FUNCTION trigger_accumulate();