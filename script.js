// Service data with document requirements
const services = {
    pan: {
        name: "PAN Card",
        icon: "🆔",
        description: "Apply for a new PAN card or update existing PAN card details",
        documents: [
            "Photo (Passport size - 35mm x 45mm)",
            "Signature (on white paper)",
            "Aadhar Card (Copy)",
            "Address Proof (Aadhar/Utility Bill/Rent Agreement)",
            "Mother's Name",
            "Father's Name",
            "Husband's Full Name (if applicable)",
            "Phone Number",
            "Email Address"
        ],
        category: "identity"
    },
    aadhar: {
        name: "Aadhar Card",
        icon: "🪪",
        description: "Apply for new Aadhar card, update details, or download e-Aadhar",
        documents: [
            "Birth Certificate or School Certificate",
            "Photo (for new enrollment)",
            "Address Proof (Electricity Bill/Rent Agreement/Bank Statement)",
            "Identity Proof (PAN/Voter ID/Driving License)",
            "Phone Number",
            "Email Address"
        ],
        category: "identity"
    },
    scholarship: {
        name: "Scholarship Forms",
        icon: "🎓",
        description: "Apply for various government scholarships (Post-Matric, Merit, etc.)",
        documents: [
            "Income Certificate",
            "Caste Certificate (if applicable)",
            "Domicile Certificate",
            "Previous Year Marksheet",
            "Bank Account Details",
            "Aadhar Card",
            "Passport Size Photo",
            "School/College ID Card"
        ],
        category: "education"
    },
    caste: {
        name: "Caste Certificate",
        icon: "📜",
        description: "Apply for or renew caste certificate",
        documents: [
            "Birth Certificate",
            "School Leaving Certificate",
            "Father's/Mother's Caste Certificate",
            "Aadhar Card",
            "Ration Card (if available)",
            "Address Proof",
            "Passport Size Photo",
            "Affidavit (if required)"
        ],
        category: "certificate"
    },
    domicile: {
        name: "Domicile Certificate",
        icon: "🏠",
        description: "Apply for domicile certificate of Maharashtra",
        documents: [
            "Birth Certificate",
            "School Leaving Certificate (SSC/HSC)",
            "Aadhar Card",
            "Address Proof (Electricity Bill/Rent Agreement)",
            "Father's/Mother's Domicile Certificate (if available)",
            "Passport Size Photo",
            "Affidavit"
        ],
        category: "certificate"
    },
    ladkiBahin: {
        name: "Ladki Bahin KYC",
        icon: "👩",
        description: "Complete KYC for Ladki Bahin Yojana scheme",
        documents: [
            "Aadhar Card",
            "Bank Account Details",
            "Ration Card",
            "Income Certificate",
            "Caste Certificate (if applicable)",
            "Domicile Certificate",
            "Passport Size Photo",
            "Mobile Number (linked with Aadhar)",
            "Email Address"
        ],
        category: "scheme"
    },
    govtExam: {
        name: "Government Exam Forms",
        icon: "📝",
        description: "Fill forms for various government exams (MPSC, UPSC, etc.)",
        documents: [
            "Educational Certificates (10th, 12th, Graduation)",
            "Aadhar Card",
            "PAN Card",
            "Caste Certificate (if applicable)",
            "Domicile Certificate",
            "Passport Size Photo",
            "Signature",
            "Bank Account Details",
            "Email Address",
            "Phone Number"
        ],
        category: "exam"
    },
    recharge: {
        name: "Recharge Services",
        icon: "📱",
        description: "Mobile, DTH, and other recharge services",
        documents: [],
        category: "recharge",
        rechargeOptions: [
            { name: "Mobile Recharge", icon: "📱" },
            { name: "DTH Recharge", icon: "📺" },
            { name: "Data Card", icon: "💾" },
            { name: "Electricity Bill", icon: "⚡" },
            { name: "Gas Bill", icon: "🔥" },
            { name: "Water Bill", icon: "💧" }
        ]
    }
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    renderServices();
    setupModal();
    checkBackendConnection();
});

