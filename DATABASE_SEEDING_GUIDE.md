# Database Seeding Guide

This guide explains how to seed your database with test data for development and testing purposes.

## Overview

The seeding tools populate your Firebase database with realistic test data covering all aspects of the trading platform:
- **Users** with profiles, ratings, and verification levels
- **Items** with photos, categories, and trade preferences
- **Services** with provider details and ratings
- **Matches** between users
- **Conversations** with realistic message threads
- **Swipes** (left/right interactions)
- **Reviews** and ratings
- **Verifications** (email, phone, identity)

## Options

### Option 1: React Native App (Recommended)

**Best for:** Quick testing within the app

1. **Add DevToolsScreen to your navigation**
   
   In your App.js or navigation configuration:
   ```javascript
   import DevToolsScreen from './src/screens/DevToolsScreen';
   
   // Add to your stack navigator
   <Stack.Screen 
     name="DevTools" 
     component={DevToolsScreen} 
     options={{ title: 'Dev Tools' }}
   />
   ```

2. **Access DevTools**
   - Navigate to the DevTools screen in your app
   - Tap "Seed Database"
   - Confirm the action
   - Wait for seeding to complete (shows progress indicator)

3. **Test with seeded data**
   - Use the test accounts provided:
     - alice@test.com / test123
     - bob@test.com / test123
     - carol@test.com / test123

### Option 2: Node.js Script

**Best for:** Automated seeding, CI/CD, or command-line usage

1. **Install dependencies**
   ```bash
   npm install firebase
   ```

2. **Configure Firebase**
   
   Edit `scripts/seedDatabase.js` and replace the Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. **Run the script**
   ```bash
   node scripts/seedDatabase.js
   ```

### Option 3: Import in Code

**Best for:** Programmatic seeding in tests or other scripts

```javascript
import { seedDatabase } from './src/utils/seedDatabase';

// Seed database
await seedDatabase();
```

## Seeded Data Details

### Users (5 test users)

| User | Email | Location | Rating | Trust Score | Verification |
|------|-------|----------|--------|-------------|---------------|
| Alice Johnson | alice@test.com | San Francisco, CA | 4.8 | 85 | VERIFIED |
| Bob Smith | bob@test.com | Los Angeles, CA | 4.5 | 78 | VERIFIED |
| Carol Williams | carol@test.com | New York, NY | 4.9 | 92 | VERIFIED |
| David Brown | david@test.com | Chicago, IL | 4.2 | 70 | EMAIL |
| Eva Martinez | eva@test.com | Miami, FL | 4.7 | 88 | VERIFIED |

### Items (5 test items)

1. **iPhone 13 Pro Max** - Electronics, $800 (Alice)
2. **Vintage Levi's Denim Jacket** - Clothing, $120 (Bob)
3. **Gaming Setup** - Electronics, $600 (Carol)
4. **Professional Photography Service** - Services, $300 (Eva)
5. **Rare Book Collection** - Books, $500 (David)

### Services (2 test services)

1. **Graphic Design Services** - Design, $250 (Eva)
2. **Web Development** - Technology, $1500 (Alice)

### Matches (2 test matches)

1. Alice ↔ Bob (iPhone ↔ Denim Jacket)
2. Bob ↔ Carol (Denim Jacket ↔ Gaming Setup)

### Conversations (6 messages each)

Realistic conversation threads covering:
- Initial match greeting
- Interest confirmation
- Meeting arrangement
- Time and location coordination

### Swipes (6 test swipes)

- 4 right swipes (leading to matches)
- 2 left swipes (no match)

## What Gets Seeded

✅ **Users Collection**
- User profiles with ratings, trust scores
- Verification levels (EMAIL, VERIFIED)
- Profile photos (null - will be added if you upload)
- Trade statistics

✅ **Items Collection**
- Items with photos (using Unsplash placeholder URLs)
- Categories, conditions, prices
- Trade preferences (cash, trade, barter)
- Wanted items lists
- View/like/swipe statistics

✅ **Services Collection**
- Service listings with provider details
- Ratings, reviews, completion rates
- Availability and deliverables
- Service-specific metadata

