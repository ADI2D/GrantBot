# Supabase Rate Limit - Troubleshooting Guide

## 🚨 Error Message
```
Request rate limit reached
```

## 📋 What Happened

Supabase has rate limits on authentication requests to prevent abuse. Your project has exceeded the allowed number of requests within a time window.

## 🔍 Common Causes

### 1. **Free Tier Limits** (Most Likely)
Supabase Free tier has these rate limits:
- **60 requests per hour** for auth endpoints
- **100 requests per 10 seconds** for database queries
- Applies per IP address

### 2. **Development Environment**
- Hot-reloading triggering multiple auth checks
- Multiple browser tabs/windows
- Middleware checking session on every page load
- Automatic retries on failed requests

### 3. **Multiple Failed Login Attempts**
- Typing wrong password multiple times
- Testing with invalid credentials
- Automated tests hitting auth endpoints

### 4. **Session Checks**
- Middleware runs on every request
- Components checking auth state repeatedly
- Page reloads triggering session validation

## ✅ Immediate Solutions

### Solution 1: Wait It Out (Easiest)
**Time required**: 30-60 minutes

The rate limit resets automatically. Just wait and try again.

```bash
# Check back in:
# - 10 minutes (for burst limits)
# - 1 hour (for hourly limits)
```

### Solution 2: Different Browser/Device
Try logging in from:
- ✅ Incognito/Private browsing mode
- ✅ Different browser (Chrome → Firefox)
- ✅ Different device (phone, tablet)
- ✅ Different network (mobile hotspot, VPN)

This bypasses IP-based rate limiting.

### Solution 3: Check Supabase Dashboard

1. **Go to your project**:
   ```
   https://app.supabase.com/project/wwwrchacbyepnvbqhgnb
   ```

2. **Check Auth Logs**:
   - Left sidebar → **Authentication** → **Logs**
   - Look for recent failed attempts
   - Check for patterns (same email, same IP)

3. **Check API Usage**:
   - Left sidebar → **Settings** → **API**
   - View rate limit status
   - Check current request count

4. **Check Database Logs**:
   - Left sidebar → **Logs** → **Database**
   - Look for excessive queries

### Solution 4: Clear Browser Data

```bash
# Clear browser cache and cookies
# 1. Open DevTools (F12)
# 2. Application tab
# 3. Clear storage
# 4. Refresh page
```

Or in Chrome:
1. Settings → Privacy → Clear browsing data
2. Select "Cookies" and "Cached images"
3. Clear data
4. Try logging in again

### Solution 5: Restart Dev Server

```bash
# Stop server
# Ctrl+C or Cmd+C

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

## 🔧 Long-Term Fixes

### Fix 1: Add Rate Limit Handling (✅ Already Implemented)

The login form now shows user-friendly messages:
```typescript
if (error.message.includes("rate limit") || error.status === 429) {
  throw new Error("Too many login attempts. Please wait a few minutes and try again.");
}
```

### Fix 2: Reduce Session Checks

Check your middleware to ensure it's not over-checking:

```typescript
// Bad: Check on every request
export async function middleware(request: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession(); // Every request!
  // ...
}

// Good: Only check on protected routes
export const config = {
  matcher: ['/dashboard/:path*', '/workspace/:path*', '/admin/:path*']
};
```

### Fix 3: Add Caching

Cache session checks to reduce API calls:

```typescript
// In your auth provider
const [session, setSession] = useState(null);

