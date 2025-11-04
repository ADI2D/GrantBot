-- Add billing_rate column to freelancer_clients table
-- Run this in your Supabase SQL Editor

ALTER TABLE freelancer_clients
ADD COLUMN IF NOT EXISTS billing_rate NUMERIC(10, 2);

COMMENT ON COLUMN freelancer_clients.billing_rate IS 'Hourly billing rate in USD for this client';
