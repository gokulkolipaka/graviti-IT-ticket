// Main Application Logic
class TicketingSystem {
    constructor() {
        this.tickets = [];
        this.ticketCounter = 1;
        this.timeToResolve = {
            'High': 4, // 4 hours
            'Medium': 24, // 24 hours
            'Low': 72 // 72 hours
        };
        this.currentAssignTicket = null;
        this.init();
    }

    init() {
        this.loadTickets();
        this.setupEventListeners();
        this.checkAuth();
        this.updateCompanyBranding();
    }

    loadTickets() {
        const stored = localStorage.getItem('tickets');
        if (stored) {
            this.tickets = JSON.parse(stored);
            if (this.tickets.length > 0) {
                this.ticketCounter = Math.max(...this.tickets.map(t => parseInt(t.id.replace('TKT-', '')))) + 1;
            }
        }
    }

    saveTickets() {
        localStorage.setItem('tickets', JSON.stringify(this.tickets));
    }

    checkAuth() {
        const user = auth.getCurrentUser();
        if (user) {
            this.showMainApp();
            if (user.role === 'admin') {
                document.body.classList.add('admin-view');
                document.body.classList.remove('user-view');
                this.showPage('adminDashboard');
            } else {
                document.body.classList.add('user-view');
                document.body.classList.remove('admin-view');
                this.showPage('ticketForm');
            }
        } else {
            this.showLoginPage();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Password reset form
        document.getElementById('passwordResetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordReset();
        });

        // Password change form
        document.getElementById('passwordChangeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordChange();
        });

