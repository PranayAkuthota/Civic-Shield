# Civic-Shield (Telangana Assets and Properties Protection Portal)

A comprehensive full-stack web application for citizens to file complaints against unauthorized land encroachments in Telangana, India.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- npm 8+

### Installation

1. **Clone and Setup**
```bash
git clone <repository-url>
cd telangana-properties-protection
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run build
npm start
```

3. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 🏗️ Architecture

### Backend (Node.js + TypeScript)
- Express.js REST API
- MongoDB with Mongoose ODM
- JWT authentication with refresh tokens
- File upload with S3/local storage
- Email notifications via SendGrid
- Role-based access control

### Frontend (React + TypeScript)
- Material-UI component library
- React Router for navigation
- Context API for state management
- Axios for API communication
- Multi-step complaint forms

### Key Features
- **Citizen Portal**: File complaints anonymously or with identity
- **Official Dashboard**: Manage and track complaints
- **Admin Panel**: User management and analytics
- **File Uploads**: Evidence documents and images
- **Real-time Updates**: Complaint status tracking
- **Geolocation**: District/mandal/village mapping
- **Notifications**: Email and SMS alerts

## 📁 Project Structure

```
telangana-properties-protection/
├── backend/
│   ├── src/
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation
│   │   ├── utils/           # Helper functions
│   │   └── types/           # TypeScript types
│   ├── uploads/             # File upload directory
│   └── dist/                # Compiled TypeScript
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   └── build/               # Production build
└── docs/                    # Documentation
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/telangana_properties
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 📊 Database Schema

### Users
- Citizens, Officials, Admins, Superadmins
- Role-based permissions
- Profile management
- Aadhaar verification

### Complaints
- Multi-category encroachment types
- Geospatial location data
- Status tracking workflow
- Evidence file attachments
- Anonymous reporting option

### Departments
- Government department management
- Official assignment system

### Analytics
- Complaint statistics
- Performance metrics
- Regional analysis

## 🔐 Authentication

- JWT access tokens (24h expiry)
- Refresh tokens (7d expiry)
- Role-based access control
- Passwordless login for citizens
- Secure password hashing

## 📱 Supported Features

### Citizen Features
- File complaints with detailed forms
- Upload evidence files
- Track complaint status
- Anonymous reporting
- Receive notifications

### Official Features
- View assigned complaints
- Update complaint status
- Add comments and notes
- Upload evidence
- Generate reports

### Admin Features
- User management
- Department configuration
- System analytics
- Complaint oversight
- Bulk operations

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📦 Production Deployment

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Production Setup

1. **Build applications:**
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

2. **Set up production database with indexes:**
```bash
mongo telangana_properties
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ phone: 1 }, { unique: true })
db.complaints.createIndex({ complaintId: 1 }, { unique: true })
```

3. **Deploy with PM2:**
```bash
npm install -g pm2
cd backend && pm2 start ecosystem.config.js
```

## 🔧 Development

### Adding New Features

1. **Backend:**
   - Add model in `src/models/`
   - Create routes in `src/routes/`
   - Add business logic in `src/services/`
   - Update types in `src/types/`

2. **Frontend:**
   - Create components in `src/components/`
   - Add API calls in `src/services/`
   - Update contexts for state management
   - Add routes in App.tsx

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits for git

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Email: support@telangana.gov.in
- Documentation: See `/docs` folder

## 🏛️ Government Integration

This portal is designed to integrate with:
- Telangana State Land Records
- Municipal Administration Systems
- Police Department Records
- Revenue Department Systems

## 🔒 Security Features

- End-to-end encryption for sensitive data
- Secure file upload validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Input sanitization

---

**Built with ❤️ for the citizens of Telangana**
