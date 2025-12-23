# Diagnosis Plan: Reset Password Token Issue

## Problem Analysis

**User Issue:**

- User receives reset password email with Supabase link
- When clicking the link, redirected to `http://localhost:5173/reset-password/confirm`
- Page shows request reset form (asks for email again)
- Console shows "token none"

## Root Cause Investigation

### Current Code Analysis

**ResetPasswordPage.tsx Logic:**

```typescript
useEffect(() => {
  const token = searchParams.get("token");
  const type = searchParams.get("type");

  console.log("URL Parameters:", {
    token: token ? "exists" : "none",
    type: type,
    allParams: Object.fromEntries(searchParams.entries()),
  });

  if (token && type === "recovery") {
    console.log("Valid recovery token found, switching to confirm step");
    setStep("confirm");
  }
}, [searchParams]);
```

**Expected Behavior:**

1. User clicks email link → Supabase redirects to `/reset-password/confirm?token=xxx&type=recovery`
2. `searchParams.get('token')` should return the token
3. Should automatically switch to 'confirm' step
4. User should see password reset form, not email request form

**Actual Behavior:**

- Token not detected (shows "none")
- Stays on 'request' step
- User asked to enter email again

## Possible Causes & Solutions

### 1. **URL Parameter Not Being Passed**

**Diagnosis:** Check actual URL parameters received
**Solution:** Add more detailed console logging

### 2. **Supabase Redirect URL Configuration**

**Current Config:**

```typescript
const redirectUrl = "http://localhost:5173/reset-password/confirm";
```

**Issue:** If Supabase doesn't properly redirect with parameters, token gets lost

**Solution:** Check and fix redirect URL configuration

### 3. **React Router URL Parsing Issue**

**Possible Cause:** Race condition or routing issue
**Solution:** Add better URL parameter handling

### 4. **Token Expiration**

**Possible Cause:** Token expired before user clicked link
**Solution:** Verify token validity and expiration

## Fix Plan

### Step 1: Enhanced Diagnostic Logging

- Add comprehensive URL parameter logging
- Check all URL parameters on page load
- Verify token extraction logic

### Step 2: Supabase Configuration Review

- Verify redirect URL in AuthContext
- Check if email template configuration is correct
- Ensure token is properly passed in redirect

### Step 3: URL Parameter Handling Fix

- Implement fallback token detection
- Add direct URL parsing as backup
- Improve error handling for missing tokens

### Step 4: Testing & Validation

- Test complete flow from email to password reset
- Verify token persistence through redirect
- Ensure proper step switching logic

## Implementation Steps

1. **Enhanced Diagnostics** - Add detailed console logging to identify exact issue
2. **Fix Token Detection** - Implement robust token extraction logic
3. **Test Complete Flow** - Verify fix works end-to-end
4. **Documentation** - Update user guidance based on findings

## Expected Outcome

After fix:

- User clicks email link → Properly redirected to confirm page
- Token automatically detected → Page shows password reset form
- User can set new password → Successfully completes reset flow