useEffect(() => {
  // Check session once on mount
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
  });

  // Listen for changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
    }
  );

  return () => subscription.unsubscribe();
}, []); // Only on mount!
```

### Fix 4: Upgrade Supabase Plan

If you need higher limits:

**Free Tier**:
- 60 auth requests/hour
- 50,000 monthly active users

**Pro Tier** ($25/month):
- Higher rate limits
- 100,000 monthly active users
- Priority support

Go to: Settings → Billing → Upgrade

## 🐛 Debugging Steps

### Step 1: Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by "auth" or "supabase"
4. Look for:
   - 429 status codes (rate limit)
   - Multiple rapid requests
   - Failed requests being retried

### Step 2: Check Console Logs

Look for error messages:
```javascript
// Rate limit error
{
  message: "Request rate limit reached",
  status: 429,
  code: "over_request_rate_limit"
}
```

### Step 3: Test Auth Directly

Try using the Supabase Dashboard to test auth:
1. Go to Authentication → Users
2. Click "Add user"
3. If this also fails → definitely rate limited
4. If this works → issue is in your code

### Step 4: Check for Loops

Search your code for potential infinite loops:

```bash
# Search for auth checks
grep -r "getSession" src/
grep -r "getUser" src/
grep -r "signInWithPassword" src/

# Look for useEffect without dependencies
grep -A 5 "useEffect" src/
```

## 🎯 Prevention Tips

### 1. Use Environment Detection

```typescript
// Only enable auth checks in production
if (process.env.NODE_ENV === 'production') {
  // Strict auth checks
} else {
  // Relaxed checks during development
}
```

### 2. Add Request Debouncing

```typescript
import { debounce } from 'lodash';

const debouncedLogin = debounce(async (email, password) => {
  await supabase.auth.signInWithPassword({ email, password });
}, 1000); // Wait 1 second between attempts
```

### 3. Implement Client-Side Rate Limiting

```typescript
const lastAttempt = useRef(0);

const handleLogin = async () => {
  const now = Date.now();
  if (now - lastAttempt.current < 2000) {
    alert("Please wait before trying again");
    return;
  }

  lastAttempt.current = now;
  // Proceed with login
};
```

### 4. Add Retry Logic with Backoff

```typescript
const loginWithRetry = async (email: string, password: string, attempt = 1) => {
  try {
    return await supabase.auth.signInWithPassword({ email, password });
  } catch (error) {
    if (error.status === 429 && attempt < 3) {
      // Exponential backoff: 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      return loginWithRetry(email, password, attempt + 1);
    }
    throw error;
  }
};
```

## 📊 Monitoring

### Check Current Usage

```bash
# View Supabase logs
supabase logs --project-ref wwwrchacbyepnvbqhgnb

# View auth events
supabase logs --filter "auth" --project-ref wwwrchacbyepnvbqhgnb
```

### Set Up Alerts

In Supabase Dashboard:
1. Go to **Settings** → **Alerts**
2. Create alert for "High API usage"
3. Get notified before hitting limits

## 🆘 Still Having Issues?

### Option 1: Contact Supabase Support

If you're on Pro plan:
- Email: support@supabase.com
- Dashboard: Settings → Support

### Option 2: Check Supabase Status

```
https://status.supabase.com
```

Look for ongoing incidents or maintenance.

### Option 3: Community Help

Post in:
- Supabase Discord: https://discord.supabase.com
- GitHub Discussions: https://github.com/supabase/supabase/discussions
- Stack Overflow: Tag `supabase`

### Option 4: Alternative Auth

Temporary workaround while debugging:
```typescript
// Use service role key for development only
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bypasses rate limits
);

// WARNING: Only for development!
// Never expose service role key in production!
```

## 📝 Summary

**Quick Fix**: Wait 30-60 minutes, then try again

**Best Practice**:
1. ✅ Add rate limit error handling (done)
2. ✅ Reduce unnecessary session checks
3. ✅ Cache auth state
4. ✅ Add client-side rate limiting
5. ✅ Monitor usage in Supabase Dashboard

**If Persistent**: Upgrade to Pro plan for higher limits

## ✅ Checklist

- [ ] Waited at least 30 minutes
- [ ] Tried different browser/incognito
- [ ] Checked Supabase Dashboard for errors
- [ ] Cleared browser cache/cookies
- [ ] Restarted dev server
- [ ] Checked for infinite loops in code
- [ ] Verified middleware isn't over-checking
- [ ] Considered upgrading Supabase plan

---

**Your login form now has better rate limit handling!** It will show a clear message when rate limits are hit instead of generic errors.
