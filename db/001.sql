CREATE TABLE chain_link_1 (
  base_id SERIAL PRIMARY KEY,
  val INT
);

CREATE TABLE mapping_table (
  id SERIAL PRIMARY KEY,
  source_val INT UNIQUE,
  target_val INT
);

CREATE TABLE chain_link_3 (
  id SERIAL PRIMARY KEY,
  base_id INT REFERENCES chain_link_1(base_id),
  prev_id INT REFERENCES chain_link_1(base_id),
  map_id INT REFERENCES mapping_table(id),
  val INT
);

CREATE OR REPLACE FUNCTION insert_chain_link_3() RETURNS trigger AS $$
DECLARE
  mapping_id INT;
BEGIN
  SELECT id INTO mapping_id FROM mapping_table WHERE source_val = NEW.val LIMIT 1;
  IF mapping_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO chain_link_3 (base_id, prev_id, map_id, val)
  VALUES (NEW.base_id, NEW.base_id, mapping_id, NEW.val);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cl1_insert_trigger
AFTER INSERT ON chain_link_1
FOR EACH ROW
EXECUTE FUNCTION insert_chain_link_3();