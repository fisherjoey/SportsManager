-- Cerbos PostgreSQL Schema
-- Creates the required tables for Cerbos policy storage
-- Reference: https://docs.cerbos.dev/cerbos/latest/configuration/storage.html#postgres-schema

CREATE SCHEMA IF NOT EXISTS cerbos;

SET search_path TO cerbos;

-- Main policy table
CREATE TABLE IF NOT EXISTS policy (
    id bigint NOT NULL PRIMARY KEY, 
    kind VARCHAR(128) NOT NULL,
    name VARCHAR(1024) NOT NULL,
    version VARCHAR(128) NOT NULL,
    scope VARCHAR(512),
    description TEXT,
    disabled BOOLEAN default false,
    definition BYTEA
);

-- Policy dependencies tracking
CREATE TABLE IF NOT EXISTS policy_dependency (
    policy_id BIGINT,
    dependency_id BIGINT,
    PRIMARY KEY (policy_id, dependency_id),
    FOREIGN KEY (policy_id) REFERENCES cerbos.policy(id) ON DELETE CASCADE
);

-- Policy ancestors tracking (for derived roles)
CREATE TABLE IF NOT EXISTS policy_ancestor (
    policy_id BIGINT,
    ancestor_id BIGINT,
    PRIMARY KEY (policy_id, ancestor_id),
    FOREIGN KEY (policy_id) REFERENCES cerbos.policy(id) ON DELETE CASCADE
);

-- Policy revision history for audit trail
CREATE TABLE IF NOT EXISTS policy_revision (
    revision_id SERIAL PRIMARY KEY,
    action VARCHAR(64),
    id BIGINT,
    kind VARCHAR(128),
    name VARCHAR(1024),
    version VARCHAR(128),
    scope VARCHAR(512),
    description TEXT,
    disabled BOOLEAN, 
    definition BYTEA,
    update_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Attribute schema definitions
CREATE TABLE IF NOT EXISTS attr_schema_defs (
    id VARCHAR(255) PRIMARY KEY,
    definition JSON
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION process_policy_audit() RETURNS TRIGGER AS $policy_audit$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO policy_revision(action, id, kind, name, version, scope, description, disabled, definition)
            VALUES('DELETE', OLD.id, OLD.kind, OLD.name, OLD.version, OLD.scope, OLD.description, OLD.disabled, OLD.definition);
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO policy_revision(action, id, kind, name, version, scope, description, disabled, definition)
            VALUES('UPDATE', NEW.id, NEW.kind, NEW.name, NEW.version, NEW.scope, NEW.description, NEW.disabled, NEW.definition);
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO policy_revision(action, id, kind, name, version, scope, description, disabled, definition)
            VALUES('INSERT', NEW.id, NEW.kind, NEW.name, NEW.version, NEW.scope, NEW.description, NEW.disabled, NEW.definition);
        END IF;
        RETURN NULL; 
    END;
$policy_audit$ LANGUAGE plpgsql;

-- Create audit trigger
DROP TRIGGER IF EXISTS policy_audit ON policy;
CREATE TRIGGER policy_audit
AFTER INSERT OR UPDATE OR DELETE ON policy 
FOR EACH ROW EXECUTE PROCEDURE process_policy_audit();

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON SCHEMA cerbos TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cerbos TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cerbos TO postgres;

COMMENT ON SCHEMA cerbos IS 'Cerbos authorization policy storage';
