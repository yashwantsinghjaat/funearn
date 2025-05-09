// Initialize Firebase with your config
firebase.initializeApp(firebaseConfig);

// Auth and Firestore references
const auth = firebase.auth();
let db;

// Check for Firestore availability
try {
    db = firebase.firestore();
    
    // Enable offline persistence if possible
    db.enablePersistence()
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab
                console.warn('Multiple tabs open, persistence only works in one tab at a time');
            } else if (err.code === 'unimplemented') {
                // The browser doesn't support persistence
                console.warn('This browser does not support offline persistence');
            }
        });
} catch (e) {
    console.error("Firestore initialization error:", e);
    showNotification('Database Error', 'Could not connect to the database. Some features may be limited.', 'error');
}

// DOM Elements
const userNameElement = document.getElementById('user-name');
const welcomeNameElement = document.getElementById('welcome-name');
const profileStatusElement = document.getElementById('profile-status');
const profileActionElement = document.getElementById('profile-action');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const logoutButton = document.getElementById('logout-btn');

// Dashboard Stats Elements
const activeJobsElement = document.getElementById('active-jobs');
const proposalsSentElement = document.getElementById('proposals-sent');
const completedJobsElement = document.getElementById('completed-jobs');
const totalEarningsElement = document.getElementById('total-earnings');

// Content Elements
const recommendedJobsElement = document.getElementById('recommended-jobs');
const activityListElement = document.getElementById('activity-list');
const myJobsElement = document.getElementById('my-jobs');
const myProposalsElement = document.getElementById('my-proposals');

// Earnings Elements
const totalEarnedElement = document.getElementById('total-earned');
const pendingClearanceElement = document.getElementById('pending-clearance');
const availableWithdrawalElement = document.getElementById('available-withdrawal');
const paymentListElement = document.getElementById('payment-list');

// Filter Elements
const jobFilterElement = document.getElementById('job-filter');
const proposalFilterElement = document.getElementById('proposal-filter');
const earningsPeriodElement = document.getElementById('earnings-period');

// Check if user is logged in
auth.onAuthStateChanged(function(user) {
    if (user) {
        // User is signed in
        initializeDashboard(user);
    } else {
        // No user is signed in, redirect to login
        window.location.href = 'index.html';
    }
});

// Initialize Dashboard
function initializeDashboard(user) {
    // Set user name in navbar and welcome section
    userNameElement.textContent = user.displayName || user.email || 'User';
    welcomeNameElement.textContent = user.displayName || 'Freelancer';
    
    // Check for network status
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
        // Display offline notification
        showNotification('You are offline', 'Some features may not be available while offline.', 'warning');
    }
    
    // Fetch user profile data
    fetchUserProfile(user.uid);
    
    // Load dashboard data
    loadDashboardData(user.uid);
    
    // Add event listeners for tab navigation
    setupTabNavigation();
    
    // Add event listeners for filters
    setupFilterListeners(user.uid);
    
    // Setup logout listener
    logoutButton.addEventListener('click', handleLogout);
}

// Fetch user profile data from Firestore
function fetchUserProfile(userId) {
    if (!db) return;
    
    db.collection('users').doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                updateProfileStatus(userData);
            } else {
                // Create a new user document if it doesn't exist
                const newUserData = {
                    profileCompleted: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    skills: [],
                    jobPreferences: {},
                    earnings: {
                        total: 0,
                        pending: 0,
                        available: 0
                    }
                };
                
                db.collection('users').doc(userId).set(newUserData)
                    .then(() => {
                        updateProfileStatus(newUserData);
                    })
                    .catch(error => {
                        console.error("Error creating user profile:", error);
                    });
            }
        })
        .catch(error => {
            console.error("Error fetching user profile:", error);
            showNotification('Profile Error', 'Could not load your profile data.', 'error');
        });
}

// Update profile status section
function updateProfileStatus(userData) {
    if (userData.profileCompleted) {
        profileStatusElement.textContent = 'complete';
        profileStatusElement.className = 'status-complete';
        profileActionElement.textContent = 'View your profile';
    } else {
        profileStatusElement.textContent = 'incomplete';
        profileStatusElement.className = 'status-incomplete';
        profileActionElement.textContent = 'Complete your profile';
    }
}

