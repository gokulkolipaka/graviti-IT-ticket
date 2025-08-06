// Kanban Board functionality with enhanced role-based permissions
TicketingSystem.prototype.refreshKanban = function() {
    const user = auth.getCurrentUser();
    const isAdmin = auth.isAdmin();
    const isTeamMember = auth.isTeamMember();
    
    // Determine which kanban view we're updating
    const activePage = document.querySelector('.content-page.active');
    const isTeamKanban = activePage && activePage.id === 'teamKanban';
    const isAdminKanban = activePage && activePage.id === 'adminKanban';
    
    let prefix = '';
    if (isTeamKanban) prefix = 'team';
    if (isAdminKanban) prefix = 'admin';
    
    const columns = {
        'Open': document.getElementById(`${prefix}OpenColumn`),
        'In Progress': document.getElementById(`${prefix}InProgressColumn`),
        'Resolved': document.getElementById(`${prefix}ResolvedColumn`),
        'Closed': document.getElementById(`${prefix}ClosedColumn`)
    };

    // Clear all columns
    Object.values(columns).forEach(column => {
        if (column) column.innerHTML = '';
    });

    // Initialize counts
    const counts = {
        'Open': 0,
        'In Progress': 0,
        'Resolved': 0,
        'Closed': 0
    };

    // Filter tickets based on user role and current view
    let ticketsToShow = this.tickets;
    
    if (isTeamKanban && isTeamMember && !isAdmin) {
        // Team members see their assigned tickets or available unassigned tickets
        if (this.showMyTicketsOnly) {
            ticketsToShow = this.tickets.filter(ticket => ticket.assignedTo === user.username);
        } else {
            ticketsToShow = this.tickets.filter(ticket => 
                ticket.assignedTo === user.username || 
                (ticket.status === 'Open' && !ticket.assignedTo)
            );
        }
    }
    // Admin sees all tickets in admin kanban

    // Populate tickets
    ticketsToShow.forEach(ticket => {
        counts[ticket.status] = (counts[ticket.status] || 0) + 1;
        const column = columns[ticket.status];
        if (column) {
            const ticketCard = this.createKanbanCard(ticket, isTeamKanban, isAdminKanban);
            column.appendChild(ticketCard);
        }
    });

    // Update count badges
    const countElements = {
        'Open': document.getElementById(`${prefix}OpenCount`),
        'In Progress': document.getElementById(`${prefix}ProgressCount`),
        'Resolved': document.getElementById(`${prefix}ResolvedCount`),
        'Closed': document.getElementById(`${prefix}ClosedCount`)
    };

    Object.keys(countElements).forEach(status => {
        const element = countElements[status];
        if (element) {
            element.textContent = counts[status] || 0;
        }
    });

    // Initialize drag and drop
    this.initializeKanbanDragAndDrop(columns, isTeamKanban, isAdminKanban);
};

