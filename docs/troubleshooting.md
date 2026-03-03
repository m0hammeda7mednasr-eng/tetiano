# Troubleshooting Guide

## Common Issues and Solutions

### 1. Authentication Issues

#### Problem: "Invalid or expired token"
**Symptoms:**
- 401 errors on API calls
- User logged out unexpectedly

**Solutions:**
1. Check if Supabase session is valid:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   console.log(session);
   ```

2. Verify environment variables:
   - Frontend: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Backend: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

3. Check token expiration (default 1 hour)
4. Implement token refresh in frontend

#### Problem: "User not assigned to any team"
**Symptoms:**
- 403 errors after login
- Cannot access any resources

**Solutions:**
1. Check `team_members` table:
   ```sql
   SELECT * FROM team_members WHERE user_id = 'user-uuid';
   ```

2. Assign user to team:
   ```sql
   INSERT INTO team_members (user_id, team_id, role)
   VALUES ('user-uuid', 'team-uuid', 'admin');
   ```

### 2. Webhook Issues

#### Problem: Webhooks not being received
**Symptoms:**
- Inventory not syncing
- No webhook events in database

**Solutions:**
1. Check webhook configuration in Shopify:
   - Settings → Notifications → Webhooks
   - Verify URL is correct
   - Check webhook status (should be "Enabled")

2. Test webhook endpoint:
   ```bash
   curl -X POST https://your-backend.com/health
   ```

3. Check Shopify webhook logs:
   - View delivery attempts
   - Check for errors

4. Verify backend is accessible:
   - Not behind firewall
   - HTTPS enabled
   - Correct port exposed

#### Problem: "Invalid webhook signature"
**Symptoms:**
- 401 errors in webhook logs
- Webhooks rejected

**Solutions:**
1. Verify `SHOPIFY_WEBHOOK_SECRET` matches Shopify:
   - Get from Shopify webhook settings
   - Update in backend `.env`

2. Check HMAC verification code:
   ```typescript
   const hmac = req.headers['x-shopify-hmac-sha256'];
   const hash = crypto
     .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
     .update(rawBody, 'utf8')
     .digest('base64');
   ```

3. Ensure raw body is used for verification

#### Problem: Duplicate webhook processing
**Symptoms:**
- Stock movements recorded twice
- Inventory incorrect

**Solutions:**
1. Check idempotency implementation:
   ```sql
   SELECT * FROM shopify_webhook_events 
   WHERE event_hash = 'hash' AND processed = true;
   ```

2. Verify event hash generation is consistent

3. Check for race conditions in async processing

### 3. Inventory Sync Issues

#### Problem: Stock levels don't match Shopify
**Symptoms:**
- Local inventory differs from Shopify
- Manual adjustments not reflected

**Solutions:**
1. Check recent stock movements:
   ```sql
   SELECT * FROM stock_movements 
   WHERE variant_id = 'variant-uuid'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. Verify Shopify API credentials:
   - Access token valid
   - Correct location ID
   - Proper scopes granted

3. Manual sync from Shopify:
   ```bash
   POST /api/inventory/sync/:brandId/:productId
   ```

4. Check for failed API calls in logs

#### Problem: "Resulting quantity cannot be negative"
**Symptoms:**
- Cannot adjust stock
- Error on manual adjustment

**Solutions:**
1. Check current inventory level
2. Adjust delta to not go below zero
3. If legitimate, set to zero first, then adjust

### 4. Database Issues

#### Problem: RLS policy errors
**Symptoms:**
- "new row violates row-level security policy"
- Cannot insert/update records

**Solutions:**
1. Check user has team membership:
   ```sql
   SELECT * FROM team_members WHERE user_id = auth.uid();
   ```

