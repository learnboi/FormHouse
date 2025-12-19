# Cloudinary Setup Guide

## Why Cloudinary?

✅ **Simplest Setup** - Just 3 environment variables!
✅ **Perfect for Files** - Designed specifically for file/image uploads
✅ **Free Tier** - 25GB storage, 25GB bandwidth/month
✅ **No Quota Issues** - Much more reliable than Google Drive API
✅ **Fast CDN** - Files delivered via global CDN
✅ **Auto Optimization** - Automatic image optimization
✅ **Easy Management** - Beautiful dashboard to manage files

## Quick Setup (3 minutes)

### Step 1: Create Cloudinary Account

1. Go to [Cloudinary Sign Up](https://cloudinary.com/users/register/free)
2. Sign up with your email (free account)
3. Verify your email

### Step 2: Get Your Credentials

1. After logging in, go to **Dashboard**
2. You'll see your account details:
   - **Cloud Name** (e.g., `dxyz123abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### Step 3: Add to .env File

1. Open your `.env` file (or copy from `env.example`)
2. Add your Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Important:** Replace the values with your actual credentials from Step 2!

### Step 4: Install Dependencies

```bash
npm install
```

This will install the `cloudinary` package.

### Step 5: Start Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Verify Setup

1. Server should show: `✅ Cloudinary configured successfully`
2. Visit: `http://localhost:3000/api/health`
3. Should show: `"storage": "cloudinary"`

## File Organization

Files will be stored in Cloudinary like this:

```
FormHouse/
├── PAN_Card/
│   └── User_Name/
│       ├── document1.pdf
│       ├── photo.jpg
│       └── metadata_1234567890.json
├── Aadhar_Card/
│   └── Another_User/
│       └── ...
```

## View Your Files

1. Go to [Cloudinary Console](https://console.cloudinary.com/)
2. Click **Media Library**
3. Navigate to `FormHouse` folder
4. See all uploaded files organized by service and user

## Free Tier Limits

**Free Plan:**
- ✅ 25GB storage
- ✅ 25GB bandwidth/month
- ✅ Unlimited transformations
- ✅ CDN delivery
- ✅ Secure URLs

**Paid Plans:**
- Start at $89/month for more storage/bandwidth
- Free tier is usually enough for small to medium use

## Advantages Over Other Options

### vs Google Drive API
✅ No sharing/permission issues
✅ No quota errors
✅ Simpler setup (just 3 env variables)
✅ Better for web applications
✅ Built-in CDN

### vs Firebase Storage
✅ Simpler setup (no service account JSON)
✅ Better free tier (25GB vs 5GB)
✅ Better for media files
✅ Built-in image optimization

### vs Local Storage
✅ Cloud backup
✅ Accessible from anywhere
✅ No server storage needed
✅ CDN delivery (faster)

## Security

- **API Secret** is sensitive - never commit it to Git
- Already added to `.gitignore`
- Use environment variables (already set up)
- Cloudinary provides secure URLs by default

## File Types Supported

Cloudinary supports:
- **Images**: JPG, PNG, GIF, WebP, SVG, etc.
- **Documents**: PDF, DOC, DOCX, etc.
- **Videos**: MP4, MOV, AVI, etc.
- **Raw files**: Any file type

## Troubleshooting

### "Cloudinary credentials not found"
- Check `.env` file exists
- Verify all 3 variables are set:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Restart server after changing `.env`

### "Invalid API credentials"
- Double-check credentials from Cloudinary Dashboard
- Make sure no extra spaces in `.env` file
- Verify you're using the correct account

### "Upload failed"
- Check file size (10MB limit by default)
- Verify Cloudinary account is active
- Check Cloudinary Dashboard for errors

## Next Steps

1. ✅ Test file upload through the website
2. ✅ Check Cloudinary Media Library to see files
3. ✅ Files are automatically organized by service and user
4. ✅ All files get secure URLs automatically

## Switching Storage Options

- **Cloudinary** (default): `npm start`
- **Local Storage**: `npm run start:local`

The frontend works with all storage options!

