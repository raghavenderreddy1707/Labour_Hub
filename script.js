// Application State Management
class LaborApp {
    constructor() {
        this.currentUser = null;
        this.currentRole = null;
        this.currentView = 'browse';
        this.users = this.loadFromStorage('users') || [];
        this.jobs = this.loadFromStorage('jobs') || [];
        this.applications = this.loadFromStorage('applications') || [];
        this.bookmarks = this.loadFromStorage('bookmarks') || [];
        this.theme = this.loadFromStorage('theme') || 'light';
        
        this.initializeApp();
    }

    // Storage Management
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            this.showToast('Storage error: ' + error.message, 'error');
        }
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load from storage:', error);
            return null;
        }
    }

    // App Initialization
    initializeApp() {
        this.setupEventListeners();
        this.setupTheme();
        this.checkExistingSession();
        this.hideLoadingScreen();
    }

    setupEventListeners() {
        // Role selection
        document.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const role = e.currentTarget.dataset.role;
                this.selectRole(role);
            });
        });

        // Navigation
        document.getElementById('backToWelcome').addEventListener('click', () => {
            this.showScreen('welcome');
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Auth tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchAuthTab(e.target.dataset.tab);
            });
        });

        // Forms
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistration();
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('postJobForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleJobPost();
        });

        // Dashboard navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterJobs();
        });

        document.getElementById('professionFilter').addEventListener('change', () => {
            this.filterJobs();
        });

        document.getElementById('locationFilter').addEventListener('change', () => {
            this.filterJobs();
        });

        document.getElementById('dateFilter').addEventListener('change', () => {
            this.filterJobs();
        });

        // Modal
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.closeModal();
            }
        });
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
    }

    checkExistingSession() {
        const savedUser = this.loadFromStorage('currentUser');
        if (savedUser) {
            this.currentUser = savedUser;
            this.currentRole = savedUser.role;
            this.showDashboard();
        }
    }

    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('fade-out');
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
            }, 500);
        }, 1500);
    }

    // Screen Management
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        const targetScreen = document.getElementById(screenName + 'Screen');
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            targetScreen.classList.add('fade-in');
        }

        // Show/hide header based on screen
        const header = document.getElementById('header');
        if (screenName === 'dashboard') {
            header.classList.remove('hidden');
        } else {
            header.classList.add('hidden');
        }
    }

    // Role Selection
    selectRole(role) {
        this.currentRole = role;
        const authTitle = document.getElementById('authTitle');
        const professionGroup = document.getElementById('professionGroup');
        
        if (role === 'laborer') {
            authTitle.textContent = 'Join as Laborer 👷';
            professionGroup.style.display = 'flex';
            document.body.className = 'laborer-theme';
        } else {
            authTitle.textContent = 'Join as Job Provider 🧑‍💼';
            professionGroup.style.display = 'none';
            document.body.className = 'provider-theme';
        }
        
        this.showScreen('auth');
    }

    // Authentication
    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        if (tab === 'register') {
            document.getElementById('registerForm').classList.remove('hidden');
            document.getElementById('loginForm').classList.add('hidden');
        } else {
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
        }
    }

    handleRegistration() {
        const formData = {
            name: document.getElementById('regName').value.trim(),
            location: document.getElementById('regLocation').value.trim(),
            contact: document.getElementById('regContact').value.trim(),
            role: this.currentRole
        };

        if (this.currentRole === 'laborer') {
            formData.profession = document.getElementById('regProfession').value;
        }

        // Validation
        if (!this.validateRegistration(formData)) {
            return;
        }

        // Check if user already exists
        const existingUser = this.users.find(user => 
            user.contact === formData.contact && user.role === this.currentRole
        );

        if (existingUser) {
            this.showToast('User with this contact number already exists!', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: this.generateId(),
            ...formData,
            rating: 5,
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveToStorage('users', this.users);
        
        this.currentUser = newUser;
        this.saveToStorage('currentUser', this.currentUser);
        
        this.showToast('Registration successful! Welcome aboard! 🎉', 'success');
        this.showDashboard();
    }

    handleLogin() {
        const contact = document.getElementById('loginContact').value.trim();
        
        if (!this.validateContact(contact)) {
            this.showToast('Please enter a valid 10-digit contact number', 'error');
            return;
        }

        const user = this.users.find(u => 
            u.contact === contact && u.role === this.currentRole
        );

        if (user) {
            this.currentUser = user;
            this.saveToStorage('currentUser', this.currentUser);
            this.showToast(`Welcome back, ${user.name}! 👋`, 'success');
            this.showDashboard();
        } else {
            this.showToast('User not found. Please check your contact number or register first.', 'error');
        }
    }

    logout() {
        this.currentUser = null;
        this.currentRole = null;
        this.saveToStorage('currentUser', null);
        document.body.className = '';
        this.showScreen('welcome');
        this.showToast('Logged out successfully', 'success');
    }

    // Dashboard
    showDashboard() {
        this.showScreen('dashboard');
        this.updateUserInfo();
        this.setupDashboardForRole();
        this.switchView('browse');
        this.populateLocationFilter();
    }

    updateUserInfo() {
        const userName = document.querySelector('.user-name');
        const userRole = document.querySelector('.user-role');
        const userStat = document.getElementById('userStat');

        userName.textContent = `Welcome back, ${this.currentUser.name}!`;
        userRole.textContent = this.currentUser.role === 'laborer' 
            ? `${this.currentUser.profession} • ${this.currentUser.location}`
            : `Job Provider • ${this.currentUser.location}`;

        // Update statistics
        if (this.currentUser.role === 'laborer') {
            const appliedJobs = this.applications.filter(app => 
                app.laborerId === this.currentUser.id
            ).length;
            userStat.textContent = `Applied: ${appliedJobs}`;
        } else {
            const postedJobs = this.jobs.filter(job => 
                job.providerId === this.currentUser.id
            ).length;
            userStat.textContent = `Posted: ${postedJobs}`;
        }
    }

    setupDashboardForRole() {
        const providerOnlyElements = document.querySelectorAll('.provider-only');
        
        if (this.currentUser.role === 'provider') {
            providerOnlyElements.forEach(el => el.classList.remove('hidden'));
            document.body.className = 'provider-theme';
        } else {
            providerOnlyElements.forEach(el => el.classList.add('hidden'));
            document.body.className = 'laborer-theme';
        }
    }

    // View Management
    switchView(viewName) {
        this.currentView = viewName;
        
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Show correct view
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(viewName + 'View').classList.remove('hidden');

        // Load view content
        switch (viewName) {
            case 'browse':
                this.loadBrowseJobs();
                break;
            case 'manage':
                this.loadManageJobs();
                break;
            case 'bookmarks':
                this.loadBookmarkedJobs();
                break;
            case 'post':
                this.resetJobForm();
                break;
        }
    }

    // Job Management
    handleJobPost() {
        const jobData = {
            title: document.getElementById('jobTitle').value.trim(),
            profession: document.getElementById('jobProfession').value,
            description: document.getElementById('jobDescription').value.trim(),
            location: document.getElementById('jobLocation').value.trim(),
            date: document.getElementById('jobDate').value,
            contact: document.getElementById('jobContact').value.trim()
        };

        if (!this.validateJobPost(jobData)) {
            return;
        }

        const newJob = {
            id: this.generateId(),
            providerId: this.currentUser.id,
            providerName: this.currentUser.name,
            status: 'active',
            createdAt: new Date().toISOString(),
            ...jobData
        };

        this.jobs.push(newJob);
        this.saveToStorage('jobs', this.jobs);
        
        this.showToast('Job posted successfully! 📝', 'success');
        this.resetJobForm();
        this.switchView('manage');
    }

    resetJobForm() {
        document.getElementById('postJobForm').reset();
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('jobDate').min = today;
    }

    // Job Loading and Filtering
    loadBrowseJobs() {
        const activeJobs = this.jobs.filter(job => job.status === 'active');
        this.displayJobs(activeJobs, 'jobsList');
    }

    loadManageJobs() {
        let relevantJobs;
        
        if (this.currentUser.role === 'provider') {
            relevantJobs = this.jobs.filter(job => job.providerId === this.currentUser.id);
        } else {
            const appliedJobIds = this.applications
                .filter(app => app.laborerId === this.currentUser.id)
                .map(app => app.jobId);
            relevantJobs = this.jobs.filter(job => appliedJobIds.includes(job.id));
        }
        
        this.displayJobs(relevantJobs, 'myJobsList');
    }

    loadBookmarkedJobs() {
        const bookmarkedJobs = this.jobs.filter(job => 
            this.bookmarks.includes(job.id)
        );
        this.displayJobs(bookmarkedJobs, 'bookmarksList');
    }

    displayJobs(jobs, containerId) {
        const container = document.getElementById(containerId);
        
        if (jobs.length === 0) {
            container.innerHTML = '<div class="no-jobs"><p>📋 No jobs to display</p></div>';
            return;
        }

        container.innerHTML = jobs.map(job => this.createJobCard(job)).join('');
        
        // Attach event listeners to job cards
        container.querySelectorAll('.job-card').forEach(card => {
            const jobId = card.dataset.jobId;
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.job-actions')) {
                    this.showJobDetails(jobId);
                }
            });

            // Bookmark button
            const bookmarkBtn = card.querySelector('.bookmark-btn');
            if (bookmarkBtn) {
                bookmarkBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleBookmark(jobId);
                });
            }

            // Apply button
            const applyBtn = card.querySelector('.apply-btn');
            if (applyBtn) {
                applyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.applyToJob(jobId);
                });
            }

            // Delete button
            const deleteBtn = card.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteJob(jobId);
                });
            }
        });
    }

    createJobCard(job) {
        const isBookmarked = this.bookmarks.includes(job.id);
        const hasApplied = this.applications.some(app => 
            app.jobId === job.id && app.laborerId === this.currentUser.id
        );
        const isOwner = job.providerId === this.currentUser.id;
        const timeAgo = this.getTimeAgo(job.createdAt);

        let actions = '';
        if (this.currentUser.role === 'laborer' && !isOwner) {
            actions = `
                <button class="btn btn-ghost bookmark-btn" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark job'}">
                    ${isBookmarked ? '❤️' : '🤍'}
                </button>
                ${hasApplied 
                    ? '<span class="status-badge status-applied">✅ Applied</span>'
                    : '<button class="btn btn-primary apply-btn">Apply Now</button>'
                }
            `;
        } else if (isOwner) {
            actions = '<button class="btn btn-ghost delete-btn" title="Delete job">🗑️</button>';
        }

        return `
            <div class="job-card" data-job-id="${job.id}">
                <div class="job-header">
                    <div>
                        <div class="job-title">${job.title}</div>
                        <span class="job-profession">${job.profession}</span>
                    </div>
                    <div class="job-actions">
                        ${actions}
                    </div>
                </div>
                
                <div class="job-meta">
                    <span>📍 ${job.location}</span>
                    <span>📅 ${new Date(job.date).toLocaleDateString()}</span>
                    <span>📞 ${job.contact}</span>
                    <span>⏰ ${timeAgo}</span>
                </div>
                
                <div class="job-description">
                    ${job.description}
                </div>
                
                <div class="job-status">
                    <span class="status-badge status-${job.status}">${job.status.toUpperCase()}</span>
                    <small>by ${job.providerName}</small>
                </div>
            </div>
        `;
    }

    filterJobs() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const professionFilter = document.getElementById('professionFilter').value;
        const locationFilter = document.getElementById('locationFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;

        let filteredJobs = this.jobs.filter(job => job.status === 'active');

        // Search filter
        if (searchTerm) {
            filteredJobs = filteredJobs.filter(job =>
                job.title.toLowerCase().includes(searchTerm) ||
                job.description.toLowerCase().includes(searchTerm) ||
                job.location.toLowerCase().includes(searchTerm) ||
                job.profession.toLowerCase().includes(searchTerm)
            );
        }

        // Profession filter
        if (professionFilter) {
            filteredJobs = filteredJobs.filter(job => job.profession === professionFilter);
        }

        // Location filter
        if (locationFilter) {
            filteredJobs = filteredJobs.filter(job => 
                job.location.toLowerCase().includes(locationFilter.toLowerCase())
            );
        }

        // Date filter
        if (dateFilter) {
            const now = new Date();
            filteredJobs = filteredJobs.filter(job => {
                const jobDate = new Date(job.createdAt);
                switch (dateFilter) {
                    case 'today':
                        return jobDate.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return jobDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        return jobDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        this.displayJobs(filteredJobs, 'jobsList');
    }

    populateLocationFilter() {
        const locations = [...new Set(this.jobs.map(job => job.location))];
        const locationFilter = document.getElementById('locationFilter');
        
        locationFilter.innerHTML = '<option value="">All Locations</option>';
        locations.forEach(location => {
            locationFilter.innerHTML += `<option value="${location}">${location}</option>`;
        });
    }

    // Job Actions
    applyToJob(jobId) {
        const existingApplication = this.applications.find(app =>
            app.jobId === jobId && app.laborerId === this.currentUser.id
        );

        if (existingApplication) {
            this.showToast('You have already applied to this job!', 'warning');
            return;
        }

        const application = {
            id: this.generateId(),
            jobId: jobId,
            laborerId: this.currentUser.id,
            laborerName: this.currentUser.name,
            appliedAt: new Date().toISOString(),
            status: 'pending'
        };

        this.applications.push(application);
        this.saveToStorage('applications', this.applications);
        
        this.showToast('Application submitted successfully! 🎉', 'success');
        this.loadBrowseJobs(); // Refresh the view
    }

    toggleBookmark(jobId) {
        const index = this.bookmarks.indexOf(jobId);
        
        if (index > -1) {
            this.bookmarks.splice(index, 1);
            this.showToast('Removed from bookmarks', 'success');
        } else {
            this.bookmarks.push(jobId);
            this.showToast('Added to bookmarks ⭐', 'success');
        }
        
        this.saveToStorage('bookmarks', this.bookmarks);
        
        // Refresh current view
        switch (this.currentView) {
            case 'browse':
                this.loadBrowseJobs();
                break;
            case 'bookmarks':
                this.loadBookmarkedJobs();
                break;
        }
    }

    deleteJob(jobId) {
        if (confirm('Are you sure you want to delete this job posting?')) {
            this.jobs = this.jobs.filter(job => job.id !== jobId);
            this.saveToStorage('jobs', this.jobs);
            
            // Remove related applications
            this.applications = this.applications.filter(app => app.jobId !== jobId);
            this.saveToStorage('applications', this.applications);
            
            // Remove from bookmarks
            this.bookmarks = this.bookmarks.filter(id => id !== jobId);
            this.saveToStorage('bookmarks', this.bookmarks);
            
            this.showToast('Job deleted successfully', 'success');
            this.loadManageJobs();
        }
    }

    // Modal Management
    showJobDetails(jobId) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;

        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = job.title;
        
        const applications = this.applications.filter(app => app.jobId === jobId);
        const applicantsList = applications.length > 0 
            ? `<div class="applicants-section">
                <h4>📋 Applications (${applications.length})</h4>
                ${applications.map(app => `
                    <div class="applicant-item">
                        <span>👤 ${app.laborerName}</span>
                        <small>Applied: ${new Date(app.appliedAt).toLocaleDateString()}</small>
                    </div>
                `).join('')}
               </div>`
            : '<p><em>No applications yet</em></p>';

        modalBody.innerHTML = `
            <div class="job-details">
                <div class="detail-section">
                    <h4>🔧 Profession Required</h4>
                    <p>${job.profession}</p>
                </div>
                
                <div class="detail-section">
                    <h4>📝 Description</h4>
                    <p>${job.description}</p>
                </div>
                
                <div class="detail-section">
                    <h4>📍 Location</h4>
                    <p>${job.location}</p>
                </div>
                
                <div class="detail-section">
                    <h4>📅 Work Date</h4>
                    <p>${new Date(job.date).toLocaleDateString()}</p>
                </div>
                
                <div class="detail-section">
                    <h4>📞 Contact</h4>
                    <p>${job.contact}</p>
                </div>
                
                <div class="detail-section">
                    <h4>👤 Posted By</h4>
                    <p>${job.providerName}</p>
                </div>
                
                ${this.currentUser.role === 'provider' && job.providerId === this.currentUser.id ? applicantsList : ''}
            </div>
        `;

        document.getElementById('modal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('modal').classList.add('hidden');
    }

    // Theme Management
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.saveToStorage('theme', this.theme);
        this.setupTheme();
    }

    // Utility Functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        document.getElementById('toastContainer').appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Validation Functions
    validateRegistration(data) {
        if (!data.name || data.name.length < 2) {
            this.showToast('Name must be at least 2 characters long', 'error');
            return false;
        }

        if (!data.location || data.location.length < 2) {
            this.showToast('Location must be at least 2 characters long', 'error');
            return false;
        }

        if (!this.validateContact(data.contact)) {
            this.showToast('Please enter a valid 10-digit contact number', 'error');
            return false;
        }

        if (data.role === 'laborer' && !data.profession) {
            this.showToast('Please select your profession', 'error');
            return false;
        }

        return true;
    }

    validateContact(contact) {
        const phoneRegex = /^[0-9]{10}$/;
        return phoneRegex.test(contact);
    }

    validateJobPost(data) {
        if (!data.title || data.title.length < 5) {
            this.showToast('Job title must be at least 5 characters long', 'error');
            return false;
        }

        if (!data.profession) {
            this.showToast('Please select required profession', 'error');
            return false;
        }

        if (!data.description || data.description.length < 10) {
            this.showToast('Job description must be at least 10 characters long', 'error');
            return false;
        }

        if (!data.location || data.location.length < 2) {
            this.showToast('Location must be at least 2 characters long', 'error');
            return false;
        }

        if (!data.date) {
            this.showToast('Please select work date', 'error');
            return false;
        }

        const selectedDate = new Date(data.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            this.showToast('Work date cannot be in the past', 'error');
            return false;
        }

        if (!this.validateContact(data.contact)) {
            this.showToast('Please enter a valid 10-digit contact number', 'error');
            return false;
        }

        return true;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.laborApp = new LaborApp();
});

// Add some sample data for demonstration
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.laborApp && window.laborApp.jobs.length === 0) {
            // Add sample jobs only if no jobs exist
            const sampleJobs = [
                {
                    id: 'sample1',
                    providerId: 'sample_provider1',
                    providerName: 'Rajesh Kumar',
                    title: 'Need experienced plumber for bathroom renovation',
                    profession: 'plumber',
                    description: 'Looking for skilled plumber to fix leaking pipes and install new fixtures in bathroom. Work involves replacing old pipes, fixing water pressure issues, and installing modern taps.',
                    location: 'Koramangala, Bangalore',
                    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    contact: '9876543210',
                    status: 'active',
                    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'sample2',
                    providerId: 'sample_provider2',
                    providerName: 'Priya Sharma',
                    title: 'Electrical work needed for new house',
                    profession: 'electrician',
                    description: 'Complete electrical wiring for 2BHK apartment. Need certified electrician for installation of switches, outlets, and lighting fixtures. Safety compliance required.',
                    location: 'Whitefield, Bangalore',
                    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    contact: '9123456789',
                    status: 'active',
                    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'sample3',
                    providerId: 'sample_provider3',
                    providerName: 'Amit Patel',
                    title: 'Wooden furniture repair and polishing',
                    profession: 'carpenter',
                    description: 'Need skilled carpenter to repair dining table, chairs, and wardrobe. Also need polishing work for bedroom furniture. Experience with wood restoration preferred.',
                    location: 'Jayanagar, Bangalore',
                    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    contact: '9988776655',
                    status: 'active',
                    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
                }
            ];

            window.laborApp.jobs = sampleJobs;
            window.laborApp.saveToStorage('jobs', sampleJobs);
        }
    }, 2000);
});
