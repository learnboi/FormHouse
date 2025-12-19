# FormHouse - Grahak Seva Kendra

A modern web application for Grahak Seva Kendra in Maharashtra, providing easy access to government forms and services.

## Features

- **Interactive Service Map**: Click on any service to view document requirements
- **Document Upload**: Upload required documents directly through the website
- **Multiple Services**: 
  - PAN Card
  - Aadhar Card
  - Scholarship Forms
  - Caste Certificate
  - Domicile Certificate
  - Ladki Bahin KYC
  - Government Exam Forms
  - Recharge Services
- **User-Friendly Interface**: Modern, responsive design
- **Document Requirements**: Clear list of required documents for each service

## How to Use

1. Open `index.html` in a web browser
2. Click on any service card to view details
3. See the list of required documents
4. Upload your documents
5. Fill in your contact information
6. Submit your application

## Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla)
- Modern responsive design

### Backend
- Node.js
- Express.js
- Cloudinary (file storage)
- Multer (file upload handling)

## Setup Instructions

### Frontend Setup
1. Simply open `index.html` in a web browser
2. Or use a local server (recommended):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```

### Backend Setup

**You have two options:**

#### Option 1: Cloudinary Storage (Recommended - Easiest Cloud Storage!)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Cloudinary** (3 minutes)
   - Sign up at [Cloudinary](https://cloudinary.com/users/register/free) (free account)
   - Get your credentials from Dashboard
   - Add to `.env` file (see `env.example`)
   - See [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md) for detailed instructions

3. **Start Server**
   ```bash
   npm start
   ```
   
   Files will be stored in Cloudinary (cloud). See [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md) for details.

#### Option 2: Local File Storage (No API Setup!)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Local Storage Server**
   ```bash
   npm run start:local
   ```
   
   Files will be stored in the `uploads/` folder. See [LOCAL_STORAGE.md](LOCAL_STORAGE.md) for details.

**⚠️ Requires Google Drive API setup**

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Google Drive API**
   - Follow the detailed instructions in [SETUP.md](SETUP.md)
   - You need to:
     - Create a Google Cloud project
     - Enable Google Drive API
     - Create a service account
     - Download `credentials.json`
     - Share FormHouse folder with service account

3. **Start the Backend Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Configure API URL**
   - Edit `config.js` to set your backend URL
   - Default: `http://localhost:3000/api`

## Google Drive Folder Structure

Files are automatically organized in Google Drive:

```
FormHouse/
├── PAN Card/
│   └── User_Name/
│       ├── document1.pdf
│       ├── document2.jpg
│       └── metadata_timestamp.json
├── Aadhar Card/
│   └── User_Name/
│       └── ...
└── [Other Services]/
    └── ...
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/submit` - Submit form with files
- `GET /api/services` - Get list of services

## Project Structure

```
FormHouse/
├── index.html          # Main frontend page
├── styles.css          # Styling
├── script.js           # Frontend JavaScript
├── config.js           # API configuration
├── server.js           # Backend server
├── package.json        # Node.js dependencies
├── SETUP.md            # Detailed setup guide
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Features

- ✅ **Interactive Service Map**: Click on any service to view document requirements
- ✅ **Document Upload**: Upload required documents directly through the website
- ✅ **Google Drive Integration**: Files automatically stored in organized folders
- ✅ **User Organization**: Files organized by service and user name
- ✅ **Multiple Services**: PAN, Aadhar, Scholarships, Certificates, etc.
- ✅ **User-Friendly Interface**: Modern, responsive design
- ✅ **Document Requirements**: Clear list of required documents for each service

## Future Enhancements

- Payment gateway integration
- User authentication
- Application tracking dashboard
- SMS/Email notifications
- Admin panel for managing applications