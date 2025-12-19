const express = require('express');
const multer = require('multer');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for temporary file storage
const upload = multer({
  dest: 'temp-uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Ensure temp directory exists
if (!fs.existsSync('temp-uploads')) {
  fs.mkdirSync('temp-uploads', { recursive: true });
}

// Firebase Admin Setup
let firebaseInitialized = false;
let bucket = null;

try {
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: serviceAccount.project_id + '.appspot.com'
    });
    
    bucket = admin.storage().bucket();
    firebaseInitialized = true;
    console.log('✅ Firebase Storage initialized successfully');
    console.log(`📦 Storage Bucket: ${bucket.name}`);
  } else {
    console.warn('⚠️ firebase-service-account.json not found.');
    console.warn('   Firebase Storage features will be disabled.');
    console.warn('   See FIREBASE_SETUP.md for setup instructions.');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message);
  console.warn('   Firebase Storage features will be disabled.');
}

// Service name mapping
const serviceNames = {
  pan: 'PAN Card',
  aadhar: 'Aadhar Card',
  scholarship: 'Scholarship Forms',
  caste: 'Caste Certificate',
  domicile: 'Domicile Certificate',
  ladkiBahin: 'Ladki Bahin KYC',
  govtExam: 'Government Exam Forms',
  recharge: 'Recharge Services'
};

// Helper function to upload file to Firebase Storage
async function uploadFileToFirebase(filePath, fileName, service, userName) {
  try {
    const sanitizedService = service.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedUserName = userName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    
    // Create storage path: FormHouse/Service/User/FileName
    const storagePath = `FormHouse/${sanitizedService}/${sanitizedUserName}/${fileName}`;
    
    // Upload file to Firebase Storage
    const [file] = await bucket.upload(filePath, {
      destination: storagePath,
      metadata: {
        metadata: {
          originalName: fileName,
          service: service,
          userName: userName,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    // Make file publicly accessible (optional - you can change this)
    await file.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    
    return {
      name: fileName,
      path: storagePath,
      url: publicUrl,
      size: (await file.getMetadata())[0].size
    };
  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
    throw error;
  }
}

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// API Routes

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'FormHouse API is running',
    storage: firebaseInitialized ? 'firebase' : 'not configured'
  });
});

// Submit form with files
app.post('/api/submit', upload.array('files'), async (req, res) => {
  try {
    if (!firebaseInitialized) {
      return res.status(503).json({ 
        error: 'Firebase Storage not configured',
        message: 'Please configure Firebase Storage. See FIREBASE_SETUP.md for instructions.'
      });
    }

    const { service, name, phone, email } = req.body;
    const files = req.files || [];

    if (!service || !name || !phone || !email) {
      // Clean up uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({ 
        error: 'Missing required fields: service, name, phone, email' 
      });
    }

    const serviceName = serviceNames[service] || service;
    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9]/g, '_');

    // Upload all files to Firebase Storage
    const uploadedFiles = [];
    for (const file of files) {
      try {
        const originalName = file.originalname;
        const firebaseFile = await uploadFileToFirebase(
          file.path,
          originalName,
          serviceName,
          sanitizedName
        );
        
        uploadedFiles.push(firebaseFile);
        
        // Delete temporary file after upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (uploadError) {
        console.error(`Error uploading file ${file.originalname}:`, uploadError);
        // Continue with other files
      }
    }

    // Create and upload metadata file
    const metadata = {
      service: serviceName,
      name: name,
      phone: phone,
      email: email,
      submittedAt: new Date().toISOString(),
      files: uploadedFiles.map(f => ({
        originalName: f.name,
        path: f.path,
        url: f.url,
        size: f.size
      }))
    };

    const metadataFileName = `metadata_${Date.now()}.json`;
    const metadataPath = path.join(__dirname, 'temp-uploads', metadataFileName);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    try {
      const sanitizedService = serviceName.replace(/[^a-zA-Z0-9]/g, '_');
      const metadataStoragePath = `FormHouse/${sanitizedService}/${sanitizedName}/${metadataFileName}`;
      await bucket.upload(metadataPath, {
        destination: metadataStoragePath
      });
      await bucket.file(metadataStoragePath).makePublic();
      
      // Delete temporary metadata file
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
    } catch (metadataError) {
      console.error('Error uploading metadata:', metadataError);
      // Continue anyway
    }

    res.json({
      success: true,
      message: 'Form submitted successfully',
      data: {
        service: serviceName,
        filesUploaded: uploadedFiles.length,
        files: uploadedFiles
      }
    });

  } catch (error) {
    console.error('Error submitting form:', error);
    
    // Clean up uploaded files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to submit form', 
      message: error.message 
    });
  }
});

// Get service list
app.get('/api/services', (req, res) => {
  res.json({
    services: Object.keys(serviceNames).map(key => ({
      key: key,
      name: serviceNames[key]
    }))
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FormHouse Backend Server running on http://localhost:${PORT}`);
  if (firebaseInitialized) {
    console.log(`🔥 Using Firebase Storage for file uploads`);
  } else {
    console.log(`⚠️ Firebase Storage not configured - file uploads will fail`);
    console.log(`   See FIREBASE_SETUP.md for setup instructions`);
  }
});

