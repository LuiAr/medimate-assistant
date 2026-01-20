-- Add updated_by field to patients table to track who last updated
ALTER TABLE patients ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Create patient_views table to track when doctors last viewed updates
CREATE TABLE patient_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, user_id)
);

-- Enable RLS on patient_views
ALTER TABLE patient_views ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own view records
CREATE POLICY "Users can view their own view records"
ON patient_views FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own view records
CREATE POLICY "Users can insert their own view records"
ON patient_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own view records
CREATE POLICY "Users can update their own view records"
ON patient_views FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_patient_views_user_patient ON patient_views(user_id, patient_id);