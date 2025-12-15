-- 1. Add gender_preference column to profiles table
ALTER TABLE public.profiles
ADD COLUMN gender_preference text DEFAULT 'both';

-- Make sure new profiles get a default value
ALTER TABLE public.profiles
ALTER COLUMN gender_preference SET DEFAULT 'both';

-- Optional: You might want to update existing users based on some logic.
-- For now, we default them all to 'both' to maximize matches.

-- 2. Update the matching function for two-way preference matching

-- Drop the old function signature first
DROP FUNCTION IF EXISTS get_random_profiles_with_photos(uuid, text, integer, integer, integer, uuid[]);

-- Create the new, smarter function
CREATE OR REPLACE FUNCTION get_random_profiles_with_photos(
    current_user_id uuid,
    min_age integer,
    max_age integer,
    count_limit integer,
    excluded_ids uuid[]
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    full_name text,
    age integer,
    bio text,
    location text,
    interests text[],
    avatar_url text,
    gender text,
    photos json
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    current_user_gender text;
    current_user_preference text;
BEGIN
    -- Get the current user's gender and preference to use in the main query
    SELECT
        p.gender, p.gender_preference
    INTO
        current_user_gender, current_user_preference
    FROM
        public.profiles p
    WHERE
        p.user_id = current_user_id;

    -- The main query that finds compatible profiles
    RETURN QUERY
    WITH profiles_with_photos AS (
      SELECT
          p.id,
          p.user_id,
          p.full_name,
          p.age,
          p.bio,
          p.location,
          p.interests,
          p.avatar_url,
          p.gender,
          -- Aggregate photos into a JSON array
          json_agg(
              json_build_object(
                  'id', ph.id,
                  'url', ph.url,
                  'is_primary', ph.is_primary
              ) ORDER BY ph.is_primary DESC, ph.created_at ASC
          ) FILTER (WHERE ph.id IS NOT NULL) AS photos
      FROM
          public.profiles AS p
      LEFT JOIN
          public.photos AS ph ON p.user_id = ph.user_id
      WHERE
          -- 1. Exclude the current user
          p.user_id != current_user_id

          -- 2. Exclude profiles already seen in this session
          AND NOT (p.user_id = ANY(excluded_ids))

          -- 3. Exclude profiles the user has already interacted with (liked, passed, or matched)
          AND NOT EXISTS (
              SELECT 1
              FROM public.matches m
              WHERE
                (m.user1_id = current_user_id AND m.user2_id = p.user_id) OR
                (m.user2_id = current_user_id AND m.user1_id = p.user_id)
          )

          -- 4. Apply age filter
          AND p.age >= min_age
          AND p.age <= max_age

          -- 5. TWO-WAY GENDER PREFERENCE MATCHING
          --    - My preference includes their gender
          --    - Their preference includes my gender
          AND (current_user_preference = 'both' OR current_user_preference = p.gender)
          AND (p.gender_preference = 'both' OR p.gender_preference = current_user_gender)

          -- 6. Ensure profile has minimal required data
          AND p.age IS NOT NULL
          AND p.full_name IS NOT NULL

      GROUP BY
          p.id, p.user_id
    )
    -- Final selection
    SELECT
        *
    FROM
        profiles_with_photos
    -- Only return profiles that have at least one photo
    WHERE
        json_array_length(COALESCE(photos, '[]'::json)) > 0
    -- Randomize the results
    ORDER BY
        random()
    LIMIT
        count_limit;
END;
$$;
