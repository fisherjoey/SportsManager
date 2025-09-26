# SportsManager Deployment Guide for Proxmox/Ubuntu

This guide walks through deploying the SportsManager application on Ubuntu Server 22.04 LTS running in a Proxmox container or VM.

## Prerequisites

- Ubuntu Server 22.04 LTS (fresh installation)
- Root or sudo access
- Network connectivity
- Minimum 4GB RAM, 2 vCPUs, 20GB storage

## Step 1: Install Required Software

### 1.1 Install Node.js 20.x and npm

```bash
# Install curl if not present
apt update
apt install curl -y

# Remove any old Node.js versions
apt remove nodejs npm -y
apt autoremove -y

# Install Node.js 20.x from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

### 1.2 Install PostgreSQL, PM2, Nginx, and Git

```bash
# Install PostgreSQL
apt install postgresql postgresql-contrib -y

# Install PM2 for process management
npm install -g pm2

# Install nginx for reverse proxy
apt install nginx -y

# Install git
apt install git -y

# Install build essentials
apt install build-essential -y
```

## Step 2: Setup PostgreSQL Database

```bash
# Switch to postgres user and create database
sudo -u postgres psql << EOF
CREATE DATABASE sports_manager;
CREATE USER sports_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE sports_manager TO sports_user;
\q
EOF

# Enable PostgreSQL to start on boot
systemctl enable postgresql
```

## Step 3: Clone and Setup Application

### 3.1 Clone Repository

```bash
# Create app directory
mkdir -p /opt/apps
cd /opt/apps

# Clone your repository
git clone https://github.com/fisherjoey/SportsManager.git
cd SportsManager
```

### 3.2 Setup Backend

```bash
cd backend
npm install
npm run build

# Create .env file (EDIT THE VALUES BELOW)
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=sports_user
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_NAME=sports_manager

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=GENERATE_AND_PASTE_SECURE_STRING_HERE

# Frontend URL
FRONTEND_URL=http://YOUR_SERVER_IP:3000

# Email settings (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EOF

# Run database migrations
npm run migrate

# Seed initial data (if needed)
# npm run seed
```

### 3.3 Setup Frontend

```bash
cd ../frontend
npm install

# Create .env.local file
# IF USING NGINX (port 80):
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP/api
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP
EOF

# OR IF NOT USING NGINX (direct ports):
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001/api
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000
EOF

# Build frontend
npm run build
```

## Step 4: Configure PM2 Process Manager

```bash
# Go to project root
cd /opt/apps/SportsManager

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sports-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/sports-backend-error.log',
      out_file: '/var/log/pm2/sports-backend-out.log',
    },
    {
      name: 'sports-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/sports-frontend-error.log',
      out_file: '/var/log/pm2/sports-frontend-out.log',
    }
  ]
}
EOF

# Start both applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
# Run the command that PM2 outputs
```

## Step 5: Configure Nginx Reverse Proxy (Recommended)

```bash
# Create nginx configuration
cat > /etc/nginx/sites-available/sportsmanager << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/sportsmanager /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
systemctl enable nginx
```

## Step 6: Configure Firewall

```bash
# Install UFW
apt install ufw -y

# Allow SSH (adjust port if you changed it)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Optional: Allow direct Node.js ports (if not using nginx)
# ufw allow 3000/tcp
# ufw allow 3001/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

## Step 7: Verify Installation

### 7.1 Check Services Status

```bash
# Check PM2 status
pm2 status
pm2 logs

# Check nginx status
systemctl status nginx

# Check PostgreSQL status
systemctl status postgresql

# Check listening ports
netstat -tlpn | grep -E '3000|3001|80|5432'
```

### 7.2 Test Application

```bash
# Test backend health endpoint
curl http://localhost:3001/api/health

# Test frontend
curl -I http://localhost:3000

# Get server IP address
ip addr show | grep "inet " | grep -v 127.0.0.1
```

### 7.3 Create Initial Admin User

```bash
cd /opt/apps/SportsManager/backend

# Create admin user via script or database
sudo -u postgres psql sports_manager << EOF
-- Check if users exist
SELECT email, name FROM users LIMIT 5;
EOF
```

## Step 8: Maintenance Commands

### Application Management

```bash
# View logs
pm2 logs sports-backend
pm2 logs sports-frontend

# Restart services
pm2 restart sports-backend
pm2 restart sports-frontend

# Stop services
pm2 stop all

# Monitor resources
pm2 monit
```

### Update Application

```bash
cd /opt/apps/SportsManager

# Pull latest code
git pull origin main

# Update backend
cd backend
npm install
npm run build
pm2 restart sports-backend

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart sports-frontend

# Run any new migrations
cd ../backend
npm run migrate
```

### Database Backup

```bash
# Create backup
sudo -u postgres pg_dump sports_manager > ~/sports_manager_backup_$(date +%Y%m%d).sql

# Restore backup
sudo -u postgres psql sports_manager < ~/sports_manager_backup_20240101.sql
```

## Step 9: Optional SSL Setup with Let's Encrypt

If you have a domain name pointing to your server:

```bash
# Install certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
# Test renewal
certbot renew --dry-run
```

## Troubleshooting

### Check Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Common Issues

1. **Port already in use:**
   ```bash
   # Find what's using a port
   lsof -i :3000
   # Kill the process if needed
   kill -9 <PID>
   ```

2. **Database connection errors:**
   - Check PostgreSQL is running: `systemctl status postgresql`
   - Verify credentials in `/opt/apps/SportsManager/backend/.env`
   - Check PostgreSQL logs

3. **PM2 apps crashing:**
   ```bash
   # Check error logs
   pm2 logs --err
   # Increase memory if needed in ecosystem.config.js
   ```

4. **Permission errors:**
   ```bash
   # Fix ownership
   chown -R root:root /opt/apps/SportsManager
   chmod -R 755 /opt/apps/SportsManager
   ```

## Security Checklist

- [ ] Changed default database password
- [ ] Generated secure JWT secret
- [ ] Configured firewall (UFW)
- [ ] Removed default nginx site
- [ ] Set up SSL certificate (if using domain)
- [ ] Regular system updates: `apt update && apt upgrade`
- [ ] Set up automated backups
- [ ] Monitor logs regularly
- [ ] Use strong passwords for all user accounts

## Access Your Application

After completing all steps:

- **With Nginx:** `http://YOUR_SERVER_IP`
- **Without Nginx:**
  - Frontend: `http://YOUR_SERVER_IP:3000`
  - Backend: `http://YOUR_SERVER_IP:3001/api`

Replace `YOUR_SERVER_IP` with your actual server IP address.

## Support

For issues specific to:
- **Application bugs:** Check the GitHub repository issues
- **Deployment:** Review PM2 and nginx logs
- **Database:** Check PostgreSQL logs and connection settings