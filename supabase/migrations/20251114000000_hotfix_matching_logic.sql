-- Hotfix for matching function to handle NULL gender/preference gracefully

-- Drop the old function signature if it exists
DROP FUNCTION IF EXISTS get_random_profiles_with_photos(uuid, integer, integer, integer, uuid[]);

-- Create the new, more robust function
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
    -- Get the current user's gender and preference
    SELECT
        p.gender, p.gender_preference
    INTO
        current_user_gender, current_user_preference
    FROM
        public.profiles p
    WHERE
        p.user_id = current_user_id;

    -- Main query to find compatible profiles
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

          -- 3. Exclude profiles the user has already interacted with
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

          -- 5. FIXED TWO-WAY GENDER PREFERENCE MATCHING
          -- Their gender must match my preference. Default my preference to 'both' if not set.
          AND (COALESCE(current_user_preference, 'both') = 'both' OR p.gender = current_user_preference)
          
          -- My gender must match their preference.
          AND (
               p.gender_preference = 'both'
               OR
               -- This part now safely handles if my own gender is not set.
               (current_user_gender IS NOT NULL AND p.gender_preference = current_user_gender)
          )

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
    ORDER BY
        random()
    LIMIT
        count_limit;
END;
$$;