        // New ticket form
        document.getElementById('newTicketForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewTicket();
        });

        // Add user form
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddUser();
        });

        // Assign ticket form
        document.getElementById('assignForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAssignTicket();
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const success = await auth.authenticate(username, password);
            if (success) {
                this.showMainApp();
                if (auth.isAdmin()) {
                    document.body.classList.add('admin-view');
                    document.body.classList.remove('user-view');
                    this.showPage('adminDashboard');
                } else {
                    document.body.classList.add('user-view');
                    document.body.classList.remove('admin-view');
                    this.showPage('ticketForm');
                }
                errorDiv.textContent = '';
            } else if (auth.getCurrentUser() && auth.getCurrentUser().isFirstLogin) {
                errorDiv.textContent = '';
            } else {
                errorDiv.textContent = 'Invalid username or password';
            }
        } catch (error) {
            errorDiv.textContent = 'Login failed. Please try again.';
        }
    }

    handlePasswordReset() {
        const username = document.getElementById('resetUsername').value;
        const email = document.getElementById('resetEmail').value;
        const messageDiv = document.getElementById('resetMessage');

        if (auth.resetPassword(username, email)) {
            messageDiv.textContent = 'Password reset successful! Check the alert for your temporary password.';
            messageDiv.className = 'message success-message';
            setTimeout(() => {
                this.closeModal('passwordResetModal');
                document.getElementById('passwordResetForm').reset();
                messageDiv.textContent = '';
            }, 3000);
        } else {
            messageDiv.textContent = 'User not found or email does not match.';
            messageDiv.className = 'message error-message';
        }
    }

    handlePasswordChange() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        if (auth.changePassword(newPassword)) {
            alert('Password changed successfully');
            this.showMainApp();
            if (auth.isAdmin()) {
                document.body.classList.add('admin-view');
                this.showPage('adminDashboard');
            } else {
                document.body.classList.add('user-view');
                this.showPage('ticketForm');
            }
        } else {
            alert('Failed to change password');
        }
    }

    handleNewTicket() {
        const user = auth.getCurrentUser();
        if (!user) return;

        const ticketData = {
            id: `TKT-${String(this.ticketCounter).padStart(4, '0')}`,
            type: document.getElementById('ticketType').value,
            severity: document.getElementById('severity').value,
            department: document.getElementById('department').value,
            supervisor: document.getElementById('supervisor').value,
            location: document.getElementById('location').value,
            employeeId: document.getElementById('employeeId').value,
            description: document.getElementById('description').value,
            status: 'Open',
            requestor: user.username,
            requestorEmail: user.email,
            assignedTo: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachments: []
        };

        // Handle file attachments
        const fileInput = document.getElementById('attachments');
        if (fileInput.files.length > 0) {
            Array.from(fileInput.files).forEach(file => {
                ticketData.attachments.push({
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            });
        }

        this.tickets.push(ticketData);
        this.ticketCounter++;
        this.saveTickets();

        // Send email notification (simulated)
        this.sendEmailNotification(ticketData);

        alert(`Ticket ${ticketData.id} created successfully!`);
        document.getElementById('newTicketForm').reset();
        this.showPage('myTickets');
    }

    sendEmailNotification(ticket) {
        console.log(`Email sent to ${ticket.supervisor} for ticket ${ticket.id}`);
    }

    handleAddUser() {
        try {
            const userData = {
                username: document.getElementById('newUsername').value,
                email: document.getElementById('newUserEmail').value,
                department: document.getElementById('newUserDepartment').value,
                role: document.getElementById('newUserRole').value
            };

            auth.addUser(userData);
            this.showNotification('User added successfully', 'success');
            document.getElementById('addUserForm').reset();
            this.closeModal('addUserModal');
            this.loadUsersList();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    handleAssignTicket() {
        const ticketId = this.currentAssignTicket;
        const assignTo = document.getElementById('assignTo').value;

        if (!ticketId || !assignTo) return;

        const ticket = this.tickets.find(t => t.id === ticketId);
        if (ticket) {
            ticket.assignedTo = assignTo;
            ticket.status = 'In Progress';
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            
            this.closeModal('assignModal');
            this.refreshCurrentView();
            
            this.showNotification(`Ticket ${ticketId} assigned to ${assignTo}`, 'success');
        }
    }

    showLoginPage() {
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('mainApp').classList.remove('active');
    }

    showMainApp() {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');
        this.updateCompanyBranding();
    }

    showPage(pageId) {
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Hide all content pages
        document.querySelectorAll('.content-page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update button states and load page-specific data
        switch(pageId) {
            case 'myTickets':
                document.getElementById('myTicketsBtn').classList.add('active');
                this.refreshTicketsList();
                break;
            case 'adminDashboard':
                this.loadDashboard();
                this.refreshKanban();
                break;
            case 'userManagement':
                document.getElementById('userManagementBtn').classList.add('active');
                this.loadUsersList();
                break;
            case 'reports':
                document.getElementById('reportsBtn').classList.add('active');
                this.loadReports();
                break;
            case 'ticketForm':
                // No button for ticket form as it's default for users
                break;
        }
    }

    refreshCurrentView() {
        const activePages = document.querySelectorAll('.content-page.active');
        if (activePages.length > 0) {
            const pageId = activePages[0].id;
            this.showPage(pageId);
        }
    }

    refreshTicketsList() {
        const user = auth.getCurrentUser();
        const isAdmin = auth.isAdmin();
        
        let ticketsToShow = this.tickets;
        if (!isAdmin) {
            ticketsToShow = this.tickets.filter(t => t.requestor === user.username);
        }

        // Apply status filter
        const statusFilter = document.getElementById('ticketStatusFilter').value;
        if (statusFilter) {
            ticketsToShow = ticketsToShow.filter(t => t.status === statusFilter);
        }

        const ticketsList = document.getElementById('ticketsList');
        ticketsList.innerHTML = '';

        if (ticketsToShow.length === 0) {
            ticketsList.innerHTML = '<p class="no-tickets">No tickets found.</p>';
            return;
        }

        ticketsToShow.forEach(ticket => {
            const ticketCard = this.createTicketCard(ticket);
            ticketsList.appendChild(ticketCard);
        });

        // Check for overdue tickets
        if (isAdmin) {
            this.checkOverdueTickets();
        }
    }

    createTicketCard(ticket) {
        const card = document.createElement('div');
        card.className = `ticket-card severity-${ticket.severity.toLowerCase()}`;
        
        const timeCreated = new Date(ticket.createdAt);
        const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
        const isOverdue = hoursElapsed > this.timeToResolve[ticket.severity] && ticket.status !== 'Closed';
        
        card.innerHTML = `
            <div class="ticket-header">
                <span class="ticket-id">${ticket.id}</span>
                <span class="ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span>
            </div>
            <h4>${ticket.type}</h4>
            <p><strong>Department:</strong> ${ticket.department}</p>
            <p><strong>Severity:</strong> ${ticket.severity}</p>
            <p><strong>Location:</strong> ${ticket.location}</p>
            <p><strong>Created:</strong> ${timeCreated.toLocaleString()}</p>
            ${ticket.assignedTo ? `<p><strong>Assigned to:</strong> ${ticket.assignedTo}</p>` : ''}
            ${isOverdue ? '<div class="overdue-warning">⚠️ OVERDUE</div>' : ''}
            <p class="description">${ticket.description.substring(0, 100)}${ticket.description.length > 100 ? '...' : ''}</p>
            <div class="ticket-actions">
                <button onclick="ticketSystem.viewTicketDetails('${ticket.id}')" class="btn btn-primary">View Details</button>
                ${auth.isAdmin() ? `
                    <button onclick="ticketSystem.showAssignModal('${ticket.id}')" class="btn btn-warning">Assign</button>
                    <button onclick="ticketSystem.changeSeverity('${ticket.id}')" class="btn btn-warning">Change Severity</button>
                ` : ''}
                ${ticket.status === 'Closed' && ticket.requestor === auth.getCurrentUser().username ? `
                    <button onclick="ticketSystem.reopenTicket('${ticket.id}')" class="btn btn-danger">Reopen</button>
                ` : ''}
                ${ticket.status !== 'Closed' && (auth.isAdmin() || ticket.assignedTo === auth.getCurrentUser().username) ? `
                    <button onclick="ticketSystem.closeTicket('${ticket.id}')" class="btn btn-success">Close</button>
                ` : ''}
            </div>
        `;
        
        return card;
    }

    viewTicketDetails(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const modal = document.getElementById('ticketModal');
        const details = document.getElementById('ticketDetails');
        
        details.innerHTML = `
            <h3>Ticket Details - ${ticket.id}</h3>
            <div class="ticket-detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                <p><strong>Type:</strong> ${ticket.type}</p>
                <p><strong>Severity:</strong> ${ticket.severity}</p>
                <p><strong>Status:</strong> ${ticket.status}</p>
                <p><strong>Department:</strong> ${ticket.department}</p>
                <p><strong>Requestor:</strong> ${ticket.requestor}</p>
                <p><strong>Employee ID:</strong> ${ticket.employeeId}</p>
                <p><strong>Location:</strong> ${ticket.location}</p>
                <p><strong>Supervisor:</strong> ${ticket.supervisor}</p>
                <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
                <p><strong>Last Updated:</strong> ${new Date(ticket.updatedAt).toLocaleString()}</p>
                ${ticket.assignedTo ? `<p><strong>Assigned to:</strong> ${ticket.assignedTo}</p>` : '<p><strong>Assigned to:</strong> Unassigned</p>'}
            </div>
            <div class="description-section" style="margin: 20px 0;">
                <h4>Description:</h4>
                <p style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px;">${ticket.description}</p>
            </div>
            ${ticket.attachments.length > 0 ? `
                <div class="attachments-section" style="margin: 20px 0;">
                    <h4>Attachments:</h4>
                    ${ticket.attachments.map(att => `<p style="margin: 5px 0;">📎 ${att.name} (${(att.size/1024).toFixed(1)} KB)</p>`).join('')}
                </div>
            ` : ''}
        `;
        
        modal.style.display = 'block';
    }

    showAssignModal(ticketId) {
        this.currentAssignTicket = ticketId;
        const modal = document.getElementById('assignModal');
        const select = document.getElementById('assignTo');
        
        // Populate team members
        select.innerHTML = '<option value="">Select Team Member</option>';
        const users = auth.getUsers().filter(u => u.role === 'user' || u.role === 'admin');
        users.forEach(user => {
            select.innerHTML += `<option value="${user.username}">${user.username} (${user.department})</option>`;
        });
        
        modal.style.display = 'block';
    }

    changeSeverity(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const severities = ['High', 'Medium', 'Low'];
        const newSeverity = prompt(`Current severity: ${ticket.severity}\nEnter new severity (High/Medium/Low):`, ticket.severity);
        
        if (newSeverity && severities.includes(newSeverity)) {
            ticket.severity = newSeverity;
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            this.refreshCurrentView();
            this.showNotification(`Ticket ${ticketId} severity changed to ${newSeverity}`, 'success');
        }
    }

    closeTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (confirm(`Are you sure you want to close ticket ${ticketId}?`)) {
            ticket.status = 'Closed';
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            this.refreshCurrentView();
            this.showNotification(`Ticket ${ticketId} has been closed`, 'success');
        }
    }

    reopenTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (confirm(`Are you sure you want to reopen ticket ${ticketId}?`)) {
            ticket.status = 'Open';
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            this.refreshCurrentView();
            this.showNotification(`Ticket ${ticketId} has been reopened`, 'success');
        }
    }

    checkOverdueTickets() {
        const overdueTickets = this.tickets.filter(ticket => {
            if (ticket.status === 'Closed') return false;
            
            const timeCreated = new Date(ticket.createdAt);
            const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
            return hoursElapsed > this.timeToResolve[ticket.severity];
        });

        if (overdueTickets.length > 0) {
            console.log(`Alert: ${overdueTickets.length} overdue tickets found`);
            // You could show a notification here
        }
    }

    loadUsersList() {
        const usersList = document.getElementById('usersList');
        const users = auth.getUsers();
        
        usersList.innerHTML = users.map(user => `
            <div class="user-card">
                <h4>${user.username}</h4>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Department:</strong> ${user.department}</p>
                <p><strong>Role:</strong> ${user.role}</p>
                <div class="user-actions" style="margin-top: 10px;">
                    <button onclick="ticketSystem.deleteUser('${user.username}')" class="btn btn-danger btn-small">Delete</button>
                </div>
            </div>
        `).join('');
    }

    deleteUser(username) {
        if (username === 'admin') {
            alert('Cannot delete admin user');
            return;
        }
        
        if (confirm(`Are you sure you want to delete user ${username}?`)) {
            auth.deleteUser(username);
            this.showNotification('User deleted successfully', 'success');
            this.loadUsersList();
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showAddUserModal() {
        document.getElementById('addUserModal').style.display = 'block';
    }

    showSettingsModal() {
        document.getElementById('settingsModal').style.display = 'block';
    }

    updateCompanyBranding() {
        const companyName = localStorage.getItem('companyName') || 'Graviti Technologies';
        const logoUrl = localStorage.getItem('companyLogo') || 'assets/logo.png';
        
        // Update all company name elements
        const nameElements = ['loginCompanyName', 'appCompanyName', 'companyNameEdit'];
        nameElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.tagName === 'INPUT') {
                    element.value = companyName;
                } else {
                    element.textContent = companyName;
                }
            }
        });
        
        // Update all logo elements
        const logoElements = ['loginLogo', 'appLogo'];
        logoElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.src = logoUrl;
            }
        });
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    logout() {
        auth.logout();
        document.body.classList.remove('admin-view', 'user-view');
        this.showLoginPage();
    }
}

