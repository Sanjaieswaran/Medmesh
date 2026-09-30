-- =============================================================================
-- MedMesh Enterprise Real-Time Capacity & Event-Driven Outbox Schema
-- Database: PostgreSQL 16 + PostGIS
-- Pattern: Transactional Outbox + CQRS Event Sourcing Support
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Real-Time Hospital Capacity Table
CREATE TABLE IF NOT EXISTS hospital_capacity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id VARCHAR(64) NOT NULL UNIQUE,
    district_id VARCHAR(32) NOT NULL,
    total_beds INT NOT NULL DEFAULT 0,
    available_beds INT NOT NULL DEFAULT 0,
    occupied_beds INT NOT NULL DEFAULT 0,
    total_icu INT NOT NULL DEFAULT 0,
    available_icu INT NOT NULL DEFAULT 0,
    occupied_icu INT NOT NULL DEFAULT 0,
    total_ventilators INT NOT NULL DEFAULT 0,
    available_ventilators INT NOT NULL DEFAULT 0,
    occupied_ventilators INT NOT NULL DEFAULT 0,
    congestion_level VARCHAR(16) NOT NULL DEFAULT 'Low', -- 'Low', 'Moderate', 'High', 'Critical'
    freshness_score INT NOT NULL DEFAULT 100,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(64)
);

CREATE INDEX idx_capacity_district ON hospital_capacity(district_id);
CREATE INDEX idx_capacity_congestion ON hospital_capacity(congestion_level);

-- 2. Doctor Shift & On-Duty Status Ledger
CREATE TABLE IF NOT EXISTS doctor_roster (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL REFERENCES hospital_capacity(hospital_id) ON DELETE CASCADE,
    district_id VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    specialty VARCHAR(64) NOT NULL,
    qualification VARCHAR(64) NOT NULL,
    shift_hours VARCHAR(64) NOT NULL,
    on_duty BOOLEAN NOT NULL DEFAULT FALSE,
    last_clock_in TIMESTAMP WITH TIME ZONE,
    last_clock_out TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doctor_duty ON doctor_roster(hospital_id, on_duty);

-- 3. 108 Emergency Incident Queue
CREATE TABLE IF NOT EXISTS emergency_incidents (
    id VARCHAR(32) PRIMARY KEY,
    district_id VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    location_name VARCHAR(256) NOT NULL,
    patient_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Assigned', 'En Route', 'Transporting', 'Arrived', 'Completed'
    assigned_hospital_id VARCHAR(64),
    assigned_ambulance_id VARCHAR(64),
    bed_reserved BOOLEAN DEFAULT FALSE,
    eta_minutes INT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incident_status ON emergency_incidents(district_id, status);

-- 4. Transactional Outbox Table
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(64) NOT NULL,       -- 'HospitalCapacity', 'Doctor', 'Incident'
    aggregate_id VARCHAR(64) NOT NULL,         -- e.g. 'hosp-karur-kgmch'
    event_type VARCHAR(64) NOT NULL,           -- 'hospital:capacity:updated', 'doctor:duty:toggled'
    district_id VARCHAR(32) NOT NULL,          -- e.g. 'dist-karur'
    payload JSONB NOT NULL,                    -- Full serialized event envelope
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_outbox_unpublished ON outbox_events(created_at) WHERE published = FALSE;

-- 5. Trigger Function: Automatically write to outbox on capacity update
CREATE OR REPLACE FUNCTION trg_hospital_capacity_outbox()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO outbox_events (
        aggregate_type,
        aggregate_id,
        event_type,
        district_id,
        payload
    ) VALUES (
        'HospitalCapacity',
        NEW.hospital_id,
        'hospital:capacity:updated',
        NEW.district_id,
        json_build_object(
            'availableBeds', NEW.available_beds,
            'totalBeds', NEW.total_beds,
            'availableIcu', NEW.available_icu,
            'totalIcu', NEW.total_icu,
            'availableVentilators', NEW.available_ventilators,
            'totalVentilators', NEW.total_ventilators,
            'congestion', NEW.congestion_level,
            'updatedAt', NEW.updated_at
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_capacity_change_outbox
AFTER UPDATE ON hospital_capacity
FOR EACH ROW
EXECUTE FUNCTION trg_hospital_capacity_outbox();