// Check if backend is running
async function checkBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('✅ Backend server is connected');
        }
    } catch (error) {
        console.warn('⚠️ Backend server is not running. File uploads will not work.');
        console.warn('Please start the backend server: npm start');
        // Optionally show a notification to user
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 80px; right: 20px; background: #f59e0b; color: white; padding: 1rem; border-radius: 8px; z-index: 2000; max-width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        notification.innerHTML = '⚠️ Backend server not connected. Please start the server for file uploads.';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
}

// Render service cards
function renderServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    servicesGrid.innerHTML = '';

    Object.keys(services).forEach(key => {
        const service = services[key];
        const card = document.createElement('div');
        card.className = 'service-card';
        card.onclick = () => openServiceModal(key);
        
        card.innerHTML = `
            <span class="service-icon">${service.icon}</span>
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <span class="service-badge">Click to view details</span>
        `;
        
        servicesGrid.appendChild(card);
    });
}

// Open service modal
function openServiceModal(serviceKey) {
    const service = services[serviceKey];
    const modal = document.getElementById('serviceModal');
    const modalBody = document.getElementById('modalBody');
    
    let content = `
        <div class="service-detail">
            <h2>
                <span class="service-icon-large">${service.icon}</span>
                ${service.name}
            </h2>
            <p class="service-description">${service.description}</p>
    `;

    // If it's recharge service, show recharge options
    if (serviceKey === 'recharge') {
        content += `
            <div class="recharge-services">
        `;
        service.rechargeOptions.forEach(option => {
            content += `
                <div class="recharge-item" onclick="handleRecharge('${option.name}')">
                    <div class="icon">${option.icon}</div>
                    <h4>${option.name}</h4>
                </div>
            `;
        });
        content += `</div>`;
    } else {
        // Show document requirements
        content += `
            <div class="documents-section">
                <h3>📋 Required Documents</h3>
                <ul class="documents-list">
        `;
        service.documents.forEach(doc => {
            content += `<li>${doc}</li>`;
        });
        content += `</ul>`;

        // Upload section
        content += `
            <div class="upload-section">
                <h3>📤 Upload Documents</h3>
                <div class="upload-area" id="uploadArea">
                    <span class="upload-icon">📎</span>
                    <p>Click to upload or drag and drop</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">Supported: PDF, JPG, PNG (Max 5MB each)</p>
                    <input type="file" id="fileInput" multiple accept=".pdf,.jpg,.jpeg,.png">
                </div>
                <div class="file-list" id="fileList"></div>
                
                <div class="form-group" style="margin-top: 2rem;">
                    <label for="phone">Phone Number *</label>
                    <input type="tel" id="phone" placeholder="Enter your phone number" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email Address *</label>
                    <input type="email" id="email" placeholder="Enter your email address" required>
                </div>
                
                <div class="form-group">
                    <label for="name">Full Name *</label>
                    <input type="text" id="name" placeholder="Enter your full name" required>
                </div>
                
                <button class="btn btn-primary" onclick="submitForm('${serviceKey}')" style="width: 100%; margin-top: 1rem;">
                    Submit Application
                </button>
            </div>
        `;
    }

    content += `</div>`;
    modalBody.innerHTML = content;
    modal.style.display = 'block';

    // Setup file upload
    if (serviceKey !== 'recharge') {
        setupFileUpload();
    }
}