// Load all dashboard data
function loadDashboardData(userId) {
    loadDashboardStats(userId);
    loadRecommendedJobs(userId);
    loadRecentActivity(userId);
    loadMyJobs(userId, 'all');
    loadMyProposals(userId, 'all');
    loadEarningsData(userId, 'all-time');
}

// Load dashboard statistics
function loadDashboardStats(userId) {
    if (!db) return;
    
    // Get active jobs count
    db.collection('jobs')
        .where('freelancerId', '==', userId)
        .where('status', '==', 'active')
        .get()
        .then(snapshot => {
            activeJobsElement.textContent = snapshot.size;
        })
        .catch(error => {
            console.error("Error fetching active jobs:", error);
        });
    
    // Get proposals count
    db.collection('proposals')
        .where('freelancerId', '==', userId)
        .get()
        .then(snapshot => {
            proposalsSentElement.textContent = snapshot.size;
        })
        .catch(error => {
            console.error("Error fetching proposals:", error);
        });
    
    // Get completed jobs count
    db.collection('jobs')
        .where('freelancerId', '==', userId)
        .where('status', '==', 'completed')
        .get()
        .then(snapshot => {
            completedJobsElement.textContent = snapshot.size;
        })
        .catch(error => {
            console.error("Error fetching completed jobs:", error);
        });
    
    // Get earnings data
    db.collection('users').doc(userId).get()
        .then(doc => {
            if (doc.exists && doc.data().earnings) {
                const earnings = doc.data().earnings;
                totalEarningsElement.textContent = formatCurrency(earnings.total || 0);
                totalEarnedElement.textContent = formatCurrency(earnings.total || 0);
                pendingClearanceElement.textContent = formatCurrency(earnings.pending || 0);
                availableWithdrawalElement.textContent = formatCurrency(earnings.available || 0);
            }
        })
        .catch(error => {
            console.error("Error fetching earnings:", error);
        });
}

// Load recommended jobs
function loadRecommendedJobs(userId) {
    if (!db) return;
    
    // First get user skills
    db.collection('users').doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const skills = userData.skills || [];
                
                if (skills.length > 0) {
                    // Find jobs that match user skills
                    db.collection('jobs')
                        .where('status', '==', 'open')
                        .limit(5)
                        .get()
                        .then(snapshot => {
                            if (!snapshot.empty) {
                                // Filter jobs by skills match (client-side filtering)
                                const jobs = [];
                                snapshot.forEach(doc => {
                                    const jobData = doc.data();
                                    jobData.id = doc.id;
                                    
                                    // Check if any job skill matches user skills
                                    const hasMatchingSkill = jobData.skills && 
                                        jobData.skills.some(skill => skills.includes(skill));
                                    
                                    if (hasMatchingSkill) {
                                        jobs.push(jobData);
                                    }
                                });
                                
                                if (jobs.length > 0) {
                                    displayRecommendedJobs(jobs);
                                } else {
                                    recommendedJobsElement.innerHTML = 
                                        '<p class="no-data-message">No jobs matching your skills found</p>';
                                }
                            } else {
                                recommendedJobsElement.innerHTML = 
                                    '<p class="no-data-message">No jobs available at the moment</p>';
                            }
                        })
                        .catch(error => {
                            console.error("Error fetching recommended jobs:", error);
                        });
                } else {
                    recommendedJobsElement.innerHTML = 
                        '<p class="no-data-message">Add skills to your profile to see recommended jobs</p>';
                }
            }
        })
        .catch(error => {
            console.error("Error fetching user profile for job recommendations:", error);
        });
}

// Display recommended jobs in the dashboard
function displayRecommendedJobs(jobs) {
    if (!recommendedJobsElement) return;
    
    let html = '';
    
    jobs.forEach(job => {
        html += `
            <div class="job-card">
                <h3 class="job-title">${job.title || 'Untitled Job'}</h3>
                <div class="job-budget">${formatCurrency(job.budget || 0)}</div>
                <p class="job-description">${truncateText(job.description || 'No description', 100)}</p>
                <div class="job-skills">
                    ${(job.skills || []).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
                <a href="job-details.html?id=${job.id}" class="btn btn-primary">View Details</a>
            </div>
        `;
    });
    
    recommendedJobsElement.innerHTML = html;
}

