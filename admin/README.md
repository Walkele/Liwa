# Liwa Admin Dashboard

A comprehensive admin dashboard for managing the Liwa trading platform. Built with Next.js, TypeScript, Material-UI, and Firebase.

## 🚀 Features

### Core Admin Functions
- **User Management**: View, ban/unban, manage user accounts and trust scores
- **Item Management**: Monitor, moderate, and manage posted items
- **Trade Management**: Oversee all trades, resolve disputes, track completion rates
- **Analytics Dashboard**: Comprehensive insights into platform usage and performance
- **Report Management**: Handle user reports and content moderation
- **Security Monitoring**: Track suspicious activities and implement safety measures

### Advanced Features
- **Real-time Analytics**: Live charts and metrics
- **Role-based Access Control**: Super admin, admin, moderator, and support roles
- **Data Export**: CSV exports for analytics and reporting
- **System Health Monitoring**: Track Firebase services and system status
- **Audit Logging**: Complete admin action history
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK + JWT
- **Charts**: Recharts
- **State Management**: React Query
- **Styling**: Material-UI Theme System

## 📦 Installation

1. **Clone and navigate to admin directory**:
```bash
cd admin
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.local.example .env.local
```

4. **Configure Firebase**:
   - Add your Firebase project configuration
   - Set up Firebase Admin SDK credentials
   - Configure authentication secrets

5. **Run development server**:
```bash
npm run dev
```

The admin dashboard will be available at `http://localhost:3001`

## 🔧 Configuration

### Environment Variables

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# Admin Authentication
ADMIN_JWT_SECRET=your_super_secret_jwt_key
ADMIN_SESSION_SECRET=your_session_secret

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
```

### Initial Admin Setup

Create your first admin user by running the setup script:

```bash
npm run setup-admin
```

Or manually add to Firestore `admins` collection:

```json
{
  "email": "admin@liwa.com",
  "displayName": "Super Admin",
  "role": "super-admin",
  "permissions": ["*"],
  "hashedPassword": "bcrypt_hashed_password",
  "createdAt": "2024-01-01T00:00:00Z",
  "isActive": true
}
```

## 📊 Admin Roles & Permissions

### Super Admin
- Full access to all features
- Can create/manage other admin users
- System configuration access

### Admin
- User management (ban/unban, trust scores)
- Item and trade management
- Analytics and reporting
- Settings configuration

### Moderator
- Content moderation
- Report handling
- User support
- Limited analytics access

### Support
- Read-only access to users and trades
- Report viewing
- Basic analytics

## 🔐 Security Features

- **JWT-based Authentication**: Secure token-based auth
- **Role-based Access Control**: Granular permissions system
- **HTTP-only Cookies**: Secure token storage
- **Admin Action Logging**: Complete audit trail
- **Rate Limiting**: API protection (implement as needed)
- **CSRF Protection**: Built-in Next.js protection

## 📈 Analytics & Reporting

### Dashboard Metrics
- Total users, active users, growth trends
- Item statistics and category breakdowns
- Trade volume and success rates
- Revenue tracking and projections

### Advanced Analytics
- User retention and engagement
- Geographic distribution
- Performance metrics
- Custom date range filtering

### Data Export
- CSV exports for all major data types
- Scheduled reports (implement as needed)
- Custom query builder (future feature)

## 🛡️ Content Moderation

### Automated Systems
- Keyword filtering
- Image content scanning (implement with ML)
- Spam detection algorithms
- Trust score calculations

### Manual Moderation
- Report queue management
- Item approval workflows
- User verification processes
- Dispute resolution tools

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current admin

### User Management
- `GET /api/users` - List users with filters
- `POST /api/users/[userId]/ban` - Ban user
- `DELETE /api/users/[userId]/ban` - Unban user
- `PUT /api/users/[userId]/trust-score` - Update trust score

### Analytics
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/users` - User analytics
- `GET /api/analytics/trades` - Trade analytics
- `GET /api/analytics/export` - Export data

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker build -t liwa-admin .
docker run -p 3001:3001 liwa-admin
```

### Vercel Deployment
```bash
vercel --prod
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Development Guidelines

### Code Structure
```
admin/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Next.js pages and API routes
│   ├── services/      # Business logic and API calls
│   ├── hooks/         # Custom React hooks
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   └── config/        # Configuration files
├── public/            # Static assets
└── docs/             # Documentation
```

### Best Practices
- Use TypeScript for type safety
- Follow Material-UI design patterns
- Implement proper error handling
- Add loading states for better UX
- Use React Query for data fetching
- Maintain consistent code formatting

## 🔄 Integration with Mobile App

The admin dashboard integrates seamlessly with the Liwa mobile app:

- **Shared Firebase Database**: Same Firestore collections
- **Real-time Updates**: Changes reflect immediately
- **Consistent Data Models**: Shared TypeScript types
- **Cross-platform Analytics**: Unified reporting

## 📞 Support & Maintenance

### Monitoring
- Firebase console for database monitoring
- Next.js analytics for performance
- Error tracking with Sentry (implement as needed)
- Custom health check endpoints

### Backup & Recovery
- Firestore automatic backups
- Admin user data export
- Configuration backup procedures
- Disaster recovery protocols

## 🎯 Future Enhancements

- **Advanced ML Moderation**: Automated content filtering
- **Real-time Notifications**: WebSocket integration
- **Advanced Analytics**: Predictive insights
- **Mobile Admin App**: React Native companion
- **API Rate Limiting**: Enhanced security
- **Multi-language Support**: Internationalization

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Liwa Admin Dashboard** - Empowering administrators to manage and grow the trading platform effectively! 🚀