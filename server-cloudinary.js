const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
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
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Cloudinary Configuration
let cloudinaryConfigured = false;

try {
  if (process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET) {
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    cloudinaryConfigured = true;
    console.log('✅ Cloudinary configured successfully');
    console.log(`☁️  Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  } else {
    console.warn('⚠️ Cloudinary credentials not found in .env file');
    console.warn('   Cloudinary features will be disabled.');
    console.warn('   See CLOUDINARY_SETUP.md for setup instructions.');
  }
} catch (error) {
  console.error('❌ Error configuring Cloudinary:', error.message);
  console.warn('   Cloudinary features will be disabled.');
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

// Helper function to upload file to Cloudinary
async function uploadFileToCloudinary(buffer, fileName, service, userName) {
  return new Promise((resolve, reject) => {
    const sanitizedService = service.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedUserName = userName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    
    // Create folder path: FormHouse/Service/User
    const folderPath = `FormHouse/${sanitizedService}/${sanitizedUserName}`;
    
    // Determine resource type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    let resourceType = 'auto'; // Cloudinary will auto-detect
    if (['.pdf', '.doc', '.docx'].includes(ext)) {
      resourceType = 'raw'; // For documents
    }
    
    const uploadOptions = {
      folder: folderPath,
      public_id: path.basename(fileName, ext),
      resource_type: resourceType,
      overwrite: false,
      use_filename: true,
      unique_filename: true
    };
    
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            name: fileName,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            resourceType: result.resource_type
          });
        }
      }
    );
    
    uploadStream.end(buffer);
  });
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
    storage: cloudinaryConfigured ? 'cloudinary' : 'not configured'
  });
});

// Submit form with files
app.post('/api/submit', upload.array('files'), async (req, res) => {
  try {
    if (!cloudinaryConfigured) {
      return res.status(503).json({ 
        error: 'Cloudinary not configured',
        message: 'Please configure Cloudinary. See CLOUDINARY_SETUP.md for instructions.'
      });
    }

    const { service, name, phone, email } = req.body;
    const files = req.files || [];

    if (!service || !name || !phone || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: service, name, phone, email' 
      });
    }

    const serviceName = serviceNames[service] || service;
    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9]/g, '_');

    // Upload all files to Cloudinary
    const uploadedFiles = [];
    for (const file of files) {
      try {
        const cloudinaryFile = await uploadFileToCloudinary(
          file.buffer,
          file.originalname,
          serviceName,
          sanitizedName
        );
        
        uploadedFiles.push(cloudinaryFile);
      } catch (uploadError) {
        console.error(`Error uploading file ${file.originalname}:`, uploadError);
        // Continue with other files
      }
    }

    // Create and upload metadata as JSON
    const metadata = {
      service: serviceName,
      name: name,
      phone: phone,
      email: email,
      submittedAt: new Date().toISOString(),
      files: uploadedFiles.map(f => ({
        originalName: f.name,
        url: f.url,
        publicId: f.publicId,
        size: f.size
      }))
    };

    try {
      const sanitizedService = serviceName.replace(/[^a-zA-Z0-9]/g, '_');
      const metadataFolder = `FormHouse/${sanitizedService}/${sanitizedName}`;
      const metadataJson = JSON.stringify(metadata, null, 2);
      const metadataBuffer = Buffer.from(metadataJson, 'utf-8');
      
      const metadataResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: metadataFolder,
            public_id: `metadata_${Date.now()}`,
            resource_type: 'raw',
            overwrite: false
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(metadataBuffer);
      });
      
      uploadedFiles.push({
        name: 'metadata.json',
        url: metadataResult.secure_url,
        publicId: metadataResult.public_id,
        size: metadataResult.bytes
      });
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
  if (cloudinaryConfigured) {
    console.log(`☁️  Using Cloudinary for file storage`);
  } else {
    console.log(`⚠️ Cloudinary not configured - file uploads will fail`);
    console.log(`   See CLOUDINARY_SETUP.md for setup instructions`);
  }
});

