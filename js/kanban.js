// Kanban Board functionality with real-time sync
TicketingSystem.prototype.refreshKanban = function() {
    const user = auth.getCurrentUser();
    const isAdmin = auth.isAdmin();
    const isTeamMember = auth.isTeamMember();
    
    // Determine which kanban view we're updating
    const activePage = document.querySelector('.content-page.active');
    const isTeamKanban = activePage && activePage.id === 'kanban';
    
    const prefix = isTeamKanban ? 'team' : 'admin';
    
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

    // Populate tickets
    ticketsToShow.forEach(ticket => {
        counts[ticket.status] = (counts[ticket.status] || 0) + 1;
        const column = columns[ticket.status];
        if (column) {
            const ticketCard = this.createKanbanCard(ticket, isTeamKanban);
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
    this.initializeDragAndDrop(columns, isTeamKanban);
};

TicketingSystem.prototype.createKanbanCard = function(ticket, isTeamView = false) {
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
            ${ticket.assignedTo ? `<div>🔧 ${ticket.assignedTo}</div>` : '<div>🔧 Unassigned</div>'}
            ${isOverdue ? '<div style="color: red; font-weight: bold;">⚠️ OVERDUE</div>' : ''}
        </div>
        <div class="kanban-ticket-actions">
            <button onclick="ticketSystem.viewTicketDetails('${ticket.id}')" class="btn-small btn-primary">View</button>
            ${auth.isAdmin() ? `<button onclick="ticketSystem.showAssignModal('${ticket.id}')" class="btn-small btn-warning">Assign</button>` : ''}
            ${(auth.isTeamMember() && ticket.assignedTo === user.username && ticket.status === 'In Progress') ? `
                <button onclick="ticketSystem.resolveTicket('${ticket.id}')" class="btn-small btn-success">Resolve</button>
            ` : ''}
        </div>
    `;
    
    return card;
};

TicketingSystem.prototype.initializeDragAndDrop = function(columns, isTeamView) {
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
                }
            };

            // Configure permissions based on user role and view
            if (isTeamView && isTeamMember && !isAdmin) {
                // Team members have limited drag and drop permissions
                sortableOptions.onMove = (evt) => {
                    const ticketId = evt.dragged.dataset.ticketId;
                    const ticket = this.tickets.find(t => t.id === ticketId);
                    const targetStatus = evt.to.parentElement.dataset.status;
                    
                    // Team members can only move their assigned tickets from In Progress to Resolved
                    if (ticket.assignedTo === user.username && 
                        ticket.status === 'In Progress' && 
                        targetStatus === 'Resolved') {
                        return true;
                    }
                    
                    return false;
                };
            } else if (!isAdmin) {
                // Regular users cannot drag tickets
                sortableOptions.disabled = true;
            }

            new Sortable(columns[status], sortableOptions);
        }
    });
};

TicketingSystem.prototype.handleKanbanMove = function(evt) {
    const ticketId = evt.item.dataset.ticketId;
    const newStatus = evt.to.parentElement.dataset.status;
    const user = auth.getCurrentUser();
    
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket && ticket.status !== newStatus) {
        // Validate the move
        const canMove = this.validateKanbanMove(ticket, newStatus, user);
        
        if (canMove) {
            const oldStatus = ticket.status;
            ticket.status = newStatus;
            ticket.updatedAt = new Date().toISOString();
            
            // Handle special transitions
            if (oldStatus === 'Open' && newStatus === 'In Progress' && !ticket.assignedTo && auth.isAdmin()) {
                // Admin can auto-assign when moving to In Progress
                const assignTo = prompt('Assign to team member (optional):');
                if (assignTo) {
                    const teamMember = auth.getTeamMembers().find(u => u.username === assignTo);
                    if (teamMember) {
                        ticket.assignedTo = assignTo;
                        this.sendAssignmentNotification(ticket, teamMember);
                    }
                }
            }
            
            this.saveTickets();
            this.showNotification(`Ticket ${ticketId} moved to ${newStatus}`, 'success');
            
            // Refresh both kanban views if they exist
            this.refreshKanban();
        } else {
            this.showNotification(`Cannot move ticket from ${ticket.status} to ${newStatus}`, 'error');
            this.refreshKanban(); // Revert the move
        }
    }
};

TicketingSystem.prototype.validateKanbanMove = function(ticket, newStatus, user) {
    const isAdmin = auth.isAdmin();
    const isTeamMember = auth.isTeamMember();
    
    // Admin can move any ticket anywhere (with some logical restrictions)
    if (isAdmin) {
        // Prevent moving closed tickets back to other statuses without confirmation
        if (ticket.status === 'Closed' && newStatus !== 'Closed') {
            return confirm(`Are you sure you want to reopen ticket ${ticket.id}?`);
        }
        return true;
    }
    
    // Team member validations
    if (isTeamMember) {
        // Can only move their assigned tickets from In Progress to Resolved
        if (ticket.assignedTo === user.username && 
            ticket.status === 'In Progress' && 
            newStatus === 'Resolved') {
            return true;
        }
        
        // Can take unassigned open tickets
        if (ticket.status === 'Open' && !ticket.assignedTo && newStatus === 'In Progress') {
            ticket.assignedTo = user.username;
            return true;
        }
    }
    
    // Regular users cannot move tickets via kanban
    return false;
};

// Additional kanban utility functions
TicketingSystem.prototype.getKanbanStats = function() {
    const stats = {
        total: this.tickets.length,
        open: this.tickets.filter(t => t.status === 'Open').length,
        inProgress: this.tickets.filter(t => t.status === 'In Progress').length,
        resolved: this.tickets.filter(t => t.status === 'Resolved').length,
        closed: this.tickets.filter(t => t.status === 'Closed').length
    };
    
    return stats;
};

TicketingSystem.prototype.getOverdueTickets = function() {
    return this.tickets.filter(ticket => {
        if (ticket.status === 'Closed') return false;
        
        const timeCreated = new Date(ticket.createdAt);
        const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
        return hoursElapsed > this.timeToResolve[ticket.severity];
    });
};

TicketingSystem.prototype.getMyAssignedTickets = function() {
    const user = auth.getCurrentUser();
    return this.tickets.filter(ticket => ticket.assignedTo === user.username);
};

TicketingSystem.prototype.getUnassignedTickets = function() {
    return this.tickets.filter(ticket => !ticket.assignedTo && ticket.status !== 'Closed');
};
