import { getDb } from "../client";

export type HabitSuggestion = {
  item_id: number;
  name: string;
  category: string;
  purchase_count: number;
  avg_interval_days: number;
  last_purchased: string;
  days_since_last: number;
  days_overdue: number;
};

/**
 * Suggests items that are "due" for repurchase, based purely on the average
 * gap between past purchases (no ML — just SQL aggregation over history).
 * Requires at least 3 purchases so the average is meaningful.
 */
export async function getHabitSuggestions(lookbackDays = 180): Promise<HabitSuggestion[]> {
  const db = await getDb();
  return db.getAllAsync<HabitSuggestion>(
    `WITH gaps AS (
       SELECT
         item_id,
         purchased_date,
         julianday(purchased_date) - julianday(LAG(purchased_date) OVER (
           PARTITION BY item_id ORDER BY purchased_date
         )) AS gap_days
       FROM purchase_history
       WHERE purchased_date >= date('now', ?)
     ),
     stats AS (
       SELECT
         item_id,
         COUNT(*) + 1 AS purchase_count,
         AVG(gap_days) AS avg_interval_days,
         MAX(purchased_date) AS last_purchased
       FROM gaps
       WHERE gap_days IS NOT NULL
       GROUP BY item_id
       HAVING COUNT(*) >= 2
     )
     SELECT
       s.item_id,
       i.name,
       i.category,
       s.purchase_count,
       ROUND(s.avg_interval_days, 1) AS avg_interval_days,
       s.last_purchased,
       CAST(julianday('now', 'localtime') - julianday(s.last_purchased) AS INTEGER) AS days_since_last,
       CAST((julianday('now', 'localtime') - julianday(s.last_purchased)) - s.avg_interval_days AS INTEGER) AS days_overdue
     FROM stats s
     JOIN items i ON i.id = s.item_id
     WHERE (julianday('now', 'localtime') - julianday(s.last_purchased)) >= s.avg_interval_days
     ORDER BY days_overdue DESC;`,
    [`-${lookbackDays} days`]
  );
}

/** Raw purchase interval stats for a single item, e.g. for a detail view. */
export async function getItemPurchaseStats(itemId: number) {
  const db = await getDb();
  return db.getFirstAsync<{ purchase_count: number; avg_interval_days: number | null; last_purchased: string | null }>(
    `WITH gaps AS (
       SELECT
         purchased_date,
         julianday(purchased_date) - julianday(LAG(purchased_date) OVER (ORDER BY purchased_date)) AS gap_days
       FROM purchase_history
       WHERE item_id = ?
     )
     SELECT
       (SELECT COUNT(*) FROM purchase_history WHERE item_id = ?) AS purchase_count,
       ROUND(AVG(gap_days), 1) AS avg_interval_days,
       (SELECT MAX(purchased_date) FROM purchase_history WHERE item_id = ?) AS last_purchased
     FROM gaps;`,
    [itemId, itemId, itemId]
  );
}
