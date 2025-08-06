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
        const ctx = document.getElementById('dashboardChart');
        if (!ctx) return;

        const tickets = this.ticketSystem.tickets;
        const filter = document.getElementById('dashboardFilter').value;
        
        let chartData = {};
        let chartTitle = '';

        switch(filter) {
            case 'department':
                chartTitle = 'Tickets by Department';
                chartData = this.getTicketsByDepartment(tickets);
                break;
            case 'category':
                chartTitle = 'Tickets by Category';
                chartData = this.getTicketsByCategory(tickets);
                break;
            case 'teammember':
                chartTitle = 'Tickets by Team Member';
                chartData = this.getTicketsByTeamMember(tickets);
                break;
        }

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(chartData),
                datasets: [{
                    data: Object.values(chartData),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: chartTitle,
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    getTicketsByDepartment(tickets) {
        const departmentCounts = {};
        tickets.forEach(ticket => {
            const dept = ticket.department || 'Unknown';
            departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        });
        return departmentCounts;
    }

    getTicketsByCategory(tickets) {
        const categoryCounts = {};
        tickets.forEach(ticket => {
            const category = ticket.type;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        return categoryCounts;
    }

    getTicketsByTeamMember(tickets) {
        const memberCounts = { 'Unassigned': 0 };
        tickets.forEach(ticket => {
            const member = ticket.assignedTo || 'Unassigned';
            memberCounts[member] = (memberCounts[member] || 0) + 1;
        });
        return memberCounts;
    }

    filterDashboard() {
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
        this.showNotification('Please select both start and end dates', 'error');
        return;
    }
    
    this.generateReportTable(startDate, endDate);
};

TicketingSystem.prototype.exportReport = function() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    let filteredTickets = this.tickets;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        filteredTickets = this.tickets.filter(ticket => {
            const ticketDate = new Date(ticket.createdAt);
            return ticketDate >= start && ticketDate <= end;
        });
    }
    
    if (filteredTickets.length === 0) {
        this.showNotification('No tickets to export', 'error');
        return;
    }
    
    // Create CSV content
    const headers = [
        'Ticket ID', 'Summary', 'Status', 'Last Update', 'Opening Date', 
        'Severity', 'Requestor', 'Assigned To', 'Type/Category', 'Department', 'Time to Resolve'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    filteredTickets.forEach(ticket => {
        const timeCreated = new Date(ticket.createdAt);
        const timeUpdated = new Date(ticket.updatedAt);
        const hoursElapsed = (new Date() - timeCreated) / (1000 * 60 * 60);
        const expectedHours = this.timeToResolve[ticket.severity];
        const timeStatus = ticket.status === 'Closed' ? 
            `${hoursElapsed.toFixed(1)}h (Completed)` : 
            `${hoursElapsed.toFixed(1)}h / ${expectedHours}h`;
        
        const row = [
            ticket.id,
            `"${ticket.description.replace(/"/g, '""').substring(0, 50)}${ticket.description.length > 50 ? '...' : ''}"`,
            ticket.status,
            timeUpdated.toLocaleString(),
            timeCreated.toLocaleString(),
            ticket.severity,
            ticket.requestor,
            ticket.assignedTo || 'Unassigned',
            ticket.type,
            ticket.department || 'Unknown',
            timeStatus
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ticket_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showNotification('Report exported successfully', 'success');
};

TicketingSystem.prototype.generateReportTable = function(startDate, endDate) {
    let filteredTickets = this.tickets;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        filteredTickets = this.tickets.filter(ticket => {
            const ticketDate = new Date(ticket.createdAt);
            return ticketDate >= start && ticketDate <= end;
        });
    }
    
    const reportTable = document.getElementById('reportTable');
    
    if (filteredTickets.length === 0) {
        reportTable.innerHTML = '<div class="no-data" style="text-align: center; padding: 40px; color: #666;">No tickets found for the selected date range.</div>';
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
                    <th>Department</th>
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
                <td><span class="ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span></td>
                <td>${timeUpdated.toLocaleString()}</td>
                <td>${timeCreated.toLocaleString()}</td>
                <td><span class="severity-badge severity-${ticket.severity.toLowerCase()}">${ticket.severity}</span></td>
                <td>${ticket.requestor}</td>
                <td>${ticket.assignedTo || 'Unassigned'}</td>
                <td>${ticket.type}</td>
                <td>${ticket.department || 'Unknown'}</td>
                <td>${timeStatus}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    reportTable.innerHTML = tableHTML;
};
