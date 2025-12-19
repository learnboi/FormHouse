const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
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

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Google Drive API Setup
let drive = null;
let driveAvailable = false;

try {
  const credentialsPath = path.join(__dirname, 'credentials.json');
  if (fs.existsSync(credentialsPath)) {
    const SCOPES = ['https://www.googleapis.com/auth/drive'];
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: SCOPES
    });
    drive = google.drive({ version: 'v3', auth });
    driveAvailable = true;
    
    // Get service account email for display
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const serviceAccountEmail = credentials.client_email;
    
    console.log('✅ Google Drive API initialized successfully');
    console.log(`📧 Service Account Email: ${serviceAccountEmail}`);
    console.log('💡 Make sure to share your FormHouse folder with this email address!');
  } else {
    console.warn('⚠️ credentials.json not found. Google Drive features will be disabled.');
    console.warn('   Please follow SETUP.md to configure Google Drive API.');
  }
} catch (error) {
  console.error('❌ Error initializing Google Drive API:', error.message);
  console.warn('   Google Drive features will be disabled.');
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

// Helper function to extract folder ID from URL or clean ID
function extractFolderId(folderIdOrUrl) {
  if (!folderIdOrUrl) return null;
  
  // If it's already a clean ID (no special characters except alphanumeric, dash, underscore)
  if (/^[a-zA-Z0-9_-]+$/.test(folderIdOrUrl)) {
    return folderIdOrUrl;
  }
  
  // Extract from Google Drive URL
  // Pattern: https://drive.google.com/drive/folders/FOLDER_ID or /folders/FOLDER_ID
  const urlMatch = folderIdOrUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // If it contains query parameters, extract the ID part before '?'
  const idMatch = folderIdOrUrl.match(/^([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return idMatch[1];
  }
  
  return folderIdOrUrl;
}

// Helper function to find or create folder
async function findOrCreateFolder(parentId, folderName) {
  try {
    // Clean the parent ID to ensure it's a valid folder ID
    const cleanParentId = extractFolderId(parentId);
    if (!cleanParentId) {
      throw new Error(`Invalid parent folder ID: ${parentId}`);
    }
    
    // Search for existing folder (including shared drives)
    const response = await drive.files.list({
      q: `name='${folderName.replace(/'/g, "\\'")}' and '${cleanParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Verify parent folder is accessible before creating subfolder
    console.log(`Verifying parent folder access: ${cleanParentId}`);
    try {
      const parentFolder = await drive.files.get({
        fileId: cleanParentId,
        fields: 'id, name, capabilities, parents',
        supportsAllDrives: true
      });
      
      const canEdit = parentFolder.data.capabilities && parentFolder.data.capabilities.canEdit;
      if (!canEdit) {
        throw new Error(
          `Cannot create folder: Parent folder "${parentFolder.data.name || cleanParentId}" does not have Editor permissions.\n` +
          `Please ensure the parent folder is shared with the service account with Editor permissions.`
        );
      }
      
      console.log(`✅ Parent folder "${parentFolder.data.name || cleanParentId}" is accessible and writable`);
      console.log(`   Parent folder parents:`, parentFolder.data.parents || []);
    } catch (parentError) {
      if (parentError.code === 404) {
        throw new Error(
          `Parent folder not found: ${cleanParentId}\n` +
          `The folder may not be shared with the service account or may not exist.\n` +
          `Please verify the folder ID is correct and the folder is shared with Editor permissions.`
        );
      }
      throw parentError;
    }
    
    // Create folder if it doesn't exist (in shared folder)
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [cleanParentId]
    };

    console.log(`Creating folder "${folderName}" in parent: ${cleanParentId}`);
    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, parents',
      supportsAllDrives: true
    });

    const newFolderId = folder.data.id;
    const createdParents = folder.data.parents || [];
    
    console.log(`Created folder "${folderName}":`, newFolderId);
    console.log(`Folder parents:`, createdParents);
    
    // Automatically share the folder with the service account to ensure it has permissions
    try {
      const credentialsPath = path.join(__dirname, 'credentials.json');
      if (fs.existsSync(credentialsPath)) {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        const serviceAccountEmail = credentials.client_email;
        
        // Check if service account already has permission
        const permissions = await drive.permissions.list({
          fileId: newFolderId,
          fields: 'permissions(id, emailAddress, role)',
          supportsAllDrives: true
        });
        
        const hasPermission = permissions.data.permissions?.some(
          p => p.emailAddress === serviceAccountEmail && (p.role === 'writer' || p.role === 'owner')
        );
        
        if (!hasPermission) {
          console.log(`Sharing folder "${folderName}" with service account...`);
          await drive.permissions.create({
            fileId: newFolderId,
            requestBody: {
              role: 'writer',
              type: 'user',
              emailAddress: serviceAccountEmail
            },
            supportsAllDrives: true
          });
          console.log(`✅ Folder "${folderName}" shared with service account`);
        } else {
          console.log(`✅ Folder "${folderName}" already has service account permissions`);
        }
      }
    } catch (shareError) {
      console.warn(`⚠️ Could not automatically share folder: ${shareError.message}`);
      // Don't throw - folder creation succeeded, sharing is just a bonus
    }
    
    // Verify the folder was created in the correct parent
    if (!createdParents.includes(cleanParentId)) {
      console.error(`❌ ERROR: Folder "${folderName}" was created in a different location than expected!`);
      console.error(`   Expected parent: ${cleanParentId}, Actual parents: ${createdParents.join(', ')}`);
      throw new Error(
        `Folder "${folderName}" was created in the wrong location.\n` +
        `Expected to be in: ${cleanParentId}\n` +
        `But was created in: ${createdParents.join(', ') || 'service account\'s drive'}\n` +
        `This usually means the parent folder is not properly shared or accessible.\n` +
        `Please verify the parent folder is shared with Editor permissions.`
      );
    }
    
    // Verify the created folder is actually in the shared FormHouse location
    try {
      const formHouseFolderId = await getFormHouseFolderId();
      let isInSharedLocation = false;
      
      if (createdParents.includes(formHouseFolderId)) {
        isInSharedLocation = true;
      } else {
        // Check if parent is a child of FormHouse
        for (const parentId of createdParents) {
          try {
            const parent = await drive.files.get({
              fileId: parentId,
              fields: 'id, parents',
              supportsAllDrives: true
            });
            const parentParents = parent.data.parents || [];
            if (parentParents.includes(formHouseFolderId)) {
              isInSharedLocation = true;
              break;
            }
          } catch (e) {
            // Ignore
          }
        }
      }
      
      if (!isInSharedLocation) {
        throw new Error(
          `Folder "${folderName}" was created in the service account's drive instead of your shared FormHouse folder.\n` +
          `This folder will not work for file uploads. Please ensure the parent folder is in your shared FormHouse folder.`
        );
      }
      
      console.log(`✅ Folder "${folderName}" is in the correct shared location`);
    } catch (locationError) {
      if (locationError.message && locationError.message.includes('was created in')) {
        throw locationError;
      }
      console.warn(`⚠️ Could not verify folder location: ${locationError.message}`);
    }
    
    // Verify folder permissions before returning
    try {
      const createdFolder = await drive.files.get({
        fileId: newFolderId,
        fields: 'id, name, parents, capabilities',
        supportsAllDrives: true
      });
      
      const canEdit = createdFolder.data.capabilities && createdFolder.data.capabilities.canEdit;
      if (!canEdit) {
        console.error(`❌ Error: Newly created folder "${folderName}" does not have write permissions`);
        throw new Error(
          `Cannot write to folder "${folderName}". The folder may have been created in the service account's drive instead of the shared folder.\n` +
          `Parent folder ID: ${cleanParentId}\n` +
          `Please ensure the parent folder is properly shared with Editor permissions.`
        );
      } else {
        console.log(`✅ Folder "${folderName}" has write permissions`);
      }
    } catch (verifyError) {
      if (verifyError.message && verifyError.message.includes('Cannot write')) {
        throw verifyError;
      }
      console.warn(`⚠️ Could not verify folder permissions: ${verifyError.message}`);
    }
    
    return newFolderId;
  } catch (error) {
    // If creation fails due to permissions, provide helpful error
    if (error.message && error.message.includes('storage quota')) {
      throw new Error(
        'Cannot create folder: Service accounts don\'t have storage quota.\n' +
        'Please create the folder manually in your shared FormHouse folder and share it with the service account.'
      );
    }
    console.error('Error in findOrCreateFolder:', error);
    throw error;
  }
}

// Helper function to validate folder access
async function validateFolderAccess(folderId) {
  try {
    const cleanFolderId = extractFolderId(folderId);
    const file = await drive.files.get({
      fileId: cleanFolderId,
      fields: 'id, name, permissions, capabilities',
      supportsAllDrives: true
    });
    
    // Check if service account can write to this folder
    const canEdit = file.data.capabilities && file.data.capabilities.canEdit;
    if (!canEdit) {
      throw new Error('Service account does not have Editor permissions on this folder');
    }
    
    return { valid: true, folderName: file.data.name, folderId: cleanFolderId };
  } catch (error) {
    if (error.code === 404) {
      throw new Error(
        `Folder not found or not accessible. The folder ID "${folderId}" may be incorrect, or the folder is not shared with your service account.\n\n` +
        `To fix this:\n` +
        `1. Open credentials.json and copy the client_email value\n` +
        `2. Go to Google Drive and open the FormHouse folder\n` +
        `3. Right-click > Share\n` +
        `4. Paste the service account email and give it "Editor" permission\n` +
        `5. Make sure you're sharing YOUR personal folder, not the service account's folder`
      );
    }
    throw error;
  }
}

// Helper function to get FormHouse root folder ID
async function getFormHouseFolderId() {
  try {
    // Option 1: Use folder ID from environment variable (if provided)
    if (process.env.FORMHOUSE_FOLDER_ID) {
      const folderId = extractFolderId(process.env.FORMHOUSE_FOLDER_ID);
      console.log('Using FormHouse folder ID from environment:', folderId);
      // Validate access
      const validation = await validateFolderAccess(folderId);
      console.log(`✅ Folder access validated: "${validation.folderName}"`);
      return validation.folderId;
    }

    // Option 2: Search for FormHouse folder in shared folders
    // Search in "My Drive" and shared folders
    const response = await drive.files.list({
      q: "name='FormHouse' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });

    if (response.data.files.length > 0) {
      const folderId = response.data.files[0].id;
      console.log('Found FormHouse folder:', folderId);
      // Validate access
      const validation = await validateFolderAccess(folderId);
      console.log(`✅ Folder access validated: "${validation.folderName}"`);
      return validation.folderId;
    }

    // If folder not found, throw helpful error
    throw new Error(
      'FormHouse folder not found. Please:\n' +
      '1. Create a folder named "FormHouse" in your Google Drive\n' +
      '2. Share it with your service account email (found in credentials.json)\n' +
      '3. Give it "Editor" permissions\n' +
      'OR set FORMHOUSE_FOLDER_ID in .env file with the folder ID'
    );
  } catch (error) {
    console.error('Error getting FormHouse folder:', error.message);
    throw error;
  }
}

// Helper function to upload file to Google Drive
async function uploadFileToDrive(filePath, fileName, folderId) {
  try {
    // Clean the folder ID to ensure it's valid
    const cleanFolderId = extractFolderId(folderId);
    if (!cleanFolderId) {
      throw new Error(`Invalid folder ID: ${folderId}`);
    }
    
    // CRITICAL: Verify folder is in shared location before uploading
    console.log(`🔍 Verifying upload folder location: ${cleanFolderId}`);
    const formHouseFolderId = await getFormHouseFolderId();
    
    try {
      const uploadFolder = await drive.files.get({
        fileId: cleanFolderId,
        fields: 'id, name, parents',
        supportsAllDrives: true
      });
      
      const folderParents = uploadFolder.data.parents || [];
      console.log(`   Folder parents:`, folderParents);
      
      // Recursively check if folder is in FormHouse location
      const checkedParents = new Set();
      let isInSharedLocation = false;
      
      const checkParentChain = async (parentId) => {
        if (checkedParents.has(parentId)) return false;
        checkedParents.add(parentId);
        
        if (parentId === formHouseFolderId) {
          return true;
        }
        
        try {
          const parent = await drive.files.get({
            fileId: parentId,
            fields: 'id, parents',
            supportsAllDrives: true
          });
          
          const parentParents = parent.data.parents || [];
          for (const grandParentId of parentParents) {
            if (await checkParentChain(grandParentId)) {
              return true;
            }
          }
        } catch (e) {
          // Ignore errors checking parents
        }
        
        return false;
      };
      
      for (const parentId of folderParents) {
        if (await checkParentChain(parentId)) {
          isInSharedLocation = true;
          break;
        }
      }
      
      if (!isInSharedLocation) {
        throw new Error(
          `❌ CRITICAL ERROR: Folder "${uploadFolder.data.name || cleanFolderId}" is NOT in your shared FormHouse folder!\n` +
          `The folder is in the service account's drive (which has NO storage quota).\n\n` +
          `This folder was created in the wrong location. To fix:\n` +
          `1. Go to Google Drive and delete this folder (it's in the service account's drive)\n` +
          `2. Make sure your FormHouse folder is properly shared with Editor permissions\n` +
          `3. Try uploading again - the folder should be created in the correct location\n\n` +
          `The server will now prevent folder creation in the wrong location.`
        );
      }
      
      console.log(`✅ Upload folder is in shared FormHouse location`);
    } catch (folderError) {
      if (folderError.message && folderError.message.includes('CRITICAL')) {
        throw folderError;
      }
      if (folderError.code === 404) {
        throw new Error(
          `Upload folder not found: ${cleanFolderId}\n` +
          `The folder may not be shared with the service account.`
        );
      }
      throw folderError;
    }
    
    const fileMetadata = {
      name: fileName,
      parents: [cleanFolderId]
    };

    const media = {
      mimeType: getMimeType(fileName),
      body: fs.createReadStream(filePath)
    };

    console.log(`📤 Uploading file "${fileName}" to folder: ${cleanFolderId}`);
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true
    });

    return file.data;
  } catch (error) {
    // Log full error details for debugging
    console.error('Full upload error:', JSON.stringify({
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    }, null, 2));
    
    // Check for various error types
    const errorMessage = error.message || '';
    const errorResponse = error.response?.data || {};
    const errorCode = error.code || errorResponse.error?.code;
    
    // Storage quota error (can be 403 or 507)
    const isStorageQuotaError = errorMessage.includes('storage quota') || 
        errorResponse.error?.message?.includes('storage quota') ||
        errorCode === 507 ||
        errorResponse.error?.errors?.some(e => e.reason === 'storageQuotaExceeded') ||
        (errorCode === 403 && errorResponse.error?.errors?.some(e => e.reason === 'storageQuotaExceeded'));
    
    if (isStorageQuotaError) {
      // Get service account email for better error message
      let serviceAccountEmail = 'your service account email';
      try {
        const credentialsPath = path.join(__dirname, 'credentials.json');
        if (fs.existsSync(credentialsPath)) {
          const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
          serviceAccountEmail = credentials.client_email;
        }
      } catch (e) {
        // Ignore
      }
      
      throw new Error(
        'Cannot upload file: Service accounts don\'t have storage quota.\n\n' +
        'Even though the folder is in your shared FormHouse folder, Google Drive is still checking\n' +
        'the service account\'s quota when uploading files.\n\n' +
        'SOLUTION: You need to ensure the folder AND all parent folders are properly shared.\n\n' +
        'To fix:\n' +
        '1. Go to Google Drive\n' +
        '2. Open your FormHouse folder\n' +
        '3. Right-click on the "PAN Card" folder (or whichever service folder)\n' +
        '4. Click Share\n' +
        '5. Add: ' + serviceAccountEmail + '\n' +
        '6. Set permission to "Editor"\n' +
        '7. Click "Send"\n' +
        '8. Do the same for the user folder (e.g., "sdd sdfsf")\n' +
        '9. Try uploading again\n\n' +
        'Alternatively, you can share the entire FormHouse folder and ensure "Share with all subfolders" is enabled.'
      );
    }
    
    // Permission denied error
    if (error.code === 403 || errorMessage.includes('permission') || errorMessage.includes('Forbidden')) {
      throw new Error(
        'Permission denied: Cannot upload file to this folder.\n' +
        'The folder may not be properly shared with the service account.\n' +
        'Please check that the folder has Editor permissions for the service account.'
      );
    }
    
    // File not found error
    if (error.code === 404 || errorMessage.includes('not found')) {
      throw new Error(
        `Folder not found: The folder ID "${folderId}" may be incorrect or not accessible.\n` +
        'Please verify the folder exists and is shared with the service account.'
      );
    }
    
    console.error('Error uploading file to Drive:', error);
    console.error('Error details:', JSON.stringify(errorResponse, null, 2));
    throw new Error(`Failed to upload file: ${errorMessage || errorResponse.error?.message || 'Unknown error'}`);
  }
}

// Helper function to get MIME type
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// API Routes

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FormHouse API is running' });
});

