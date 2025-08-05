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
        this.init();
    }

    init() {
        this.loadTickets();
        this.setupEventListeners();
        this.checkAuth();
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
                }
                errorDiv.textContent = '';
            } else if (auth.getCurrentUser() && auth.getCurrentUser().isFirstLogin) {
                // Password change modal is shown by auth system
                errorDiv.textContent = '';
            } else {
                errorDiv.textContent = 'Invalid username or password';
            }
        } catch (error) {
            errorDiv.textContent = 'Login failed. Please try again.';
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
            // In a real implementation, files would be uploaded to server
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
        this.refreshTicketsList();
    }

    sendEmailNotification(ticket) {
        // Simulate email sending
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
            alert('User added successfully');
            document.getElementById('addUserForm').reset();
            this.closeModal('addUserModal');
            this.loadUsersList();
        } catch (error) {
            alert(error.message);
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
            this.refreshTicketsList();
            this.refreshKanban();
            
            alert(`Ticket ${ticketId} assigned to ${assignTo}`);
        }
    }

    showLoginPage() {
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('mainApp').classList.remove('active');
    }

    showMainApp() {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');
        this.refreshTicketsList();
        this.updateCompanyBranding();
    }

    showPage(pageId) {
        // Hide all content pages
        document.querySelectorAll('.content-page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        document.getElementById(pageId).classList.add('active');

        // Load page-specific data
        switch(pageId) {
            case 'myTickets':
                this.refreshTicketsList();
                break;
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'kanban':
                this.refreshKanban();
                break;
            case 'userManagement':
                this.loadUsersList();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    }

    refreshTicketsList() {
        const user = auth.getCurrentUser();
        const isAdmin = auth.isAdmin();
        
        let ticketsToShow = this.tickets;
        if (!isAdmin) {
            ticketsToShow = this.tickets.filter(t => t.requestor === user.username);
        }

        const ticketsList = document.getElementById('ticketsList');
        ticketsList.innerHTML = '';

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
            <p><strong>Severity:</strong> ${ticket.severity}</p>
            <p><strong>Location:</strong> ${ticket.location}</p>
            <p><strong>Created:</strong> ${timeCreated.toLocaleString()}</p>
            ${ticket.assignedTo ? `<p><strong>Assigned to:</strong> ${ticket.assignedTo}</p>` : ''}
            ${isOverdue ? '<p class="overdue-warning" style="color: red; font-weight: bold;">⚠️ OVERDUE</p>' : ''}
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
            <div class="ticket-detail-grid">
                <p><strong>Type:</strong> ${ticket.type}</p>
                <p><strong>Severity:</strong> ${ticket.severity}</p>
                <p><strong>Status:</strong> ${ticket.status}</p>
                <p><strong>Requestor:</strong> ${ticket.requestor}</p>
                <p><strong>Employee ID:</strong> ${ticket.employeeId}</p>
                <p><strong>Location:</strong> ${ticket.location}</p>
                <p><strong>Supervisor:</strong> ${ticket.supervisor}</p>
                <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
                <p><strong>Last Updated:</strong> ${new Date(ticket.updatedAt).toLocaleString()}</p>
                ${ticket.assignedTo ? `<p><strong>Assigned to:</strong> ${ticket.assignedTo}</p>` : ''}
            </div>
            <div class="description-section">
                <h4>Description:</h4>
                <p>${ticket.description}</p>
            </div>
            ${ticket.attachments.length > 0 ? `
                <div class="attachments-section">
                    <h4>Attachments:</h4>
                    ${ticket.attachments.map(att => `<p>📎 ${att.name} (${(att.size/1024).toFixed(1)} KB)</p>`).join('')}
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
        const currentIndex = severities.indexOf(ticket.severity);
        const newSeverity = prompt(`Current severity: ${ticket.severity}\nEnter new severity (High/Medium/Low):`, ticket.severity);
        
        if (newSeverity && severities.includes(newSeverity)) {
            ticket.severity = newSeverity;
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            this.refreshTicketsList();
            alert(`Ticket ${ticketId} severity changed to ${newSeverity}`);
        }
    }

    closeTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (confirm(`Are you sure you want to close ticket ${ticketId}?`)) {
            ticket.status = 'Closed';
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            this.refreshTicketsList();
            this.refreshKanban();
            alert(`Ticket ${ticketId} has been closed`);
        }
    }

    reopenTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (confirm(`Are you sure you want to reopen ticket ${ticketId}?`)) {
            ticket.status = 'Open';
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            this.refreshTicketsList();
            this.refreshKanban();
            alert(`Ticket ${ticketId} has been reopened`);
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
            // In a real app, this would send notifications
        }
    }

    loadUsersList() {
        const usersList = document.getElementById('usersList');
        const users = auth.getUsers();
        
        usersList.innerHTML = users.map(user => `
            <div class="user-card">
                <h4>${user.username}</h4>
                <p>Email: ${user.email}</p>
                <p>Department: ${user.department}</p>
                <p>Role: ${user.role}</p>
            </div>
        `).join('');
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showAddUserModal() {
        document.getElementById('addUserModal').style.display = 'block';
    }

    updateCompanyBranding() {
        const companyName = localStorage.getItem('companyName') || 'Graviti Technologies';
        const logoUrl = localStorage.getItem('companyLogo') || 'assets/logo.png';
        
        document.getElementById('appCompanyName').textContent = companyName;
        document.getElementById('appLogo').src = logoUrl;
        document.getElementById('companyNameEdit').value = companyName;
    }

    logout() {
        auth.logout();
        document.body.classList.remove('admin-view');
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

function logout() {
    ticketSystem.logout();
}

function editCompanyName() {
    const currentName = document.getElementById('companyName').textContent;
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
        const reader = new FileReader();
        reader.onload = function(e) {
            const logoUrl = e.target.result;
            localStorage.setItem('companyLogo', logoUrl);
            ticketSystem.updateCompanyBranding();
            alert('Logo updated successfully');
        };
        reader.readAsDataURL(file);
    }
}

function updateCompanyName() {
    const newName = document.getElementById('companyNameEdit').value;
    if (newName && newName.trim()) {
        localStorage.setItem('companyName', newName.trim());
        ticketSystem.updateCompanyBranding();
        alert('Company name updated successfully');
    }
}

// Initialize the application
const ticketSystem = new TicketingSystem();
