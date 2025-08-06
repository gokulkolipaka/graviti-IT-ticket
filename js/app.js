// Main Application Logic with Fixed Navigation and Archive System
class TicketingSystem {
    constructor() {
        this.tickets = [];
        this.archivedTickets = [];
        this.ticketCounter = 1;
        this.timeToResolve = {
            'High': 4, // 4 hours
            'Medium': 24, // 24 hours
            'Low': 72 // 72 hours
        };
        this.currentAssignTicket = null;
        this.showMyTicketsOnly = false;
        this.backupHistory = [];
        this.init();
    }

    init() {
        this.loadTickets();
        this.loadArchivedTickets();
        this.loadBackupHistory();
        this.setupEventListeners();
        this.updateCompanyBranding();
        setTimeout(() => {
            this.checkAuth();
        }, 100);
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

    loadArchivedTickets() {
        const stored = localStorage.getItem('archivedTickets');
        if (stored) {
            this.archivedTickets = JSON.parse(stored);
        }
    }

    loadBackupHistory() {
        const stored = localStorage.getItem('backupHistory');
        if (stored) {
            this.backupHistory = JSON.parse(stored);
        }
    }

    saveTickets() {
        localStorage.setItem('tickets', JSON.stringify(this.tickets));
        window.dispatchEvent(new CustomEvent('ticketsUpdated'));
    }

    saveArchivedTickets() {
        localStorage.setItem('archivedTickets', JSON.stringify(this.archivedTickets));
    }

    saveBackupHistory() {
        localStorage.setItem('backupHistory', JSON.stringify(this.backupHistory));
    }

    checkAuth() {
        const user = auth.getCurrentUser();
        if (user) {
            this.showMainApp();
            this.updateUserInterface(user);
        } else {
            this.showLoginPage();
        }
    }

    updateUserInterface(user) {
        document.body.classList.remove('admin-view', 'user-view', 'team-view');
        
        const userName = document.getElementById('currentUserName');
        const userRole = document.getElementById('currentUserRole');
        if (userName) userName.textContent = user.username;
        if (userRole) {
            userRole.textContent = user.role.toUpperCase();
            userRole.className = `user-role-badge ${user.role}`;
        }

        // Set view based on role and show appropriate default page
        if (user.role === 'admin') {
            document.body.classList.add('admin-view');
            this.showPage('adminDashboard'); // Default to dashboard for admin
        } else if (user.role === 'team') {
            document.body.classList.add('team-view');
            this.showPage('teamKanban');
        } else {
            document.body.classList.add('user-view');
            this.showPage('ticketForm'); // Default to ticket form for users
        }

        this.setupNavigation();
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn[data-page]');
        navButtons.forEach(btn => {
            btn.removeEventListener('click', this.handleNavClick);
            btn.addEventListener('click', this.handleNavClick.bind(this));
        });
    }

    handleNavClick(event) {
        event.preventDefault();
        const pageId = event.target.getAttribute('data-page');
        if (pageId) {
            this.showPage(pageId);
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Password reset form
        const passwordResetForm = document.getElementById('passwordResetForm');
        if (passwordResetForm) {
            passwordResetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordReset();
            });
        }

        // Password change form
        const passwordChangeForm = document.getElementById('passwordChangeForm');
        if (passwordChangeForm) {
            passwordChangeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }

        // New ticket form
        const newTicketForm = document.getElementById('newTicketForm');
        if (newTicketForm) {
            newTicketForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNewTicket();
            });
        }

        // Add user form
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddUser();
            });
        }

        // Assign ticket form
        const assignForm = document.getElementById('assignForm');
        if (assignForm) {
            assignForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAssignTicket();
            });
        }

        // Real-time updates
        window.addEventListener('ticketsUpdated', () => {
            this.loadTickets();
            this.refreshCurrentView();
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        if (!username || !password) {
            errorDiv.textContent = 'Please enter both username and password';
            return;
        }

        try {
            const result = await auth.authenticate(username, password);
            
            if (result === true) {
                const user = auth.getCurrentUser();
                this.showMainApp();
                this.updateUserInterface(user);
                errorDiv.textContent = '';
                document.getElementById('loginForm').reset();
            } else if (result === 'password_change_required') {
                errorDiv.textContent = '';
            } else {
                errorDiv.textContent = 'Invalid username or password';
            }
        } catch (error) {
            errorDiv.textContent = 'Login failed. Please try again.';
            console.error('Login error:', error);
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
            const user = auth.getCurrentUser();
            this.showMainApp();
            this.updateUserInterface(user);
            this.showNotification('Password changed successfully', 'success');
            document.getElementById('passwordChangeForm').reset();
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

        this.showNotification(`Ticket ${ticketData.id} created successfully!`, 'success');
        document.getElementById('newTicketForm').reset();
        
        // Auto-navigate to My Tickets to show the created ticket
        this.showPage('myTickets');
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
        const notes = document.getElementById('assignNotes').value;
        const sendEmail = document.getElementById('sendEmailNotification').checked;

        if (!ticketId || !assignTo) return;

        const ticket = this.tickets.find(t => t.id === ticketId);
        const assignee = auth.getUsers().find(u => u.username === assignTo);
        
        if (ticket && assignee) {
            ticket.assignedTo = assignTo;
            ticket.status = 'In Progress';
            ticket.updatedAt = new Date().toISOString();
            if (notes) {
                ticket.assignmentNotes = notes;
            }
            this.saveTickets();
            
            if (sendEmail) {
                this.sendAssignmentNotification(ticket, assignee);
            }
            
            this.closeModal('assignModal');
            this.refreshCurrentView();
            this.showNotification(`Ticket ${ticketId} assigned to ${assignTo}`, 'success');
        }
    }

    sendAssignmentNotification(ticket, assignee) {
        console.log(`📧 Email sent to ${assignee.email}:`);
        console.log(`Subject: New Ticket Assigned - ${ticket.id}`);
        console.log(`You have been assigned ticket ${ticket.id}: ${ticket.type}`);
        this.showNotification(`Email sent to ${assignee.username}`, 'info');
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
        // Clear all active states
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
        
        // Show selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Update navigation button state
            const navBtn = document.querySelector(`[data-page="${pageId}"]`);
            if (navBtn) navBtn.classList.add('active');
        }

        // Load page-specific data
        switch(pageId) {
            case 'myTickets':
                this.refreshTicketsList();
                break;
            case 'adminDashboard':
                this.loadDashboard();
                break;
            case 'adminKanban':
                this.refreshKanban();
                break;
            case 'teamKanban':
                this.refreshKanban();
                break;
            case 'userManagement':
                this.loadUsersList();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'archive':
                this.loadArchive();
                break;
            case 'ticketForm':
                // Form is ready to use
                break;
        }
    }

    refreshCurrentView() {
        const activePage = document.querySelector('.content-page.active');
        if (activePage) {
            this.showPage(activePage.id);
        }
    }

    refreshTicketsList() {
        const user = auth.getCurrentUser();
        let ticketsToShow = this.tickets;

        // Filter tickets based on user role
        if (user.role === 'user') {
            ticketsToShow = this.tickets.filter(t => t.requestor === user.username);
        } else if (user.role === 'team') {
            ticketsToShow = this.tickets.filter(t => 
                t.assignedTo === user.username || 
                (t.status === 'Open' && !t.assignedTo)
            );
        }

        // Apply status filter
        const statusFilter = document.getElementById('ticketStatusFilter');
        if (statusFilter && statusFilter.value) {
            ticketsToShow = ticketsToShow.filter(t => t.status === statusFilter.value);
        }

        const ticketsList = document.getElementById('ticketsList');
        if (!ticketsList) return;

        ticketsList.innerHTML = '';

        if (ticketsToShow.length === 0) {
            ticketsList.innerHTML = '<p class="no-tickets">No tickets found.</p>';
            return;
        }

        ticketsToShow.forEach(ticket => {
            const ticketCard = this.createTicketCard(ticket);
            ticketsList.appendChild(ticketCard);
        });
    }

    createTicketCard(ticket) {
        const card = document.createElement('div');
        const user = auth.getCurrentUser();
        
        let cardClass = `ticket-card severity-${ticket.severity.toLowerCase()}`;
        if (ticket.assignedTo === user.username) {
            cardClass += ' assigned-to-me';
        }
        if (ticket.requestor === user.username) {
            cardClass += ' my-ticket';
        }
        
        card.className = cardClass;
        
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
                ${(auth.isTeamMember() && ticket.assignedTo === user.username && ticket.status === 'In Progress') ? `
                    <button onclick="ticketSystem.resolveTicket('${ticket.id}')" class="btn btn-success">Mark Resolved</button>
                ` : ''}
                ${ticket.status === 'Closed' && ticket.requestor === user.username ? `
                    <button onclick="ticketSystem.reopenTicket('${ticket.id}')" class="btn btn-danger">Reopen</button>
                ` : ''}
                ${ticket.status === 'Resolved' && auth.isAdmin() ? `
                    <button onclick="ticketSystem.closeTicket('${ticket.id}')" class="btn btn-success">Close Ticket</button>
                ` : ''}
            </div>
        `;
        
        return card;
    }

    // Archive System Methods
    archiveTicket(ticketId) {
        const ticketIndex = this.tickets.findIndex(t => t.id === ticketId);
        if (ticketIndex !== -1) {
            const ticket = this.tickets[ticketIndex];
            ticket.archivedAt = new Date().toISOString();
            ticket.status = 'Archived';
            
            this.archivedTickets.push(ticket);
            this.tickets.splice(ticketIndex, 1);
            
            this.saveTickets();
            this.saveArchivedTickets();
            
            this.showNotification(`Ticket ${ticketId} archived successfully`, 'success');
        }
    }

    closeTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (confirm(`Are you sure you want to close ticket ${ticketId}? Closed tickets will be automatically archived.`)) {
            ticket.status = 'Closed';
            ticket.closedAt = new Date().toISOString();
            ticket.updatedAt = new Date().toISOString();
            
            // Auto-archive after 24 hours (simulate with immediate archive for demo)
            setTimeout(() => {
                this.archiveTicket(ticketId);
            }, 1000); // 1 second for demo, would be 24 hours in production
            
            this.saveTickets();
            this.refreshCurrentView();
            this.showNotification(`Ticket ${ticketId} has been closed and will be archived`, 'success');
        }
    }

    loadArchive() {
        if (!auth.isAdmin()) {
            this.showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }

        this.updateArchiveStats();
        this.displayArchivedTickets();
    }

    updateArchiveStats() {
        const totalElement = document.getElementById('totalArchived');
        const thisMonthElement = document.getElementById('thisMonthArchived');
        const storageElement = document.getElementById('storageUsed');

        if (totalElement) totalElement.textContent = this.archivedTickets.length;

        // Calculate this month's archived tickets
        const thisMonth = new Date().toISOString().slice(0, 7);
        const thisMonthCount = this.archivedTickets.filter(t => 
            t.archivedAt && t.archivedAt.slice(0, 7) === thisMonth
        ).length;
        
        if (thisMonthElement) thisMonthElement.textContent = thisMonthCount;

        // Calculate storage usage (approximate)
        const storageSize = (JSON.stringify(this.archivedTickets).length / 1024 / 1024).toFixed(2);
        if (storageElement) storageElement.textContent = `${storageSize} MB`;
    }

    displayArchivedTickets(filteredTickets = null) {
        const archiveList = document.getElementById('archiveList');
        if (!archiveList) return;

        const ticketsToShow = filteredTickets || this.archivedTickets;
        archiveList.innerHTML = '';

        if (ticketsToShow.length === 0) {
            archiveList.innerHTML = '<p class="no-tickets">No archived tickets found.</p>';
            return;
        }

        ticketsToShow.forEach(ticket => {
            const archivedCard = this.createArchivedTicketCard(ticket);
            archiveList.appendChild(archivedCard);
        });
    }

    createArchivedTicketCard(ticket) {
        const card = document.createElement('div');
        card.className = 'archived-ticket';
        
        const archivedDate = new Date(ticket.archivedAt || ticket.closedAt).toLocaleString();
        
        card.innerHTML = `
            <div class="archived-ticket-header">
                <span class="archived-ticket-id">${ticket.id}</span>
                <span class="archived-date">Archived: ${archivedDate}</span>
            </div>
            <h4>${ticket.type}</h4>
            <p><strong>Department:</strong> ${ticket.department}</p>
            <p><strong>Requestor:</strong> ${ticket.requestor}</p>
            <p><strong>Final Status:</strong> ${ticket.status}</p>
            <div class="ticket-actions">
                <button onclick="ticketSystem.viewArchivedTicketDetails('${ticket.id}')" class="btn btn-primary">View Details</button>
                <button onclick="ticketSystem.restoreTicket('${ticket.id}')" class="btn btn-warning">Restore</button>
                <button onclick="ticketSystem.permanentDeleteTicket('${ticket.id}')" class="btn btn-danger">Delete Permanently</button>
            </div>
        `;
        
        return card;
    }

    restoreTicket(ticketId) {
        if (!auth.isAdmin()) return;

        if (confirm(`Restore ticket ${ticketId} to active tickets?`)) {
            const ticketIndex = this.archivedTickets.findIndex(t => t.id === ticketId);
            if (ticketIndex !== -1) {
                const ticket = this.archivedTickets[ticketIndex];
                delete ticket.archivedAt;
                ticket.status = 'Closed'; // Restore as closed
                ticket.updatedAt = new Date().toISOString();
                
                this.tickets.push(ticket);
                this.archivedTickets.splice(ticketIndex, 1);
                
                this.saveTickets();
                this.saveArchivedTickets();
                this.loadArchive();
                
                this.showNotification(`Ticket ${ticketId} restored successfully`, 'success');
            }
        }
    }

    permanentDeleteTicket(ticketId) {
        if (!auth.isAdmin()) return;

        if (confirm(`PERMANENTLY DELETE ticket ${ticketId}? This action cannot be undone.`)) {
            const ticketIndex = this.archivedTickets.findIndex(t => t.id === ticketId);
            if (ticketIndex !== -1) {
                this.archivedTickets.splice(ticketIndex, 1);
                this.saveArchivedTickets();
                this.loadArchive();
                
                this.showNotification(`Ticket ${ticketId} permanently deleted`, 'success');
            }
        }
    }

    // Backup and Restore Methods
    createTimestampedBackup() {
        if (!auth.isAdmin()) return;

        const timestamp = new Date().toISOString();
        const backupData = {
            timestamp: timestamp,
            tickets: this.tickets,
            archivedTickets: this.archivedTickets,
            users: auth.getUsers(),
            version: '1.1'
        };

        const backupString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([backupString], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ticketing_backup_${timestamp.split('T')[0]}_${timestamp.split('T')[1].split('.')[0].replace(/:/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Add to backup history
        this.backupHistory.push({
            timestamp: timestamp,
            filename: link.download,
            size: (backupString.length / 1024).toFixed(2) + ' KB'
        });
        this.saveBackupHistory();
        this.updateBackupHistoryDisplay();

        this.showNotification('Backup created successfully', 'success');
    }

    showBackupModal() {
        if (!auth.isAdmin()) return;
        
        this.updateBackupHistoryDisplay();
        document.getElementById('backupModal').style.display = 'block';
    }

    updateBackupHistoryDisplay() {
        const historyList = document.getElementById('backupHistoryList');
        if (!historyList) return;

        if (this.backupHistory.length === 0) {
            historyList.innerHTML = '<p>No backup history available.</p>';
            return;
        }

        historyList.innerHTML = this.backupHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10) // Show last 10 backups
            .map(backup => `
                <div class="backup-item">
                    <span>${new Date(backup.timestamp).toLocaleString()}</span>
                    <span>${backup.size}</span>
                </div>
            `).join('');
    }

    restoreBackupFile() {
        if (!auth.isAdmin()) return;

        const fileInput = document.getElementById('backupFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Please select a backup file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                
                if (confirm('This will replace all current data. Are you sure?')) {
                    if (backupData.tickets) {
                        this.tickets = backupData.tickets;
                        this.saveTickets();
                    }
                    
                    if (backupData.archivedTickets) {
                        this.archivedTickets = backupData.archivedTickets;
                        this.saveArchivedTickets();
                    }
                    
                    if (backupData.users) {
                        localStorage.setItem('users', JSON.stringify(backupData.users));
                    }

                    this.refreshCurrentView();
                    this.closeModal('backupModal');
                    this.showNotification('Backup restored successfully', 'success');
                    
                    // Force page reload to ensure all data is updated
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            } catch (error) {
                this.showNotification('Invalid backup file', 'error');
            }
        };
        
        reader.readAsText(file);
    }

    // Filter methods for archive
    filterArchive() {
        const startDate = document.getElementById('archiveStartDate').value;
        const endDate = document.getElementById('archiveEndDate').value;
        const department = document.getElementById('archiveDepartmentFilter').value;
        
        let filteredTickets = this.archivedTickets;
        
        if (startDate) {
            filteredTickets = filteredTickets.filter(t => 
                new Date(t.archivedAt || t.closedAt) >= new Date(startDate)
            );
        }
        
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filteredTickets = filteredTickets.filter(t => 
                new Date(t.archivedAt || t.closedAt) <= end
            );
        }
        
        if (department) {
            filteredTickets = filteredTickets.filter(t => t.department === department);
        }
        
        this.displayArchivedTickets(filteredTickets);
    }

    clearArchiveFilter() {
        document.getElementById('archiveStartDate').value = '';
        document.getElementById('archiveEndDate').value = '';
        document.getElementById('archiveDepartmentFilter').value = '';
        this.displayArchivedTickets();
    }

    exportArchive() {
        if (!auth.isAdmin()) return;

        if (this.archivedTickets.length === 0) {
            this.showNotification('No archived tickets to export', 'error');
            return;
        }

        const csvContent = this.generateArchiveCSV();
        this.downloadCSV(csvContent, `archived_tickets_${new Date().toISOString().split('T')[0]}.csv`);
        this.showNotification('Archive exported successfully', 'success');
    }

    generateArchiveCSV() {
        const headers = [
            'Ticket ID', 'Type', 'Department', 'Requestor', 'Assigned To', 
            'Created Date', 'Closed Date', 'Archived Date', 'Final Status', 'Description'
        ];
        
        let csvContent = headers.join(',') + '\n';
        
        this.archivedTickets.forEach(ticket => {
            const row = [
                ticket.id,
                ticket.type,
                ticket.department,
                ticket.requestor,
                ticket.assignedTo || 'Unassigned',
                new Date(ticket.createdAt).toLocaleString(),
                ticket.closedAt ? new Date(ticket.closedAt).toLocaleString() : 'N/A',
                ticket.archivedAt ? new Date(ticket.archivedAt).toLocaleString() : 'N/A',
                ticket.status,
                `"${ticket.description.replace(/"/g, '""')}"`
            ];
            
            csvContent += row.join(',') + '\n';
        });
        
        return csvContent;
    }

    downloadCSV(csvContent, fileName) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Existing methods (keeping the same functionality)
    resolveTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (confirm(`Mark ticket ${ticketId} as resolved?`)) {
            ticket.status = 'Resolved';
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            this.refreshCurrentView();
            this.showNotification(`Ticket ${ticketId} marked as resolved`, 'success');
        }
    }

    viewTicketDetails(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        this.showTicketDetailsModal(ticket);
    }

    viewArchivedTicketDetails(ticketId) {
        const ticket = this.archivedTickets.find(t => t.id === ticketId);
        if (!ticket) return;

        this.showTicketDetailsModal(ticket, true);
    }

    showTicketDetailsModal(ticket, isArchived = false) {
        const modal = document.getElementById('ticketModal');
        const details = document.getElementById('ticketDetails');
        
        details.innerHTML = `
            <h3>Ticket Details - ${ticket.id} ${isArchived ? '(Archived)' : ''}</h3>
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
                ${ticket.closedAt ? `<p><strong>Closed:</strong> ${new Date(ticket.closedAt).toLocaleString()}</p>` : ''}
                ${ticket.archivedAt ? `<p><strong>Archived:</strong> ${new Date(ticket.archivedAt).toLocaleString()}</p>` : ''}
            </div>
            <div class="description-section" style="margin: 20px 0;">
                <h4>Description:</h4>
                <p style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px;">${ticket.description}</p>
            </div>
            ${ticket.assignmentNotes ? `
                <div class="notes-section" style="margin: 20px 0;">
                    <h4>Assignment Notes:</h4>
                    <p style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin-top: 10px;">${ticket.assignmentNotes}</p>
                </div>
            ` : ''}
            ${ticket.attachments && ticket.attachments.length > 0 ? `
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
            this.showNotification(`Ticket ${ticketId} severity changed to ${newSeverity}`, 'success');
        }
    }

    reopenTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (confirm(`Are you sure you want to reopen ticket ${ticketId}?`)) {
            ticket.status = 'Open';
            ticket.assignedTo = null;
            delete ticket.closedAt;
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            this.refreshCurrentView();
            this.showNotification(`Ticket ${ticketId} has been reopened`, 'success');
        }
    }

    loadUsersList() {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        const users = auth.getUsers();
        const counts = auth.getUserCounts();
        
        const adminCount = document.getElementById('adminCount');
        const teamCount = document.getElementById('teamCount');
        const regularUserCount = document.getElementById('regularUserCount');
        
        if (adminCount) adminCount.textContent = counts.admin;
        if (teamCount) teamCount.textContent = counts.team;
        if (regularUserCount) regularUserCount.textContent = counts.user;
        
        usersList.innerHTML = users.map(user => `
            <div class="user-card">
                <h4>${user.username} <span class="role-badge ${user.role}">${user.role.toUpperCase()}</span></h4>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Department:</strong> ${user.department}</p>
                <div class="user-actions" style="margin-top: 10px;">
                    <button onclick="ticketSystem.deleteUser('${user.username}')" class="btn btn-danger btn-small" ${user.username === 'admin' ? 'disabled' : ''}>Delete</button>
                </div>
            </div>
        `).join('');
    }

    deleteUser(username) {
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

    toggleMyTickets() {
        this.showMyTicketsOnly = !this.showMyTicketsOnly;
        const btn = document.getElementById('filterMyTicketsBtn');
        if (btn) {
            btn.textContent = this.showMyTicketsOnly ? 'Show All Tickets' : 'Show My Tickets Only';
        }
        this.refreshKanban();
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    showAddUserModal() {
        const modal = document.getElementById('addUserModal');
        if (modal) modal.style.display = 'block';
    }

    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.style.display = 'block';
    }

    updateCompanyBranding() {
        const companyName = localStorage.getItem('companyName') || 'Your Company Name';
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
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
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
        document.body.classList.remove('admin-view', 'user-view', 'team-view');
        this.showLoginPage();
        this.showNotification('Logged out successfully', 'info');
    }
}

