# 📍 Where to Get Your SSH Key for GitHub

## 🔍 Your SSH Key Location

Your private SSH key is stored on **your Mac** at this location:

```
/Users/tamirmei/.ssh/id_rsa
```

## 🎯 How to Get It (3 Easy Steps)

### Step 1: Open Terminal (You're already here!)

### Step 2: Run This Command

```bash
cat ~/.ssh/id_rsa
```

### Step 3: Copy Everything

The output will look like this:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAA
ABCHPZshgYbd3XFeYhaR06WCAAAAEAAAAAEAAAEXAAAAB3NzaC1yc2EAAAAD
... (about 25 more lines of random text) ...
kZ5/u+SB8ThwKzAEUYX6FGtqm+tjhq5qc7wA0RSVJMRVB5bwpO
-----END OPENSSH PRIVATE KEY-----
```

**Copy ALL of it** (Cmd+A, then Cmd+C)

---

## 🎬 Where Does This Go?

### Add to GitHub:

1. Go to: https://github.com/tamirmeir/sport_calender/settings/secrets/actions
2. Click **"New repository secret"**
3. **Name**: `DO_SSH_KEY`
4. **Secret**: Paste what you copied (the entire key)
5. Click **"Add secret"**

---

## 🤔 What Is This Key?

Think of it like a special password file that GitHub Actions will use to connect to your production server.

```
┌─────────────────────────────────────────────────────────┐
│                      YOUR MAC                            │
│                                                          │
│  📁 /Users/tamirmei/.ssh/id_rsa  ◄── The key file      │
│     (This is what we copy)                              │
│                                                          │
└──────────────────────────┬───────────────────────────────┘
                           │
                           │ Copy content with:
                           │ cat ~/.ssh/id_rsa
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       GITHUB                             │
│                                                          │
│  Secret: DO_SSH_KEY  ◄── Paste the key here            │
│                                                          │
└──────────────────────────┬───────────────────────────────┘
                           │
                           │ When you push code
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                PRODUCTION SERVER                         │
│                  (165.227.5.88)                         │
│                                                          │
│  GitHub uses the key to SSH in and deploy your code     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Easy Helper Script

I made a script that shows you everything step-by-step:

```bash
bash show_all_github_secrets.sh
```

This script will:
1. Show you all 4 secrets you need
2. Display each value clearly
3. Show your SSH key when you're ready
4. Guide you through adding them to GitHub

---

## ✅ Quick Checklist

- [ ] Run: `cat ~/.ssh/id_rsa`
- [ ] Copy the entire output (including BEGIN/END lines)
- [ ] Go to GitHub secrets page
- [ ] Add as `DO_SSH_KEY`
- [ ] Add the other 3 secrets too

---

## 🔒 Security Note

- ✅ It's safe to add this to GitHub Secrets (they're encrypted)
- ❌ NEVER commit this key to your Git repository
- ✅ Only add it as a GitHub Secret
- ✅ The key is already on your server, so this just lets GitHub use it

---

## 📞 Still Confused?

Just run this and follow along:

```bash
bash show_all_github_secrets.sh
```

It will walk you through everything! 🎯
