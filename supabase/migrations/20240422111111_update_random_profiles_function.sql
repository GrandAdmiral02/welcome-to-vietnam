CREATE OR REPLACE FUNCTION get_random_profiles_with_photos(
    current_user_id TEXT,
    min_age INT,
    max_age INT,
    count INT,
    excluded_ids TEXT[],
    p_gender_preference TEXT -- Thêm tham số mới
)
RETURNS TABLE (
    id UUID,
    user_id TEXT,
    full_name TEXT,
    age INT,
    bio TEXT,
    location TEXT,
    interests TEXT[],
    avatar_url TEXT,
    gender TEXT,
    photos JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH potential_matches AS (
        SELECT p.id, p.user_id
        FROM profiles p
        WHERE
            p.user_id != current_user_id
            AND p.age BETWEEN min_age AND max_age
            AND p.full_name IS NOT NULL
            AND p.birth_date IS NOT NULL
            AND p.gender IS NOT NULL
            -- Lọc giới tính dựa trên tham số mới
            AND (p_gender_preference = 'both' OR p.gender = p_gender_preference)
            AND NOT (p.user_id = ANY(excluded_ids))
            AND NOT EXISTS (
                SELECT 1
                FROM matches m
                WHERE
                    (m.user1_id = current_user_id AND m.user2_id = p.user_id)
                    OR (m.user1_id = p.user_id AND m.user2_id = current_user_id)
            )
        LIMIT count
    )
    SELECT
        pm.id,
        pm.user_id,
        p.full_name,
        p.age,
        p.bio,
        p.location,
        p.interests,
        p.avatar_url,
        p.gender,
        (
            SELECT jsonb_agg(ph_agg)
            FROM (
                SELECT ph.id, ph.url, ph.is_primary
                FROM photos ph
                WHERE ph.user_id = pm.user_id
                ORDER BY ph.is_primary DESC, ph.created_at ASC
            ) AS ph_agg
        ) AS photos
    FROM potential_matches pm
    JOIN profiles p ON pm.user_id = p.user_id;
END;
$$ LANGUAGE plpgsql;
