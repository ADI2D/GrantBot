-- Add EIN and About Us fields to freelancer_clients table
ALTER TABLE freelancer_clients
ADD COLUMN IF NOT EXISTS ein TEXT,
ADD COLUMN IF NOT EXISTS about_us TEXT;

-- Add comments for documentation
COMMENT ON COLUMN freelancer_clients.ein IS 'Employer Identification Number (Tax ID)';
COMMENT ON COLUMN freelancer_clients.about_us IS 'Extended description/background of the client organization for matching purposes';
