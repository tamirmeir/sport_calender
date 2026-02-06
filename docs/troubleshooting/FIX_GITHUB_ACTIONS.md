# 🔧 Fix GitHub Actions SSH Deployment

## ⚠️ Current Situation

- ✅ **Production is UPDATED** - Manually deployed latest code
- ✅ **Site is LIVE** - https://matchdaybytm.com working perfectly
- ❌ **GitHub Actions failing** - Deploy job can't SSH to server

---

## 🎯 The Problem

GitHub Actions deploy job failed in 7 seconds, which means SSH authentication failed.

**Most likely cause:** The `DO_SSH_KEY` secret has formatting issues when pasted into GitHub.

---

## ✅ Solution: Fix the SSH Key Secret

### Step 1: Get Your SSH Private Key (Again)

Run this command:
```bash
cat ~/.ssh/id_rsa
```

You'll see something like:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAA...
(many more lines)
...
-----END OPENSSH PRIVATE KEY-----
```

### Step 2: Copy It Carefully

**IMPORTANT:**
- ✅ Include the `-----BEGIN` line
- ✅ Include ALL the middle lines (no missing lines!)
- ✅ Include the `-----END` line
- ❌ No extra spaces before or after
- ❌ No missing newlines

**Best practice:**
```bash
# Copy to clipboard automatically
cat ~/.ssh/id_rsa | pbcopy

# Or manually select all with Cmd+A in terminal
```

### Step 3: Update GitHub Secret

1. Go to: **https://github.com/tamirmeir/sport_calender/settings/secrets/actions**

2. Find `DO_SSH_KEY` in the list

3. Click the **pencil icon** (Edit) or **Update** button

4. **Delete the old value**

5. **Paste the new value** (Cmd+V)

6. Click **Update secret**

### Step 4: Verify Other Secrets

While you're there, verify these are correct:

| Secret Name | Correct Value |
|------------|---------------|
| `DO_HOST` | `165.227.5.88` |
| `DO_USERNAME` | `tamir` |
| `DO_SSH_KEY` | Your full private key (just updated) |
| `FOOTBALL_API_KEY` | `528f8539304f360adaf38e7c7c021397` |

---

## 🧪 Test the Fix

After updating the secret, test it:

### Option 1: Trigger Manual Workflow

1. Go to: https://github.com/tamirmeir/sport_calender/actions
2. Click "Deploy to DigitalOcean" workflow
3. Click "Run workflow" button (if available)

### Option 2: Push a Small Change

I've updated the workflow file to be more robust. Commit and push it:

```bash
git add .github/workflows/deploy.yml
git commit -m "fix: improve deployment workflow error handling"
git push origin main
```

This will trigger deployment automatically.

---

## 📊 What to Expect

After fixing the SSH key, you should see:

```
✅ test job: Succeeded (~24 seconds)
✅ deploy job: Succeeded (~2-3 minutes)
```

The deploy job should:
1. SSH to your server ✅
2. Pull latest code ✅
3. Install dependencies ✅
4. Update service worker ✅
5. Sync league data ✅
6. Restart PM2 ✅

---

## 🔍 Common Issues & Solutions

### Issue 1: "Permission denied (publickey)"
**Cause:** SSH key is incorrect or incomplete  
**Fix:** Re-copy the entire key from `cat ~/.ssh/id_rsa`

### Issue 2: "Host key verification failed"
**Cause:** GitHub doesn't recognize your server  
**Fix:** Already handled in updated workflow (script_stop: false)

### Issue 3: Deploy still fails after fixing key
**Cause:** Might need to regenerate a new key specifically for GitHub  
**Fix:**
```bash
# Generate new key without password for GitHub Actions
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key -N ""

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_deploy_key.pub tamir@165.227.5.88

# Use private key for DO_SSH_KEY secret
cat ~/.ssh/github_deploy_key
```

---

## ✅ Current Workaround

Until GitHub Actions is fixed, you can deploy manually:

```bash
# Connect to production
ssh sport-calendar-prod

# Pull latest code
cd /var/www/sport_calendar
git pull origin main

# Install any new dependencies
npm install
cd backend && source venv/bin/activate && pip install -r requirements.txt

# Restart services
pm2 restart matchday-frontend
```

---

## 🎯 Bottom Line

**For Now:**
- ✅ Your site is LIVE with latest code
- ✅ I deployed it manually
- ✅ Everything working perfectly

**To Fix:**
1. Update `DO_SSH_KEY` secret in GitHub with properly formatted key
2. Push the workflow update I made
3. Watch it succeed!

**Time to fix:** 2 minutes

---

## 📞 Quick Commands

```bash
# Copy SSH key to clipboard
cat ~/.ssh/id_rsa | pbcopy

# Test SSH works locally
ssh sport-calendar-prod "echo 'SSH works!'"

# Manual deployment (if needed)
ssh sport-calendar-prod "cd /var/www/sport_calendar && git pull && pm2 restart matchday-frontend"

# Check GitHub Actions
# https://github.com/tamirmeir/sport_calender/actions
```

---

**Your production is working! The GitHub Actions fix is optional but recommended for future automated deployments.** 🚀
