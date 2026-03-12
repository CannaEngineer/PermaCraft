-- Add MiniMax M2.5 model settings for farm reports and planning
-- M2.5 excels at structured document generation, planning optimization,
-- and producing office-ready output (spreadsheets, structured plans)

ALTER TABLE model_settings ADD COLUMN farm_report_model TEXT NOT NULL DEFAULT 'minimax/minimax-m2.5';
ALTER TABLE model_settings ADD COLUMN farm_planning_model TEXT NOT NULL DEFAULT 'minimax/minimax-m2.5';

-- Update the default row with MiniMax M2.5
UPDATE model_settings
SET farm_report_model = 'minimax/minimax-m2.5',
    farm_planning_model = 'minimax/minimax-m2.5'
WHERE id = 'default';