// Utility functions
function showPage(pageId) {
    ticketSystem.showPage(pageId);
}

function closeModal(modalId) {
    ticketSystem.closeModal(modalId);
}

function showAddUserModal() {
    ticketSystem.showAddUserModal();
}

function showSettingsModal() {
    ticketSystem.showSettingsModal();
}

function showPasswordReset() {
    document.getElementById('passwordResetModal').style.display = 'block';
}

function logout() {
    ticketSystem.logout();
}

function editCompanyName() {
    const currentName = document.getElementById('loginCompanyName').textContent;
    const newName = prompt('Enter company name:', currentName);
    if (newName && newName.trim()) {
        localStorage.setItem('companyName', newName.trim());
        ticketSystem.updateCompanyBranding();
    }
}

function uploadLogo() {
    const fileInput = document.getElementById('logoUpload');
    const file = fileInput.files[0];
    
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert('File size should be less than 2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const logoUrl = e.target.result;
            localStorage.setItem('companyLogo', logoUrl);
            ticketSystem.updateCompanyBranding();
            ticketSystem.showNotification('Logo updated successfully', 'success');
        };
        reader.readAsDataURL(file);
    }
}

function updateCompanyName() {
    const newName = document.getElementById('companyNameEdit').value;
    if (newName && newName.trim()) {
        localStorage.setItem('companyName', newName.trim());
        ticketSystem.updateCompanyBranding();
        ticketSystem.showNotification('Company name updated successfully', 'success');
    }
}

function filterMyTickets() {
    ticketSystem.refreshTicketsList();
}

function filterDashboard() {
    if (ticketSystem.dashboard) {
        ticketSystem.dashboard.filterDashboard();
    }
}

function generateReport() {
    ticketSystem.generateReport();
}

function exportReport() {
    ticketSystem.exportReport();
}

// Initialize the application
const ticketSystem = new TicketingSystem();

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .no-tickets {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 40px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
    }
`;
document.head.appendChild(notificationStyles);
