-- Create appointments table for Cal.com integration
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    lead_id VARCHAR(255),
    campaign_id VARCHAR(255),
    conversation_id VARCHAR(255),
    
    -- Cal.com booking details
    cal_booking_id VARCHAR(255) UNIQUE,
    cal_event_type_id VARCHAR(255),
    
    -- Appointment details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    attendee_name VARCHAR(255) NOT NULL,
    attendee_email VARCHAR(255) NOT NULL,
    attendee_phone VARCHAR(50),
    
    -- Scheduling
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    duration_minutes INTEGER DEFAULT 30,
    
    -- Status and metadata
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, cancelled, completed, no_show
    booking_status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, rescheduled
    meeting_url TEXT,
    meeting_password VARCHAR(100),
    location VARCHAR(500),
    
    -- Booking source
    booked_by VARCHAR(50) DEFAULT 'ai_agent', -- ai_agent, manual, api
    booking_reference VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_campaign_id ON appointments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_cal_booking_id ON appointments(cal_booking_id);
CREATE INDEX IF NOT EXISTS idx_appointments_conversation_id ON appointments(conversation_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at_trigger
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointments_updated_at();