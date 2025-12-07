-- ============================================================================
-- МИГРАЦИЯ: Перенос логики начисления комиссий из TypeScript в PostgreSQL
-- Дата: 2025-12-07
-- Автор: Hydrogen MLM System
-- ============================================================================
--
-- СТРУКТУРА КОМИССИЙ (Price Ladder):
--   P0: Розничная цена (цена_розница) — для гостей
--   P1: Партнёрская цена (цена1) — уровень 1
--   P2: Цена уровня 2 (цена2)
--   P3: Цена уровня 3 (цена3)
--   P_company: Цена компании (цена4)
--
-- ФОРМУЛЫ РАСЧЁТА:
--   L0 = max(0, P0 - P1)                              -- Всегда
--   L1 = P2 > 0 ? max(0, P1 - P2) : 0                 -- Только если P2 задано
--   L2 = (P2 > 0 AND P3 > 0) ? max(0, P2 - P3) : 0    -- Только если P2 и P3 заданы
--   L3 = (P3 > 0 AND P_company > 0) ? max(0, P3 - P_company) : 0
--
-- БИЗНЕС-ЛОГИКА:
--   Гостевая продажа:    L0→продавец, L1/L2/L3→спонсоры продавца
--   Партнёрская покупка: L0=0, L1/L2/L3→спонсоры покупателя
-- ============================================================================

-- ============================================================================
-- 1. ТАБЛИЦА ДЛЯ ХРАНЕНИЯ НАЧИСЛЕНИЙ (earnings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    level TEXT NOT NULL CHECK (level IN ('L0', 'L1', 'L2', 'L3', 'L4', 'L5')),
    
    order_type TEXT NOT NULL CHECK (order_type IN ('guest', 'partner')),
    product_sku TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_earning_per_order_user_level 
        UNIQUE (order_id, user_id, level)
);

CREATE INDEX IF NOT EXISTS idx_earnings_order_id ON earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON earnings(created_at);

COMMENT ON TABLE earnings IS 'Начисления комиссий партнёрам по заказам';
COMMENT ON COLUMN earnings.level IS 'Уровень комиссии: L0-продавец, L1-L3 спонсоры';


