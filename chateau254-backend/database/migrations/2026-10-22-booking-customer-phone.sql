ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(60);

-- Extract customer_phone from notes if present
UPDATE bookings
SET customer_phone = TRIM(SUBSTRING(notes FROM 'Phone:\s*([^\n\r]+)'))
WHERE (customer_phone IS NULL OR customer_phone = '')
  AND notes ~* 'Phone:\s*';

-- Clean notes of injected phone and selected items
UPDATE bookings
SET notes = BTRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      notes,
      'Phone:\s*[^\n\r]+(\r?\n)?', '', 'gi'
    ),
    'Selected items:\s*[^\n\r]+(\r?\n)?', '', 'gi'
  ),
  E' \t\r\n'
)
WHERE notes ~* 'Phone:\s*' OR notes ~* 'Selected items:\s*';
