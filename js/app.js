// Main Application Logic with Three-Tier System
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
        this.needsRefresh = false;
        this.showOnlyMyTickets = false;
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
        this.needsRefresh = true;
    }

    checkAuth() {
        const user = auth.getCurrentUser();
        if (user) {
            this.showMainApp();
            this.setUserRole(user.role);
        } else {
            this.showLoginPage();
        }
    }

    setUserRole(role) {
        // Remove all role classes
        document.body.classList.remove('admin-view', 'user-view', 'team-view');
        
        // Add appropriate role class
        switch(role) {
            case 'admin':
                document.body.classList.add('admin-view');
                this.showPage('adminDashboard');
                break;
            case 'team':
                document.body.classList.add('team-view');
                this.showPage('kanban');
                break;
            case 'user':
                document.body.classList.add('user-view');
                this.showPage('ticketForm');
                break;
        }

        this.updateUserInfo(auth.getCurrentUser());
    }

    updateUserInfo(user) {
        const nameElement = document.getElementById('currentUserName');
        const roleElement = document.getElementById('currentUserRole');
        
        if (nameElement && roleElement) {
            nameElement.textContent = user.username;
            roleElement.textContent = user.role.toUpperCase();
            roleElement.className = `user-role-badge ${user.role}`;
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
                const user = auth.getCurrentUser();
                this.setUserRole(user.role);
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
            realtimeSystem.showNotification('Password changed successfully', 'success');
            this.showMainApp();
            const user = auth.getCurrentUser();
            this.setUserRole(user.role);
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
            requestorDepartment: user.department,
            assignedTo: null,
            assignedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachments: [],
            emailSent: false
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

        realtimeSystem.showNotification(`Ticket ${ticketData.id} created successfully!`, 'success');
        document.getElementById('newTicketForm').reset();
        this.showPage('myTickets');
    }

    sendEmailNotification(ticket) {
        console.log(`Email sent to ${ticket.supervisor} for ticket ${ticket.id}`);
        // In real implementation, this would integrate with email service
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
            realtimeSystem.showNotification('User added successfully', 'success');
            document.getElementById('addUserForm').reset();
            this.closeModal('addUserModal');
            this.loadUsersList();
        } catch (error) {
            realtimeSystem.showNotification(error.message, 'error');
        }
    }

    handleAssignTicket() {
        const ticketId = this.currentAssignTicket;
        const assignTo = document.getElementById('assignTo').value;
        const notes = document.getElementById('assignNotes').value;

        if (!ticketId || !assignTo) return;

        const ticket = this.tickets.find(t => t.id === ticketId);
        const assignedUser = auth.getUsers().find(u => u.username === assignTo);
        
        if (ticket && assignedUser) {
            ticket.assignedTo = assignTo;
            ticket.assignedAt = new Date().toISOString();
            ticket.status = 'In Progress';
            ticket.updatedAt = new Date().toISOString();
            ticket.assignmentNotes = notes;
            
            this.saveTickets();
            this.closeModal('assignModal');
            this.refreshCurrentView();
            
            // Send email notification to assigned team member
            if (assignedUser.role === 'team' || assignedUser.role === 'admin') {
                realtimeSystem.sendEmailNotification(ticket, assignedUser);
                ticket.emailSent = true;
            }
            
            realtimeSystem.showNotification(`Ticket ${ticketId} assigned to ${assignTo}`, 'success');
            realtimeSystem.broadcastUpdate('ticket_assigned', { ticketId, assignTo });
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
                const btn = document.getElementById('myTicketsBtn');
                if (btn) btn.classList.add('active');
                this.loadMyTicketsPage();
                break;
            case 'adminDashboard':
                this.loadDashboard();
                this.refreshKanban('admin');
                break;
            case 'kanban':
                const kanbanBtn = document.getElementById('kanbanBtn');
                if (kanbanBtn) kanbanBtn.classList.add('active');
                this.refreshKanban('team');
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

    loadMyTicketsPage() {
        const user = auth.getCurrentUser();
        const isAdmin = auth.isAdmin();
        const isTeam = auth.isTeamMember();
        
        // Update page title based on role
        const titleElement = document.getElementById('ticketsPageTitle');
        if (titleElement) {
            if (isAdmin) {
                titleElement.textContent = 'All Tickets';
            } else if (isTeam) {
                titleElement.textContent = this.showOnlyMyTickets ? 'My Assigned Tickets' : 'All Tickets';
            } else {
                titleElement.textContent = 'My Tickets';
            }
        }
        
        this.refreshTicketsList();
    }

    refreshCurrentView() {
        const activePages = document.querySelectorAll('.content-page.active');
        if (activePages.length > 0) {
            const pageId = activePages[0].id;
            if (pageId === 'kanban') {
                this.refreshKanban(auth.isAdmin() ? 'admin' : 'team');
            } else {
                this.showPage(pageId);
            }
        }
    }

    refreshTicketsList() {
        const user = auth.getCurrentUser();
        const isAdmin = auth.isAdmin();
        const isTeam = auth.isTeamMember();
        
        let ticketsToShow = [];
        
        if (isAdmin) {
            ticketsToShow = this.tickets; // Admin sees all tickets
        } else if (isTeam) {
            if (this.showOnlyMyTickets) {
                ticketsToShow = this.tickets.filter(t => t.assignedTo === user.username);
            } else {
                ticketsToShow = this.tickets; // Team members can see all tickets
            }
        } else {
            ticketsToShow = this.tickets.filter(t => t.requestor === user.username); // Users see only their tickets
        }

        // Apply status filter
        const statusFilter = document.getElementById('ticketStatusFilter').value;
        if (statusFilter) {
            ticketsToShow = ticketsToShow.filter(t => t.status === statusFilter);
        }

        const ticketsList = document.getElementById('ticketsList');
        ticketsList.innerHTML = '';

        if (ticketsToShow.length === 0) {
            ticketsList.innerHTML = '<div class="no-tickets">No tickets found.</div>';
            return;
        }

        ticketsToShow.forEach(ticket => {
            const ticketCard = this.createTicketCard(ticket);
            ticketsList.appendChild(ticketCard);
        });

        // Check for overdue tickets
        if (isAdmin || isTeam) {
            this.checkOverdueTickets();
        }
    }

    createTicketCard(ticket) {
        const card = document.createElement('div');
        card.className = `ticket-card severity-${ticket.severity.toLowerCase()}`;
        
        const timeCreated = new Date(ticket.createdAt);
        const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
        const isOverdue = hoursElapsed > this.timeToResolve[ticket.severity] && ticket.status !== 'Closed';
        
        const user = auth.getCurrentUser();
        const isMyTicket = ticket.assignedTo === user.username;
        const canEdit = auth.isAdmin() || (auth.isTeamMember() && isMyTicket);
        
        card.innerHTML = `
            <div class="ticket-header">
                <span class="ticket-id">${ticket.id}</span>
                <span class="ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span>
                ${ticket.emailSent ? '<span class="email-sent-indicator">📧</span>' : ''}
            </div>
            <h4>${ticket.type}</h4>
            <p><strong>Department:</strong> ${ticket.department}</p>
            <p><strong>Severity:</strong> ${ticket.severity}</p>
            <p><strong>Location:</strong> ${ticket.location}</p>
            <p><strong>Requestor:</strong> ${ticket.requestor}</p>
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
                ${ticket.status === 'Resolved' && auth.isAdmin() ? `
                    <button onclick="ticketSystem.closeTicket('${ticket.id}')" class="btn btn-success">Close Ticket</button>
                ` : ''}
                ${ticket.status === 'Closed' && ticket.requestor === user.username ? `
                    <button onclick="ticketSystem.reopenTicket('${ticket.id}')" class="btn btn-danger">Reopen</button>
                ` : ''}
                ${auth.isTeamMember() && isMyTicket && ticket.status === 'In Progress' ? `
                    <button onclick="ticketSystem.resolveTicket('${ticket.id}')" class="btn btn-success">Mark as Resolved</button>
                ` : ''}
            </div>
        `;
        
        return card;
    }

    resolveTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        const user = auth.getCurrentUser();
        
        if (!ticket || ticket.assignedTo !== user.username) {
            realtimeSystem.showNotification('You can only resolve tickets assigned to you', 'error');
            return;
        }

        if (confirm(`Are you sure you want to mark ticket ${ticketId} as resolved?`)) {
            ticket.status = 'Resolved';
            ticket.resolvedAt = new Date().toISOString();
            ticket.updatedAt = new Date().toISOString();
            ticket.resolvedBy = user.username;
            
            this.saveTickets();
            this.refreshCurrentView();
            
            realtimeSystem.showNotification(`Ticket ${ticketId} marked as resolved`, 'success');
            realtimeSystem.broadcastUpdate('ticket_resolved', { ticketId, resolvedBy: user.username });
        }
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
                <p><strong>Requestor:</strong> ${ticket.requestor} (${ticket.requestorDepartment})</p>
                <p><strong>Employee ID:</strong> ${ticket.employeeId}</p>
                <p><strong>Location:</strong> ${ticket.location}</p>
                <p><strong>Supervisor:</strong> ${ticket.supervisor}</p>
                <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
                <p><strong>Last Updated:</strong> ${new Date(ticket.updatedAt).toLocaleString()}</p>
                <p><strong>Assigned to:</strong> ${ticket.assignedTo || 'Unassigned'}</p>
                ${ticket.assignedAt ? `<p><strong>Assigned at:</strong> ${new Date(ticket.assignedAt).toLocaleString()}</p>` : ''}
                ${ticket.resolvedAt ? `<p><strong>Resolved at:</strong> ${new Date(ticket.resolvedAt).toLocaleString()}</p>` : ''}
                ${ticket.resolvedBy ? `<p><strong>Resolved by:</strong> ${ticket.resolvedBy}</p>` : ''}
            </div>
            <div class="description-section" style="margin: 20px 0;">
                <h4>Description:</h4>
                <p style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px;">${ticket.description}</p>
            </div>
            ${ticket.assignmentNotes ? `
                <div class="notes-section" style="margin: 20px 0;">
                    <h4>Assignment Notes:</h4>
                    <p style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 10px;">${ticket.assignmentNotes}</p>
                </div>
            ` : ''}
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
        
        // Populate IT team members only
        select.innerHTML = '<option value="">Select IT Team Member</option>';
        const teamMembers = auth.getTeamMembers();
        teamMembers.forEach(user => {
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
            realtimeSystem.showNotification(`Ticket ${ticketId} severity changed to ${newSeverity}`, 'success');
        }
    }

    closeTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (ticket.status !== 'Resolved') {
            realtimeSystem.showNotification('Only resolved tickets can be closed', 'error');
            return;
        }

        if (confirm(`Are you sure you want to close ticket ${ticketId}?`)) {
            ticket.status = 'Closed';
            ticket.closedAt = new Date().toISOString();
            ticket.updatedAt = new Date().toISOString();
            ticket.closedBy = auth.getCurrentUser().username;
            
            this.saveTickets();
            this.refreshCurrentView();
            realtimeSystem.showNotification(`Ticket ${ticketId} has been closed`, 'success');
            realtimeSystem.broadcastUpdate('ticket_closed', { ticketId });
        }
    }

    reopenTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (confirm(`Are you sure you want to reopen ticket ${ticketId}?`)) {
            ticket.status = 'Open';
            ticket.reopenedAt = new Date().toISOString();
            ticket.updatedAt = new Date().toISOString();
            
            // Clear resolved/closed timestamps
            delete ticket.resolvedAt;
            delete ticket.closedAt;
            delete ticket.resolvedBy;
            delete ticket.closedBy;
            
            this.saveTickets();
            this.refreshCurrentView();
            realtimeSystem.showNotification(`Ticket ${ticketId} has been reopened`, 'success');
        }
    }

    showMyAssignedTickets() {
        this.showOnlyMyTickets = true;
        this.refreshTicketsList();
    }

    showAllTickets() {
        this.showOnlyMyTickets = false;
        this.refreshTicketsList();
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
        }
    }

    loadUsersList() {
        const usersList = document.getElementById('usersList');
        const users = auth.getUsers();
        const counts = auth.getUserCounts();
        
        // Update user counts
        document.getElementById('adminCount').textContent = counts.admin;
        document.getElementById('teamCount').textContent = counts.team;
        document.getElementById('regularUserCount').textContent = counts.user;
        
        usersList.innerHTML = users.map(user => `
            <div class="user-card ${user.role}-user">
                <div class="user-info">
                    <h4>${user.username}</h4>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Department:</strong> ${user.department}</p>
                    <p><strong>Role:</strong> ${user.role.toUpperCase()}</p>
                </div>
                <div class="user-actions">
                    <button onclick="ticketSystem.deleteUser('${user.username}')" class="btn btn-danger btn-small" 
                            ${user.username === 'admin' ? 'disabled' : ''}>Delete</button>
                </div>
            </div>
        `).join('');
    }

    deleteUser(username) {
        if (username === 'admin') {
            realtimeSystem.showNotification('Cannot delete admin user', 'error');
            return;
        }
        
        if (confirm(`Are you sure you want to delete user ${username}?`)) {
            try {
                auth.deleteUser(username);
                realtimeSystem.showNotification('User deleted successfully', 'success');
                this.loadUsersList();
            } catch (error) {
                realtimeSystem.showNotification(error.message, 'error');
            }
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

    logout() {
        auth.logout();
        document.body.classList.remove('admin-view', 'user-view', 'team-view');
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
            realtimeSystem.showNotification('File size should be less than 2MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const logoUrl = e.target.result;
            localStorage.setItem('companyLogo', logoUrl);
            ticketSystem.updateCompanyBranding();
            realtimeSystem.showNotification('Logo updated successfully', 'success');
        };
        reader.readAsDataURL(file);
    }
}

function updateCompanyName() {
    const newName = document.getElementById('companyNameEdit').value;
    if (newName && newName.trim()) {
        localStorage.setItem('companyName', newName.trim());
        ticketSystem.updateCompanyBranding();
        realtimeSystem.showNotification('Company name updated successfully', 'success');
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

function refreshTicketsList() {
    ticketSystem.refreshTicketsList();
}

function refreshKanban() {
    const user = auth.getCurrentUser();
    if (user.role === 'admin') {
        ticketSystem.refreshKanban('admin');
    } else {
        ticketSystem.refreshKanban('team');
    }
}

function showMyAssignedTickets() {
    ticketSystem.showMyAssignedTickets();
}

function showAllTickets() {
    ticketSystem.showAllTickets();
}

// Initialize the application
const ticketSystem = new TicketingSystem();
