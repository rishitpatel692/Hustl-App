-- Query to check existing constraints on tasks table
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'tasks'
  AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Check if tasks table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'tasks' 
  AND table_schema = 'public'
) AS tasks_table_exists;

-- Check specific foreign key constraints
SELECT 
  constraint_name,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'tasks'
  AND table_schema = 'public'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name IN ('tasks_created_by_fkey', 'tasks_accepted_by_fkey');