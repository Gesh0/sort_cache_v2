-- Check if all job types have corresponding data
-- CREATE OR REPLACE FUNCTION queue_check() RETURNS BOOLEAN AS $$
-- DECLARE
--     latest_ingest_id INTEGER;
--     latest_idmap_id INTEGER;
--     latest_sortmap_id INTEGER;
--     ingest_complete BOOLEAN;
--     idmap_complete BOOLEAN;
--     sortmap_complete BOOLEAN;
-- BEGIN
--     -- Get latest job ID for each type
--     SELECT MAX(id) INTO latest_ingest_id 
--     FROM job_queue WHERE type = 'ingest';
    
--     SELECT MAX(id) INTO latest_idmap_id 
--     FROM job_queue WHERE type = 'id_map';
    
--     SELECT MAX(id) INTO latest_sortmap_id 
--     FROM job_queue WHERE type = 'sort_map';
    
--     -- Check if each has corresponding data
--     -- (For ingest: check ingest_raw has job_ref)
--     SELECT EXISTS(
--         SELECT 1 FROM ingest_raw WHERE job_ref = latest_ingest_id
--     ) INTO ingest_complete;
    
--     -- Similar checks for id_map and sort_map tables
--     -- idmap_complete := EXISTS(SELECT 1 FROM id_map WHERE job_ref = latest_idmap_id);
--     -- sortmap_complete := EXISTS(SELECT 1 FROM sort_map WHERE job_ref = latest_sortmap_id);
    
--     -- For now, just checking ingest since that's Phase 1
--     IF ingest_complete THEN
--         PERFORM pg_notify('derive_cache_channel', 'ready');
--         RETURN TRUE;
--     END IF;
    
--     RETURN FALSE;
-- END;
-- $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION queue_check() RETURNS BOOLEAN AS $$
DECLARE
    latest_ingest_id INTEGER;
    has_data BOOLEAN;
BEGIN
    -- Get latest ingest job
    SELECT MAX(id) INTO latest_ingest_id 
    FROM job_queue 
    WHERE type = 'ingest';
    
    -- If no ingest jobs exist, nothing to check
    IF latest_ingest_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if ingest_acc has any data
    -- (We don't check job_ref because acc is accumulated/deduplicated)
    SELECT EXISTS(SELECT 1 FROM ingest_acc LIMIT 1) INTO has_data;
    
    IF has_data THEN
        -- Ready for derivation
        PERFORM pg_notify('derive_cache_channel', latest_ingest_id::text);
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger queue check after data insert
CREATE OR REPLACE FUNCTION trigger_queue_check() RETURNS TRIGGER AS $$
BEGIN
    PERFORM queue_check();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ingest_raw_check
AFTER INSERT ON ingest_raw
FOR EACH STATEMENT EXECUTE FUNCTION trigger_queue_check();

-- Add similar triggers for id_map, sort_map tables later