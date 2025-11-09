import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-server';
import { getAllFocusAreas } from '@/types/focus-areas';

/**
 * GET /api/focus-areas
 * Fetch all active focus areas from taxonomy
 */
export async function GET() {
  try {
    const supabase = await createRouteSupabase();

    // Fetch from database (in case it's been customized)
    const { data, error } = await supabase
      .from('focus_area_taxonomy')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[focus-areas] Database error:', error);
      // Fallback to hardcoded taxonomy
      return NextResponse.json({ focusAreas: getAllFocusAreas() });
    }

    return NextResponse.json({ focusAreas: data || getAllFocusAreas() });
  } catch (error) {
    console.error('[focus-areas] Unexpected error:', error);
    // Fallback to hardcoded taxonomy
    return NextResponse.json({ focusAreas: getAllFocusAreas() });
  }
}
