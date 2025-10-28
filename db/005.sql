
CREATE OR REPLACE FUNCTION load_cache()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('load_cache', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER load_cache_trigger
  AFTER INSERT ON derived_cache
  FOR EACH STATEMENT
  EXECUTE FUNCTION load_cache();