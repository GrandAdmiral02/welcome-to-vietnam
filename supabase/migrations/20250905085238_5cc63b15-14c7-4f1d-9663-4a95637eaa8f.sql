-- Reset database by deleting all data from all tables
-- Delete in order to respect foreign key constraints

-- Delete messages first (references matches)
DELETE FROM public.messages;

-- Delete photos (no foreign key dependencies)
DELETE FROM public.photos;

-- Delete matches
DELETE FROM public.matches;

-- Delete blocked_users
DELETE FROM public.blocked_users;

-- Delete reports
DELETE FROM public.reports;

-- Delete user_preferences
DELETE FROM public.user_preferences;

-- Delete profiles last (might be referenced by other tables)
DELETE FROM public.profiles;