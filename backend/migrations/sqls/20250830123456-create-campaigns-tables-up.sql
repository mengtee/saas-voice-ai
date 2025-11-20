-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(20) NOT NULL DEFAULT 'voice_call', -- 'voice_call', 'sms', 'whatsapp', 'email'
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'running', 'paused', 'completed', 'failed'
    custom_message TEXT,
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_leads INTEGER NOT NULL DEFAULT 0,
    called INTEGER NOT NULL DEFAULT 0,
    successful INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    lead_ids JSONB NOT NULL DEFAULT '[]',
    batch_id VARCHAR(255), -- ElevenLabs batch ID
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create campaign_calls table
CREATE TABLE IF NOT EXISTS campaign_calls (
    id VARCHAR(255) PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL,
    lead_id VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'calling', 'completed', 'failed'
    conversation_id VARCHAR(255),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration INTEGER, -- in seconds
    outcome VARCHAR(50), -- 'interested', 'not_interested', 'callback', 'appointment', 'no_answer'
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);

CREATE INDEX IF NOT EXISTS idx_campaign_calls_campaign_id ON campaign_calls(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_lead_id ON campaign_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_status ON campaign_calls(status);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_created_at ON campaign_calls(created_at);