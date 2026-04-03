/**
 * Shared Supabase query helpers for dual-provider services.
 *
 * Used by content.js, cases.js, circles.js, etc. when their
 * provider flag is set to 'supabase'.
 */
import { getSupabase } from '@/api/supabaseClient';

/**
 * Parse a Base44-style sort string into Supabase order params.
 * e.g., '-created_date' → { column: 'created_at', ascending: false }
 */
export function parseSort(sortStr) {
  if (!sortStr) return { column: 'created_at', ascending: false };
  const desc = sortStr.startsWith('-');
  const column = desc ? sortStr.slice(1) : sortStr;
  // Map Base44 field names to Supabase column names
  const mapped = column === 'created_date' ? 'created_at'
    : column === 'updated_date' ? 'updated_at'
    : column;
  return { column: mapped, ascending: !desc };
}

/**
 * Run a Supabase query with Base44-compatible filter/sort/limit interface.
 *
 * @param {string} table - Supabase table name
 * @param {object} [opts]
 * @param {object} [opts.filters] - { column: value } equality filters
 * @param {string} [opts.sort] - Base44-style sort string (e.g., '-created_date')
 * @param {number} [opts.limit] - Max rows to return
 * @returns {Promise<any[]>}
 */
export async function supabaseQuery(table, { filters = {}, sort, limit } = {}) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase client not available');
  let query = sb.from(table).select('*');
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  if (sort) {
    const { column, ascending } = parseSort(sort);
    query = query.order(column, { ascending });
  }
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
