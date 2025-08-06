// Kanban Board functionality with role-based permissions
TicketingSystem.prototype.refreshKanban = function(viewType = 'admin') {
    const user = auth.getCurrentUser();
    
    if (viewType === 'admin') {
        this.refreshAdminKanban();
    } else {
        this.refreshTeamKanban();
    }
};

TicketingSystem.prototype.refreshAdminKanban = function() {
    const columns = {
        'Open': document.getElementById('adminOpenColumn'),
        'In Progress': document.getElementById('adminInProgressColumn'),
        'Resolved': document.getElementById('adminResolvedColumn'),
        'Closed': document.getElementById('adminClosedColumn')
    };

    // Clear all columns
    Object.values(columns).forEach(column => {
        if (column) column.innerHTML = '';
    });

    // Update counts
    const counts = {
        'Open': 0,
        'In Progress': 0,
        'Resolved': 0,
        'Closed': 0
    };

    // Populate tickets
    this.tickets.forEach(ticket => {
        counts[ticket.status] = (counts[ticket.status] || 0) + 1;
        const column = columns[ticket.status];
        if (column) {
            const ticketCard = this.createKanbanCard(ticket, 'admin');
            column.appendChild(ticketCard);
        }
    });

    // Update count badges
    if (document.getElementById('adminOpenCount')) document.getElementById('adminOpenCount').textContent = counts['Open'];
    if (document.getElementById('adminProgressCount')) document.getElementById('adminProgressCount').textContent = counts['In Progress'];
    if (document.getElementById('adminResolvedCount')) document.getElementById('adminResolvedCount').textContent = counts['Resolved'];
    if (document.getElementById('adminClosedCount')) document.getElementById('adminClosedCount').textContent = counts['Closed'];

    // Initialize drag and drop for admin (all columns)
    Object.keys(columns).forEach(status => {
        if (columns[status]) {
            new Sortable(columns[status], {
                group: 'admin-kanban',
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: (evt) => {
                    this.handleKanbanMove(evt, 'admin');
                }
            });
        }
    });
};

TicketingSystem.prototype.refreshTeamKanban = function() {
    const user = auth.getCurrentUser();
    const columns = {
        'Open': document.getElementById('teamOpenColumn'),
        'In Progress': document.getElementById('teamInProgressColumn'),
        'Resolved': document.getElementById('teamResolvedColumn'),
        'Closed': document.getElementById('teamClosedColumn')
    };

    // Clear all columns
    Object.values(columns).forEach(column => {
        if (column) column.innerHTML = '';
    });

    // Update counts
    const counts = {
        'Open': 0,
        'In Progress': 0,
        'Resolved': 0,
        'Closed': 0
    };

    // Filter tickets based on showOnlyMyTickets flag
    let ticketsToShow = this.tickets;
    if (this.showOnlyMyTickets) {
        ticketsToShow = this.tickets.filter(ticket => ticket.assignedTo === user.username);
    }

    // Populate tickets
    ticketsToShow.forEach(ticket => {
        counts[ticket.status] = (counts[ticket.status] || 0) + 1;
        const column = columns[ticket.status];
        if (column) {
            const ticketCard = this.createKanbanCard(ticket, 'team');
            column.appendChild(ticketCard);
        }
    });

    // Update count badges
    if (document.getElementById('teamOpenCount')) document.getElementById('teamOpenCount').textContent = counts['Open'];
    if (document.getElementById('teamProgressCount')) document.getElementById('teamProgressCount').textContent = counts['In Progress'];
    if (document.getElementById('teamResolvedCount')) document.getElementById('teamResolvedCount').textContent = counts['Resolved'];
    if (document.getElementById('teamClosedCount')) document.getElementById('teamClosedCount').textContent = counts['Closed'];

    // Initialize drag and drop for team members (only In Progress to Resolved)
    const inProgressColumn = columns['In Progress'];
    const resolvedColumn = columns['Resolved'];
    
    if (inProgressColumn) {
        new Sortable(inProgressColumn, {
            group: {
                name: 'team-kanban',
                put: false
            },
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            filter: (evt, item) => {
                const ticketId = item.dataset.ticketId;
                const ticket = this.tickets.find(t => t.id === ticketId);
                return !ticket || ticket.assignedTo !== user.username;
            },
            onEnd: (evt) => {
                this.handleKanbanMove(evt, 'team');
            }
        });
    }

    if (resolvedColumn) {
        new Sortable(resolvedColumn, {
            group: {
                name: 'team-kanban',
                pull: false
            },
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag'
        });
    }
};

