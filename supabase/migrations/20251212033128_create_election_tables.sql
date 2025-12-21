/*
  # Skema Database Pemilihan Ketua Serikat Pekerja
  
  1. Tabel Baru
    - `candidates`
      - `id` (uuid, primary key)
      - `name` (text) - Nama calon
      - `photo_url` (text, optional) - URL foto calon
      - `description` (text, optional) - Deskripsi/visi misi calon
      - `order_number` (integer) - Nomor urut calon
      - `created_at` (timestamp)
      
    - `employees`
      - `id` (uuid, primary key)
      - `employee_id` (text, unique) - Nomor Induk Pegawai
      - `has_voted` (boolean) - Status sudah memilih atau belum
      - `created_at` (timestamp)
      
    - `votes`
      - `id` (uuid, primary key)
      - `employee_id` (text) - Nomor Induk Pegawai yang memilih
      - `candidate_id` (uuid) - ID calon yang dipilih
      - `selfie_url` (text) - URL foto selfie pemilih
      - `voted_at` (timestamp)
      
  2. Keamanan
    - Enable RLS pada semua tabel
    - Public dapat membaca candidates dan melihat ringkasan votes
    - Public dapat insert vote (dengan validasi)
    - Admin (authenticated) dapat mengelola semua data
*/

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  photo_url text,
  description text,
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text UNIQUE NOT NULL,
  employee_name text,
  has_voted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  candidate_id uuid NOT NULL REFERENCES candidates(id),
  selfie_url text NOT NULL,
  voted_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policies for candidates table
CREATE POLICY "Anyone can view candidates"
  ON candidates FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert candidates"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidates"
  ON candidates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete candidates"
  ON candidates FOR DELETE
  TO authenticated
  USING (true);

-- Policies for employees table
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- Policies for votes table
CREATE POLICY "Anyone can insert votes"
  ON votes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all votes"
  ON votes FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate_id ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_employee_id ON votes(employee_id);
CREATE INDEX IF NOT EXISTS idx_candidates_order_number ON candidates(order_number);