2. Verify RLS policies are correct:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'table_name';
   ```

3. Use service role for backend operations:
   ```typescript
   // Backend should use SUPABASE_SERVICE_KEY
   const supabase = createClient(url, serviceKey);
   ```

4. Check helper functions:
   ```sql
   SELECT get_user_team_ids(auth.uid());
   SELECT get_user_brand_ids(auth.uid());
   ```

#### Problem: Slow queries
**Symptoms:**
- API timeouts
- Long load times

**Solutions:**
1. Check query execution plan:
   ```sql
   EXPLAIN ANALYZE SELECT ...;
   ```

2. Add missing indexes:
   ```sql
   CREATE INDEX idx_name ON table(column);
   ```

3. Optimize queries:
   - Limit results
   - Use pagination
   - Avoid N+1 queries

4. Monitor Supabase dashboard for slow queries

### 5. Frontend Issues

#### Problem: "Network Error" on API calls
**Symptoms:**
- API calls fail
- CORS errors in console

**Solutions:**
1. Check `VITE_API_URL` is correct
2. Verify backend is running
3. Check CORS configuration in backend:
   ```typescript
   app.use(cors({
     origin: ['http://localhost:5173', 'https://your-frontend.com']
   }));
   ```

4. Check browser console for details

#### Problem: Components not updating
**Symptoms:**
- Stale data displayed
- Changes not reflected

**Solutions:**
1. Check state management:
   ```typescript
   // Zustand store
   const { user } = useAuthStore();
   ```

2. Verify API calls are made:
   ```typescript
   useEffect(() => {
     fetchData();
   }, [dependency]);
   ```

3. Check for errors in console
4. Implement proper loading states

### 6. Scheduled Jobs Issues

#### Problem: Daily report reminders not sent
**Symptoms:**
- No notifications at 18:00
- Cron job not running

**Solutions:**
1. Check cron expression:
   ```typescript
   cron.schedule('0 16 * * *', job, {
     timezone: 'Africa/Cairo'
   });
   ```

2. Verify timezone is correct:
   ```bash
   echo $TZ
   # Should be: Africa/Cairo
   ```

3. Check logs at scheduled time
4. Test job manually:
   ```typescript
   await dailyReportReminder();
   ```

5. Ensure backend is running continuously

### 7. Shopify API Issues

#### Problem: "Rate limit exceeded"
**Symptoms:**
- 429 errors
- API calls failing

**Solutions:**
1. Implement rate limiting:
   ```typescript
   // Wait between requests
   await new Promise(resolve => setTimeout(resolve, 500));
   ```

2. Use GraphQL for efficiency:
   - Batch operations
   - Request only needed fields

3. Cache product data locally
4. Implement exponential backoff

#### Problem: "Invalid API credentials"
**Symptoms:**
- 401 errors from Shopify
- Cannot access products

**Solutions:**
1. Verify access token:
   - Check in Shopify admin
   - Regenerate if needed

2. Check API scopes:
   - `read_products`
   - `write_products`
   - `read_inventory`
   - `write_inventory`

3. Verify shop domain is correct
4. Test with Shopify API explorer

### 8. Deployment Issues

#### Problem: Environment variables not loaded
**Symptoms:**
- "Missing environment variables" error
- Features not working in production

**Solutions:**
1. Verify variables in deployment platform:
   - Vercel: Project Settings → Environment Variables
   - Render: Environment tab

2. Check variable names match:
   - Frontend: Must start with `VITE_`
   - Backend: No prefix needed

3. Redeploy after adding variables

#### Problem: Build failures
**Symptoms:**
- Deployment fails
- TypeScript errors

**Solutions:**
1. Check build locally:
   ```bash
   npm run build
   ```

2. Fix TypeScript errors
3. Check dependencies are installed
4. Verify Node version matches

### 9. Performance Issues

#### Problem: Slow page loads
**Symptoms:**
- Long initial load time
- Laggy interactions

**Solutions:**
1. Implement code splitting:
   ```typescript
   const Component = lazy(() => import('./Component'));
   ```

2. Add pagination to large lists
3. Optimize images
4. Use React.memo for expensive components
5. Implement virtual scrolling for long lists

#### Problem: High database load
**Symptoms:**
- Slow queries
- Connection timeouts

**Solutions:**
1. Add database indexes
2. Implement caching (Redis)
3. Use connection pooling
4. Optimize queries
5. Archive old data

### 10. Data Consistency Issues

#### Problem: Inventory out of sync
**Symptoms:**
- Local inventory doesn't match Shopify
- Missing stock movements

**Solutions:**
1. Check webhook delivery:
   ```sql
   SELECT * FROM shopify_webhook_events
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

2. Verify all webhooks are configured
3. Check for failed webhook processing
4. Manual reconciliation:
   - Export from Shopify
   - Compare with local DB
   - Adjust discrepancies

5. Implement periodic sync job

## Debugging Tips

### Enable Debug Logging

**Backend:**
```typescript
// In logger.ts
logger.level = 'debug';
```

**Frontend:**
```typescript
// In api.ts
api.interceptors.request.use(config => {
  console.log('Request:', config);
  return config;
});
```

### Check Database State

```sql
-- Check user's teams
SELECT t.*, tm.role 
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
WHERE tm.user_id = 'user-uuid';

-- Check brand access
SELECT b.* 
FROM brands b
JOIN team_brands tb ON b.id = tb.brand_id
WHERE tb.team_id = 'team-uuid';

-- Check recent stock movements
SELECT sm.*, v.sku, p.title
FROM stock_movements sm
JOIN variants v ON sm.variant_id = v.id
JOIN products p ON v.product_id = p.id
ORDER BY sm.created_at DESC
LIMIT 20;

-- Check webhook events
SELECT topic, processed, created_at
FROM shopify_webhook_events
ORDER BY created_at DESC
LIMIT 20;
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3002/health

# Get inventory (with auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3002/api/inventory

# Test webhook (local)
curl -X POST http://localhost:3002/api/webhooks/shopify \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: inventory_levels/update" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -d '{"inventory_item_id": "123", "available": 10}'
```

## Getting Help

1. Check logs:
   - Backend: Console or log files
   - Frontend: Browser console
   - Database: Supabase logs

2. Review documentation:
   - API docs
   - Architecture docs
   - Feature docs

3. Search issues:
   - GitHub issues
   - Stack Overflow
   - Shopify community

4. Contact support:
   - Supabase support
   - Shopify support
   - Team lead/admin

## Preventive Measures

1. **Monitoring**
   - Set up error tracking (Sentry)
   - Monitor API response times
   - Track webhook delivery rates
   - Alert on failures

2. **Testing**
   - Write unit tests
   - Integration tests
   - End-to-end tests
   - Load testing

3. **Documentation**
   - Keep docs updated
   - Document changes
   - Maintain runbooks
   - Record incidents

4. **Backups**
   - Regular database backups
   - Test restore procedures
   - Document recovery steps
   - Keep backup of configs

5. **Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Test updates in staging
   - Plan maintenance windows
