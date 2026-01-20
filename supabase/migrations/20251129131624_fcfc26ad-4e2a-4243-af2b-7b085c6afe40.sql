-- Create patients table with JSON storage
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (for demo purposes)
-- In production, this should be restricted to authenticated users
CREATE POLICY "Allow public read access to patients"
  ON public.patients
  FOR SELECT
  TO public
  USING (true);

-- Create policy for public insert/update (for demo purposes)
CREATE POLICY "Allow public insert access to patients"
  ON public.patients
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to patients"
  ON public.patients
  FOR UPDATE
  TO public
  USING (true);

-- Create index on name for faster searching
CREATE INDEX idx_patients_name ON public.patients USING gin(to_tsvector('english', name));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();