// Load recent activity
function loadRecentActivity(userId) {
    if (!db) return;
    
    // Get combined activities (proposals, messages, job status changes)
    const activities = [];
    
    // Get recent proposals
    db.collection('proposals')
        .where('freelancerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const proposal = doc.data();
                proposal.id = doc.id;
                proposal.type = 'proposal';
                activities.push({
                    type: 'proposal',
                    data: proposal,
                    timestamp: proposal.createdAt ? proposal.createdAt.toDate() : new Date()
                });
            });
            
            // Get recent job status changes
            return db.collection('jobs')
                .where('freelancerId', '==', userId)
                .orderBy('updatedAt', 'desc')
                .limit(5)
                .get();
        })
        .then(snapshot => {
            snapshot.forEach(doc => {
                const job = doc.data();
                job.id = doc.id;
                activities.push({
                    type: 'job',
                    data: job,
                    timestamp: job.updatedAt ? job.updatedAt.toDate() : new Date()
                });
            });
            
            // Order activities by timestamp
            activities.sort((a, b) => b.timestamp - a.timestamp);
            
            // Display activities
            displayRecentActivity(activities.slice(0, 5));
        })
        .catch(error => {
            console.error("Error loading activity:", error);
        });
}

// Display recent activity
function displayRecentActivity(activities) {
    if (!activityListElement) return;
    
    if (activities.length === 0) {
        activityListElement.innerHTML = '<p class="no-activity">No recent activity to display.</p>';
        return;
    }
    
    let html = '';
    
    activities.forEach(activity => {
        switch(activity.type) {
            case 'proposal':
                html += `
                    <div class="activity-item">
                        <div class="activity-icon proposal-icon"></div>
                        <div class="activity-content">
                            <p>You submitted a proposal for <a href="job-details.html?id=${activity.data.jobId}">${activity.data.jobTitle || 'a job'}</a></p>
                            <span class="activity-time">${formatTimeAgo(activity.timestamp)}</span>
                        </div>
                    </div>
                `;
                break;
            case 'job':
                html += `
                    <div class="activity-item">
                        <div class="activity-icon job-icon"></div>
                        <div class="activity-content">
                            <p>Job status updated: <a href="job-details.html?id=${activity.data.id}">${activity.data.title || 'Untitled job'}</a> is now ${activity.data.status}</p>
                            <span class="activity-time">${formatTimeAgo(activity.timestamp)}</span>
                        </div>
                    </div>
                `;
                break;
        }
    });
    
    activityListElement.innerHTML = html;
}

// Load My Jobs tab
function loadMyJobs(userId, filter = 'all') {
    if (!db) return;
    
    let query = db.collection('jobs').where('freelancerId', '==', userId);
    
    // Apply filter
    if (filter !== 'all') {
        query = query.where('status', '==', filter);
    }
    
    // Order by date
    query = query.orderBy('createdAt', 'desc');
    
    query.get()
        .then(snapshot => {
            if (snapshot.empty) {
                myJobsElement.innerHTML = '<p class="no-data-message">No jobs found</p>';
                return;
            }
            
            let html = '';
            snapshot.forEach(doc => {
                const job = doc.data();
                job.id = doc.id;
                
                html += `
                    <div class="job-card">
                        <div class="job-status ${job.status}">${job.status}</div>
                        <h3 class="job-title">${job.title || 'Untitled Job'}</h3>
                        <div class="job-client">Client: ${job.clientName || 'Anonymous'}</div>
                        <div class="job-dates">
                            <div>Started: ${formatDate(job.startDate)}</div>
                            <div>Deadline: ${formatDate(job.deadline)}</div>
                        </div>
                        <div class="job-payment">
                            <div class="job-budget">${formatCurrency(job.budget || 0)}</div>
                            <div class="payment-status">${job.paymentStatus || 'Pending'}</div>
                        </div>
                        <a href="job-details.html?id=${job.id}" class="btn btn-primary">View Details</a>
                    </div>
                `;
            });
            
            myJobsElement.innerHTML = html;
        })
        .catch(error => {
            console.error("Error loading jobs:", error);
            myJobsElement.innerHTML = '<p class="error-message">Error loading jobs</p>';
        });
}

