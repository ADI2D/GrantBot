# Apply Pricing Plans Migration

## Quick Fix for "pricing_plans table not found" Error

### Option 1: Apply via Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Copy the contents of `supabase/migrations/20241101_pricing_plans.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Cmd+Enter)

### Option 2: Apply via Supabase CLI

```bash
cd /Users/alexbach/Library/CloudStorage/OneDrive-Personal/Alex/_Startup/CODEX/grantbot-app
supabase db push
```

### What This Creates

The migration creates a `pricing_plans` table with three default plans:

| ID | Name | Price | Max Proposals/Month |
|----|------|-------|---------------------|
| starter | Starter | $249/mo | 2 |
| growth | Growth | $499/mo | 10 |
| impact | Impact | $999/mo | 999 (unlimited) |

### After Applying

Refresh your `/opportunities` page and the `pricing_plans` error should be gone.

---

## Still See Errors?

If you still see errors after applying the migration, the billing component might be loaded on the opportunities page. You can temporarily hide it by checking the page code.
