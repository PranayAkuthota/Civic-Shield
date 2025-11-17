# Telangana Assets and Properties Protection Portal - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Telangana Assets and Properties Protection Portal, a full-stack web application for filing complaints against unauthorized land encroachments.

## Architecture

- **Backend**: Node.js with Express, MongoDB, TypeScript
- **Frontend**: React with TypeScript, Material-UI
- **Database**: MongoDB
- **File Storage**: Local filesystem or AWS S3
- **Authentication**: JWT with refresh tokens

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **MongoDB**: 5.0 or higher
- **Git**: Latest version

### Cloud Services (Optional)

- **AWS S3**: For file storage in production
- **SendGrid**: For email notifications
- **Vercel/Netlify**: For frontend hosting
- **AWS EC2/DigitalOcean**: For backend hosting

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd telangana-properties-protection
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/telangana_properties
MONGODB_TEST_URI=mongodb://localhost:27017/telangana_properties_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@telangana.gov.in
FRONTEND_URL=https://your-domain.com

# File Upload Configuration
UPLOAD_MODE=local  # 'local' or 's3'
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# AWS S3 Configuration (if using S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=telangana-properties-files

# Security Configuration
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_UPLOAD_URL=https://your-api-domain.com
REACT_APP_APP_NAME=Telangana Properties Protection Portal
REACT_APP_VERSION=1.0.0
```

## Database Setup

### 1. Install MongoDB

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**CentOS/RHEL:**
```bash
sudo yum install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

### 2. Create Database

```bash
mongo
use telangana_properties
db.createCollection("users")
db.createCollection("complaints")
db.createCollection("departments")
db.createCollection("analytics")
exit
```

### 3. Create Indexes

```bash
mongo telangana_properties
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ phone: 1 }, { unique: true })
db.users.createIndex({ aadhaar: 1 }, { unique: true })
db.complaints.createIndex({ complaintId: 1 }, { unique: true })
db.complaints.createIndex({ "location.coordinates": "2dsphere" })
db.complaints.createIndex({ status: 1 })
db.complaints.createIndex({ category: 1 })
db.complaints.createIndex({ district: 1 })
exit
```

## Build and Deploy

### 1. Build Backend

```bash
cd backend
npm run build
```

### 2. Build Frontend

```bash
cd frontend
npm run build
```

## Deployment Options

### Option 1: Traditional Server Deployment

#### Backend Deployment

1. **Install PM2 Process Manager:**
```bash
npm install -g pm2
```

2. **Create PM2 Configuration File** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'telangana-properties-backend',
    script: 'dist/server.js',
    cwd: './backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

3. **Start Backend with PM2:**
```bash
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Frontend Deployment

1. **Install Nginx:**
```bash
sudo apt update
sudo apt install nginx
```

2. **Configure Nginx** (`/etc/nginx/sites-available/telangana-properties`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /path/to/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File uploads
    location /uploads {
        alias /path/to/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

3. **Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/telangana-properties /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 2: Docker Deployment

1. **Create Dockerfile for Backend**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

2. **Create Dockerfile for Frontend**:
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

3. **Create docker-compose.yml**:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: telangana-properties-db
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    container_name: telangana-properties-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/telangana_properties?authSource=admin
    depends_on:
      - mongodb
    ports:
      - "5000:5000"
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    container_name: telangana-properties-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

4. **Deploy with Docker:**
```bash
docker-compose up -d
```

### Option 3: Cloud Deployment

#### Vercel (Frontend) + Railway/Heroku (Backend)

**Frontend on Vercel:**
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Configure build command: `cd frontend && npm run build`
4. Configure output directory: `frontend/build`

**Backend on Railway:**
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Configure build command: `cd backend && npm run build`
4. Configure start command: `npm start`

## SSL Certificate Setup

### Using Let's Encrypt

1. **Install Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
```

2. **Obtain Certificate:**
```bash
sudo certbot --nginx -d your-domain.com
```

3. **Auto-renewal:**
```bash
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Maintenance

### 1. Application Monitoring

Install monitoring tools:
```bash
# For PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Basic health check endpoint
curl https://your-domain.com/health
```

### 2. Database Monitoring

```bash
# MongoDB status
sudo systemctl status mongodb

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Database statistics
mongo telangana_properties --eval "db.stats()"
```

### 3. Log Management

```bash
# PM2 logs
pm2 logs telangana-properties-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Security Considerations

### 1. Firewall Configuration

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 27017  # Restrict MongoDB access
```

### 2. Security Headers

Add to Nginx configuration:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

### 3. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update npm packages
npm audit fix
npm update
```

## Backup Strategy

### 1. Database Backup

Create backup script (`backup-db.sh`):
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --db telangana_properties --out $BACKUP_DIR/backup_$DATE
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

Schedule with cron:
```bash
# Daily at 2 AM
0 2 * * * /path/to/backup-db.sh
```

### 2. File Backup

```bash
# Backup uploaded files
rsync -av /path/to/backend/uploads/ /backups/uploads/
```

## Performance Optimization

### 1. Database Optimization

```javascript
// Create compound indexes for common queries
db.complaints.createIndex({ status: 1, createdAt: -1 })
db.complaints.createIndex({ district: 1, category: 1 })
db.complaints.createIndex({ "filedBy": 1, createdAt: -1 })
```

### 2. Caching

Implement Redis caching for frequently accessed data:
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru
```

### 3. CDN Configuration

Use CloudFront or Cloudflare for static assets:
- Configure CDN for file uploads
- Enable gzip compression
- Set appropriate cache headers

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed:**
   - Check MongoDB service status
   - Verify connection string
   - Check firewall settings

2. **File Upload Issues:**
   - Verify upload directory permissions
   - Check disk space
   - Validate file size limits

3. **JWT Token Issues:**
   - Verify JWT secrets
   - Check token expiration
   - Validate refresh token logic

4. **Nginx Configuration:**
   - Test configuration: `sudo nginx -t`
   - Check logs: `sudo tail -f /var/log/nginx/error.log`

### Health Checks

Regular health checks should include:
- Database connectivity
- File system accessibility
- Memory and CPU usage
- API response times

## Support and Maintenance

### Emergency Contacts

- System Administrator: [contact]
- Database Administrator: [contact]
- DevOps Team: [contact]

### Documentation

- API Documentation: Available at `/api/docs`
- System Architecture: See `docs/architecture.md`
- User Manual: See `docs/user-guide.md`

### Updates and Patches

- Subscribe to security mailing lists
- Monitor Node.js and MongoDB security advisories
- Schedule regular maintenance windows

---

This deployment guide covers all aspects of deploying the Telangana Assets and Properties Protection Portal. For specific issues or additional support, refer to the project documentation or contact the development team.