// Dashboard functionality with enhanced analytics
class Dashboard {
    constructor(ticketSystem) {
        this.ticketSystem = ticketSystem;
        this.chart = null;
    }

    loadDashboard() {
        this.updateStats();
        this.renderChart();
        this.checkOverdueAlerts();
    }

    updateStats() {
        const tickets = this.ticketSystem.tickets;
        
        const stats = {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'Open').length,
            inProgress: tickets.filter(t => t.status === 'In Progress').length,
            resolved: tickets.filter(t => t.status === 'Resolved').length,
            closed: tickets.filter(t => t.status === 'Closed').length
        };

        // Update stat cards
        const elements = {
            totalTickets: document.getElementById('totalTickets'),
            openTickets: document.getElementById('openTickets'),
            inProgressTickets: document.getElementById('inProgressTickets'),
            resolvedTickets: document.getElementById('resolvedTickets'),
            closedTickets: document.getElementById('closedTickets')
        };

        if (elements.totalTickets) elements.totalTickets.textContent = stats.total;
        if (elements.openTickets) elements.openTickets.textContent = stats.open;
        if (elements.inProgressTickets) elements.inProgressTickets.textContent = stats.inProgress;
        if (elements.resolvedTickets) elements.resolvedTickets.textContent = stats.resolved;
        if (elements.closedTickets) elements.closedTickets.textContent = stats.closed;
    }

    renderChart() {
        const ctx = document.getElementById('dashboardChart');
        if (!ctx) return;

        const tickets = this.ticketSystem.tickets;
        const filterElement = document.getElementById('dashboardFilter');
        const filter = filterElement ? filterElement.value : 'department';
        
        let chartData = {};
        let chartTitle = '';
        let chartColors = [];

        switch(filter) {
            case 'department':
                chartTitle = 'Tickets by Department';
                chartData = this.getTicketsByDepartment(tickets);
                chartColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'];
                break;
            case 'category':
                chartTitle = 'Tickets by Category';
                chartData = this.getTicketsByCategory(tickets);
                chartColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'];
                break;
            case 'teammember':
                chartTitle = 'Tickets by Team Member';
                chartData = this.getTicketsByTeamMember(tickets);
                chartColors = ['#27ae60', '#e74c3c', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
                break;
        }

        if (this.chart) {
            this.chart.destroy();
        }

        // Only create chart if there's data
        const dataValues = Object.values(chartData);
        const hasData = dataValues.some(value => value > 0);

        if (!hasData) {
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
            const context = ctx.getContext('2d');
            context.font = '16px Arial';
            context.textAlign = 'center';
            context.fillStyle = '#666';
            context.fillText('No data available', ctx.width / 2, ctx.height / 2);
            return;
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(chartData),
                datasets: [{
                    data: dataValues,
                    backgroundColor: chartColors.slice(0, Object.keys(chartData).length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: chartTitle,
                        font: { 
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#333'
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            color: '#333'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
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

    getTicketsByStatus(tickets) {
        const statusCounts = {};
        tickets.forEach(ticket => {
            statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
        });
        return statusCounts;
    }

    getSeverityBreakdown(tickets) {
        const severityCounts = {};
        tickets.forEach(ticket => {
            severityCounts[ticket.severity] = (severityCounts[ticket.severity] || 0) + 1;
        });
        return severityCounts;
    }

    checkOverdueAlerts() {
        const overdueTickets = this.ticketSystem.getOverdueTickets();
        if (overdueTickets.length > 0) {
            console.log(`⚠️ Alert: ${overdueTickets.length} overdue tickets detected`);
            // Could add UI notification here
        }
    }

    filterDashboard() {
        this.renderChart();
    }

    exportDashboardData() {
        const tickets = this.ticketSystem.tickets;
        const data = {
            summary: {
                total: tickets.length,
                open: tickets.filter(t => t.status === 'Open').length,
                inProgress: tickets.filter(t => t.status === 'In Progress').length,
                resolved: tickets.filter(t => t.status === 'Resolved').length,
                closed: tickets.filter(t => t.status === 'Closed').length
            },
            byDepartment: this.getTicketsByDepartment(tickets),
            byCategory: this.getTicketsByCategory(tickets),
            byTeamMember: this.getTicketsByTeamMember(tickets),
            bySeverity: this.getSeverityBreakdown(tickets),
            overdueCount: this.ticketSystem.getOverdueTickets().length
        };
        
        return data;
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
    const reportType = document.getElementById('reportType').value;
    
    let filteredTickets = this.tickets;
    
    // Apply date filter
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
    
    // Create CSV content based on report type
    let csvContent = '';
    let fileName = `ticket_report_${new Date().toISOString().split('T')[0]}.csv`;
    
    switch(reportType) {
        case 'department':
            csvContent = this.generateDepartmentReport(filteredTickets);
            fileName = `department_report_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'team':
            csvContent = this.generateTeamReport(filteredTickets);
            fileName = `team_report_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'status':
            csvContent = this.generateStatusReport(filteredTickets);
            fileName = `status_report_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        default:
            csvContent = this.generateDetailedReport(filteredTickets);
            break;
    }
    
    // Download CSV
    this.downloadCSV(csvContent, fileName);
    this.showNotification('Report exported successfully', 'success');
};

TicketingSystem.prototype.generateDetailedReport = function(tickets) {
    const headers = [
        'Ticket ID', 'Type', 'Severity', 'Status', 'Department', 'Requestor', 
        'Assigned To', 'Created Date', 'Last Update', 'Description', 'Location'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    tickets.forEach(ticket => {
        const row = [
            ticket.id,
            ticket.type,
            ticket.severity,
            ticket.status,
            ticket.department || 'Unknown',
            ticket.requestor,
            ticket.assignedTo || 'Unassigned',
            new Date(ticket.createdAt).toLocaleString(),
            new Date(ticket.updatedAt).toLocaleString(),
            `"${ticket.description.replace(/"/g, '""')}"`,
            ticket.location
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
};

TicketingSystem.prototype.generateDepartmentReport = function(tickets) {
    const departmentStats = {};
    
    tickets.forEach(ticket => {
        const dept = ticket.department || 'Unknown';
        if (!departmentStats[dept]) {
            departmentStats[dept] = { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
        }
        departmentStats[dept].total++;
        departmentStats[dept][ticket.status.toLowerCase().replace(' ', '')] = 
            (departmentStats[dept][ticket.status.toLowerCase().replace(' ', '')] || 0) + 1;
    });
    
    let csvContent = 'Department,Total Tickets,Open,In Progress,Resolved,Closed\n';
    
    Object.keys(departmentStats).forEach(dept => {
        const stats = departmentStats[dept];
        csvContent += `${dept},${stats.total},${stats.open || 0},${stats.inprogress || 0},${stats.resolved || 0},${stats.closed || 0}\n`;
    });
    
    return csvContent;
};

TicketingSystem.prototype.generateTeamReport = function(tickets) {
    const teamStats = {};
    
    tickets.forEach(ticket => {
        const member = ticket.assignedTo || 'Unassigned';
        if (!teamStats[member]) {
            teamStats[member] = { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
        }
        teamStats[member].total++;
        teamStats[member][ticket.status.toLowerCase().replace(' ', '')] = 
            (teamStats[member][ticket.status.toLowerCase().replace(' ', '')] || 0) + 1;
    });
    
    let csvContent = 'Team Member,Total Tickets,Open,In Progress,Resolved,Closed\n';
    
    Object.keys(teamStats).forEach(member => {
        const stats = teamStats[member];
        csvContent += `${member},${stats.total},${stats.open || 0},${stats.inprogress || 0},${stats.resolved || 0},${stats.closed || 0}\n`;
    });
    
    return csvContent;
};

TicketingSystem.prototype.generateStatusReport = function(tickets) {
    const statusStats = {};
    
    tickets.forEach(ticket => {
        statusStats[ticket.status] = (statusStats[ticket.status] || 0) + 1;
    });
    
    let csvContent = 'Status,Count\n';
    
    Object.keys(statusStats).forEach(status => {
        csvContent += `${status},${statusStats[status]}\n`;
    });
    
    return csvContent;
};

TicketingSystem.prototype.downloadCSV = function(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    if (!reportTable) return;
    
    if (filteredTickets.length === 0) {
        reportTable.innerHTML = '<div class="no-data" style="text-align: center; padding: 40px; color: #666;">No tickets found for the selected criteria.</div>';
        return;
    }
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Ticket ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Severity</th>
                    <th>Department</th>
                    <th>Requestor</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                    <th>Last Updated</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredTickets.forEach(ticket => {
        const timeCreated = new Date(ticket.createdAt);
        const timeUpdated = new Date(ticket.updatedAt);
        
        tableHTML += `
            <tr onclick="ticketSystem.viewTicketDetails('${ticket.id}')" style="cursor: pointer;">
                <td><strong>${ticket.id}</strong></td>
                <td>${ticket.type}</td>
                <td><span class="ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span></td>
                <td><span class="severity-badge severity-${ticket.severity.toLowerCase()}">${ticket.severity}</span></td>
                <td>${ticket.department || 'Unknown'}</td>
                <td>${ticket.requestor}</td>
                <td>${ticket.assignedTo || 'Unassigned'}</td>
                <td>${timeCreated.toLocaleDateString()}</td>
                <td>${timeUpdated.toLocaleDateString()}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    reportTable.innerHTML = tableHTML;
};
