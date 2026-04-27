ALTER TABLE recurring_rules
ADD COLUMN IF NOT EXISTS end_date date;
