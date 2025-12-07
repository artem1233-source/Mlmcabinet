-- ============================================================================
-- ПОЛНАЯ МИГРАЦИЯ MLM СИСТЕМЫ
-- Дата: 2025-12-07
-- 
-- Переносит данные из KV Store (kv_store_05aa3c8a) в нормальные SQL таблицы
-- ============================================================================

-- ============================================================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    supabase_id UUID,
    
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    
    referrer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    ref_code TEXT UNIQUE,
    team JSONB DEFAULT '[]'::JSONB,
    
    balance NUMERIC(12, 2) DEFAULT 0,
    available_balance NUMERIC(12, 2) DEFAULT 0,
    rank_level INT DEFAULT 0,
    
    telegram TEXT,
    instagram TEXT,
    vk TEXT,
    facebook TEXT,
    avatar_url TEXT,
    
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    
    raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referrer ON profiles(referrer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_ref_code ON profiles(ref_code);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

COMMENT ON TABLE profiles IS 'Профили партнёров MLM системы';
COMMENT ON COLUMN profiles.referrer_id IS 'ID пригласившего партнёра (спонсора)';
COMMENT ON COLUMN profiles.ref_code IS 'Уникальный реферальный код для приглашений';
COMMENT ON COLUMN profiles.team IS 'Массив ID прямых рефералов (1-я линия)';
COMMENT ON COLUMN profiles.raw_data IS 'Исходные данные из KV Store для отладки';


-- ============================================================================
-- 2. МИГРАЦИЯ ДАННЫХ ИЗ KV STORE В PROFILES
-- ============================================================================

INSERT INTO profiles (
    id,
    supabase_id,
    email,
    first_name,
    last_name,
    phone,
    referrer_id,
    ref_code,
    team,
    balance,
    available_balance,
    rank_level,
    telegram,
    instagram,
    vk,
    facebook,
    avatar_url,
    is_admin,
    created_at,
    last_login,
    raw_data
)
SELECT 
    value->>'id' AS id,
    
    CASE 
        WHEN value->>'supabaseId' IS NOT NULL 
             AND value->>'supabaseId' != '' 
             AND value->>'supabaseId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (value->>'supabaseId')::UUID
        ELSE NULL
    END AS supabase_id,
    
    LOWER(TRIM(value->>'email')) AS email,
    value->>'имя' AS first_name,
    value->>'фамилия' AS last_name,
    value->>'телефон' AS phone,
    
    NULLIF(TRIM(value->>'спонсорId'), '') AS referrer_id,
    value->>'рефКод' AS ref_code,
    
    COALESCE(value->'команда', '[]'::JSONB) AS team,
    
    COALESCE((value->>'баланс')::NUMERIC, 0) AS balance,
    COALESCE((value->>'доступныйБаланс')::NUMERIC, 0) AS available_balance,
    COALESCE((value->>'уровень')::INT, 0) AS rank_level,
    
    value->>'telegram' AS telegram,
    value->>'instagram' AS instagram,
    value->>'vk' AS vk,
    value->>'facebook' AS facebook,
    value->>'аватарка' AS avatar_url,
    
    COALESCE((value->>'isAdmin')::BOOLEAN, FALSE) AS is_admin,
    
    CASE 
        WHEN value->>'зарегистрирован' IS NOT NULL 
        THEN (value->>'зарегистрирован')::TIMESTAMPTZ
        ELSE NOW()
    END AS created_at,
    
    CASE 
        WHEN value->>'lastLogin' IS NOT NULL 
        THEN (value->>'lastLogin')::TIMESTAMPTZ
        ELSE NULL
    END AS last_login,
    
    value AS raw_data
    
FROM kv_store_05aa3c8a
WHERE key LIKE 'user:id:%'
  AND value->>'id' IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    referrer_id = EXCLUDED.referrer_id,
    ref_code = EXCLUDED.ref_code,
    team = EXCLUDED.team,
    balance = EXCLUDED.balance,
    available_balance = EXCLUDED.available_balance,
    rank_level = EXCLUDED.rank_level,
    telegram = EXCLUDED.telegram,
    instagram = EXCLUDED.instagram,
    vk = EXCLUDED.vk,
    facebook = EXCLUDED.facebook,
    avatar_url = EXCLUDED.avatar_url,
    is_admin = EXCLUDED.is_admin,
    last_login = EXCLUDED.last_login,
    raw_data = EXCLUDED.raw_data;


-- ============================================================================
-- 3. СОЗДАНИЕ ТАБЛИЦЫ EARNINGS (История начислений)
-- ============================================================================

CREATE TABLE IF NOT EXISTS earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    level TEXT NOT NULL CHECK (level IN ('L0', 'L1', 'L2', 'L3', 'L4', 'L5')),
    
    order_type TEXT NOT NULL CHECK (order_type IN ('guest', 'partner')),
    product_sku TEXT,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    
    CONSTRAINT unique_earning_per_order_user_level 
        UNIQUE (order_id, user_id, level)
);

