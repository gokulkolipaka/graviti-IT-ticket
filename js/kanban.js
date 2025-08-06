// Kanban Board functionality with three-tier access control
TicketingSystem.prototype.refreshKanban = function() {
    const user = auth.getCurrentUser();
    const isAdmin = auth.isAdmin();
    const isITTeam = auth.isITTeam();
    
    // Determine which kanban to update based on current page
    const activePage = document.querySelector('.content-page.active');
    const isITKanban = activePage && activePage.id === 'kanban';
    
    const prefix = isITKanban ? 'it' : '';
    
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

    // Update counts
    const counts = {
        'Open': 0,
        'In Progress': 0,
        'Resolved': 0,
        'Closed': 0
    };

    // Filter tickets based on user role and current view
    let ticketsToShow = this.tickets;
    
    if (isITKanban && isITTeam && !isAdmin) {
        // IT team members see only their assigned tickets or unassigned open tickets
        ticketsToShow = this.tickets.filter(ticket => 
            ticket.assignedTo === user.username || 
            (ticket.status === 'Open' && !ticket.assignedTo)
        );
    }

    // Populate tickets
    ticketsToShow.forEach(ticket => {
        counts[ticket.status] = (counts[ticket.status] || 0) + 1;
        const column = columns[ticket.status];
        if (column) {
            const ticketCard = this.createKanbanCard(ticket, isITKanban);
            column.appendChild(ticketCard);
        }
    });

    // Update count badges
    const countElements = {
        'Open': document.getElementById(`${prefix}openCount`),
        'In Progress': document.getElementById(`${prefix}progressCount`),
        'Resolved': document.getElementById(`${prefix}resolvedCount`),
        'Closed': document.getElementById(`${prefix}closedCount`)
    };

    Object.keys(countElements).forEach(status => {
        const element = countElements[status];
        if (element) {
            element.textContent = counts[status] || 0;
        }
    });

    // Initialize drag and drop based on user permissions
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

            // Restrict drag and drop for non-admin users
            if (!isAdmin) {
                if (isITTeam) {
                    // IT team can only drag their assigned tickets to resolved
                    sortableOptions.onMove = (evt) => {
                        const ticketId = evt.dragged.dataset.ticketId;
                        const ticket = this.tickets.find(t => t.id === ticketId);
                        const targetStatus = evt.to.parentElement.dataset.status;
                        
                        // IT team can move their tickets to resolved, or take unassigned open tickets
                        if (ticket.assignedTo === user.username || 
                            (ticket.status === 'Open' && !ticket.assignedTo && targetStatus === 'In Progress')) {
                            return true;
                        }
                        
                        // Only allow moving to resolved from in progress
                        if (ticket.assignedTo === user.username && 
                            ticket.status === 'In Progress' && 
                            targetStatus === 'Resolved') {
                            return true;
                        }
                        
                        return false;
                    };
                } else {
                    // Regular users cannot drag tickets
                    sortableOptions.disabled = true;
                }
            }

            new Sortable(columns[status], sortableOptions);
        }
    });
};

TicketingSystem.prototype.createKanbanCard = function(ticket, isITView = false) {
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
            ${(auth.isITTeam() && ticket.assignedTo === user.username && ticket.status === 'In Progress') ? `
                <button onclick="ticketSystem.resolveTicket('${ticket.id}')" class="btn-small btn-success">Resolve</button>
            ` : ''}
        </div>
    `;
    
    return card;
};

TicketingSystem.prototype.handleKanbanMove = function(evt) {
    const ticketId = evt.item.dataset.ticketId;
    const newStatus = evt.to.parentElement.dataset.status;
    const user = auth.getCurrentUser();
    
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket && ticket.status !== newStatus) {
        // Validate permissions and transitions
        const canMove = this.validateKanbanMove(ticket, newStatus, user);
        
        if (canMove) {
            const oldStatus = ticket.status;
            ticket.status = newStatus;
            ticket.updatedAt = new Date().toISOString();
            
            // Auto-assign ticket if IT team member moves open ticket to in progress
            if (oldStatus === 'Open' && newStatus === 'In Progress' && !ticket.assignedTo && auth.isITTeam()) {
                ticket.assignedTo = user.username;
            }
            
            this.saveTickets();
            this.showNotification(`Ticket ${ticketId} moved to ${newStatus}`, 'success');
            this.refreshKanban();
        } else {
            this.showNotification(`You don't have permission to move this ticket`, 'error');
            this.refreshKanban(); // Revert the move
        }
    }
};

TicketingSystem.prototype.validateKanbanMove = function(ticket, newStatus, user) {
    const isAdmin = auth.isAdmin();
    const isITTeam = auth.isITTeam();
    
    // Admin can move any ticket anywhere
    if (isAdmin) return true;
    
    // IT team member validations
    if (isITTeam) {
        // Can take unassigned open tickets
        if (ticket.status === 'Open' && !ticket.assignedTo && newStatus === 'In Progress') {
            return true;
        }
        
        // Can move their assigned tickets from in progress to resolved
        if (ticket.assignedTo === user.username && 
            ticket.status === 'In Progress' && 
            newStatus === 'Resolved') {
            return true;
        }
        
        // Can move their assigned tickets between in progress and open
        if (ticket.assignedTo === user.username && 
            ((ticket.status === 'In Progress' && newStatus === 'Open') ||
             (ticket.status === 'Open' && newStatus === 'In Progress'))) {
            return true;
        }
    }
    
    // Regular users cannot move tickets
    return false;
};
