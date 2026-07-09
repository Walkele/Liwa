# 🚀 Liwa Admin Dashboard Setup Guide

## 📋 Prerequisites

1. **Firebase Project**: You already have `liwach-19664` project ✅
2. **Node.js**: Version 16 or higher
3. **Firebase Admin SDK**: Service account key needed

## 🔧 Step-by-Step Setup

### Step 1: Firebase Admin SDK Configuration

1. **Go to Firebase Console**:
   - Visit: https://console.firebase.google.com/project/liwach-19664
   - Navigate to **Project Settings** (gear icon)

2. **Generate Service Account Key**:
   - Click on **Service Accounts** tab
   - Click **Generate new private key**
   - Download the JSON file

3. **Update Environment Variables**:
   - Open `admin/.env.local`
   - Replace `FIREBASE_ADMIN_CLIENT_EMAIL` with the email from your JSON file
   - Replace `FIREBASE_ADMIN_PRIVATE_KEY` with the private key from your JSON file
   - **Important**: Keep the `\n` characters in the private key!

### Step 2: Install Dependencies

```bash
cd admin
npm install
```

### Step 3: Create First Admin User

```bash
npm run create-admin
```

This will create a super admin user with:
- **Email**: admin@liwa.com
- **Password**: Liwa2024!
- **Role**: Super Admin

### Step 4: Start the Development Server

```bash
npm run dev
```

The admin dashboard will be available at: **http://localhost:3001**

### Step 5: Login and Test

1. Open http://localhost:3001
2. Login with the admin credentials
3. Explore the dashboard features

## 🔐 Security Setup

### Change Default Password
1. Login with default credentials
2. Go to Profile settings
3. Change the password immediately

### Create Additional Admin Users
1. Use the User Management section
2. Create admins with appropriate roles:
   - **Super Admin**: Full access
   - **Admin**: User/content management
   - **Moderator**: Content moderation only
   - **Support**: Read-only access

## 🎯 Features Available

### ✅ Currently Working
- **Authentication System**: JWT-based secure login
- **Dashboard Overview**: Real-time metrics and charts
- **User Management**: View, ban/unban users (when connected to your data)
- **Analytics**: Platform insights and reporting
- **Responsive Design**: Works on all devices

### 🔄 Integration with Mobile App
The admin dashboard shares the same Firebase database as your mobile app:
- Real-time synchronization
- Admin actions immediately affect mobile app
- Unified user and content management

## 🛠️ Troubleshooting

### Common Issues

**1. Firebase Admin SDK Error**
```
Error: permission-denied
```
**Solution**: Make sure your service account key is correctly configured in `.env.local`

**2. Build Error**
```
Could not find a production build
```
**Solution**: Run `npm run dev` for development, not `npm start`

**3. Authentication Issues**
```
Invalid token
```
**Solution**: Clear browser cookies and login again

### Getting Help

1. **Check Console Logs**: Open browser developer tools
2. **Verify Environment**: Ensure all `.env.local` variables are set
3. **Firebase Console**: Check Firestore rules and data structure

## 📊 Next Steps

### 1. Customize Dashboard
- Add your branding
- Configure analytics metrics
- Set up custom reports

### 2. Configure Permissions
- Set up role-based access
- Define custom permissions
- Create admin workflows

### 3. Production Deployment
- Set up production environment variables
- Configure domain and SSL
- Set up monitoring and logging

## 🎉 You're Ready!

Your Liwa Admin Dashboard is now configured and ready to manage your trading platform. The dashboard provides powerful tools to:

- Monitor platform health and usage
- Manage users and content
- Analyze performance metrics
- Ensure platform security
- Handle customer support

**Happy administrating!** 🚀

---

## 📞 Support

If you need help with setup or have questions:
1. Check the troubleshooting section above
2. Review the Firebase console for any configuration issues
3. Ensure your mobile app and admin dashboard are using the same Firebase project