CREATE INDEX IF NOT EXISTS idx_earnings_order_id ON earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);
CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON earnings(created_at);

COMMENT ON TABLE earnings IS 'История начислений комиссий партнёрам';
COMMENT ON COLUMN earnings.level IS 'Уровень комиссии: L0-продавец, L1-L3 спонсоры';
COMMENT ON COLUMN earnings.order_type IS 'Тип заказа: guest (гость) или partner (партнёр)';


-- ============================================================================
-- 4. ФУНКЦИЯ get_upline — Получение цепочки спонсоров
-- ============================================================================

CREATE OR REPLACE FUNCTION get_upline(
    p_user_id TEXT,
    p_max_depth INT DEFAULT 3
)
RETURNS TABLE (
    level_num INT,
    sponsor_id TEXT,
    sponsor_name TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE upline AS (
        SELECT 
            1 AS lvl,
            p.referrer_id AS sponsor_id,
            (SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') 
             FROM profiles WHERE id = p.referrer_id) AS sponsor_name
        FROM profiles p
        WHERE p.id = p_user_id
          AND p.referrer_id IS NOT NULL
          AND p.referrer_id != ''
        
        UNION ALL
        
        SELECT 
            u.lvl + 1,
            p.referrer_id,
            (SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') 
             FROM profiles WHERE id = p.referrer_id) AS sponsor_name
        FROM upline u
        JOIN profiles p ON p.id = u.sponsor_id
        WHERE u.lvl < p_max_depth
          AND p.referrer_id IS NOT NULL
          AND p.referrer_id != ''
    )
    SELECT u.lvl, u.sponsor_id, u.sponsor_name
    FROM upline u
    WHERE u.sponsor_id IS NOT NULL
    ORDER BY u.lvl;
END;
$$;

COMMENT ON FUNCTION get_upline IS 'Возвращает цепочку спонсоров (upline) до 3 уровней';


-- ============================================================================
-- 5. ФУНКЦИЯ calculate_commission — Расчёт комиссий из ценовой лестницы
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_commission(
    p_retail NUMERIC,
    p_partner NUMERIC,
    p_level2 NUMERIC DEFAULT 0,
    p_level3 NUMERIC DEFAULT 0,
    p_company NUMERIC DEFAULT 0,
    p_is_partner BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_L0 NUMERIC;
    v_L1 NUMERIC;
    v_L2 NUMERIC;
    v_L3 NUMERIC;
BEGIN
    v_L0 := GREATEST(0, COALESCE(p_retail, 0) - COALESCE(p_partner, 0));
    
    IF COALESCE(p_level2, 0) > 0 THEN
        v_L1 := GREATEST(0, COALESCE(p_partner, 0) - p_level2);
    ELSE
        v_L1 := 0;
    END IF;
    
    IF COALESCE(p_level2, 0) > 0 AND COALESCE(p_level3, 0) > 0 THEN
        v_L2 := GREATEST(0, p_level2 - p_level3);
    ELSE
        v_L2 := 0;
    END IF;
    
    IF COALESCE(p_level3, 0) > 0 AND COALESCE(p_company, 0) > 0 THEN
        v_L3 := GREATEST(0, p_level3 - p_company);
    ELSE
        v_L3 := 0;
    END IF;
    
    IF p_is_partner THEN
        v_L0 := 0;
    END IF;
    
    RETURN jsonb_build_object(
        'L0', v_L0,
        'L1', v_L1,
        'L2', v_L2,
        'L3', v_L3,
        'is_partner', p_is_partner,
        'total', v_L0 + v_L1 + v_L2 + v_L3
    );
END;
$$;

COMMENT ON FUNCTION calculate_commission IS 'Рассчитывает комиссии L0-L3 из ценовой лестницы';


-- ============================================================================
-- 6. ГЛАВНАЯ ФУНКЦИЯ process_order_commission — Начисление комиссий
-- ============================================================================

CREATE OR REPLACE FUNCTION process_order_commission(
    p_order_id TEXT,
    p_buyer_id TEXT DEFAULT NULL,
    p_referrer_id TEXT DEFAULT NULL,
    p_is_partner BOOLEAN DEFAULT FALSE,
    p_product_sku TEXT DEFAULT NULL,
    p_L0 NUMERIC DEFAULT 0,
    p_L1 NUMERIC DEFAULT 0,
    p_L2 NUMERIC DEFAULT 0,
    p_L3 NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_upline RECORD;
    v_payouts JSONB := '[]'::JSONB;
    v_result JSONB;
    v_existing_count INT;
    v_payout_item JSONB;
    v_base_user_id TEXT;
    v_order_type TEXT;
BEGIN
    IF p_order_id IS NULL OR p_order_id = '' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'order_id is required'
        );
    END IF;
    
    SELECT COUNT(*) INTO v_existing_count
    FROM earnings
    WHERE order_id = p_order_id;
    
    IF v_existing_count > 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Order already processed',
            'order_id', p_order_id,
            'existing_count', v_existing_count
        );
    END IF;
    
    IF p_is_partner THEN
        v_order_type := 'partner';
        v_base_user_id := p_buyer_id;
    ELSE
        v_order_type := 'guest';
        v_base_user_id := p_referrer_id;
        
        IF v_base_user_id IS NOT NULL AND p_L0 > 0 THEN
            INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
            VALUES (p_order_id, v_base_user_id, p_L0, 'L0', v_order_type, p_product_sku)
            ON CONFLICT (order_id, user_id, level) DO NOTHING;
            
            v_payout_item := jsonb_build_object(
                'user_id', v_base_user_id,
                'amount', p_L0,
                'level', 'L0'
            );
            v_payouts := v_payouts || v_payout_item;
            
            UPDATE profiles 
            SET balance = balance + p_L0
            WHERE id = v_base_user_id;
        END IF;
    END IF;
    
    IF v_base_user_id IS NOT NULL THEN
        FOR v_upline IN 
            SELECT level_num, sponsor_id 
            FROM get_upline(v_base_user_id, 3)
        LOOP
            CASE v_upline.level_num
                WHEN 1 THEN
                    IF p_L1 > 0 THEN
                        INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
                        VALUES (p_order_id, v_upline.sponsor_id, p_L1, 'L1', v_order_type, p_product_sku)
                        ON CONFLICT (order_id, user_id, level) DO NOTHING;
                        
                        v_payout_item := jsonb_build_object(
                            'user_id', v_upline.sponsor_id,
                            'amount', p_L1,
                            'level', 'L1'
                        );
                        v_payouts := v_payouts || v_payout_item;
                        
                        UPDATE profiles 
                        SET balance = balance + p_L1
                        WHERE id = v_upline.sponsor_id;
                    END IF;
                    
                WHEN 2 THEN
                    IF p_L2 > 0 THEN
                        INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
                        VALUES (p_order_id, v_upline.sponsor_id, p_L2, 'L2', v_order_type, p_product_sku)
                        ON CONFLICT (order_id, user_id, level) DO NOTHING;
                        
                        v_payout_item := jsonb_build_object(
                            'user_id', v_upline.sponsor_id,
                            'amount', p_L2,
                            'level', 'L2'
                        );
                        v_payouts := v_payouts || v_payout_item;
                        
                        UPDATE profiles 
                        SET balance = balance + p_L2
                        WHERE id = v_upline.sponsor_id;
                    END IF;
                    
                WHEN 3 THEN
                    IF p_L3 > 0 THEN
                        INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
                        VALUES (p_order_id, v_upline.sponsor_id, p_L3, 'L3', v_order_type, p_product_sku)
                        ON CONFLICT (order_id, user_id, level) DO NOTHING;
                        
                        v_payout_item := jsonb_build_object(
                            'user_id', v_upline.sponsor_id,
                            'amount', p_L3,
                            'level', 'L3'
                        );
                        v_payouts := v_payouts || v_payout_item;
                        
                        UPDATE profiles 
                        SET balance = balance + p_L3
                        WHERE id = v_upline.sponsor_id;
                    END IF;
            END CASE;
        END LOOP;
    END IF;
    
    v_result := jsonb_build_object(
        'success', TRUE,
        'order_id', p_order_id,
        'is_partner', p_is_partner,
        'base_user', v_base_user_id,
        'commissions', jsonb_build_object('L0', p_L0, 'L1', p_L1, 'L2', p_L2, 'L3', p_L3),
        'payouts', v_payouts,
        'total_paid', (SELECT COALESCE(SUM((p->>'amount')::NUMERIC), 0) FROM jsonb_array_elements(v_payouts) p)
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION process_order_commission IS 'Начисляет комиссии по заказу. Идемпотентна — не начислит дважды.';


-- ============================================================================
-- 7. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_earnings_stats(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_id', p_user_id,
        'total_earned', COALESCE(SUM(amount), 0),
        'by_level', (
            SELECT COALESCE(jsonb_object_agg(level, level_sum), '{}'::JSONB)
            FROM (
                SELECT level, SUM(amount) as level_sum
                FROM earnings
                WHERE user_id = p_user_id
                GROUP BY level
            ) sub
        ),
        'by_type', (
            SELECT COALESCE(jsonb_object_agg(order_type, type_sum), '{}'::JSONB)
            FROM (
                SELECT order_type, SUM(amount) as type_sum
                FROM earnings
                WHERE user_id = p_user_id
                GROUP BY order_type
            ) sub
        ),
        'orders_count', COUNT(DISTINCT order_id),
        'last_earning', MAX(created_at)
    )
    INTO v_result
    FROM earnings
    WHERE user_id = p_user_id;
    
    IF v_result IS NULL OR (v_result->>'total_earned')::NUMERIC = 0 THEN
        v_result := jsonb_build_object(
            'user_id', p_user_id,
            'total_earned', 0,
            'by_level', '{}'::JSONB,
            'by_type', '{}'::JSONB,
            'orders_count', 0,
            'last_earning', NULL
        );
    END IF;
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_user_earnings_stats IS 'Возвращает статистику начислений пользователя';


CREATE OR REPLACE FUNCTION get_team_stats(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_result JSONB;
    v_direct_count INT;
    v_total_count INT;
BEGIN
    SELECT COUNT(*) INTO v_direct_count
    FROM profiles
    WHERE referrer_id = p_user_id;
    
    WITH RECURSIVE team AS (
        SELECT id, 1 as depth
        FROM profiles
        WHERE referrer_id = p_user_id
        
        UNION ALL
        
        SELECT p.id, t.depth + 1
        FROM profiles p
        JOIN team t ON p.referrer_id = t.id
        WHERE t.depth < 10
    )
    SELECT COUNT(*) INTO v_total_count FROM team;
    
    v_result := jsonb_build_object(
        'user_id', p_user_id,
        'direct_referrals', v_direct_count,
        'total_team', v_total_count,
        'by_level', (
            WITH RECURSIVE team AS (
                SELECT id, 1 as depth
                FROM profiles
                WHERE referrer_id = p_user_id
                
                UNION ALL
                
                SELECT p.id, t.depth + 1
                FROM profiles p
                JOIN team t ON p.referrer_id = t.id
                WHERE t.depth < 5
            )
            SELECT COALESCE(jsonb_object_agg(depth::TEXT, cnt), '{}'::JSONB)
            FROM (
                SELECT depth, COUNT(*) as cnt
                FROM team
                GROUP BY depth
            ) sub
        )
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_team_stats IS 'Возвращает статистику команды пользователя';


-- ============================================================================
-- 8. ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ============================================================================

/*
-- Проверка миграции данных:
SELECT id, email, first_name, last_name, referrer_id, balance, rank_level
FROM profiles
LIMIT 10;

-- Получение цепочки спонсоров:
SELECT * FROM get_upline('123', 3);

-- Расчёт комиссий из цен товара H2-1 (розница 6500, партнёр 4900):
SELECT calculate_commission(6500, 4900, 4000, 3500, 3300, FALSE);

-- Начисление комиссий за гостевой заказ:
SELECT process_order_commission(
    'order_001',           -- order_id
    NULL,                  -- buyer_id (NULL для гостя)
    'partner_123',         -- referrer_id (продавец)
    FALSE,                 -- is_partner
    'H2-1',               -- product_sku
    1600,                  -- L0
    900,                   -- L1
    500,                   -- L2
    200                    -- L3
);

-- Начисление комиссий за партнёрский заказ:
SELECT process_order_commission(
    'order_002',           -- order_id
    'partner_456',         -- buyer_id
    NULL,                  -- referrer_id (NULL для партнёра)
    TRUE,                  -- is_partner
    'H2-3',               -- product_sku
    0,                     -- L0 (0 для партнёра)
    1800,                  -- L1
    1200,                  -- L2
    600                    -- L3
);

-- Статистика начислений пользователя:
SELECT get_user_earnings_stats('partner_123');

-- Статистика команды:
SELECT get_team_stats('partner_123');

-- Проверка идемпотентности (повторный вызов вернёт ошибку):
SELECT process_order_commission('order_001', NULL, 'partner_123', FALSE, 'H2-1', 1600, 900, 500, 200);
-- Результат: {"success": false, "error": "Order already processed", ...}
*/


-- ============================================================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================================================
