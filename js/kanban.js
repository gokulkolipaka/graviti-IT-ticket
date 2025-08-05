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
        column.innerHTML = '';
    });

    // Populate tickets
    this.tickets.forEach(ticket => {
        const column = columns[ticket.status];
        if (column) {
            const ticketCard = this.createKanbanCard(ticket);
            column.appendChild(ticketCard);
        }
    });

    // Initialize drag and drop
    Object.keys(columns).forEach(status => {
        new Sortable(columns[status], {
            group: 'kanban',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                this.handleKanbanMove(evt);
            }
        });
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
        <div class="kanban-ticket-description">${ticket.description.substring(0, 80)}${ticket.description.length > 80 ? '...' : ''}</div>
        <div class="kanban-ticket-meta">
            <div>👤 ${ticket.requestor}</div>
            ${ticket.assignedTo ? `<div>🔧 ${ticket.assignedTo}</div>` : ''}
            ${isOverdue ? '<div style="color: red;">⚠️ OVERDUE</div>' : ''}
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
        ticket.status = newStatus;
        ticket.updatedAt = new Date().toISOString();
        this.saveTickets();
        
        // Show success message
        this.showNotification(`Ticket ${ticketId} moved to ${newStatus}`);
    }
};

TicketingSystem.prototype.showNotification = function(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
};

// Add CSS for notifications
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
    
    .btn-small {
        padding: 4px 8px;
        font-size: 12px;
        margin: 2px;
        border: none;
        background: #667eea;
        color: white;
        border-radius: 3px;
        cursor: pointer;
    }
    
    .btn-small:hover {
        background: #5a6fd8;
    }
    
    .severity-badge {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        color: white;
    }
    
    .severity-badge.severity-high { background: #e74c3c; }
    .severity-badge.severity-medium { background: #f39c12; }
    .severity-badge.severity-low { background: #27ae60; }
    
    .kanban-ticket-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .kanban-ticket-title {
        font-weight: bold;
        margin-bottom: 8px;
        color: #333;
    }
    
    .kanban-ticket-description {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
        line-height: 1.4;
    }
    
    .kanban-ticket-meta {
        font-size: 11px;
        color: #888;
        margin-bottom: 8px;
    }
    
    .kanban-ticket-actions {
        display: flex;
        gap: 5px;
    }
    
    .sortable-ghost {
        opacity: 0.5;
    }
`;
document.head.appendChild(notificationStyles);
