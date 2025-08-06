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
    document.getElementById('adminOpenCount').textContent = counts['Open'];
    document.getElementById('adminProgressCount').textContent = counts['In Progress'];
    document.getElementById('adminResolvedCount').textContent = counts['Resolved'];
    document.getElementById('adminClosedCount').textContent = counts['Closed'];

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
    document.getElementById('teamOpenCount').textContent = counts['Open'];
    document.getElementById('teamProgressCount').textContent = counts['In Progress'];
    document.getElementById('teamResolvedCount').textContent = counts['Resolved'];
    document.getElementById('teamClosedCount').textContent = counts['Closed'];

    // Initialize drag and drop for team members (only In Progress to Resolved)
    const inProgressColumn = columns['In Progress'];
    const resolvedColumn = columns['Resolved'];
    
    if (inProgressColumn) {
        new Sortable(inProgressColumn, {
            group: {
                name: 'team-kanban',
                put: false // Can't drag items into In Progress
            },
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            filter: (evt, item) => {
                // Only allow dragging tickets assigned to current user
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
                pull: false // Can't drag items out of Resolved
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
                ${ticket.emailS
