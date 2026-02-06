# 🔐 How GitHub Actions Uses Your Secrets

## 🎯 The Simple Answer

When GitHub Actions runs your workflow, it **replaces** `${{ secrets.SECRET_NAME }}` with the actual secret value you stored.

---

## 📋 Your Workflow File

In `.github/workflows/deploy.yml`:

```yaml
- name: Deploy via SSH
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.DO_HOST }}           # ← GitHub replaces this
    username: ${{ secrets.DO_USERNAME }}    # ← GitHub replaces this
    key: ${{ secrets.DO_SSH_KEY }}          # ← GitHub replaces this
    script: |
      cd /var/www/sport_calendar
      git pull origin main
      pm2 restart matchday-frontend
```

---

## 🔄 What Happens Step-by-Step

### **Step 1: You Push Code**
```bash
git push origin main
```

### **Step 2: GitHub Actions Starts**
GitHub receives your push and starts the workflow.

### **Step 3: GitHub Replaces Secrets**
Before running, GitHub replaces the secret placeholders with actual values:

**Before (in your file):**
```yaml
host: ${{ secrets.DO_HOST }}
username: ${{ secrets.DO_USERNAME }}
key: ${{ secrets.DO_SSH_KEY }}
```

**After (what GitHub Actions actually uses):**
```yaml
host: 165.227.5.88
username: tamir
key: -----BEGIN OPENSSH PRIVATE KEY-----
     b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1j...
     -----END OPENSSH PRIVATE KEY-----
```

### **Step 4: SSH Action Uses the Secrets**
The `appleboy/ssh-action` receives:
- **host**: `165.227.5.88` (your server IP)
- **username**: `tamir` (SSH user)
- **key**: Your full private SSH key

### **Step 5: SSH Action Connects**
```bash
# Internally, GitHub Actions does something like:
ssh -i /tmp/private_key tamir@165.227.5.88 "cd /var/www/sport_calendar && git pull..."
```

Where `/tmp/private_key` contains your `DO_SSH_KEY` secret.

---

## 🔍 Visual Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  YOU PUSH CODE                                               │
│  git push origin main                                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS STARTS                                       │
│  Reads: .github/workflows/deploy.yml                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  GITHUB FETCHES SECRETS                                      │
│  Gets from: Settings → Secrets and variables → Actions       │
│                                                              │
│  DO_HOST = "165.227.5.88"                                   │
│  DO_USERNAME = "tamir"                                      │
│  DO_SSH_KEY = "-----BEGIN OPENSSH PRIVATE KEY-----..."     │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  GITHUB REPLACES PLACEHOLDERS                                │
│                                                              │
│  ${{ secrets.DO_HOST }}      →  165.227.5.88               │
│  ${{ secrets.DO_USERNAME }}  →  tamir                      │
│  ${{ secrets.DO_SSH_KEY }}   →  [your private key]        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  SSH ACTION CONNECTS TO SERVER                               │
│                                                              │
│  ssh -i [key] tamir@165.227.5.88                           │
│                                                              │
│  Authenticates with your private key                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  RUNS DEPLOYMENT SCRIPT                                      │
│                                                              │
│  cd /var/www/sport_calendar                                 │
│  git pull origin main                                       │
│  npm install                                                │
│  pm2 restart matchday-frontend                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  ✅ DEPLOYMENT COMPLETE                                      │
│  Your production is updated!                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security: How Secrets Are Protected

### **What GitHub Does:**
1. ✅ **Encrypts secrets** at rest in their database
2. ✅ **Never logs secret values** (shows `***` in logs)
3. ✅ **Only available to the repository** they're defined in
4. ✅ **Deleted from memory** after workflow completes

### **Example Log Output:**

**What you see in GitHub Actions logs:**
```
Connecting to ***...
Using username: tamir
Authenticating with private key...
✅ Connection successful
```

**What you DON'T see:**
```
Connecting to 165.227.5.88...
Using key: -----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1j...
```

---

## 🎯 Why Each Secret is Needed

| Secret | Purpose | Example Value | Used For |
|--------|---------|---------------|----------|
| `DO_HOST` | Server IP address | `165.227.5.88` | Where to connect |
| `DO_USERNAME` | SSH username | `tamir` | Who to login as |
| `DO_SSH_KEY` | Private SSH key | `-----BEGIN...-----` | Authentication (like a password) |
| `FOOTBALL_API_KEY` | API-Sports key | `528f85...` | Fetch match data |

---

## 🔄 The SSH Authentication Process

Think of it like using a key to open a door:

**Traditional SSH (What you do manually):**
```bash
ssh sport-calendar-prod
# Uses: ~/.ssh/id_rsa (your local private key)
```

**GitHub Actions SSH (What workflow does):**
```bash
ssh -i [DO_SSH_KEY] [DO_USERNAME]@[DO_HOST]
# Uses: The secret values you stored
```

**Both use the same private key!** You're just storing it in GitHub so Actions can use it.

---

## 🛡️ Why This Is Safe

1. **Secrets are encrypted** - Only GitHub and your workflow can read them
2. **No one else can see them** - Not in logs, not in UI, nowhere
3. **Scoped to your repo** - Only YOUR repository can use them
4. **You control access** - Only people with admin access can manage secrets

---

## ❓ Common Questions

### Q: "Can someone steal my secrets?"
**A:** No. GitHub encrypts them and never exposes them. Even in logs, they show as `***`.

### Q: "What if my workflow file is public?"
**A:** That's fine! The file shows `${{ secrets.DO_SSH_KEY }}` (placeholder), not the actual key.

### Q: "Why did my deployment fail?"
**A:** The secret value is incorrect or incomplete. GitHub replaces it correctly, but SSH can't authenticate if the key is wrong.

### Q: "Can I see my secret values after storing them?"
**A:** No. GitHub never shows secret values after you save them. You can only update or delete them.

---

## 🎯 Summary

```
Your Secret Store (GitHub)          Your Workflow File
─────────────────────────          ──────────────────
DO_HOST: 165.227.5.88      →       host: ${{ secrets.DO_HOST }}
DO_USERNAME: tamir         →       username: ${{ secrets.DO_USERNAME }}
DO_SSH_KEY: [full key]     →       key: ${{ secrets.DO_SSH_KEY }}
                                   
GitHub Actions replaces these at runtime ↑
```

**The workflow file is just a template. GitHub fills in the real values when it runs.** 🔐