TicketingSystem.prototype.createKanbanCard = function(ticket, viewType = 'admin') {
    const card = document.createElement('div');
    const user = auth.getCurrentUser();
    const isAssignedToMe = ticket.assignedTo === user.username;
    
    card.className = `kanban-ticket ${isAssignedToMe ? 'assigned-to-me' : ''}`;
    card.dataset.ticketId = ticket.id;
    
    const timeCreated = new Date(ticket.createdAt);
    const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
    const isOverdue = hoursElapsed > this.timeToResolve[ticket.severity] && ticket.status !== 'Closed';
    
    card.innerHTML = `
        <div class="kanban-ticket-header">
            <strong>${ticket.id}</strong>
            <div>
                <span class="severity-badge severity-${ticket.severity.toLowerCase()}">${ticket.severity}</span>
                ${ticket.emailSent ? '<span class="email-sent-indicator">📧</span>' : ''}
            </div>
        </div>
        <div class="kanban-ticket-title">${ticket.type}</div>
        <div class="kanban-ticket-description">${ticket.description.substring(0, 60)}${ticket.description.length > 60 ? '...' : ''}</div>
        <div class="kanban-ticket-meta">
            <div>👤 ${ticket.requestor}</div>
            <div>🏢 ${ticket.department}</div>
            ${ticket.assignedTo ? `<div>🔧 ${ticket.assignedTo}</div>` : '<div>🔧 Unassigned</div>'}
            ${isOverdue ? '<div style="color: red; font-weight: bold;">⚠️ OVERDUE</div>' : ''}
            ${isAssignedToMe ? '<div style="color: green; font-weight: bold;">👍 Mine</div>' : ''}
        </div>
        <div class="kanban-ticket-actions">
            <button onclick="ticketSystem.viewTicketDetails('${ticket.id}')" class="btn-small">View</button>
            ${viewType === 'admin' ? `<button onclick="ticketSystem.showAssignModal('${ticket.id}')" class="btn-small">Assign</button>` : ''}
            ${viewType === 'team' && isAssignedToMe && ticket.status === 'In Progress' ? `<button onclick="ticketSystem.resolveTicket('${ticket.id}')" class="btn-small btn-success">Resolve</button>` : ''}
        </div>
    `;
    
    return card;
};

TicketingSystem.prototype.handleKanbanMove = function(evt, viewType) {
    const ticketId = evt.item.dataset.ticketId;
    const newStatus = evt.to.parentElement.dataset.status;
    const user = auth.getCurrentUser();
    
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;
    
    // Validate permissions
    if (viewType === 'team') {
        // Team members can only move their assigned tickets from In Progress to Resolved
        if (ticket.assignedTo !== user.username) {
            realtimeSystem.showNotification('You can only move tickets assigned to you', 'error');
            this.refreshKanban('team');
            return;
        }
        
        if (ticket.status !== 'In Progress' || newStatus !== 'Resolved') {
            realtimeSystem.showNotification('You can only move tickets from In Progress to Resolved', 'error');
            this.refreshKanban('team');
            return;
        }
    }
    
    // Update ticket status
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();
    
    if (newStatus === 'Resolved') {
        ticket.resolvedAt = new Date().toISOString();
        ticket.resolvedBy = user.username;
    }
    
    this.saveTickets();
    realtimeSystem.showNotification(`Ticket ${ticketId} moved to ${newStatus}`, 'success');
    realtimeSystem.broadcastUpdate('ticket_moved', { ticketId, newStatus, movedBy: user.username });
    
    // Refresh the appropriate kanban view
    this.refreshKanban(viewType);
};