TicketingSystem.prototype.createKanbanCard = function(ticket, isTeamView = false, isAdminView = false) {
    const card = document.createElement('div');
    card.className = 'kanban-ticket';
    card.dataset.ticketId = ticket.id;
    
    const user = auth.getCurrentUser();
    const timeCreated = new Date(ticket.createdAt);
    const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
    const isOverdue = hoursElapsed > this.timeToResolve[ticket.severity] && ticket.status !== 'Closed';
    
    // Add visual indicators for ticket ownership
    if (ticket.assignedTo === user.username) {
        card.classList.add('assigned-to-me');
    }
    if (ticket.requestor === user.username) {
        card.classList.add('my-ticket');
    }
    
    // Add priority class based on severity and time
    if (isOverdue) {
        card.classList.add('overdue-ticket');
    }
    
    const createdDate = timeCreated.toLocaleDateString();
    const timeSinceCreated = this.getTimeSinceCreated(timeCreated);
    
    card.innerHTML = `
        <div class="kanban-ticket-header">
            <strong>${ticket.id}</strong>
            <span class="severity-badge severity-${ticket.severity.toLowerCase()}">${ticket.severity}</span>
        </div>
        <div class="kanban-ticket-title">${ticket.type}</div>
        <div class="kanban-ticket-description">${ticket.description.substring(0, 80)}${ticket.description.length > 80 ? '...' : ''}</div>
        <div class="kanban-ticket-meta">
            <div>👤 ${ticket.requestor}</div>
            <div>🏢 ${ticket.department}</div>
            <div>📅 ${createdDate} (${timeSinceCreated})</div>
            ${ticket.assignedTo ? `<div>🔧 ${ticket.assignedTo}</div>` : '<div>🔧 Unassigned</div>'}
            ${isOverdue ? '<div style="color: red; font-weight: bold;">⚠️ OVERDUE</div>' : ''}
        </div>
        <div class="kanban-ticket-actions">
            <button onclick="ticketSystem.viewTicketDetails('${ticket.id}')" class="btn-small btn-primary">View</button>
            ${auth.isAdmin() ? `
                <button onclick="ticketSystem.showAssignModal('${ticket.id}')" class="btn-small btn-warning">Assign</button>
                ${ticket.status !== 'Closed' ? `<button onclick="ticketSystem.changeSeverity('${ticket.id}')" class="btn-small btn-warning">Severity</button>` : ''}
            ` : ''}
            ${(auth.isTeamMember() && ticket.assignedTo === user.username) ? `
                ${ticket.status === 'In Progress' ? `<button onclick="ticketSystem.resolveTicket('${ticket.id}')" class="btn-small btn-success">Resolve</button>` : ''}
                ${ticket.status === 'Open' ? `<button onclick="ticketSystem.takeTicket('${ticket.id}')" class="btn-small btn-primary">Take</button>` : ''}
            ` : ''}
            ${(auth.isTeamMember() && !ticket.assignedTo && ticket.status === 'Open') ? `
                <button onclick="ticketSystem.takeTicket('${ticket.id}')" class="btn-small btn-primary">Take</button>
            ` : ''}
        </div>
    `;
    
    return card;
};

TicketingSystem.prototype.getTimeSinceCreated = function(createdDate) {
    const now = new Date();
    const diffInHours = (now - createdDate) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
        const minutes = Math.floor(diffInHours * 60);
        return `${minutes}m ago`;
    } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        return `${hours}h ago`;
    } else {
        const days = Math.floor(diffInHours / 24);
        return `${days}d ago`;
    }
};

TicketingSystem.prototype.takeTicket = function(ticketId) {
    const user = auth.getCurrentUser();
    if (!auth.isTeamMember() && !auth.isAdmin()) return;
    
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    if (confirm(`Take ownership of ticket ${ticketId}?`)) {
        ticket.assignedTo = user.username;
        ticket.status = 'In Progress';
        ticket.updatedAt = new Date().toISOString();
        
        this.saveTickets();
        this.refreshCurrentView();
        this.showNotification(`You have taken ownership of ticket ${ticketId}`, 'success');
        
        // Log the action
        console.log(`Ticket ${ticketId} taken by ${user.username}`);
    }
};

TicketingSystem.prototype.initializeKanbanDragAndDrop = function(columns, isTeamView, isAdminView) {
    const user = auth.getCurrentUser();
    const isAdmin = auth.isAdmin();
    const isTeamMember = auth.isTeamMember();

    Object.keys(columns).forEach(status => {
        if (columns[status]) {
            const sortableOptions = {
                group: 'kanban',
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: (evt) => {
                    this.handleKanbanMove(evt);
                },
                onMove: (evt) => {
                    return this.validateKanbanDragMove(evt, isTeamView, isAdminView);
                }
            };

            // Configure permissions based on user role and view
            if (isTeamView && isTeamMember && !isAdmin) {
                // Team members have limited permissions
                sortableOptions.filter = (evt, target, source) => {
                    const ticketId = evt.dataset.ticketId;
                    const ticket = this.tickets.find(t => t.id === ticketId);
                    
                    // Can only drag their own tickets or unassigned open tickets
                    return ticket && (ticket.assignedTo === user.username || 
                           (ticket.status === 'Open' && !ticket.assignedTo));
                };
            } else if (!isAdmin && !isTeamMember) {
                // Regular users cannot drag tickets
                sortableOptions.disabled = true;
            }

            new Sortable(columns[status], sortableOptions);
        }
    });
};