// Setup file upload functionality
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    
    let uploadedFiles = [];

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });

    function handleFiles(files) {
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                showFileError(`File "${file.name}" is too large. Maximum size is 5MB.`);
                return;
            }
            
            uploadedFiles.push(file);
            displayFile(file);
        });
    }

    function displayFile(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>📄 ${file.name} (${(file.size / 1024).toFixed(2)} KB)</span>
            <button class="remove-file" onclick="removeFile('${file.name}')">Remove</button>
        `;
        fileList.appendChild(fileItem);
    }

    window.removeFile = function(fileName) {
        uploadedFiles = uploadedFiles.filter(f => f.name !== fileName);
        const items = fileList.querySelectorAll('.file-item');
        items.forEach(item => {
            if (item.textContent.includes(fileName)) {
                item.remove();
            }
        });
    };

    window.uploadedFiles = uploadedFiles;
}

// API Configuration - Change this to your backend server URL
const API_BASE_URL = window.CONFIG?.API_BASE_URL || 'http://localhost:3000/api';

// Submit form
async function submitForm(serviceKey) {
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;

    if (!phone || !email || !name) {
        showValidationError('Please fill in all required fields');
        return;
    }

    const service = services[serviceKey];
    const files = window.uploadedFiles || [];

    // Show loading state
    const submitButton = document.querySelector('.btn-primary');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Uploading...';

    try {
        // Create FormData to send files
        const formData = new FormData();
        formData.append('service', serviceKey);
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('email', email);

        // Append all files
        files.forEach((file, index) => {
            formData.append('files', file);
        });

        // Send to backend
        const response = await fetch(`${API_BASE_URL}/submit`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showSuccessMessage(service.name, result.data.filesUploaded, phone);
        } else {
            throw new Error(result.message || 'Failed to submit form');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showErrorMessage(error.message);
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Handle recharge
function handleRecharge(rechargeType) {
    const modalBody = document.getElementById('modalBody');
    
    const rechargeForm = document.createElement('div');
    rechargeForm.className = 'recharge-form';
    rechargeForm.innerHTML = `
        <div class="service-detail">
            <h2>
                <span class="service-icon-large">📺</span>
                ${rechargeType}
            </h2>
            <p class="service-description">Enter your details to proceed with ${rechargeType}</p>
            
            <div class="form-group">
                <label for="rechargeNumber">${rechargeType.includes('Mobile') ? 'Mobile Number' : rechargeType.includes('DTH') ? 'Subscriber ID' : 'Account Number'} *</label>
                <input type="text" id="rechargeNumber" placeholder="Enter ${rechargeType.includes('Mobile') ? 'mobile number' : rechargeType.includes('DTH') ? 'subscriber ID' : 'account number'}" required>
            </div>
            
            <div class="form-group">
                <label for="rechargeAmount">Amount (₹) *</label>
                <input type="number" id="rechargeAmount" placeholder="Enter amount" min="1" required>
            </div>
            
            <div class="form-group">
                <label for="rechargePhone">Contact Number *</label>
                <input type="tel" id="rechargePhone" placeholder="Enter your contact number" required>
            </div>
            
            <div class="form-group">
                <label for="rechargeEmail">Email Address</label>
                <input type="email" id="rechargeEmail" placeholder="Enter your email (optional)">
            </div>
            
            <button class="btn btn-primary" onclick="submitRecharge('${rechargeType}')" style="width: 100%; margin-top: 1rem;">
                Proceed with ${rechargeType}
            </button>
        </div>
    `;
    
    modalBody.innerHTML = '';
    modalBody.appendChild(rechargeForm);
}

// Submit recharge
async function submitRecharge(rechargeType) {
    const number = document.getElementById('rechargeNumber').value;
    const amount = document.getElementById('rechargeAmount').value;
    const phone = document.getElementById('rechargePhone').value;
    const email = document.getElementById('rechargeEmail').value;
    
    if (!number || !amount || !phone) {
        showValidationError('Please fill in all required fields');
        return;
    }
    
    // Show loading
    const submitButton = document.querySelector('.btn-primary');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';
    
    try {
        // Simulate API call (replace with actual API call)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        showSuccessMessage(rechargeType, 0, phone, `Amount: ₹${amount}`);
    } catch (error) {
        showErrorMessage(error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Setup modal close functionality
function setupModal() {
    const modal = document.getElementById('serviceModal');
    const closeBtn = document.querySelector('.close');

    closeBtn.onclick = closeModal;

    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };

    // Close on Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.getElementById('serviceModal');
    modal.style.display = 'none';
    // Clear uploaded files
    window.uploadedFiles = [];
    // Remove any success/error messages
    const existingMessage = document.querySelector('.success-message, .error-message');
    if (existingMessage) {
        existingMessage.remove();
    }
}

// Show success message
function showSuccessMessage(serviceName, filesUploaded, phone, additionalInfo = '') {
    const modalBody = document.getElementById('modalBody');
    
    // Remove existing content
    modalBody.innerHTML = '';
    
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    
    let detailsHTML = '';
    if (filesUploaded > 0) {
        detailsHTML += `
            <div class="detail-item">
                <span class="detail-icon">📄</span>
                <span><strong>${filesUploaded}</strong> file${filesUploaded !== 1 ? 's' : ''} uploaded</span>
            </div>
        `;
    }
    if (phone) {
        detailsHTML += `
            <div class="detail-item">
                <span class="detail-icon">📞</span>
                <span>We will contact you soon at <strong>${phone}</strong></span>
            </div>
        `;
    }
    if (additionalInfo) {
        detailsHTML += `
            <div class="detail-item">
                <span class="detail-icon">💰</span>
                <span>${additionalInfo}</span>
            </div>
        `;
    }
    
    successDiv.innerHTML = `
        <div class="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#10b981" opacity="0.1"/>
                <path d="M9 12l2 2 4-4" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2"/>
            </svg>
        </div>
        <h2>${filesUploaded > 0 ? 'Application Submitted Successfully!' : 'Request Submitted Successfully!'}</h2>
        <p class="success-text">Thank you for your ${filesUploaded > 0 ? 'application' : 'request'} for <strong>${serviceName}</strong></p>
        ${detailsHTML ? `<div class="success-details">${detailsHTML}</div>` : ''}
        <button class="btn btn-primary" onclick="closeModal()" style="margin-top: 2rem;">
            Close
        </button>
    `;
    
    modalBody.appendChild(successDiv);
    
    // Auto-close after 5 seconds (optional)
    setTimeout(() => {
        if (document.querySelector('.success-message')) {
            closeModal();
        }
    }, 5000);
}

// Show error message
function showErrorMessage(errorMessage) {
    const modalBody = document.getElementById('modalBody');
    const existingError = modalBody.querySelector('.error-message');
    
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#ef4444" opacity="0.1"/>
                <path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="2"/>
            </svg>
        </div>
        <h3>Submission Failed</h3>
        <p>${errorMessage}</p>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">
            Please check if the backend server is running and try again.
        </p>
    `;
    
    // Insert at the top of modal body
    const uploadSection = modalBody.querySelector('.upload-section');
    if (uploadSection) {
        uploadSection.insertBefore(errorDiv, uploadSection.firstChild);
    } else {
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Show validation error
function showValidationError(message) {
    const modalBody = document.getElementById('modalBody');
    const existingError = modalBody.querySelector('.error-message');
    
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#f59e0b" opacity="0.1"/>
                <path d="M12 8v4M12 16h.01" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2"/>
            </svg>
        </div>
        <h3>Validation Error</h3>
        <p>${message}</p>
    `;
    
    // Insert at the top of modal body
    const uploadSection = modalBody.querySelector('.upload-section');
    if (uploadSection) {
        uploadSection.insertBefore(errorDiv, uploadSection.firstChild);
    } else {
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
    }
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 3000);
}

// Show file error
function showFileError(message) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'file-error-message';
    errorDiv.innerHTML = `
        <span style="color: var(--danger-color);">⚠️ ${message}</span>
    `;
    
    fileList.appendChild(errorDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 3000);
}