// Load My Proposals tab
function loadMyProposals(userId, filter = 'all') {
    if (!db) return;
    
    let query = db.collection('proposals').where('freelancerId', '==', userId);
    
    // Apply filter
    if (filter !== 'all') {
        query = query.where('status', '==', filter);
    }
    
    // Order by date
    query = query.orderBy('createdAt', 'desc');
    
    query.get()
        .then(snapshot => {
            if (snapshot.empty) {
                myProposalsElement.innerHTML = '<p class="no-data-message">No proposals found</p>';
                return;
            }
            
            let html = '';
            snapshot.forEach(doc => {
                const proposal = doc.data();
                proposal.id = doc.id;
                
                html += `
                    <div class="proposal-card">
                        <div class="proposal-status ${proposal.status}">${proposal.status || 'pending'}</div>
                        <h3 class="proposal-job-title">${proposal.jobTitle || 'Untitled Job'}</h3>
                        <div class="proposal-bid">Bid Amount: ${formatCurrency(proposal.bidAmount || 0)}</div>
                        <p class="proposal-summary">${truncateText(proposal.coverLetter || 'No cover letter', 150)}</p>
                        <div class="proposal-date">Submitted: ${formatDate(proposal.createdAt)}</div>
                        <a href="job-details.html?id=${proposal.jobId}" class="btn btn-outline">View Job</a>
                        <button class="btn btn-primary view-proposal-btn" data-id="${proposal.id}">View Proposal</button>
                    </div>
                `;
            });
            
            myProposalsElement.innerHTML = html;
            
            // Add event listeners to proposal buttons
            document.querySelectorAll('.view-proposal-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const proposalId = button.getAttribute('data-id');
                    showProposalDetails(proposalId);
                });
            });
        })
        .catch(error => {
            console.error("Error loading proposals:", error);
            myProposalsElement.innerHTML = '<p class="error-message">Error loading proposals</p>';
        });
}

// Show proposal details modal
function showProposalDetails(proposalId) {
    if (!db) return;
    
    db.collection('proposals').doc(proposalId).get()
        .then(doc => {
            if (doc.exists) {
                const proposal = doc.data();
                
                // Create modal HTML
                const modalHTML = `
                    <div class="modal-overlay">
                        <div class="modal-container">
                            <div class="modal-header">
                                <h2>Proposal Details</h2>
                                <button class="close-modal">&times;</button>
                            </div>
                            <div class="modal-content">
                                <h3>${proposal.jobTitle || 'Untitled Job'}</h3>
                                <div class="proposal-info">
                                    <div class="proposal-detail">
                                        <strong>Status:</strong> <span class="proposal-status ${proposal.status}">${proposal.status || 'pending'}</span>
                                    </div>
                                    <div class="proposal-detail">
                                        <strong>Bid Amount:</strong> ${formatCurrency(proposal.bidAmount || 0)}
                                    </div>
                                    <div class="proposal-detail">
                                        <strong>Delivery Time:</strong> ${proposal.deliveryTime || 'Not specified'} days
                                    </div>
                                    <div class="proposal-detail">
                                        <strong>Submitted:</strong> ${formatDate(proposal.createdAt)}
                                    </div>
                                </div>
                                <div class="proposal-cover-letter">
                                    <h4>Cover Letter</h4>
                                    <p>${proposal.coverLetter || 'No cover letter provided'}</p>
                                </div>
                                <div class="proposal-attachments">
                                    <h4>Attachments</h4>
                                    ${proposal.attachments && proposal.attachments.length ? 
                                        proposal.attachments.map(attachment => 
                                            `<a href="${attachment.url}" target="_blank">${attachment.name}</a>`
                                        ).join('') : 
                                        '<p>No attachments</p>'
                                    }
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-primary close-modal">Close</button>
                                ${proposal.status === 'pending' ? 
                                    `<button class="btn btn-danger delete-proposal" data-id="${proposalId}">Withdraw Proposal</button>` : 
                                    ''
                                }
                            </div>
                        </div>
                    </div>
                `;
                
                // Add modal to page
                const modalElement = document.createElement('div');
                modalElement.innerHTML = modalHTML;
                document.body.appendChild(modalElement);
                
                // Add event listeners
                document.querySelectorAll('.close-modal').forEach(button => {
                    button.addEventListener('click', () => {
                        document.body.removeChild(modalElement);
                    });
                });
                
                // Add withdraw proposal event listener if applicable
                const deleteButton = document.querySelector('.delete-proposal');
                if (deleteButton) {
                    deleteButton.addEventListener('click', () => {
                        if (confirm('Are you sure you want to withdraw this proposal?')) {
                            withdrawProposal(proposalId, modalElement);
                        }
                    });
                }
            } else {
                showNotification('Error', 'Proposal not found', 'error');
            }
        })
        .catch(error => {
            console.error("Error fetching proposal:", error);
            showNotification('Error', 'Could not load proposal details', 'error');
        });
}

