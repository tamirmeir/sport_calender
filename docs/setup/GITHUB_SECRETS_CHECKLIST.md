# ✅ GitHub Secrets Verification Checklist

## 🎯 Quick Verification

### 1. Check GitHub Secrets Page

**Open:** https://github.com/tamirmeir/sport_calender/settings/secrets/actions

**You should see exactly 4 repository secrets:**

```
Name: DO_HOST
Name: DO_SSH_KEY
Name: DO_USERNAME  
Name: FOOTBALL_API_KEY
```

**Note:** GitHub doesn't show the values (for security), only the names.

---

### 2. Verify Secret Values Are Correct

If you need to check or update any secret, here are the correct values:

| Secret Name | Correct Value | How to Get It |
|------------|---------------|---------------|
| `DO_HOST` | `165.227.5.88` | (your server IP) |
| `DO_USERNAME` | `tamir` | (your SSH username) |
| `DO_SSH_KEY` | Your private key | Run: `cat ~/.ssh/id_rsa` |
| `FOOTBALL_API_KEY` | Your API key | Run: `grep FOOTBALL_API_KEY .env` |

---

### 3. Test the Secrets Work

The **only real way** to verify secrets work is to trigger a deployment.

**Option A: Use the test script (Easiest)**
```bash
bash test_deployment.sh
```

**Option B: Manual commit and push**
```bash
git add .github/workflows/deploy.yml
git commit -m "fix: update deployment configuration"
git push origin main
```

Then watch: https://github.com/tamirmeir/sport_calender/actions

---

## 🔍 What Each Secret Does

### `FOOTBALL_API_KEY`
- **Used in:** Test job (line 26) & Deploy job (line 37, 67)
- **Purpose:** Validates API access and syncs league data
- **Test:** If this is wrong, the test job will fail

### `DO_HOST`
- **Used in:** Deploy job (line 39)
- **Purpose:** Server IP address to SSH into
- **Test:** If wrong, SSH connection will fail

### `DO_USERNAME`
- **Used in:** Deploy job (line 40)
- **Purpose:** SSH username
- **Test:** If wrong, SSH authentication will fail

### `DO_SSH_KEY`
- **Used in:** Deploy job (line 41)
- **Purpose:** SSH private key for authentication
- **Test:** If wrong or incomplete, SSH will fail with "Permission denied"

---

## ✅ Success Indicators

When secrets are correct, you'll see:

1. ✅ **Test job passes** - API key is valid
2. ✅ **Deploy job connects** - SSH credentials work
3. ✅ **Code is pulled** - Server access confirmed
4. ✅ **PM2 restarts** - Deployment successful

---

## ❌ Common Error Messages

### Error: "FOOTBALL_API_KEY is not set"
**Fix:** Add/update the `FOOTBALL_API_KEY` secret

### Error: "Permission denied (publickey)"
**Fix:** 
1. Verify `DO_SSH_KEY` contains the ENTIRE private key
2. Includes `-----BEGIN` and `-----END` lines
3. Has all ~28 lines of the key

### Error: "Host key verification failed"
**Fix:** This should auto-resolve, but if not, SSH to the server manually once

### Error: "cd: /var/www/sport_calendar: No such file or directory"
**Fix:** Already fixed! Workflow now uses correct path

---

## 📊 Current Workflow Configuration

Your workflow (`.github/workflows/deploy.yml`) is configured for:

- **Trigger:** Push to `main` branch
- **Server:** 165.227.5.88
- **User:** tamir
- **Path:** /var/www/sport_calendar
- **PM2 App:** matchday-frontend

---

## 🚀 Ready to Test?

**Quick test:**
```bash
bash test_deployment.sh
```

**Manual test:**
1. Confirm all 4 secrets exist in GitHub
2. Commit the workflow changes: `git add .github/workflows/deploy.yml`
3. Push: `git commit -m "fix: deployment" && git push`
4. Watch: https://github.com/tamirmeir/sport_calender/actions

---

## 📞 Need Help?

**If deployment fails:**
1. Click on the failed workflow run
2. Click on the failed job (test or deploy)
3. Read the error message
4. Check which secret is causing the issue
5. Update that secret in GitHub

**GitHub Secrets Page:**
https://github.com/tamirmeir/sport_calender/settings/secrets/actions
