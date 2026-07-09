# 🔑 Get Firebase Admin SDK Key - Step by Step Guide

## 🎯 What You Need

To complete your admin dashboard setup, you need to get your **Firebase Admin SDK private key**. This allows the admin dashboard to securely manage your Firebase project.

## 📋 Step-by-Step Instructions

### Step 1: Go to Firebase Console
1. Open your browser and go to: https://console.firebase.google.com/project/liwach-19664
2. Make sure you're logged in with the Google account that owns this project

### Step 2: Navigate to Service Accounts
1. Click on the **⚙️ Settings** (gear icon) in the left sidebar
2. Select **Project settings**
3. Click on the **Service accounts** tab at the top

### Step 3: Generate Private Key
1. You'll see a section called **Firebase Admin SDK**
2. Click the **Generate new private key** button
3. A dialog will appear asking for confirmation
4. Click **Generate key** to download the JSON file

### Step 4: Extract the Information
The downloaded JSON file will look like this:
```json
{
  "type": "service_account",
  "project_id": "liwach-19664",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@liwach-19664.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40liwach-19664.iam.gserviceaccount.com"
}
```

### Step 5: Update Your Environment File
1. Open `admin/.env.local` in your code editor
2. Replace these two lines with the values from your JSON file:

```bash
# Replace this line:
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@liwach-19664.iam.gserviceaccount.com

# With the actual client_email from your JSON:
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-abc123@liwach-19664.iam.gserviceaccount.com

# Replace this line:
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ADMIN_SDK_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# With the actual private_key from your JSON (keep the quotes and \n characters):
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANT**: Keep the `\n` characters in the private key exactly as they are!

## 🚀 Alternative: Create Admin User Manually

If you prefer to skip the Admin SDK setup for now, you can create the admin user manually:

### Option 1: Use Simple Script (Recommended)
```bash
cd admin
npm run create-admin-simple
```

### Option 2: Manual Creation in Firebase Console
1. Go to: https://console.firebase.google.com/project/liwach-19664/firestore
2. Create a new collection called `admins`
3. Add a document with ID: `admin@swipeit.com`
4. Add these fields:
   - `email`: `admin@swipeit.com`
   - `displayName`: `SwipeIt Super Admin`
   - `role`: `super-admin`
   - `permissions`: `["*"]`
   - `hashedPassword`: `$2a$12$rQJ8vHGkQqF5FZXzQqF5FZXzQqF5FZXzQqF5FZXzQqF5FZXzQqF5FZ` (this is "SwipeIt2024!" hashed)
   - `isActive`: `true`
   - `createdAt`: (current timestamp)

## ✅ Test Your Setup

Once you have the credentials:

1. **Verify Configuration**:
```bash
cd admin
npm run verify
```

2. **Create Admin User**:
```bash
npm run create-admin
```

3. **Start Dashboard**:
```bash
npm run dev
```

4. **Login**:
   - Go to: http://localhost:3001
   - Email: admin@swipeit.com
   - Password: SwipeIt2024!

## 🔒 Security Notes

- **Never commit** the private key to version control
- **Change the default password** immediately after first login
- **Keep the JSON file secure** - it provides full access to your Firebase project
- **Use environment variables** for all sensitive configuration

## 🎉 You're Almost There!

Once you complete these steps, your SwipeIt admin dashboard will be fully operational and ready to manage your trading platform! 🚀