// Test folder access
app.get('/api/test-folder', async (req, res) => {
  try {
    if (!driveAvailable) {
      return res.status(503).json({ 
        error: 'Google Drive API not configured',
        message: 'Please configure credentials.json'
      });
    }

    // Get service account email
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const serviceAccountEmail = credentials.client_email;

    try {
      const folderId = await getFormHouseFolderId();
      const validation = await validateFolderAccess(folderId);
      
      res.json({
        success: true,
        message: 'Folder access verified successfully',
        folder: {
          id: validation.folderId,
          name: validation.folderName
        },
        serviceAccountEmail: serviceAccountEmail,
        instructions: '✅ Everything is configured correctly! You can now upload files.'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        serviceAccountEmail: serviceAccountEmail,
        instructions: [
          '1. Open credentials.json and copy the client_email value above',
          '2. Go to Google Drive and open your FormHouse folder',
          '3. Right-click on the folder > Share',
          '4. Paste the service account email',
          '5. Set permission to "Editor"',
          '6. Click Send',
          '7. Make sure the folder is in YOUR personal Google Drive, not the service account\'s drive'
        ]
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test folder access',
      message: error.message
    });
  }
});

// Submit form with files
app.post('/api/submit', upload.array('files'), async (req, res) => {
  try {
    if (!driveAvailable) {
      return res.status(503).json({ 
        error: 'Google Drive API not configured',
        message: 'Please configure credentials.json to enable file uploads. See SETUP.md for instructions.'
      });
    }

    const { service, name, phone, email } = req.body;
    const files = req.files || [];

    if (!service || !name || !phone || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: service, name, phone, email' 
      });
    }

    // Get FormHouse root folder
    const formHouseFolderId = await getFormHouseFolderId();

    // Get or create service folder
    const serviceName = serviceNames[service] || service;
    const serviceFolderId = await findOrCreateFolder(formHouseFolderId, serviceName);

    // Get or create user folder (by name)
    const userName = name.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const userFolderId = await findOrCreateFolder(serviceFolderId, userName);

    // Upload all files to user folder
    const uploadedFiles = [];
    for (const file of files) {
      const originalName = file.originalname;
      const driveFile = await uploadFileToDrive(file.path, originalName, userFolderId);
      uploadedFiles.push({
        name: originalName,
        driveId: driveFile.id,
        webViewLink: driveFile.webViewLink
      });

      // Delete local file after upload
      fs.unlinkSync(file.path);
    }

    // Create a metadata file with user information
    const metadata = {
      service: serviceName,
      name: name,
      phone: phone,
      email: email,
      submittedAt: new Date().toISOString(),
      files: uploadedFiles.map(f => f.name)
    };

    const metadataFileName = `metadata_${Date.now()}.json`;
    const metadataPath = path.join(__dirname, 'uploads', metadataFileName);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    const metadataFile = await uploadFileToDrive(metadataPath, metadataFileName, userFolderId);
    fs.unlinkSync(metadataPath);

    res.json({
      success: true,
      message: 'Form submitted successfully',
      data: {
        service: serviceName,
        userFolderId: userFolderId,
        filesUploaded: uploadedFiles.length,
        files: uploadedFiles
      }
    });

  } catch (error) {
    console.error('Error submitting form:', error);
    
    // Clean up uploaded files if error occurs
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
  console.log(`📁 Make sure credentials.json is configured for Google Drive API`);
});

