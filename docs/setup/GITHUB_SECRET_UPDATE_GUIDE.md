# 🔐 GitHub Secret Update - Visual Guide

## What You're Doing

You need to update the `DO_SSH_KEY` secret in GitHub with your SSH private key.

---

## 📍 Where to Go

**URL:** https://github.com/tamirmeir/sport_calender/settings/secrets/actions

---

## 👀 What You'll See

You'll see a page titled **"Actions secrets and variables"** with a list like:

```
Repository secrets

Name              Updated
─────────────────────────────────
DO_HOST           2 days ago    [pencil icon]
DO_SSH_KEY        2 days ago    [pencil icon] ← CLICK THIS ONE
DO_USERNAME       2 days ago    [pencil icon]
FOOTBALL_API_KEY  2 days ago    [pencil icon]
```

---

## ✏️ Steps to Update

### 1. Click the pencil icon (✏️) next to `DO_SSH_KEY`

### 2. You'll see a form:
```
┌─────────────────────────────────────┐
│ Name: DO_SSH_KEY                    │
├─────────────────────────────────────┤
│ Value:                              │
│ ┌─────────────────────────────────┐ │
│ │ [Text box with current secret]  │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [Update secret] [Cancel]            │
└─────────────────────────────────────┘
```

### 3. In the "Value" text box:
- **Delete everything** (Cmd+A, then Delete)
- **Paste the SSH key** (Cmd+V)

### 4. Click **"Update secret"** button

---

## ✅ What Should Be Pasted

Your SSH private key should look like this:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAA
GAAAABCHPZshgYbd3XFeYhaR06WCAAAAEAAAAAEAAAEXAAAAB3NzaC1y
c2EAAAADAQABAAABAQC43paQCyOU/+jtJDoS4oYdDvZVkM9FVffnd0ff
... (about 20-25 more lines) ...
cVkp8TfK0AjELId2194ZUi/qqUq/aGvFmt7D3YJQRJnHN4Hdt830Slaz
hAArXf4Mhju/v4kZ5/u+SB8ThwKzAEUYX6FGtqm+tjhq5qc7wA0RSVJM
RVB5bwpO
-----END OPENSSH PRIVATE KEY-----
```

**Total: About 28 lines**

Must include:
- ✅ `-----BEGIN OPENSSH PRIVATE KEY-----` (first line)
- ✅ All the encoded content (middle ~25 lines)
- ✅ `-----END OPENSSH PRIVATE KEY-----` (last line)

---

## ⚠️ Common Mistakes

❌ **Missing BEGIN/END lines**
```
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1j...
```

❌ **Extra spaces or characters**
```
  -----BEGIN OPENSSH PRIVATE KEY-----  
```

❌ **Split or broken lines**
```
-----BEGIN OPENSSH 
PRIVATE KEY-----
```

✅ **CORRECT:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAA...
-----END OPENSSH PRIVATE KEY-----
```

---

## 🔄 If It Didn't Copy Properly

Run this command to copy your key again:

```bash
cat ~/.ssh/id_rsa | pbcopy
```

Then paste with Cmd+V in the GitHub secret field.

---

## 🧪 After Updating

1. Go to: https://github.com/tamirmeir/sport_calender/actions
2. Wait 1-2 minutes
3. You should see a new workflow run start
4. It should succeed this time! ✅

---

## 📞 Still Having Trouble?

If the key won't copy properly, you can:

1. **Manually copy it:**
   - Run: `cat ~/.ssh/id_rsa`
   - Select all the output with your mouse
   - Copy (Cmd+C)
   - Paste in GitHub (Cmd+V)

2. **Or tell me and I'll display it for you**

---

## ✅ Success Indicators

After updating the secret and pushing code:

```
GitHub Actions:
├─ test job: ✅ Succeeded (24s)
└─ deploy job: ✅ Succeeded (2-3 min)
```

No more SSH errors!