// Global utility functions (keeping all existing ones)
function showPage(pageId) {
    if (window.ticketSystem) {
        window.ticketSystem.showPage(pageId);
    }
}

function closeModal(modalId) {
    if (window.ticketSystem) {
        window.ticketSystem.closeModal(modalId);
    }
}

function showAddUserModal() {
    if (window.ticketSystem) {
        window.ticketSystem.showAddUserModal();
    }
}

function showSettingsModal() {
    if (window.ticketSystem) {
        window.ticketSystem.showSettingsModal();
    }
}

function showBackupModal() {
    if (window.ticketSystem) {
        window.ticketSystem.showBackupModal();
    }
}

function showPasswordReset() {
    const modal = document.getElementById('passwordResetModal');
    if (modal) modal.style.display = 'block';
}

function logout() {
    if (window.ticketSystem) {
        window.ticketSystem.logout();
    }
}

function editCompanyName() {
    const currentName = document.getElementById('loginCompanyName').textContent;
    const newName = prompt('Enter company name:', currentName);
    if (newName && newName.trim()) {
        localStorage.setItem('companyName', newName.trim());
        if (window.ticketSystem) {
            window.ticketSystem.updateCompanyBranding();
        }
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
            if (window.ticketSystem) {
                window.ticketSystem.updateCompanyBranding();
                window.ticketSystem.showNotification('Logo updated successfully', 'success');
            }
        };
        reader.readAsDataURL(file);
    }
}

