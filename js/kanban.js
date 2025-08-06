// Kanban Board functionality
TicketingSystem.prototype.refreshKanban = function() {
    const columns = {
        'Open': document.getElementById('openColumn'),
        'In Progress': document.getElementById('inProgressColumn'),
        'Resolved': document.getElementById('resolvedColumn'),
        'Closed': document.getElementById('closedColumn')
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
            const ticketCard = this.createKanbanCard(ticket);
            column.appendChild(ticketCard);
        }
    });

    // Update count badges
    document.getElementById('openCount').textContent = counts['Open'];
    document.getElementById('progressCount').textContent = counts['In Progress'];
    document.getElementById('resolvedCount').textContent = counts['Resolved'];
    document.getElementById('closedCount').textContent = counts['Closed'];

    // Initialize drag and drop
    Object.keys(columns).forEach(status => {
        if (columns[status]) {
            new Sortable(columns[status], {
                group: 'kanban',
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: (evt) => {
                    this.handleKanbanMove(evt);
                }
            });
        }
    });
};

TicketingSystem.prototype.createKanbanCard = function(ticket) {
    const card = document.createElement('div');
    card.className = 'kanban-ticket';
    card.dataset.ticketId = ticket.id;
    
    const timeCreated = new Date(ticket.createdAt);
    const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
    const isOverdue = hoursElapsed > this.timeToResolve[ticket.severity] && ticket.status !== 'Closed';
    
    card.innerHTML = `
        <div class="kanban-ticket-header">
            <strong>${ticket.id}</strong>
            <span class="severity-badge severity-${ticket.severity.toLowerCase()}">${ticket.severity}</span>
        </div>
        <div class="kanban-ticket-title">${ticket.type}</div>
        <div class="kanban-ticket-description">${ticket.description.substring(0, 60)}${ticket.description.length > 60 ? '...' : ''}</div>
        <div class="kanban-ticket-meta">
            <div>👤 ${ticket.requestor}</div>
            <div>🏢 ${ticket.department}</div>
            ${ticket.assignedTo ? `<div>🔧 ${ticket.assignedTo}</div>` : '<div>🔧 Unassigned</div>'}
            ${isOverdue ? '<div style="color: red; font-weight: bold;">⚠️ OVERDUE</div>' : ''}
        </div>
        <div class="kanban-ticket-actions">
            <button onclick="ticketSystem.viewTicketDetails('${ticket.id}')" class="btn-small">View</button>
            ${auth.isAdmin() ? `<button onclick="ticketSystem.showAssignModal('${ticket.id}')" class="btn-small">Assign</button>` : ''}
        </div>
    `;
    
    return card;
};

TicketingSystem.prototype.handleKanbanMove = function(evt) {
    const ticketId = evt.item.dataset.ticketId;
    const newStatus = evt.to.parentElement.dataset.status;
    
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket && ticket.status !== newStatus) {
        // Validate status transition
        const validTransitions = {
            'Open': ['In Progress', 'Resolved', 'Closed'],
            'In Progress': ['Open', 'Resolved', 'Closed'],
            'Resolved': ['In Progress', 'Closed'],
            'Closed': ['Open'] // Allow reopening
        };
        
        if (validTransitions[ticket.status] && validTransitions[ticket.status].includes(newStatus)) {
            ticket.status = newStatus;
            ticket.updatedAt = new Date().toISOString();
            this.saveTickets();
            
            // Show success message
            this.showNotification(`Ticket ${ticketId} moved to ${newStatus}`, 'success');
            
            // Refresh kanban to update counts
            this.refreshKanban();
        } else {
            // Invalid transition, revert
            this.showNotification(`Cannot move ticket from ${ticket.status} to ${newStatus}`, 'error');
            this.refreshKanban();
        }
    }
};
