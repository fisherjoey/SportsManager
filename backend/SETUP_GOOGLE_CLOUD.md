# Google Cloud Setup for AI Receipt Processing

## Step-by-Step Setup Instructions

### 1. Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `syncedsports` (140708809250)
3. Navigate to: **IAM & Admin** → **Service Accounts**
4. Click **+ CREATE SERVICE ACCOUNT**

### 2. Configure Service Account
**Service Account Details:**
- Service account name: `sports-app-vision`
- Service account ID: `sports-app-vision` (auto-filled)
- Description: `Service account for Sports Management App Vision API`

**Grant Roles:**
- `Cloud Vision .agent` (this provides the necessary Vision API access)

### 3. Create and Download Key
1. Click on the created service account
2. Go to **Keys** tab
3. Click **ADD KEY** → **Create new key**
4. Select **JSON** format
5. Click **CREATE** - file will download automatically

### 4. Enable Required APIs
Go to **APIs & Services** → **Library** and enable:
- ✅ Cloud Vision API
- ✅ Cloud Storage API (if using cloud storage)

### 5. Install the Key File
1. Save the downloaded JSON file as: 
   ```
   /Users/admin/Desktop/Sports Management App/backend/config/google-cloud-key.json
   ```

2. Update the .env file:
   ```env
   GOOGLE_CLOUD_KEY_FILE=./config/google-cloud-key.json
   ```

### 6. Test the Setup
Run this command to test:
```bash
cd backend
npm test -- --grep "OCR"
```

## Security Notes
- ⚠️ The service account key file contains sensitive credentials
- ⚠️ Never commit this file to version control
- ⚠️ Keep the file secure and limit access
- ✅ The file is already added to .gitignore

## Troubleshooting
If you get authentication errors:
1. Verify the JSON file path is correct
2. Check that Vision API is enabled
3. Confirm service account has proper roles
4. Restart the backend server after adding the key

## Current Status
- ✅ OpenAI API Key configured
- ✅ Google Cloud Project ID set
- ⏳ Service account key file needed
- ⏳ Vision API needs to be enabled