function updateCompanyName() {
    const newName = document.getElementById('companyNameEdit').value;
    if (newName && newName.trim()) {
        localStorage.setItem('companyName', newName.trim());
        if (window.ticketSystem) {
            window.ticketSystem.updateCompanyBranding();
            window.ticketSystem.showNotification('Company name updated successfully', 'success');
        }
    }
}

function filterMyTickets() {
    if (window.ticketSystem) {
        window.ticketSystem.refreshTicketsList();
    }
}

function refreshTicketsList() {
    if (window.ticketSystem) {
        window.ticketSystem.refreshTicketsList();
        window.ticketSystem.showNotification('Tickets refreshed', 'info');
    }
}

function refreshDashboard() {
    if (window.ticketSystem && window.ticketSystem.dashboard) {
        window.ticketSystem.loadDashboard();
        window.ticketSystem.showNotification('Dashboard refreshed', 'info');
    }
}

function filterDashboard() {
    if (window.ticketSystem && window.ticketSystem.dashboard) {
        window.ticketSystem.dashboard.filterDashboard();
    }
}

function refreshKanban() {
    if (window.ticketSystem) {
        window.ticketSystem.refreshKanban();
        window.ticketSystem.showNotification('Board refreshed', 'info');
    }
}

function toggleMyTickets() {
    if (window.ticketSystem) {
        window.ticketSystem.toggleMyTickets();
    }
}

function generateReport() {
    if (window.ticketSystem) {
        window.ticketSystem.generateReport();
    }
}

function exportReport() {
    if (window.ticketSystem) {
        window.ticketSystem.exportReport();
    }
}

// Archive and Backup functions
function filterArchive() {
    if (window.ticketSystem) {
        window.ticketSystem.filterArchive();
    }
}

function clearArchiveFilter() {
    if (window.ticketSystem) {
        window.ticketSystem.clearArchiveFilter();
    }
}

function exportArchive() {
    if (window.ticketSystem) {
        window.ticketSystem.exportArchive();
    }
}

function createTimestampedBackup() {
    if (window.ticketSystem) {
        window.ticketSystem.createTimestampedBackup();
    }
}

function restoreFromBackup() {
    if (window.ticketSystem) {
        window.ticketSystem.showNotification('Please use the file input in the backup modal', 'info');
    }
}

function restoreBackupFile() {
    if (window.ticketSystem) {
        window.ticketSystem.restoreBackupFile();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    window.ticketSystem = new TicketingSystem();
});

// Add notification styles
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
`;
document.head.appendChild(notificationStyles);
