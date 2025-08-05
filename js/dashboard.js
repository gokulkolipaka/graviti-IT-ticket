// Dashboard functionality
class Dashboard {
    constructor(ticketSystem) {
        this.ticketSystem = ticketSystem;
        this.chart = null;
    }

    loadDashboard() {
        this.updateStats();
        this.renderChart();
    }

    updateStats() {
        const tickets = this.ticketSystem.tickets;
        
        document.getElementById('totalTickets').textContent = tickets.length;
        document.getElementById('openTickets').textContent = tickets.filter(t => t.status === 'Open').length;
        document.getElementById('inProgressTickets').textContent = tickets.filter(t => t.status === 'In Progress').length;
        document.getElementById('closedTickets').textContent = tickets.filter(t => t.status === 'Closed').length;
    }

    renderChart() {
        const ctx = document.getElementById('dashboardChart').getContext('2d');
        const tickets = this.ticketSystem.tickets;
        
        const statusCounts = {
            'Open': tickets.filter(t => t.status === 'Open').length,
            'In Progress': tickets.filter(t => t.status === 'In Progress').length,
            'Resolved': tickets.filter(t => t.status === 'Resolved').length,
            'Closed': tickets.filter(t => t.status === 'Closed').length
        };

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Ticket Status Distribution'
                    }
                }
            }
        });
    }

    filterDashboard() {
        const filter = document.getElementById('dashboardFilter').value;
        // Implement filtering logic based on department, category, or team member
        this.renderChart();
    }
}

// Add dashboard methods to main app
TicketingSystem.prototype.loadDashboard = function() {
    if (!this.dashboard) {
        this.dashboard = new Dashboard(this);
    }
    this.dashboard.loadDashboard();
};

TicketingSystem.prototype.loadReports = function() {
    this.generateReportTable();
};

TicketingSystem.prototype.generateReport = function() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    this.generateReportTable(startDate, endDate);
};

TicketingSystem.prototype.generateReportTable = function(startDate, endDate) {
    let filteredTickets = this.tickets;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include full end date
        
        filteredTickets = this.tickets.filter(ticket => {
            const ticketDate = new Date(ticket.createdAt);
            return ticketDate >= start && ticketDate <= end;
        });
    }
    
    const reportTable = document.getElementById('reportTable');
    
    if (filteredTickets.length === 0) {
        reportTable.innerHTML = '<p>No tickets found for the selected date range.</p>';
        return;
    }
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Ticket ID</th>
                    <th>Summary</th>
                    <th>Status</th>
                    <th>Last Update</th>
                    <th>Opening Date</th>
                    <th>Severity</th>
                    <th>Requestor</th>
                    <th>Assigned To</th>
                    <th>Type/Category</th>
                    <th>Time to Resolve</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredTickets.forEach(ticket => {
        const timeCreated = new Date(ticket.createdAt);
        const timeUpdated = new Date(ticket.updatedAt);
        const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
        const expectedHours = this.timeToResolve[ticket.severity];
        const timeStatus = ticket.status === 'Closed' ? 
            `${hoursElapsed.toFixed(1)}h (Completed)` : 
            `${hoursElapsed.toFixed(1)}h / ${expectedHours}h`;
        
        tableHTML += `
            <tr>
                <td>${ticket.id}</td>
                <td>${ticket.description.substring(0, 50)}${ticket.description.length > 50 ? '...' : ''}</td>
                <td>${ticket.status}</td>
                <td>${timeUpdated.toLocaleString()}</td>
                <td>${timeCreated.toLocaleString()}</td>
                <td>${ticket.severity}</td>
                <td>${ticket.requestor}</td>
                <td>${ticket.assignedTo || 'Unassigned'}</td>
                <td>${ticket.type}</td>
                <td>${timeStatus}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    reportTable.innerHTML = tableHTML;
};