TicketingSystem.prototype.validateKanbanDragMove = function(evt, isTeamView, isAdminView) {
    const ticketId = evt.dragged.dataset.ticketId;
    const ticket = this.tickets.find(t => t.id === ticketId);
    const targetStatus = evt.to.parentElement.dataset.status;
    const sourceStatus = evt.from.parentElement.dataset.status;
    const user = auth.getCurrentUser();
    
    if (!ticket) return false;
    
    // Admin can move anything (with some logical restrictions)
    if (auth.isAdmin()) {
        // Prevent illogical moves
        const logicalTransitions = {
            'Open': ['In Progress'],
            'In Progress': ['Open', 'Resolved'],
            'Resolved': ['In Progress', 'Closed'],
            'Closed': ['Resolved'] // Only admin can reopen closed tickets
        };
        
        return logicalTransitions[sourceStatus]?.includes(targetStatus) || false;
    }
    
    // Team member validations
    if (auth.isTeamMember()) {
        // Can take unassigned open tickets
        if (ticket.status === 'Open' && !ticket.assignedTo && targetStatus === 'In Progress') {
            return true;
        }
        
        // Can move their assigned tickets from In Progress to Resolved
        if (ticket.assignedTo === user.username && 
            sourceStatus === 'In Progress' && 
            targetStatus === 'Resolved') {
            return true;
        }
        
        // Can move their assigned tickets back from In Progress to Open
        if (ticket.assignedTo === user.username && 
            sourceStatus === 'In Progress' && 
            targetStatus === 'Open') {
            return true;
        }
    }
    
    return false;
};

TicketingSystem.prototype.handleKanbanMove = function(evt) {
    const ticketId = evt.item.dataset.ticketId;
    const newStatus = evt.to.parentElement.dataset.status;
    const oldStatus = evt.from.parentElement.dataset.status;
    const user = auth.getCurrentUser();
    
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;
    
    // Update ticket status
    const originalStatus = ticket.status;
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();
    
    // Handle special transitions
    if (originalStatus === 'Open' && newStatus === 'In Progress') {
        // Auto-assign to current user if not already assigned
        if (!ticket.assignedTo && (auth.isTeamMember() || auth.isAdmin())) {
            ticket.assignedTo = user.username;
            this.showNotification(`Ticket ${ticketId} assigned to you and moved to In Progress`, 'success');
        }
    } else if (originalStatus === 'In Progress' && newStatus === 'Open') {
        // Optionally unassign when moving back to open
        if (auth.isTeamMember() && ticket.assignedTo === user.username) {
            if (confirm('Unassign ticket when moving back to Open?')) {
                ticket.assignedTo = null;
            }
        }
    } else if (newStatus === 'Resolved') {
        // Add resolution timestamp
        ticket.resolvedAt = new Date().toISOString();
        ticket.resolvedBy = user.username;
    } else if (newStatus === 'Closed' && originalStatus === 'Resolved') {
        // Add closed timestamp
        ticket.closedAt = new Date().toISOString();
        ticket.closedBy = user.username;
        
        // Schedule for archiving (simulate immediate for demo)
        setTimeout(() => {
            if (this.tickets.find(t => t.id === ticketId && t.status === 'Closed')) {
                this.archiveTicket(ticketId);
            }
        }, 2000);
    }
    
    this.saveTickets();
    this.refreshCurrentView();
    
    // Show appropriate notification
    let message = `Ticket ${ticketId} moved from ${originalStatus} to ${newStatus}`;
    if (originalStatus === 'Open' && newStatus === 'In Progress' && ticket.assignedTo === user.username) {
        message = `You have taken ticket ${ticketId}`;
    }
    
    this.showNotification(message, 'success');
    
    // Log the move
    console.log(`Kanban Move: ${ticketId} from ${originalStatus} to ${newStatus} by ${user.username}`);
};

// Enhanced kanban utility functions
TicketingSystem.prototype.getKanbanStats = function() {
    const user = auth.getCurrentUser();
    let tickets = this.tickets;
    
    // Filter based on user role
    if (auth.isTeamMember() && !auth.isAdmin()) {
        tickets = this.tickets.filter(t => 
            t.assignedTo === user.username || 
            (t.status === 'Open' && !t.assignedTo)
        );
    }
    
    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'Open').length,
        inProgress: tickets.filter(t => t.status === 'In Progress').length,
        resolved: tickets.filter(t => t.status === 'Resolved').length,
        closed: tickets.filter(t => t.status === 'Closed').length,
        assigned: tickets.filter(t => t.assignedTo === user.username).length,
        overdue: tickets.filter(t => {
            if (t.status === 'Closed') return false;
            const timeCreated = new Date(t.createdAt);
            const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
            return hoursElapsed > (this.timeToResolve[t.severity] || 24);
        }).length
    };
    
    return stats;
};

