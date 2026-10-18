-- Convert an existing PostgreSQL installation from USD base amounts to INR.
-- Run once against the existing expense database before starting the updated app.
ALTER TABLE receipts RENAME COLUMN base_amount_usd TO base_amount_inr;

UPDATE receipts
SET exchange_rate = exchange_rate * 83.5,
    base_amount_inr = base_amount_inr * 83.5,
    approved_amount = approved_amount * 83.5;

-- Existing policy amounts were denominated in USD. Preserve their relative
-- values while changing the policy currency to INR.
UPDATE policies
SET rules = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(rules, '{monthly_limit}', to_jsonb((rules->>'monthly_limit')::numeric * 83.5)),
          '{approval_threshold}', to_jsonb((rules->>'approval_threshold')::numeric * 83.5)
        ),
        '{client_meal_per_person_limit}', to_jsonb((rules->>'client_meal_per_person_limit')::numeric * 83.5)
      ),
      '{city_daily_caps}', (
        SELECT jsonb_object_agg(key, to_jsonb(value::numeric * 83.5))
        FROM jsonb_each_text(rules->'city_daily_caps')
      )
    ),
    '{category_caps}', (
      SELECT jsonb_object_agg(key, to_jsonb(value::numeric * 83.5))
      FROM jsonb_each_text(rules->'category_caps')
    )
)
WHERE rules ? 'monthly_limit';