// Withdraw a proposal
function withdrawProposal(proposalId, modalElement) {
    if (!db) return;
    
    db.collection('proposals').doc(proposalId).update({
        status: 'withdrawn',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showNotification('Success', 'Proposal withdrawn successfully', 'success');
        document.body.removeChild(modalElement);
        
        // Reload proposals
        const currentFilter = proposalFilterElement.value;
        loadMyProposals(auth.currentUser.uid, currentFilter);
    })
    .catch(error => {
        console.error("Error withdrawing proposal:", error);
        showNotification('Error', 'Could not withdraw proposal', 'error');
    });
}

// Load earnings data and chart
function loadEarningsData(userId, period = 'all-time') {
    if (!db) return;
    
    // Get payments based on period
    let startDate;
    const now = new Date();
    
    switch(period) {
        case 'this-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'last-month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'this-year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            // For all-time, we don't need a start date filter
            startDate = null;
    }
    
    let query = db.collection('payments').where('freelancerId', '==', userId);
    
    if (startDate) {
        query = query.where('createdAt', '>=', startDate);
    }
    
    query.orderBy('createdAt', 'desc').get()
        .then(snapshot => {
            if (snapshot.empty) {
                paymentListElement.innerHTML = '<p class="no-data-message">No payment history available</p>';
                
                // Also update the chart with empty data
                renderEarningsChart([]);
                return;
            }
            
            const payments = [];
            snapshot.forEach(doc => {
                const payment = doc.data();
                payment.id = doc.id;
                payments.push(payment);
            });
            
            displayPaymentHistory(payments);
            renderEarningsChart(payments);
        })
        .catch(error => {
            console.error("Error loading payments:", error);
            paymentListElement.innerHTML = '<p class="error-message">Error loading payment history</p>';
        });
}

// Display payment history
function displayPaymentHistory(payments) {
    if (!paymentListElement) return;
    
    if (payments.length === 0) {
        paymentListElement.innerHTML = '<p class="no-data-message">No payment history available</p>';
        return;
    }
    
    let html = `
        <table class="payment-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    payments.forEach(payment => {
        html += `
            <tr>
                <td>${formatDate(payment.createdAt)}</td>
                <td>${payment.description || `Payment for ${payment.jobTitle || 'Job'}`}</td>
                <td>${formatCurrency(payment.amount || 0)}</td>
                <td><span class="payment-status ${payment.status}">${payment.status || 'Processing'}</span></td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    paymentListElement.innerHTML = html;
}

// Render earnings chart 
function renderEarningsChart(payments) {
    // This is a placeholder for the actual chart implementation
    // In a real application, you would use a charting library like Chart.js
    // For now, we'll just show a message
    const chartElement = document.querySelector('.earnings-chart');
    
    if (payments.length === 0) {
        chartElement.innerHTML = '<p>No earnings data to display</p>';
        return;
    }
    
    // Example of what you might do with a chart library:
    /*
    const ctx = document.createElement('canvas');
    chartElement.innerHTML = '';
    chartElement.appendChild(ctx);
    
    // Group payments by month
    const monthlyData = {};
    
    payments.forEach(payment => {
        const date = payment.createdAt.toDate();
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = 0;
        }
        
        monthlyData[monthYear] += payment.amount || 0;
    });
    
    // Convert to chart data
    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(month => monthlyData[month]);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Earnings',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
    */
    
    chartElement.innerHTML = '<p>Earnings chart would be displayed here using a charting library</p>';
}

