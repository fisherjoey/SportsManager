# Deployment Instructions for Ubuntu Server Agent

Follow these steps to deploy the SportsManager application on your Ubuntu server.

## Prerequisites
- Ubuntu Server 22.04 LTS
- Root or sudo access
- The server IP address (we'll call it YOUR_SERVER_IP)

## Step 1: Update the System and Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install curl
apt install curl git build-essential -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
apt install postgresql postgresql-contrib -y

# Install PM2 and Nginx
npm install -g pm2
apt install nginx -y
```

## Step 2: Setup PostgreSQL Database

```bash
# Create database and user
sudo -u postgres psql << 'EOF'
CREATE DATABASE sports_manager;
CREATE USER sports_user WITH ENCRYPTED PASSWORD 'SportsMgr2024!';
GRANT ALL PRIVILEGES ON DATABASE sports_manager TO sports_user;
ALTER DATABASE sports_manager OWNER TO sports_user;
\q
EOF

# Enable PostgreSQL
systemctl enable postgresql
systemctl start postgresql
```

## Step 3: Clone and Setup Application

```bash
# Create app directory
mkdir -p /opt/apps
cd /opt/apps

# Clone repository
git clone https://github.com/fisherjoey/SportsManager.git
cd SportsManager

# Get your server's IP address (save this for next step)
ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1
```

## Step 4: Configure Backend

```bash
cd /opt/apps/SportsManager/backend

# Install dependencies
npm install

# Build backend
npm run build

# Create .env file (REPLACE YOUR_SERVER_IP with actual IP from Step 3)
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=sports_user
DB_PASSWORD=SportsMgr2024!
DB_NAME=sports_manager

# JWT Secret (auto-generated secure key)
JWT_SECRET=xK3Yn9P2mR6vQ8sT4wY7zB5cF1gJ0aL+N/eD2iH3uV4=

# Frontend URL (REPLACE YOUR_SERVER_IP)
FRONTEND_URL=http://YOUR_SERVER_IP
EOF

# Edit the .env file to replace YOUR_SERVER_IP
nano .env
# Press Ctrl+X, then Y, then Enter to save

# Run database migrations
npm run migrate

# Restore database with seed data
npm run db:restore
```

## Step 5: Configure Frontend

```bash
cd /opt/apps/SportsManager/frontend

# Install dependencies
npm install

# Get server IP again if needed
SERVER_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d/ -f1)
echo "Your server IP is: $SERVER_IP"

# Create .env.local file with actual IP
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://$SERVER_IP/api
NEXT_PUBLIC_APP_URL=http://$SERVER_IP
EOF

# Build frontend
npm run build
```

## Step 6: Setup PM2 Process Manager

```bash
cd /opt/apps/SportsManager

# Create PM2 configuration
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
      max_memory_restart: '1G'
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
      max_memory_restart: '1G'
    }
  ]
}
EOF

# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup systemd -u root --hp /root
```

## Step 7: Configure Nginx

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
    }
}
EOF

# Enable site and reload nginx
ln -s /etc/nginx/sites-available/sportsmanager /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl enable nginx
```

## Step 8: Configure Firewall

```bash
# Setup UFW firewall
apt install ufw -y
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## Step 9: Verify Everything is Working

```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs --lines 20

# Test the application
curl -I http://localhost

# Get your server IP for access
echo "Access your application at:"
ip addr show | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print "http://" $2}' | cut -d/ -f1
```

## Step 10: Create Initial Admin Account

The database has been seeded with the following admin account:
- Email: `superadmin@test.com`
- Password: `password123`

**IMPORTANT**: Change this password immediately after first login!

## Troubleshooting Commands

If something goes wrong, use these commands to diagnose:

```bash
# Check PM2 logs
pm2 logs sports-backend --lines 50
pm2 logs sports-frontend --lines 50

# Restart services
pm2 restart all

# Check nginx errors
tail -f /var/log/nginx/error.log

# Check PostgreSQL
systemctl status postgresql

# Check ports
netstat -tlpn | grep -E '3000|3001|80'

# Update from git
cd /opt/apps/SportsManager
git pull
cd backend
npm install
npm run build
npm run migrate
pm2 restart sports-backend
cd ../frontend
npm install
npm run build
pm2 restart sports-frontend
```

## Port Forwarding Required

On your router, forward these ports to your server's internal IP:
- **Port 80** → Server IP Port 80 (HTTP)
- **Port 443** → Server IP Port 443 (HTTPS - optional)
- **Port 22** → Server IP Port 22 (SSH - optional, use different external port for security)

## Access the Application

Once everything is running:
- Local Network: `http://YOUR_SERVER_IP`
- From Internet: `http://YOUR_PUBLIC_IP` (after port forwarding)

## Security Notes

1. Change the default admin password immediately
2. Consider setting up SSL with Let's Encrypt
3. Regularly update the system: `apt update && apt upgrade`
4. Monitor logs regularly: `pm2 logs`
5. Set up automated backups of the database