const express = require('express');
const multer = require('multer');
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const service = req.body.service || 'general';
    const name = req.body.name || 'unknown';
    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const uploadPath = path.join(__dirname, 'uploads', service, sanitizedName);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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
    storage: 'local'
  });
});

// Submit form with files
app.post('/api/submit', upload.array('files'), async (req, res) => {
  try {
    const { service, name, phone, email } = req.body;
    const files = req.files || [];

    if (!service || !name || !phone || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: service, name, phone, email' 
      });
    }

    const serviceName = serviceNames[service] || service;
    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const uploadPath = path.join(__dirname, 'uploads', service, sanitizedName);

    // Create metadata file
    const metadata = {
      service: serviceName,
      name: name,
      phone: phone,
      email: email,
      submittedAt: new Date().toISOString(),
      files: files.map(f => ({
        originalName: f.originalname,
        savedName: f.filename,
        path: path.relative(__dirname, f.path),
        size: f.size,
        mimetype: f.mimetype
      }))
    };

    const metadataPath = path.join(uploadPath, `metadata_${Date.now()}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    res.json({
      success: true,
      message: 'Form submitted successfully',
      data: {
        service: serviceName,
        uploadPath: path.relative(__dirname, uploadPath),
        filesUploaded: files.length,
        files: files.map(f => ({
          originalName: f.originalname,
          savedName: f.filename
        }))
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

// List uploaded files (for admin/debugging)
app.get('/api/files', (req, res) => {
  try {
    const uploadsPath = path.join(__dirname, 'uploads');
    const services = {};
    
    if (fs.existsSync(uploadsPath)) {
      const serviceDirs = fs.readdirSync(uploadsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      serviceDirs.forEach(service => {
        const servicePath = path.join(uploadsPath, service);
        const userDirs = fs.readdirSync(servicePath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        services[service] = userDirs.map(user => {
          const userPath = path.join(servicePath, user);
          const files = fs.readdirSync(userPath)
            .filter(file => !file.startsWith('metadata_'))
            .map(file => ({
              name: file,
              path: path.join(service, user, file),
              size: fs.statSync(path.join(userPath, file)).size
            }));
          
          return {
            user: user,
            files: files
          };
        });
      });
    }
    
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
  console.log(`📁 Files will be stored locally in: ${path.join(__dirname, 'uploads')}`);
  console.log(`✅ No Google Drive API required - using local storage`);
});

