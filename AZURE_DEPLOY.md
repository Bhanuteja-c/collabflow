# CollabFlow - Azure Portal Deployment (From Scratch)

Complete step-by-step guide to deploy CollabFlow using ONLY the Azure Portal website.

---

## 📋 What You Need Before Starting

1. ✅ Azure account with active subscription (Azure for Students)
2. ✅ GitHub account
3. ✅ Your CollabFlow code ready to push

---

## PART 1: Push Code to GitHub

### Step 1.1: Create GitHub Repository

1. Go to **https://github.com/new**
2. Enter:
   - Repository name: `collabflow`
   - Visibility: **Private**
3. Click **Create repository**

### Step 1.2: Push Your Code

Open PowerShell in `c:\Coding\collabflow` and run these commands ONE BY ONE:

```powershell
git init
```

```powershell
git add .
```

```powershell
git commit -m "Initial commit"
```

```powershell
git remote add origin https://github.com/YOUR_USERNAME/collabflow.git
```

```powershell
git branch -M main
```

```powershell
git push -u origin main
```

> Replace `YOUR_USERNAME` with your GitHub username

---

## PART 2: Create Azure Database

### Step 2.1: Open Azure Portal

1. Go to **https://portal.azure.com**
2. Sign in with your Azure account

### Step 2.2: Create Resource Group

1. In search bar, type **"Resource groups"**
2. Click **"+ Create"**
3. Fill in:
   - Subscription: **Azure for Students**
   - Resource group: `collabflow-rg`
   - Region: **Central India**
4. Click **"Review + Create"** → **"Create"**

### Step 2.3: Create PostgreSQL Database

1. In search bar, type **"Azure Database for PostgreSQL"**
2. Click **"+ Create"**
3. Select **"Flexible server"** → Click **"Create"**
4. Fill in:

| Field | Value |
|-------|-------|
| Subscription | Azure for Students |
| Resource group | `collabflow-rg` |
| Server name | `collabflow-db` (add random numbers if taken) |
| Region | Central India |
| PostgreSQL version | 15 |
| Workload type | Development |
| Compute + storage | Click "Configure server" → Select **Burstable B1ms** |
| Admin username | `collabflowadmin` |
| Password | `Collabflow@2024!` |

5. Click **"Next: Networking"**
6. Under **Firewall rules**:
   - Check ✅ "Allow public access from any Azure service"
   - Check ✅ "Add current client IP address"
7. Click **"Review + Create"** → **"Create"**

> ⏳ Wait 5-10 minutes for database to be created

### Step 2.4: Create Database

1. Go to your PostgreSQL server
2. Left menu → **"Databases"**
3. Click **"+ Add"**
4. Database name: `collabflow`
5. Click **"Save"**

### Step 2.5: Copy Your Connection String

Your DATABASE_URL is:
```
postgresql://collabflowadmin:Collabflow%402024!@collabflow-db.postgres.database.azure.com:5432/collabflow?sslmode=require
```

> Note: `@` in password becomes `%40` in URL

**📝 SAVE THIS - You'll need it in Part 4!**

---

## PART 3: Create Web App

### Step 3.1: Create App Service

1. In search bar, type **"App Services"**
2. Click **"+ Create"** → **"Web App"**
3. Fill in **Basics** tab:

| Field | Value |
|-------|-------|
| Subscription | Azure for Students |
| Resource group | `collabflow-rg` |
| Name | `collabflow-app` (add numbers if taken, like `collabflow-app-123`) |
| Publish | Code |
| Runtime stack | Node 20 LTS |
| Operating System | Linux |
| Region | Central India |

4. Under **App Service Plan**:
   - Click **"Create new"**
   - Name: `collabflow-plan`
   - Click **"Change size"** → Select **B1 Basic** → Click **"Apply"**

5. Click **"Review + Create"** → **"Create"**

> ⏳ Wait 1-2 minutes

### Step 3.2: Note Your App URL

Your app URL will be:
```
https://collabflow-app-123.azurewebsites.net
```
(Replace with your actual app name)

---

## PART 4: Configure App Settings

### Step 4.1: Enable WebSockets

1. Go to your App Service
2. Left menu → **"Configuration"**
3. Click **"General settings"** tab
4. Find **"Web sockets"** → Turn **ON**
5. Click **"Save"** at top

