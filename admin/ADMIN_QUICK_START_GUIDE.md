# 🚀 Admin Dashboard Quick Start Guide

## **Starting the Admin Dashboard**

### **1. Navigate to Admin Directory**
```bash
cd admin
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Start the Development Server**
```bash
npm run dev
```

### **4. Access the Dashboard**
Open your browser and go to: **http://localhost:3001**

## **🔐 Login Options**

### **Option 1: Development Login (Recommended)**
For development purposes, you can use these credentials:
- **Email**: `admin@swipeit.com`
- **Password**: `admin123`

### **Option 2: Create Admin User Manually**
1. Go to [Firebase Console](https://console.firebase.google.com/project/liwach-19664/firestore)
2. Create collection `admins`
3. Add document with ID: `admin@swipeit.com`
4. Add fields:
   ```json
   {
     "email": "admin@swipeit.com",
     "displayName": "SwipeIt Admin",
     "role": "super-admin",
     "permissions": ["*"],
     "isActive": true,
     "createdAt": "2024-01-26T00:00:00.000Z"
   }
   ```

## **📱 Available Admin Features**

Once logged in, you'll have access to:

### **📊 Dashboard** (`/`)
- System overview and key metrics
- Real-time analytics
- Quick action buttons

### **👥 Users Management** (`/users`)
- View and manage all users
- Ban/unban users
- Update trust scores
- View user activity

### **📦 Items Management** (`/items`)
- Review posted items
- Moderate content
- Handle reported items
- Category management

### **🔄 Trades Management** (`/trades`)
- Monitor all trades
- Resolve disputes
- Track performance
- Trade analytics

### **📋 Reports Management** (`/reports`)
- Process user reports
- Investigation tools
- Moderation actions
- Report analytics

### **📈 Analytics** (`/analytics`)
- Comprehensive metrics
- Trend analysis
- Data export
- Performance tracking

### **🔔 Notifications** (`/notifications`)
- Send notifications to users
- Template management
- Scheduling
- Engagement tracking

### **⚙️ Settings** (`/settings`)
- App configuration
- Security settings
- Feature flags
- System health

## **🔧 Troubleshooting**

### **Port Already in Use**
If port 3001 is busy, the server will automatically use the next available port (3002, 3003, etc.)

### **Firebase Connection Issues**
Make sure your `.env.local` file has the correct Firebase configuration.

### **Login Issues**
- Check that you're using the correct credentials
- Verify Firebase is properly configured
- Try refreshing the page

## **🎯 What You Can Do**

With the admin dashboard, you can:
- ✅ **Manage Users**: Ban, unban, update trust scores
- ✅ **Moderate Content**: Review items and handle reports  
- ✅ **Monitor Trades**: Track all trading activity
- ✅ **Send Notifications**: Communicate with users
- ✅ **Configure System**: Control app settings
- ✅ **View Analytics**: Track platform performance

## **🚀 Ready to Go!**

Your SwipeIt Admin Dashboard is now ready for use. You have complete control over your trading platform with professional-grade management tools.

**Access URL**: http://localhost:3001