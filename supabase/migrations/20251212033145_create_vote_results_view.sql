/*
  # Create View for Public Vote Results
  
  1. View Baru
    - `vote_results` - View untuk melihat hasil voting secara real-time
      - Menampilkan data kandidat dengan jumlah suara
      - Menghitung persentase suara
      - Diurutkan dari yang terbanyak
      
  2. Keamanan
    - Public dapat melihat view ini untuk hasil real-time
*/

-- Create view for vote results
CREATE OR REPLACE VIEW vote_results AS
SELECT 
  c.id,
  c.name,
  c.photo_url,
  c.description,
  c.order_number,
  COUNT(v.id) as vote_count,
  ROUND(
    (COUNT(v.id)::numeric / NULLIF((SELECT COUNT(*) FROM votes), 0) * 100), 
    2
  ) as percentage
FROM candidates c
LEFT JOIN votes v ON c.id = v.candidate_id
GROUP BY c.id, c.name, c.photo_url, c.description, c.order_number
ORDER BY vote_count DESC, c.order_number ASC;

-- Grant access to public
GRANT SELECT ON vote_results TO public;