TicketingSystem.prototype.getMyKanbanTickets = function() {
    const user = auth.getCurrentUser();
    return this.tickets.filter(ticket => 
        ticket.assignedTo === user.username ||
        (ticket.requestor === user.username)
    );
};

TicketingSystem.prototype.getUnassignedTickets = function() {
    return this.tickets.filter(ticket => 
        !ticket.assignedTo && ticket.status !== 'Closed'
    );
};

TicketingSystem.prototype.getOverdueTickets = function() {
    return this.tickets.filter(ticket => {
        if (ticket.status === 'Closed') return false;
        
        const timeCreated = new Date(ticket.createdAt);
        const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
        return hoursElapsed > (this.timeToResolve[ticket.severity] || 24);
    });
};

TicketingSystem.prototype.bulkAssignTickets = function(ticketIds, assignTo) {
    if (!auth.isAdmin()) {
        this.showNotification('Admin privileges required', 'error');
        return;
    }
    
    let assigned = 0;
    const assignee = auth.getUsers().find(u => u.username === assignTo);
    
    if (!assignee) {
        this.showNotification('Invalid assignee', 'error');
        return;
    }
    
    ticketIds.forEach(ticketId => {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (ticket && ticket.status !== 'Closed') {
            ticket.assignedTo = assignTo;
            if (ticket.status === 'Open') {
                ticket.status = 'In Progress';
            }
            ticket.updatedAt = new Date().toISOString();
            assigned++;
        }
    });
    
    if (assigned > 0) {
        this.saveTickets();
        this.refreshCurrentView();
        this.showNotification(`${assigned} tickets assigned to ${assignTo}`, 'success');
        
        // Send notification email (simulated)
        console.log(`📧 Bulk assignment notification sent to ${assignee.email} for ${assigned} tickets`);
    }
    
    return assigned;
};

// Kanban board refresh with different intervals for different roles
TicketingSystem.prototype.startAutoRefresh = function() {
    const user = auth.getCurrentUser();
    let interval = 60000; // 1 minute default
    
    // Different refresh rates based on role
    if (auth.isAdmin()) {
        interval = 30000; // 30 seconds for admins
    } else if (auth.isTeamMember()) {
        interval = 45000; // 45 seconds for team members
    }
    
    // Clear existing interval
    if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
    }
    
    // Set new interval
    this.refreshInterval = setInterval(() => {
        const activePage = document.querySelector('.content-page.active');
        if (activePage && (activePage.id === 'teamKanban' || activePage.id === 'adminKanban')) {
            this.refreshKanban();
        }
    }, interval);
};

TicketingSystem.prototype.stopAutoRefresh = function() {
    if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
    }
};

// Advanced kanban filtering
TicketingSystem.prototype.applyKanbanFilters = function(filters) {
    this.kanbanFilters = filters;
    this.refreshKanban();
};

TicketingSystem.prototype.clearKanbanFilters = function() {
    this.kanbanFilters = {};
    this.showMyTicketsOnly = false;
    this.refreshKanban();
};

// Performance optimization for large datasets
TicketingSystem.prototype.getFilteredKanbanTickets = function(isTeamView) {
    const user = auth.getCurrentUser();
    let tickets = this.tickets;
    
    // Apply role-based filtering
    if (isTeamView && auth.isTeamMember() && !auth.isAdmin()) {
        if (this.showMyTicketsOnly) {
            tickets = tickets.filter(t => t.assignedTo === user.username);
        } else {
            tickets = tickets.filter(t => 
                t.assignedTo === user.username || 
                (t.status === 'Open' && !t.assignedTo)
            );
        }
    }
    
    // Apply additional filters if any
    if (this.kanbanFilters) {
        if (this.kanbanFilters.department) {
            tickets = tickets.filter(t => t.department === this.kanbanFilters.department);
        }
        if (this.kanbanFilters.severity) {
            tickets = tickets.filter(t => t.severity === this.kanbanFilters.severity);
        }
        if (this.kanbanFilters.overdue) {
            tickets = tickets.filter(t => {
                const timeCreated = new Date(t.createdAt);
                const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
                return hoursElapsed > (this.timeToResolve[t.severity] || 24);
            });
        }
    }
    
    return tickets;
};