✅ **Matches Collection**
- Match records between users
- Item locking status
- Conversation references
- Match timestamps

✅ **Messages Collection**
- Conversation metadata
- Participant information
- Photo references
- Message threads

✅ **Swipes Collection**
- Swipe actions (left/right)
- Processed status
- Timestamps

## Customizing the Seed Data

### Adding More Users

Edit `src/utils/seedDatabase.js`:

```javascript
const testUsers = [
  // ... existing users
  {
    uid: 'test_user_6',
    name: 'Frank Davis',
    email: 'frank@test.com',
    location: 'Seattle, WA',
    rating: 4.6,
    totalTrades: 25,
    trustScore: 80,
    verificationLevel: 'VERIFIED',
    emailVerified: true,
    profilePhoto: null,
    bio: 'Your custom bio here'
  }
];
```

### Adding More Items

```javascript
const testItems = [
  // ... existing items
  {
    title: 'Your Custom Item',
    description: 'Item description',
    price: 100,
    estimatedValue: 90,
    category: 'Electronics',
    condition: 'Good',
    images: ['https://your-image-url.com'],
    userId: 'test_user_1',
    userName: 'Alice Johnson',
    userEmail: 'alice@test.com',
    location: 'San Francisco, CA',
    status: 'available',
    // ... other fields
  }
];
```

### Adding Custom Messages

Edit the `seedConversationMessages` function:

```javascript
const messages = [
  {
    conversationId,
    senderId: user1Id,
    text: 'Your custom message here',
    createdAt: serverTimestamp()
  },
  // ... more messages
];
```

## Clearing Seeded Data

To clear test data, you can:

1. **Use Firebase Console**
   - Go to Firebase Console → Firestore Database
   - Delete collections manually
   - Or use the "Clear database" option (use with caution!)

2. **Add a clear function** (not yet implemented)
   - Will be added to DevToolsScreen in future updates

3. **Use the Node.js script** (add clear function)
   - Add a `clearDatabase()` function to `scripts/seedDatabase.js`

## Testing Scenarios

### Scenario 1: Test Match Flow
1. Seed database
2. Login as alice@test.com
3. Go to Matches screen
4. See match with Bob
5. Open conversation
6. See pre-seeded messages
7. Send new message

### Scenario 2: Test Swipe Flow
1. Seed database
2. Login as bob@test.com
3. Go to Swipe/Home screen
4. See items from other users
5. Swipe right/left
6. Check if matches are created

### Scenario 3: Test Service Trading
1. Seed database
2. Login as eva@test.com
3. Go to Services screen
4. See service listings
5. Browse service details
6. Test service-specific features

## Important Notes

⚠️ **Development Only**
- These tools are for development/testing only
- Do not use in production
- Do not seed real user data

⚠️ **Firebase Rules**
- Ensure your Firestore rules allow write access during development
- Or use test mode in Firebase Console

⚠️ **Authentication**
- The seed users are NOT created in Firebase Auth
- You'll need to create these accounts manually in Firebase Auth
- Or update the script to create Auth users

⚠️ **Storage**
- Profile photos are set to `null` in seed data
- You'll need to upload photos manually or extend the script
- Item photos use Unsplash placeholder URLs

## Troubleshooting

### "Permission Denied" Error
- Check Firestore rules
- Ensure user is authenticated
- Try using test mode in Firebase Console

### "Document Already Exists" Error
- Clear existing data first
- Or modify script to update instead of create

### Slow Seeding
- Firebase has rate limits
- Consider batching writes
- Use Firestore emulator for local testing

## Future Enhancements

- [ ] Add clear database function
- [ ] Add photo upload seeding
- [ ] Add Firebase Auth user creation
- [ ] Add more diverse test data
- [ ] Add custom seed data option
- [ ] Add partial seeding (users only, items only, etc.)
- [ ] Add data validation before seeding
- [ ] Add rollback functionality

## Support

If you encounter issues:
1. Check Firebase Console for errors
2. Review Firestore rules
3. Verify Firebase config is correct
4. Check console logs for detailed error messages
