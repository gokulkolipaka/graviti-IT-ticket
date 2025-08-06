// Main Application Logic with Three-Tier System
class TicketingSystem {
    constructor() {
        this.tickets = [];
        this.ticketCounter = 1;
        this.timeToResolve = {
            'High': 4,
            'Medium': 24,
            'Low': 72
        };
        this.currentAssignTicket = null;
        this.syncInterval = 10000; // 10 seconds
        this.syncTimer = null;
        this.init();
    }

    init() {
        this.loadTickets();
        this.setupEventListeners();
        this.checkAuth();
        this.updateCompanyBranding();
        this.startAutoSync();
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
        localStorage.setItem('lastTicketUpdate', new Date().toISOString());
    }

    startAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        
        this.syncTimer = setInterval(() => {
            this.syncData();
        }, this.syncInterval);
    }

    syncData() {
        const lastUpdate = localStorage.getItem('lastTicketUpdate');
        const currentTime = new Date().toISOString();
        
        // Simulate checking for updates
        this.loadTickets();
        this.refreshCurrentView();
        
        // Update sync indicators
        const syncIndicators = document.querySelectorAll('.sync-indicator');
        const lastSyncElements = document.querySelectorAll('.last-sync');
        
        syncIndicators.forEach(indicator => {
            indicator.textContent = '🔄 Synced';
            indicator.className = 'sync-indicator';
        });
        
        lastSyncElements.forEach(element => {
            element.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        });
        
        // Reset to auto-sync after 2 seconds
        setTimeout(() => {
            syncIndicators.forEach(indicator => {
                if (auth.isAdmin()) {
                    indicator.textContent = '🔄 Auto-sync enabled';
                } else if (auth.isTeamMember()) {
                    indicator.textContent = '🔄 Real-time sync active';
                } else {
                    indicator.textContent = '🔄 Auto-refresh enabled';
                }
            });
        }, 2000);
    }

    checkAuth() {
        const user = auth.getCurrentUser();
        if (user) {
            this.showMainApp();
            this.updateUserInfo();
            
            if (user.role === 'admin') {
                document.body.classList.add('admin-view');
                document.body.classList.remove('team-view', 'user-view');
                this.showPage('adminDashboard');
            } else if (user.role === 'team') {
                document.body.classList.add('team-view');
                document.body.classList.remove('admin-view', 'user-view');
                this.showPage('kanban');
            } else {
                document.body.classList.add('user-view');
                document.body.classList.remove('admin-view', 'team-view');
                this.showPage('ticketForm');
            }
        } else {
            this.showLoginPage();
        }
    }

    updateUserInfo() {
        const user = auth.getCurrentUser();
        if (user) {
            const welcomeElement = document.getElementById('userWelcome');
            const roleElement = document.getElementById('userRole');
            
            welcomeElement.textContent = `Welcome, ${user.fullName || user.username}!`;
            roleElement.textContent = user.role === 'team' ? 'IT Team' : user.role.charAt(0).toUpperCase() + user.role.slice(1);
            roleElement.className = `role-badge ${user.role}`;
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
                this.updateUserInfo();
                
                const user = auth.getCurrentUser();
                if (user.role === 'admin') {
                    document.body.classList.add('admin-view');
                    this.showPage('adminDashboard');
                } else if (user.role === 'team') {
                    document.body.classList.add('team-view');
                    this.showPage('kanban');
                } else {
                    document.body.classList.add('user-view');
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
            this.updateUserInfo();
            
            const user = auth.getCurrentUser();
            if (user.role === 'admin') {
                document.body.classList.add('admin-view');
                this.showPage('adminDashboard');
            } else if (user.role === 'team') {
                document.body.classList.add('team-view');
                this.showPage('kanban');
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
        if (!user || !auth.isUser()) {
            this.showNotification('Only users can create tickets', 'error');
            return;
        }

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
            requestorName: user.fullName || user.username,
            assignedTo: null,
            assignedToName: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachments: [],
            assignmentNotes: ''
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

        this.sendEmailNotification(ticketData, 'created');
        this.showNotification(`Ticket ${ticketData.id} created successfully!`, 'success');
        document.getElementById('newTicketForm').reset();
        this.showPage('myTickets');
    }

    handleAddUser() {
        if (!auth.canManageUsers()) {
            this.showNotification('Access denied', 'error');
            return;
        }

        try {
            const userData = {
                username: document.getElementById('newUsername').value,
                email: document.getElementById('newUserEmail').value,
                department: document.getElementById('newUserDepartment').value,
                role: document.getElementById('newUserRole').value,
                fullName: document.getElementById('newUsername').value // Can be enhanced with separate full name field
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
        const assignNotes = document.getElementById('assignNotes').value;

        if (!ticketId || !assignTo) return;

        const ticket = this.tickets.find(t => t.id === ticketId);
        const assignedUser = auth.getUsers().find(u => u.username === assignTo);
        
        if (ticket && assignedUser) {
            ticket.assignedTo = assignTo;
            ticket.assignedToName = assignedUser.fullName || assignTo;
            ticket.status = 'In Progress';
            ticket.assignmentNotes = assignNotes;
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            
            // Send email to assigned team member
            this.sendEmailToTeamMember(ticket, assignedUser);
            
            this.closeModal('assignModal');
            this.refreshCurrentView();
            
            this.showNotification(`Ticket ${ticketId} assigned to ${assignedUser.fullName || assignTo}`, 'success');
        }
    }

    sendEmailToTeamMember(ticket, assignedUser) {
        // Show email preview modal
        const modal = document.getElementById('emailPreviewModal');
        const content = document.getElementById('emailPreviewContent');
        
        const emailContent = `
            <div class="email-header">
                <div class="email-subject">New Ticket Assignment: ${ticket.id}</div>
                <div class="email-meta">
                    To: ${assignedUser.email}<br>
                    From: admin@techsupport.com<br>
                    Sent: ${new Date().toLocaleString()}
                </div>
            </div>
            <div class="email-body">
                <p>Dear ${assignedUser.fullName || assignedUser.username},</p>
                
                <p>You have been assigned a new support ticket. Please review the details below and take appropriate action.</p>
                
                <table class="ticket-details-table">
                    <tr><th>Ticket ID</th><td>${ticket.id}</td></tr>
                    <tr><th>Type</th><td>${ticket.type}</td></tr>
                    <tr><th>Severity</th><td><span style="color: ${ticket.severity === 'High' ? '#e74c3c' : ticket.severity === 'Medium' ? '#f39c12' : '#27ae60'}">${ticket.severity}</span></td></tr>
                    <tr><th>Department</th><td>${ticket.department}</td></tr>
                    <tr><th>Requestor</th><td>${ticket.requestorName} (${ticket.requestor})</td></tr>
                    <tr><th>Location</th><td>${ticket.location}</td></tr>
                    <tr><th>Created</th><td>${new Date(ticket.createdAt).toLocaleString()}</td></tr>
                </table>
                
                <h4>Description:</h4>
                <p style="background: #f8f9fa; padding: 10px; border-left: 4px solid #667eea; margin: 10px 0;">${ticket.description}</p>
                
                ${ticket.assignmentNotes ? `
                    <h4>Assignment Notes:</h4>
                    <p style="background: #fff3cd; padding: 10px; border-left: 4px solid #f39c12; margin: 10px 0;">${ticket.assignmentNotes}</p>
                ` : ''}
                
                ${ticket.attachments.length > 0 ? `
                    <h4>Attachments:</h4>
                    <ul>
                        ${ticket.attachments.map(att => `<li>${att.name} (${(att.size/1024).toFixed(1)} KB)</li>`).join('')}
                    </ul>
                ` : ''}
                
                <p><strong>Please log into the support system to view full details and update the ticket status.</strong></p>
                
                <p>Best regards,<br>TechSupport Pro System</p>
            </div>
        `;
        
        content.innerHTML = emailContent;
        modal.style.display = 'block';
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            modal.style.display = 'none';
        }, 5000);
    }

    sendEmailNotification(ticket, action = 'created') {
        console.log(`Email notification sent for ticket ${ticket.id} (${action})`);
        // In a real implementation, this would send actual emails
    }

    showLoginPage() {
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('mainApp').classList.remove('active');
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
    }

    showMainApp() {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');
        this.updateCompanyBranding();
        this.startAutoSync();
    }

    showPage(pageId) {
        // Clear active states
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
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
            case 'kanban':
                document.getElementById('kanbanBtn').classList.add('active');
                this.refreshTeamKanban();
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
                break;
        }
    }

    refreshCurrentView() {
        const activePages = document.querySelectorAll('.content-page.active');
        if (activePages.length > 0) {
            const pageId = activePages[0].id;
            
            // Don't refresh the page navigation, just the content
            switch(pageId) {
                case 'myTickets':
                    this.refreshTicketsList();
                    break;
                case 'adminDashboard':
                    this.loadDashboard();
                    this.refreshKanban();
                    break;
                case 'kanban':
                    this.refreshTeamKanban();
                    break;
                case 'userManagement':
                    this.loadUsersList();
                    break;
                case 'reports':
                    this.loadReports();
                    break;
            }
        }
    }

    refreshTicketsList() {
        const user = auth.getCurrentUser();
        let ticketsToShow = [];
        
        if (auth.isAdmin()) {
            ticketsToShow = this.tickets;
        } else if (auth.isTeamMember()) {
            // Team members see assigned tickets and unassigned tickets
            ticketsToShow = this.tickets.filter(t => 
                t.assignedTo === user.username || 
                (t.assignedTo === null && (t.status === 'Open' || t.status === 'In Progress'))
            );
        } else {
            // Users see only their tickets
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
            ticketsList.innerHTML = '<div class="no-tickets">No tickets found.</div>';
            return;
        }

        ticketsToShow.forEach(ticket => {
            const ticketCard = this.createTicketCard(ticket);
            ticketsList.appendChild(ticketCard);
        });

        this.checkOverdueTickets();
    }

    createTicketCard(ticket) {
        const card = document.createElement('div');
        card.className = `ticket-card severity-${ticket.severity.toLowerCase()}`;
        
        const timeCreated = new Date(ticket.createdAt);
        const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
        const isOverdue = hoursElapsed > this.timeToResolve[ticket.severity] && ticket.status !== 'Closed';
        const user = auth.getCurrentUser();
        const isNewAssignment = auth.isTeamMember() && ticket.assignedTo === user.username && 
                               ticket.status === 'In Progress' && 
                               (new Date() - new Date(ticket.updatedAt)) < (24 * 60 * 60 * 1000); // Less than 24 hours

        card.innerHTML = `
            ${isNewAssignment ? '<div class="new-assignment">NEW</div>' : ''}
            <div class="ticket-header">
                <span class="ticket-id">${ticket.id}</span>
                <span class="ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span>
            </div>
            <h4>${ticket.type}</h4>
            <p><strong>Department:</strong> ${ticket.department}</p>
            <p><strong>Severity:</strong> ${ticket.severity}</p>
            <p><strong>Requestor:</strong> ${ticket.requestorName || ticket.requestor}</p>
            <p><strong>Location:</strong> ${ticket.location}</p>
            <p><strong>Created:</strong> ${timeCreated.toLocaleString()}</p>
            ${ticket.assignedToName ? `<p><strong>Assigned to:</strong> ${ticket.assignedToName}</p>` : ''}
            ${isOverdue ? '<div class="overdue-warning">⚠️ OVERDUE</div>' : ''}
            <p class="description">${ticket.description.substring(0, 100)}${ticket.description.length > 100 ? '...' : ''}</p>
            <div class="ticket-actions">
                <button onclick="ticketSystem.viewTicketDetails('${ticket.id}')" class="btn btn-primary">View Details</button>
                ${auth.canAssignTickets() && ticket.status !== 'Closed' ? `
                    <button onclick="ticketSystem.showAssignModal('${ticket.id}')" class="btn btn-warning">
                        ${ticket.assignedTo ? 'Reassign' : 'Assign'}
                    </button>
                ` : ''}
                ${auth.canAssignTickets() ? `
                    <button onclick="ticketSystem.changeSeverity('${ticket.id}')" class="btn btn-warning">Change Severity</button>
                ` : ''}
                ${auth.canResolveTickets() && ticket.assignedTo === user.username && ticket.status === 'In Progress' ? `
                    <button onclick="ticketSystem.resolveTicket('${ticket.id}')" class="btn btn-success">Mark as Resolved</button>
                ` : ''}
                ${auth.canCloseTickets() && ticket.status === 'Resolved' ? `
                    <button onclick="ticketSystem.closeTicket('${ticket.id}')" class="btn btn-success">Close Ticket</button>
                ` : ''}
                ${ticket.status === 'Closed' && ticket.requestor === user.username ? `
                    <button onclick="ticketSystem.reopenTicket('${ticket.id}')" class="btn btn-danger">Reopen</button>
                ` : ''}
            </div>
        `;
        
        return card;
    }

    resolveTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        const user = auth.getCurrentUser();
        
        if (!ticket || !auth.canResolveTickets() || ticket.assignedTo !== user.username) {
            this.showNotification('Access denied', 'error');
            return;
        }

        if (confirm(`Mark ticket ${ticketId} as resolved?`)) {
            ticket.status = 'Resolved';
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            this.refreshCurrentView();
            this.showNotification(`Ticket ${ticketId} marked as resolved`, 'success');
            
            // Send notification to admin
            this.sendEmailNotification(ticket, 'resolved');
        }
    }

    viewTicketDetails(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const modal = document.getElementById('ticketModal');
        const details = document.getElementById('ticketDetails');
        const user = auth.getCurrentUser();
        
        details.innerHTML = `
            <h3>Ticket Details - ${ticket.id}</h3>
            <div class="ticket-detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                <p><strong>Type:</strong> ${ticket.type}</p>
                <p><strong>Severity:</strong> <span style="color: ${ticket.severity === 'High' ? '#e74c3c' : ticket.severity === 'Medium' ? '#f39c12' : '#27ae60'}">${ticket.severity}</span></p>
                <p><strong>Status:</strong> <span class="ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span></p>
                <p><strong>Department:</strong> ${ticket.department}</p>
                <p><strong>Requestor:</strong> ${ticket.requestorName || ticket.requestor}</p>
                <p><strong>Employee ID:</strong> ${ticket.employeeId}</p>
                <p><strong>Location:</strong> ${ticket.location}</p>
                <p><strong>Supervisor:</strong> ${ticket.supervisor}</p>
                <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
                <p><strong>Last Updated:</strong> ${new Date(ticket.updatedAt).toLocaleString()}</p>
                <p><strong>Assigned to:</strong> ${ticket.assignedToName || 'Unassigned'}</p>
            </div>
            <div class="description-section" style="margin: 20px 0;">
                <h4>Description:</h4>
                <p style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #667eea;">${ticket.description}</p>
            </div>
            ${ticket.assignmentNotes ? `
                <div class="assignment-notes-section" style="margin: 20px 0;">
                    <h4>Assignment Notes:</h4>
                    <p style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #f39c12;">${ticket.assignmentNotes}</p>
                </div>
            ` : ''}
            ${ticket.attachments.length > 0 ? `
                <div class="attachments-section" style="margin: 20px 0;">
                    <h4>Attachments:</h4>
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin-top: 10px;">
                        ${ticket.attachments.map(att => `<p style="margin: 5px 0;">📎 ${att.name} (${(att.size/1024).toFixed(1)} KB)</p>`).join('')}
                    </div>
                </div>
            ` : ''}
            <div class="ticket-actions" style="margin-top: 20px; text-align: center;">
                ${auth.canResolveTickets() && ticket.assignedTo === user.username && ticket.status === 'In Progress' ? `
                    <button onclick="ticketSystem.resolveTicket('${ticket.id}'); ticketSystem.closeModal('ticketModal');" class="btn btn-success">Mark as Resolved</button>
                ` : ''}
                ${auth.canCloseTickets() && ticket.status === 'Resolved' ? `
                    <button onclick="ticketSystem.closeTicket('${ticket.id}'); ticketSystem.closeModal('ticketModal');" class="btn btn-success">Close Ticket</button>
                ` : ''}
            </div>
        `;
        
        modal.style.display = 'block';
    }

    showAssignModal(ticketId) {
        if (!auth.canAssignTickets()) {
            this.showNotification('Access denied', 'error');
            return;
        }

        this.currentAssignTicket = ticketId;
        const modal = document.getElementById('assignModal');
        const select = document.getElementById('assignTo');
        
        // Populate IT team members only
        select.innerHTML = '<option value="">Select IT Team Member</option>';
        const teamMembers = auth.getTeamMembers();
        teamMembers.forEach(member => {
            select.innerHTML += `<option value="${member.username}">${member.fullName || member.username} (${member.department})</option>`;
        });
        
        modal.style.display = 'block';
    }

    changeSeverity(ticketId) {
        if (!auth.canAssignTickets()) {
            this.showNotification('Access denied', 'error');
            return;
        }

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
        if (!auth.canCloseTickets()) {
            this.showNotification('Access denied', 'error');
            return;
        }

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
        const user = auth.getCurrentUser();
        
        if (!ticket || ticket.requestor !== user.username) {
            this.showNotification('Access denied', 'error');
            return;
        }

        if (confirm(`Are you sure you want to reopen ticket ${ticketId}?`)) {
            ticket.status = 'Open';
            ticket.assignedTo = null;
            ticket.assignedToName = null;
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

        if (overdueTickets.length > 0 && auth.canAssignTickets()) {
            console.log(`Alert: ${overdueTickets.length} overdue tickets found`);
        }
    }

    loadUsersList() {
        if (!auth.canManageUsers()) {
            this.showNotification('Access denied', 'error');
            return;
        }

        const usersList = document.getElementById('usersList');
        const users = auth.getUsers();
        
        // Apply role filter
        const roleFilter = document.getElementById('roleFilter').value;
        let filteredUsers = users;
        if (roleFilter) {
            filteredUsers = users.filter(u => u.role === roleFilter);
        }
        
        usersList.innerHTML = filteredUsers.map(user => `
            <div class="user-card ${user.role}">
                <span class="user-role-badge ${user.role}">${user.role === 'team' ? 'IT Team' : user.role}</span>
                <h4>${user.fullName || user.username}</h4>
                <p><strong>Username:</strong> ${user.username}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Department:</strong> ${user.department}</p>
                <p><strong>Role:</strong> ${user.role === 'team' ? 'IT Team Member' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
                <div class="user-actions" style="margin-top: 15px;">
                    ${user.username !== 'admin' ? `
                        <button onclick="ticketSystem.deleteUser('${user.username}')" class="btn btn-danger btn-small">Delete</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    deleteUser(username) {
        if (!auth.canManageUsers()) {
            this.showNotification('Access denied', 'error');
            return;
        }

        if (username === 'admin') {
            this.showNotification('Cannot delete admin user', 'error');
            return;
        }
        
        if (confirm(`Are you sure you want to delete user ${username}?`)) {
            try {
                auth.deleteUser(username);
                this.showNotification('User deleted successfully', 'success');
                this.loadUsersList();
            } catch (error) {
                this.showNotification(error.message, 'error');
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
        const companyName = localStorage.getItem('companyName') || 'TechSupport Pro';
        const logoUrl = localStorage.getItem('companyLogo') || 'assets/logo.png';
        
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
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    logout() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        auth.logout();
        document.body.classList.remove('admin-view', 'team-view', 'user-view');
        this.showLoginPage();
    }
}

// Global utility functions
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
        if (file.size > 2 * 1024 * 1024) {
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

function updateSyncInterval() {
    const newInterval = parseInt(document.getElementById('syncInterval').value) * 1000;
    ticketSystem.syncInterval = newInterval;
    ticketSystem.startAutoSync();
    ticketSystem.showNotification('Sync interval updated', 'success');
}

function filterMyTickets() {
    ticketSystem.refreshTicketsList();
}

function filterUsers() {
    ticketSystem.loadUsersList();
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

// Add CSS animations
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(animationStyles);