// Setup tab navigation
function setupTabNavigation() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Add active class to corresponding pane
            const tabName = button.getAttribute('data-tab');
            const pane = document.getElementById(tabName);
            if (pane) {
                pane.classList.add('active');
            }
        });
    });
}

// Setup filter listeners
function setupFilterListeners(userId) {
    // Job filter
    if (jobFilterElement) {
        jobFilterElement.addEventListener('change', () => {
            const filter = jobFilterElement.value;
            loadMyJobs(userId, filter);
        });
    }
    
    // Proposal filter
    if (proposalFilterElement) {
        proposalFilterElement.addEventListener('change', () => {
            const filter = proposalFilterElement.value;
            loadMyProposals(userId, filter);
        });
    }
    
    // Earnings period filter
    if (earningsPeriodElement) {
        earningsPeriodElement.addEventListener('change', () => {
            const period = earningsPeriodElement.value;
            loadEarningsData(userId, period);
        });
    }
}

// Handle logout
function handleLogout(e) {
    e.preventDefault();
    
    auth.signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error("Error signing out:", error);
            showNotification('Error', 'Failed to sign out. Please try again.', 'error');
        });
}

// Utility Functions

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

// Format time ago (e.g., "5 minutes ago", "2 days ago")
function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }
    
    return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
}

// Truncate text with ellipsis
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
}

// Show notification
function showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <div class="notification-header">
            <span class="notification-title">${title}</span>
            <button class="notification-close">&times;</button>
        </div>
        <div class="notification-body">
            <p>${message}</p>
        </div>
    `;
    
    // Add to notifications container (create if doesn't exist)
    let notificationsContainer = document.getElementById('notifications-container');
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'notifications-container';
        document.body.appendChild(notificationsContainer);
    }
    
    notificationsContainer.appendChild(notification);
    
    // Add close button event
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notificationsContainer.removeChild(notification);
    });
    
    // Auto-remove after 5 seconds for non-error notifications
    if (type !== 'error') {
        setTimeout(() => {
            if (notification.parentNode === notificationsContainer) {
                notificationsContainer.removeChild(notification);
            }
        }, 5000);
    }
}

// Check for network status changes
window.addEventListener('online', () => {
    showNotification('Connected', 'You are back online!', 'success');
});

window.addEventListener('offline', () => {
    showNotification('Offline', 'You are currently offline. Some features may be limited.', 'warning');
});

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in - this is already handled in auth.onAuthStateChanged
});

// Add event listener for search functionality
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

if (searchButton && searchInput) {
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Perform search
function performSearch() {
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    if (query.length === 0) return;
    
    // Redirect to search results page
    window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
}

// Initialize tooltips
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
            tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
            
            this.addEventListener('mouseleave', function() {
                document.body.removeChild(tooltip);
            }, { once: true });
        });
    });
}

// Initialize tooltips on page load
document.addEventListener('DOMContentLoaded', initTooltips);

// Handle mobile menu toggle
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function() {
        mobileMenu.classList.toggle('active');
    });
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    if (mobileMenu && mobileMenu.classList.contains('active') && 
        !mobileMenu.contains(event.target) && 
        !mobileMenuButton.contains(event.target)) {
        mobileMenu.classList.remove('active');
    }
});

// Check for app updates
function checkForUpdates() {
    // This would typically check with a server for new versions
    // For this example, we'll just show a notification sometimes
    if (Math.random() > 0.9) {  // 10% chance to show update notification
        showNotification(
            'Update Available', 
            'A new version of the dashboard is available. Refresh to update.', 
            'info'
        );
    }
}

// Run update check when appropriate
setTimeout(checkForUpdates, 60000); // Check after 1 minute

// Initialize any date pickers
function initDatePickers() {
    const dateInputs = document.querySelectorAll('.date-picker');
    
    dateInputs.forEach(input => {
        // This would usually use a date picker library
        // For this example, we'll just set the input type to date
        input.type = 'date';
    });
}

// Initialize date pickers on page load
document.addEventListener('DOMContentLoaded', initDatePickers);