### Step 4.2: Generate Secret Key

Run this in PowerShell to generate a secret:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output (it looks like: `a1b2c3d4e5f6...`)

### Step 4.3: Add Environment Variables

1. In App Service → Left menu → **"Configuration"**
2. Click **"Application settings"** tab
3. Click **"+ New application setting"** and add EACH of these:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://collabflowadmin:Collabflow%402024!@collabflow-db.postgres.database.azure.com:5432/collabflow?sslmode=require` |
| `NEXTAUTH_URL` | `https://YOUR-APP-NAME.azurewebsites.net` |
| `NEXTAUTH_SECRET` | (paste the secret you generated) |
| `AUTH_SECRET` | (same secret as above) |
| `NODE_ENV` | `production` |

4. **For Google OAuth** (if you have it):

| Name | Value |
|------|-------|
| `GOOGLE_CLIENT_ID` | (your Google client ID) |
| `GOOGLE_CLIENT_SECRET` | (your Google client secret) |

5. Click **"Save"** at top
6. Click **"Continue"** when prompted

---

## PART 5: Deploy from GitHub

### Step 5.1: Connect GitHub

1. In App Service → Left menu → **"Deployment Center"**
2. Under **Source**, select **"GitHub"**
3. Click **"Authorize"** → Login to GitHub
4. Fill in:
   - Organization: (your GitHub username)
   - Repository: `collabflow`
   - Branch: `main`
5. Click **"Save"**

### Step 5.2: Wait for Deployment

1. Click **"Logs"** tab in Deployment Center
2. Wait for status to show ✅ **Success**
3. This takes 5-10 minutes

### Step 5.3: Check Build Logs

If deployment fails:
1. Click on the deployment log
2. Look for red error messages
3. Common fixes:
   - Missing environment variable → Add it in Configuration
   - Build error → Check your code on GitHub

---

## PART 6: Run Database Migration

### Step 6.1: Open SSH Console

1. In App Service → Left menu → **"SSH"**
2. Click **"Go"** to open console

### Step 6.2: Run Prisma Push

In the SSH console, run:
```bash
npx prisma db push
```

If that doesn't work, do it from your local machine:

1. Open PowerShell in `c:\Coding\collabflow`
2. Run:
```powershell
$env:DATABASE_URL="postgresql://collabflowadmin:Collabflow%402024!@collabflow-db.postgres.database.azure.com:5432/collabflow?sslmode=require"
npx prisma db push
```

---

## PART 7: Update Google OAuth (If Using Google Sign-In)

### Step 7.1: Add Callback URL

1. Go to **https://console.cloud.google.com/apis/credentials**
2. Click your OAuth 2.0 Client ID
3. Under **"Authorized redirect URIs"**, click **"+ ADD URI"**
4. Add:
   ```
   https://YOUR-APP-NAME.azurewebsites.net/api/auth/callback/google
   ```
5. Click **"Save"**

---

## PART 8: Test Your App! 🎉

### Step 8.1: Open Your App

1. In App Service → Click **"Browse"** at top
2. Or go to: `https://YOUR-APP-NAME.azurewebsites.net`

### Step 8.2: Test Features

- [ ] Sign up with email/password
- [ ] Sign in with Google (if configured)
- [ ] Create a workspace
- [ ] Test chat
- [ ] Test kanban board
- [ ] Test video call

---

## 🔧 Troubleshooting

### "Application Error" or Blank Page

1. Go to App Service → **"Log stream"** (left menu)
2. Look for error messages
3. Common fixes:
   - Add missing environment variable
   - Check DATABASE_URL is correct

### Database Connection Error

1. Go to your PostgreSQL server
2. Left menu → **"Networking"**
3. Make sure "Allow access to Azure services" is ON

### WebSockets Not Working

1. App Service → Configuration → General settings
2. Make sure "Web sockets" is ON

---

## 💰 Monthly Cost

| Service | Cost |
|---------|------|
| App Service B1 | ~$13 |
| PostgreSQL Burstable | ~$12 |
| **Total** | **~$25/month** |

With $100 credits = **4 months free!**

---

## ✅ You're Done!

Your CollabFlow is now live at:
```
https://YOUR-APP-NAME.azurewebsites.net
```

Share this URL with your team! 🚀
