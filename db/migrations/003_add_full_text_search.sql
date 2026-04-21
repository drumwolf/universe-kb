ALTER TABLE chunks ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX ON chunks USING gin (search_vector);