-- ============================================================================
-- 2. ФУНКЦИЯ get_upline — получение цепочки спонсоров через RECURSIVE CTE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_upline(
    p_user_id TEXT,
    p_max_depth INT DEFAULT 3
)
RETURNS TABLE (
    level_num INT,
    sponsor_id TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE upline AS (
        SELECT 
            1 AS lvl,
            (p.data->>'пригласившийId')::TEXT AS sponsor_id
        FROM profiles p
        WHERE p.id = p_user_id
          AND p.data->>'пригласившийId' IS NOT NULL
          AND p.data->>'пригласившийId' != ''
        
        UNION ALL
        
        SELECT 
            u.lvl + 1,
            (p.data->>'пригласившийId')::TEXT
        FROM upline u
        JOIN profiles p ON p.id = u.sponsor_id
        WHERE u.lvl < p_max_depth
          AND p.data->>'пригласившийId' IS NOT NULL
          AND p.data->>'пригласившийId' != ''
    )
    SELECT lvl, upline.sponsor_id
    FROM upline
    WHERE upline.sponsor_id IS NOT NULL
    ORDER BY lvl;
END;
$$;

COMMENT ON FUNCTION get_upline IS 'Возвращает цепочку спонсоров для пользователя (до 3 уровней по умолчанию)';


-- ============================================================================
-- 3. ФУНКЦИЯ calculate_commission_from_prices — расчёт комиссий из ценовой лестницы
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_commission_from_prices(
    p_retail NUMERIC,      -- P0: Розничная цена
    p_partner NUMERIC,     -- P1: Партнёрская цена
    p_level2 NUMERIC DEFAULT 0,      -- P2: Цена уровня 2
    p_level3 NUMERIC DEFAULT 0,      -- P3: Цена уровня 3
    p_company NUMERIC DEFAULT 0,     -- P_company: Цена компании
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

COMMENT ON FUNCTION calculate_commission_from_prices IS 'Рассчитывает комиссии L0-L3 из ценовой лестницы товара';


-- ============================================================================
-- 4. ФУНКЦИЯ process_order_commission — основная функция начисления комиссий
-- ============================================================================

CREATE OR REPLACE FUNCTION process_order_commission(
    p_commission_plan JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id TEXT;
    v_buyer_id TEXT;
    v_referrer_id TEXT;
    v_product_sku TEXT;
    v_is_partner BOOLEAN;
    
    v_L0 NUMERIC;
    v_L1 NUMERIC;
    v_L2 NUMERIC;
    v_L3 NUMERIC;
    
    v_upline RECORD;
    v_payouts JSONB := '[]'::JSONB;
    v_result JSONB;
    v_existing_count INT;
    v_payout_item JSONB;
BEGIN
    v_order_id := p_commission_plan->>'order_id';
    v_buyer_id := p_commission_plan->>'buyer_id';
    v_referrer_id := p_commission_plan->>'referrer_id';
    v_product_sku := p_commission_plan->>'product_sku';
    v_is_partner := COALESCE((p_commission_plan->>'is_partner')::BOOLEAN, FALSE);
    
    IF v_order_id IS NULL OR v_order_id = '' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'order_id is required'
        );
    END IF;
    
    SELECT COUNT(*) INTO v_existing_count
    FROM earnings
    WHERE order_id = v_order_id;
    
    IF v_existing_count > 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Order already processed',
            'order_id', v_order_id,
            'existing_count', v_existing_count
        );
    END IF;
    
    IF p_commission_plan ? 'commissions' THEN
        v_L0 := COALESCE((p_commission_plan->'commissions'->>'L0')::NUMERIC, 0);
        v_L1 := COALESCE((p_commission_plan->'commissions'->>'L1')::NUMERIC, 0);
        v_L2 := COALESCE((p_commission_plan->'commissions'->>'L2')::NUMERIC, 0);
        v_L3 := COALESCE((p_commission_plan->'commissions'->>'L3')::NUMERIC, 0);
    ELSIF p_commission_plan ? 'prices' THEN
        DECLARE
            v_calc JSONB;
        BEGIN
            v_calc := calculate_commission_from_prices(
                (p_commission_plan->'prices'->>'P0')::NUMERIC,
                (p_commission_plan->'prices'->>'P1')::NUMERIC,
                (p_commission_plan->'prices'->>'P2')::NUMERIC,
                (p_commission_plan->'prices'->>'P3')::NUMERIC,
                (p_commission_plan->'prices'->>'P_company')::NUMERIC,
                v_is_partner
            );
            v_L0 := (v_calc->>'L0')::NUMERIC;
            v_L1 := (v_calc->>'L1')::NUMERIC;
            v_L2 := (v_calc->>'L2')::NUMERIC;
            v_L3 := (v_calc->>'L3')::NUMERIC;
        END;
    ELSE
        v_L0 := COALESCE((p_commission_plan->>'L0')::NUMERIC, 0);
        v_L1 := COALESCE((p_commission_plan->>'L1')::NUMERIC, 0);
        v_L2 := COALESCE((p_commission_plan->>'L2')::NUMERIC, 0);
        v_L3 := COALESCE((p_commission_plan->>'L3')::NUMERIC, 0);
    END IF;
    
    IF NOT v_is_partner THEN
        IF v_referrer_id IS NOT NULL AND v_referrer_id != '' AND v_L0 > 0 THEN
            INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
            VALUES (v_order_id, v_referrer_id, v_L0, 'L0', 'guest', v_product_sku)
            ON CONFLICT (order_id, user_id, level) DO NOTHING;
            
            v_payout_item := jsonb_build_object(
                'user_id', v_referrer_id,
                'amount', v_L0,
                'level', 'L0'
            );
            v_payouts := v_payouts || v_payout_item;
            
            FOR v_upline IN 
                SELECT level_num, sponsor_id 
                FROM get_upline(v_referrer_id, 3)
            LOOP
                CASE v_upline.level_num
                    WHEN 1 THEN
                        IF v_L1 > 0 THEN
                            INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
                            VALUES (v_order_id, v_upline.sponsor_id, v_L1, 'L1', 'guest', v_product_sku)
                            ON CONFLICT (order_id, user_id, level) DO NOTHING;
                            
                            v_payout_item := jsonb_build_object(
                                'user_id', v_upline.sponsor_id,
                                'amount', v_L1,
                                'level', 'L1'
                            );
                            v_payouts := v_payouts || v_payout_item;
                        END IF;
                    WHEN 2 THEN
                        IF v_L2 > 0 THEN
                            INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
                            VALUES (v_order_id, v_upline.sponsor_id, v_L2, 'L2', 'guest', v_product_sku)
                            ON CONFLICT (order_id, user_id, level) DO NOTHING;
                            
                            v_payout_item := jsonb_build_object(
                                'user_id', v_upline.sponsor_id,
                                'amount', v_L2,
                                'level', 'L2'
                            );
                            v_payouts := v_payouts || v_payout_item;
                        END IF;
                    WHEN 3 THEN
                        IF v_L3 > 0 THEN
                            INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
                            VALUES (v_order_id, v_upline.sponsor_id, v_L3, 'L3', 'guest', v_product_sku)
                            ON CONFLICT (order_id, user_id, level) DO NOTHING;
                            
                            v_payout_item := jsonb_build_object(
                                'user_id', v_upline.sponsor_id,
                                'amount', v_L3,
                                'level', 'L3'
                            );
                            v_payouts := v_payouts || v_payout_item;
                        END IF;
                END CASE;
            END LOOP;
        END IF;
    ELSE
        IF v_buyer_id IS NOT NULL AND v_buyer_id != '' THEN
            FOR v_upline IN 
                SELECT level_num, sponsor_id 
                FROM get_upline(v_buyer_id, 3)
            LOOP
                CASE v_upline.level_num
                    WHEN 1 THEN
                        IF v_L1 > 0 THEN
                            INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
                            VALUES (v_order_id, v_upline.sponsor_id, v_L1, 'L1', 'partner', v_product_sku)
                            ON CONFLICT (order_id, user_id, level) DO NOTHING;
                            
                            v_payout_item := jsonb_build_object(
                                'user_id', v_upline.sponsor_id,
                                'amount', v_L1,
                                'level', 'L1'
                            );
                            v_payouts := v_payouts || v_payout_item;
                        END IF;
                    WHEN 2 THEN
                        IF v_L2 > 0 THEN
                            INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
                            VALUES (v_order_id, v_upline.sponsor_id, v_L2, 'L2', 'partner', v_product_sku)
                            ON CONFLICT (order_id, user_id, level) DO NOTHING;
                            
                            v_payout_item := jsonb_build_object(
                                'user_id', v_upline.sponsor_id,
                                'amount', v_L2,
                                'level', 'L2'
                            );
                            v_payouts := v_payouts || v_payout_item;
                        END IF;
                    WHEN 3 THEN
                        IF v_L3 > 0 THEN
                            INSERT INTO earnings (order_id, user_id, amount, level, order_type, product_sku)
                            VALUES (v_order_id, v_upline.sponsor_id, v_L3, 'L3', 'partner', v_product_sku)
                            ON CONFLICT (order_id, user_id, level) DO NOTHING;
                            
                            v_payout_item := jsonb_build_object(
                                'user_id', v_upline.sponsor_id,
                                'amount', v_L3,
                                'level', 'L3'
                            );
                            v_payouts := v_payouts || v_payout_item;
                        END IF;
                END CASE;
            END LOOP;
        END IF;
    END IF;
    
    v_result := jsonb_build_object(
        'success', TRUE,
        'order_id', v_order_id,
        'is_partner', v_is_partner,
        'commissions_used', jsonb_build_object('L0', v_L0, 'L1', v_L1, 'L2', v_L2, 'L3', v_L3),
        'payouts', v_payouts,
        'total_paid', (SELECT COALESCE(SUM((p->>'amount')::NUMERIC), 0) FROM jsonb_array_elements(v_payouts) p)
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION process_order_commission IS 'Начисляет комиссии по заказу. Принимает JSON с планом комиссий. Идемпотентна — не начислит дважды.';


-- ============================================================================
-- 5. ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Получение статистики начислений пользователя
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
        'by_level', jsonb_object_agg(level, level_total),
        'by_type', jsonb_object_agg(order_type, type_total),
        'orders_count', COUNT(DISTINCT order_id),
        'last_earning', MAX(created_at)
    )
    INTO v_result
    FROM (
        SELECT 
            level, 
            SUM(amount) as level_total,
            order_type,
            order_id,
            amount,
            created_at
        FROM earnings
        WHERE user_id = p_user_id
        GROUP BY level, order_type, order_id, amount, created_at
    ) sub
    CROSS JOIN LATERAL (
        SELECT SUM(amount) as type_total 
        FROM earnings 
        WHERE user_id = p_user_id 
        GROUP BY order_type
    ) type_sub;
    
    IF v_result IS NULL THEN
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


-- ============================================================================
-- 6. ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ============================================================================

-- Пример 1: Гостевая покупка с явными комиссиями
/*
SELECT process_order_commission('{
    "order_id": "order_001",
    "referrer_id": "partner_123",
    "product_sku": "H2-1",
    "is_partner": false,
    "commissions": {
        "L0": 1600,
        "L1": 900,
        "L2": 500,
        "L3": 200
    }
}'::JSONB);
*/

-- Пример 2: Партнёрская покупка с расчётом из цен
/*
SELECT process_order_commission('{
    "order_id": "order_002",
    "buyer_id": "partner_456",
    "product_sku": "H2-3",
    "is_partner": true,
    "prices": {
        "P0": 18000,
        "P1": 13500,
        "P2": 11700,
        "P3": 10500,
        "P_company": 9900
    }
}'::JSONB);
*/

-- Пример 3: Проверка идемпотентности (повторный вызов вернёт ошибку)
/*
SELECT process_order_commission('{
    "order_id": "order_001",
    "referrer_id": "partner_123",
    "is_partner": false,
    "L0": 1600, "L1": 900, "L2": 500, "L3": 200
}'::JSONB);
-- Вернёт: {"success": false, "error": "Order already processed", ...}
*/

-- Пример 4: Получение цепочки спонсоров
/*
SELECT * FROM get_upline('partner_123', 3);
*/

-- Пример 5: Расчёт комиссий из ценовой лестницы
/*
SELECT calculate_commission_from_prices(6500, 4900, 4000, 3500, 3300, FALSE);
-- Вернёт: {"L0": 1600, "L1": 900, "L2": 500, "L3": 200, "is_partner": false, "total": 3200}
*/


-- ============================================================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================================================
