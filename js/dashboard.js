// Dashboard functionality with enhanced analytics and updated department list
class Dashboard {
    constructor(ticketSystem) {
        this.ticketSystem = ticketSystem;
        this.chart = null;
        this.departments = [
            'Corporate', 'HR', 'Manufacturing', 'Warehouse', 
            'QC', 'QA', 'Docu Cell', 'Admin', 'Engineering', 
            'Security', 'Stores', 'Others'
        ];
    }

    loadDashboard() {
        this.updateStats();
        this.renderChart();
        this.checkOverdueAlerts();
        this.updatePerformanceMetrics();
        this.scheduleAutoRefresh();
    }

    updateStats() {
        const tickets = this.ticketSystem.tickets;
        const archivedTickets = this.ticketSystem.archivedTickets || [];
        
        const stats = {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'Open').length,
            inProgress: tickets.filter(t => t.status === 'In Progress').length,
            resolved: tickets.filter(t => t.status === 'Resolved').length,
            closed: tickets.filter(t => t.status === 'Closed').length,
            archived: archivedTickets.length
        };

        // Calculate additional metrics
        const today = new Date();
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        stats.todayCreated = tickets.filter(t => 
            new Date(t.createdAt).toDateString() === today.toDateString()
        ).length;

        stats.weekCreated = tickets.filter(t => 
            new Date(t.createdAt) >= thisWeek
        ).length;

        stats.monthCreated = tickets.filter(t => 
            new Date(t.createdAt) >= thisMonth
        ).length;

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

        // Update additional metrics if elements exist
        this.updateAdditionalStats(stats);
    }

    updateAdditionalStats(stats) {
        // Add trend indicators
        const trendElements = {
            todayTrend: document.getElementById('todayTrend'),
            weekTrend: document.getElementById('weekTrend'),
            monthTrend: document.getElementById('monthTrend')
        };

        if (trendElements.todayTrend) {
            trendElements.todayTrend.textContent = `Today: ${stats.todayCreated}`;
        }
        if (trendElements.weekTrend) {
            trendElements.weekTrend.textContent = `This Week: ${stats.weekCreated}`;
        }
        if (trendElements.monthTrend) {
            trendElements.monthTrend.textContent = `This Month: ${stats.monthCreated}`;
        }
    }

    renderChart() {
        const ctx = document.getElementById('dashboardChart');
        if (!ctx) return;

        const tickets = this.ticketSystem.tickets;
        const archivedTickets = this.ticketSystem.archivedTickets || [];
        const allTickets = [...tickets, ...archivedTickets];
        
        const filterElement = document.getElementById('dashboardFilter');
        const filter = filterElement ? filterElement.value : 'department';
        
        let chartData = {};
        let chartTitle = '';
        let chartColors = [];

        switch(filter) {
            case 'department':
                chartTitle = 'Tickets by Department';
                chartData = this.getTicketsByDepartment(allTickets);
                chartColors = [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                    '#E7E9ED', '#71B37C', '#518CE0', '#AC64AD'
                ];
                break;
            case 'category':
                chartTitle = 'Tickets by Category';
                chartData = this.getTicketsByCategory(allTickets);
                chartColors = [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                    '#E7E9ED', '#71B37C', '#518CE0'
                ];
                break;
            case 'teammember':
                chartTitle = 'Tickets by Team Member';
                chartData = this.getTicketsByTeamMember(allTickets);
                chartColors = [
                    '#27ae60', '#e74c3c', '#f39c12', '#3498db', 
                    '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
                    '#16a085', '#c0392b', '#d35400', '#8e44ad'
                ];
                break;
            case 'status':
                chartTitle = 'Tickets by Status';
                chartData = this.getTicketsByStatus(allTickets);
                chartColors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#95a5a6'];
                break;
            case 'severity':
                chartTitle = 'Tickets by Severity';
                chartData = this.getSeverityBreakdown(allTickets);
                chartColors = ['#e74c3c', '#f39c12', '#27ae60'];
                break;
        }

        if (this.chart) {
            this.chart.destroy();
        }

        // Only create chart if there's data
        const dataValues = Object.values(chartData);
        const hasData = dataValues.some(value => value > 0);

        if (!hasData) {
            this.showNoDataMessage(ctx);
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
                    borderColor: '#ffffff',
                    hoverBorderWidth: 3,
                    hoverBorderColor: '#333'
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
                            size: 18,
                            weight: 'bold'
                        },
                        color: '#333',
                        padding: 20
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            color: '#333',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} tickets (${percentage}%)`;
                            },
                            afterLabel: function(context) {
                                const label = context.label;
                                if (filter === 'department') {
                                    const openTickets = allTickets.filter(t => 
                                        t.department === label && t.status === 'Open'
                                    ).length;
                                    return openTickets > 0 ? `${openTickets} still open` : 'All resolved/closed';
                                }
                                return null;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1500,
                    easing: 'easeInOutQuart'
                },
                onHover: (event, activeElements) => {
                    event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const label = this.chart.data.labels[index];
                        this.showDrillDownData(filter, label, allTickets);
                    }
                }
            }
        });
    }

    showNoDataMessage(ctx) {
        const context = ctx.getContext('2d');
        context.clearRect(0, 0, ctx.width, ctx.height);
        context.font = '18px Arial';
        context.textAlign = 'center';
        context.fillStyle = '#666';
        context.fillText('No data available', ctx.width / 2, ctx.height / 2);
        
        context.font = '14px Arial';
        context.fillText('Create some tickets to see analytics', ctx.width / 2, (ctx.height / 2) + 30);
    }

    showDrillDownData(filter, label, allTickets) {
        let filteredTickets = [];
        
        switch(filter) {
            case 'department':
                filteredTickets = allTickets.filter(t => t.department === label);
                break;
            case 'category':
                filteredTickets = allTickets.filter(t => t.type === label);
                break;
            case 'teammember':
                if (label === 'Unassigned') {
                    filteredTickets = allTickets.filter(t => !t.assignedTo);
                } else {
                    filteredTickets = allTickets.filter(t => t.assignedTo === label);
                }
                break;
            case 'status':
                filteredTickets = allTickets.filter(t => t.status === label);
                break;
            case 'severity':
                filteredTickets = allTickets.filter(t => t.severity === label);
                break;
        }
        
        if (filteredTickets.length > 0) {
            this.showDrillDownModal(filter, label, filteredTickets);
        }
    }

    showDrillDownModal(filter, label, tickets) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        modalContent.innerHTML = `
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>${filter.charAt(0).toUpperCase() + filter.slice(1)}: ${label}</h3>
            <p><strong>Total Tickets:</strong> ${tickets.length}</p>
            <div style="max-height: 400px; overflow-y: auto; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 10px; text-align: left;">Ticket ID</th>
                            <th style="padding: 10px; text-align: left;">Type</th>
                            <th style="padding: 10px; text-align: left;">Status</th>
                            <th style="padding: 10px; text-align: left;">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tickets.map(ticket => `
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px;">${ticket.id}</td>
                                <td style="padding: 8px;">${ticket.type}</td>
                                <td style="padding: 8px;">
                                    <span class="ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span>
                                </td>
                                <td style="padding: 8px;">${new Date(ticket.createdAt).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="btn btn-primary">Close</button>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    getTicketsByDepartment(tickets) {
        const departmentCounts = {};
        
        // Initialize all departments to ensure they appear in chart
        this.departments.forEach(dept => {
            departmentCounts[dept] = 0;
        });
        
        tickets.forEach(ticket => {
            const dept = ticket.department || 'Others';
            if (this.departments.includes(dept)) {
                departmentCounts[dept]++;
            } else {
                departmentCounts['Others']++;
            }
        });
        
        // Remove departments with zero tickets for cleaner chart
        Object.keys(departmentCounts).forEach(dept => {
            if (departmentCounts[dept] === 0) {
                delete departmentCounts[dept];
            }
        });
        
        return departmentCounts;
    }

    getTicketsByCategory(tickets) {
        const categoryCounts = {};
        const categories = [
            'Password reset', 'New User ID Creation', 'De-Activate',
            'Hardware issue', 'Software issue', 'New Asset',
            'Network issue', 'Printer/Xerox issue', 'Role Change', 'Other'
        ];
        
        categories.forEach(cat => {
            categoryCounts[cat] = 0;
        });
        
        tickets.forEach(ticket => {
            const category = ticket.type || 'Other';
            if (categories.includes(category)) {
                categoryCounts[category]++;
            } else {
                categoryCounts['Other']++;
            }
        });
        
        // Remove categories with zero tickets
        Object.keys(categoryCounts).forEach(cat => {
            if (categoryCounts[cat] === 0) {
                delete categoryCounts[cat];
            }
        });
        
        return categoryCounts;
    }

    getTicketsByTeamMember(tickets) {
        const memberCounts = { 'Unassigned': 0 };
        const teamMembers = auth.getTeamMembers();
        
        // Initialize team members
        teamMembers.forEach(member => {
            memberCounts[member.username] = 0;
        });
        
        tickets.forEach(ticket => {
            const member = ticket.assignedTo || 'Unassigned';
            if (memberCounts.hasOwnProperty(member)) {
                memberCounts[member]++;
            } else {
                memberCounts[member] = 1;
            }
        });
        
        return memberCounts;
    }

    getTicketsByStatus(tickets) {
        const statusCounts = {
            'Open': 0,
            'In Progress': 0,
            'Resolved': 0,
            'Closed': 0,
            'Archived': 0
        };
        
        tickets.forEach(ticket => {
            const status = ticket.status || 'Open';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            }
        });
        
        // Remove statuses with zero tickets
        Object.keys(statusCounts).forEach(status => {
            if (statusCounts[status] === 0) {
                delete statusCounts[status];
            }
        });
        
        return statusCounts;
    }

    getSeverityBreakdown(tickets) {
        const severityCounts = {
            'High': 0,
            'Medium': 0,
            'Low': 0
        };
        
        tickets.forEach(ticket => {
            const severity = ticket.severity || 'Low';
            if (severityCounts.hasOwnProperty(severity)) {
                severityCounts[severity]++;
            }
        });
        
        return severityCounts;
    }

    updatePerformanceMetrics() {
        const tickets = this.ticketSystem.tickets;
        const archivedTickets = this.ticketSystem.archivedTickets || [];
        const allTickets = [...tickets, ...archivedTickets];
        
        // Calculate average resolution time
        const resolvedTickets = allTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
        let avgResolutionTime = 0;
        
        if (resolvedTickets.length > 0) {
            const totalTime = resolvedTickets.reduce((sum, ticket) => {
                const created = new Date(ticket.createdAt);
                const resolved = new Date(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt);
                return sum + (resolved - created);
            }, 0);
            
            avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // Convert to hours
        }
        
        // Calculate SLA compliance
        const slaCompliantTickets = resolvedTickets.filter(ticket => {
            const created = new Date(ticket.createdAt);
            const resolved = new Date(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt);
            const hoursToResolve = (resolved - created) / (1000 * 60 * 60);
            const slaHours = this.ticketSystem.timeToResolve[ticket.severity] || 24;
            return hoursToResolve <= slaHours;
        });
        
        const slaCompliance = resolvedTickets.length > 0 
            ? (slaCompliantTickets.length / resolvedTickets.length * 100).toFixed(1)
            : 100;
        
        // Update performance display if elements exist
        const avgTimeElement = document.getElementById('avgResolutionTime');
        const slaElement = document.getElementById('slaCompliance');
        
        if (avgTimeElement) {
            avgTimeElement.textContent = `${avgResolutionTime.toFixed(1)} hours`;
        }
        
        if (slaElement) {
            slaElement.textContent = `${slaCompliance}%`;
            slaElement.style.color = slaCompliance >= 80 ? '#27ae60' : slaCompliance >= 60 ? '#f39c12' : '#e74c3c';
        }
    }

    checkOverdueAlerts() {
        const overdueTickets = this.ticketSystem.getOverdueTickets ? this.ticketSystem.getOverdueTickets() : [];
        
        if (overdueTickets.length > 0) {
            console.log(`⚠️ Alert: ${overdueTickets.length} overdue tickets detected`);
            
            // Show overdue alert in dashboard if element exists
            const overdueAlert = document.getElementById('overdueAlert');
            if (overdueAlert) {
                overdueAlert.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>⚠️ ${overdueTickets.length} Overdue Tickets</strong>
                        <p>These tickets have exceeded their SLA timeframe.</p>
                        <button onclick="this.showOverdueTickets()" class="btn btn-warning btn-small">View Details</button>
                    </div>
                `;
                overdueAlert.style.display = 'block';
            }
            
            // Update overdue count in stats
            const overdueElement = document.getElementById('overdueCount');
            if (overdueElement) {
                overdueElement.textContent = overdueTickets.length;
                overdueElement.parentElement.style.display = 'block';
            }
        }
    }

    showOverdueTickets() {
        const overdueTickets = this.ticketSystem.getOverdueTickets();
        this.showDrillDownModal('overdue', 'Overdue Tickets', overdueTickets);
    }

    filterDashboard() {
        this.renderChart();
        this.updatePerformanceMetrics();
    }

    scheduleAutoRefresh() {
        // Clear existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Refresh dashboard every 2 minutes
        this.refreshInterval = setInterval(() => {
            const activePage = document.querySelector('.content-page.active');
            if (activePage && activePage.id === 'adminDashboard') {
                this.loadDashboard();
            }
        }, 120000); // 2 minutes
    }

    exportDashboardData() {
        const tickets = this.ticketSystem.tickets;
        const archivedTickets = this.ticketSystem.archivedTickets || [];
        const allTickets = [...tickets, ...archivedTickets];
        
        const data = {
            generatedAt: new Date().toISOString(),
            generatedBy: auth.getCurrentUser()?.username,
            summary: {
                total: allTickets.length,
                active: tickets.length,
                archived: archivedTickets.length,
                open: tickets.filter(t => t.status === 'Open').length,
                inProgress: tickets.filter(t => t.status === 'In Progress').length,
                resolved: tickets.filter(t => t.status === 'Resolved').length,
                closed: tickets.filter(t => t.status === 'Closed').length
            },
            byDepartment: this.getTicketsByDepartment(allTickets),
            byCategory: this.getTicketsByCategory(allTickets),
            byTeamMember: this.getTicketsByTeamMember(allTickets),
            bySeverity: this.getSeverityBreakdown(allTickets),
            byStatus: this.getTicketsByStatus(allTickets),
            performance: {
                avgResolutionTime: this.calculateAvgResolutionTime(allTickets),
                slaCompliance: this.calculateSLACompliance(allTickets),
                overdueCount: this.ticketSystem.getOverdueTickets ? this.ticketSystem.getOverdueTickets().length : 0
            },
            trends: {
                thisWeek: this.getWeeklyTrend(allTickets),
                thisMonth: this.getMonthlyTrend(allTickets),
                lastSixMonths: this.getSixMonthTrend(allTickets)
            }
        };
        
        return data;
    }

    calculateAvgResolutionTime(tickets) {
        const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
        if (resolvedTickets.length === 0) return 0;
        
        const totalTime = resolvedTickets.reduce((sum, ticket) => {
            const created = new Date(ticket.createdAt);
            const resolved = new Date(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt);
            return sum + (resolved - created);
        }, 0);
        
        return Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60)); // Hours
    }

    calculateSLACompliance(tickets) {
        const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
        if (resolvedTickets.length === 0) return 100;
        
        const compliantTickets = resolvedTickets.filter(ticket => {
            const created = new Date(ticket.createdAt);
            const resolved = new Date(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt);
            const hoursToResolve = (resolved - created) / (1000 * 60 * 60);
            const slaHours = this.ticketSystem.timeToResolve[ticket.severity] || 24;
            return hoursToResolve <= slaHours;
        });
        
        return Math.round((compliantTickets.length / resolvedTickets.length) * 100);
    }

    getWeeklyTrend(tickets) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return tickets.filter(t => new Date(t.createdAt) >= oneWeekAgo).length;
    }

    getMonthlyTrend(tickets) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        return tickets.filter(t => new Date(t.createdAt) >= oneMonthAgo).length;
    }

    getSixMonthTrend(tickets) {
        const monthlyData = {};
        const now = new Date();
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
            monthlyData[monthKey] = 0;
        }
        
        // Count tickets by month
        tickets.forEach(ticket => {
            const monthKey = ticket.createdAt.slice(0, 7);
            if (monthlyData.hasOwnProperty(monthKey)) {
                monthlyData[monthKey]++;
            }
        });
        
        return monthlyData;
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
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
    
    let filteredTickets = [...this.tickets, ...(this.archivedTickets || [])];
    
    // Apply date filter
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        filteredTickets = filteredTickets.filter(ticket => {
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
        'Assigned To', 'Created Date', 'Last Update', 'Resolution Date', 
        'Description', 'Location', 'Employee ID'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    tickets.forEach(ticket => {
        const row = [
            ticket.id,
            `"${ticket.type}"`,
            ticket.severity,
            ticket.status,
            ticket.department || 'Unknown',
            ticket.requestor,
            ticket.assignedTo || 'Unassigned',
            new Date(ticket.createdAt).toLocaleString(),
            new Date(ticket.updatedAt).toLocaleString(),
            ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : 'N/A',
            `"${ticket.description.replace(/"/g, '""')}"`,
            ticket.location || 'N/A',
            ticket.employeeId || 'N/A'
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
};

TicketingSystem.prototype.generateDepartmentReport = function(tickets) {
    const departments = [
        'Corporate', 'HR', 'Manufacturing', 'Warehouse', 
        'QC', 'QA', 'Docu Cell', 'Admin', 'Engineering', 
        'Security', 'Stores', 'Others'
    ];
    
    const departmentStats = {};
    
    // Initialize departments
    departments.forEach(dept => {
        departmentStats[dept] = { 
            total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, archived: 0 
        };
    });
    
    tickets.forEach(ticket => {
        const dept = ticket.department || 'Others';
        if (!departmentStats[dept]) {
            departmentStats[dept] = { 
                total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, archived: 0 
            };
        }
        
        departmentStats[dept].total++;
        const status = ticket.status.toLowerCase().replace(' ', '');
        if (departmentStats[dept][status] !== undefined) {
            departmentStats[dept][status]++;
        }
    });
    
    let csvContent = 'Department,Total Tickets,Open,In Progress,Resolved,Closed,Archived\n';
    
    Object.keys(departmentStats).forEach(dept => {
        if (departmentStats[dept].total > 0) {
            const stats = departmentStats[dept];
            csvContent += `${dept},${stats.total},${stats.open || 0},${stats.inprogress || 0},${stats.resolved || 0},${stats.closed || 0},${stats.archived || 0}\n`;
        }
    });
    
    return csvContent;
};

TicketingSystem.prototype.generateTeamReport = function(tickets) {
    const teamStats = {};
    
    tickets.forEach(ticket => {
        const member = ticket.assignedTo || 'Unassigned';
        if (!teamStats[member]) {
            teamStats[member] = { 
                total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, archived: 0 
            };
        }
        
        teamStats[member].total++;
        const status = ticket.status.toLowerCase().replace(' ', '');
        if (teamStats[member][status] !== undefined) {
            teamStats[member][status]++;
        }
    });
    
    let csvContent = 'Team Member,Total Tickets,Open,In Progress,Resolved,Closed,Archived\n';
    
    Object.keys(teamStats).forEach(member => {
        const stats = teamStats[member];
        csvContent += `${member},${stats.total},${stats.open || 0},${stats.inprogress || 0},${stats.resolved || 0},${stats.closed || 0},${stats.archived || 0}\n`;
    });
    
    return csvContent;
};

TicketingSystem.prototype.generateStatusReport = function(tickets) {
    const statusStats = {};
    
    tickets.forEach(ticket => {
        statusStats[ticket.status] = (statusStats[ticket.status] || 0) + 1;
    });
    
    let csvContent = 'Status,Count,Percentage\n';
    const total = tickets.length;
    
    Object.keys(statusStats).forEach(status => {
        const count = statusStats[status];
        const percentage = ((count / total) * 100).toFixed(1);
        csvContent += `${status},${count},${percentage}%\n`;
    });
    
    return csvContent;
};

TicketingSystem.prototype.generateReportTable = function(startDate, endDate) {
    let filteredTickets = [...this.tickets, ...(this.archivedTickets || [])];
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        filteredTickets = filteredTickets.filter(ticket => {
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
                    <th>Resolution Time</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredTickets.forEach(ticket => {
        const timeCreated = new Date(ticket.createdAt);
        const timeUpdated = new Date(ticket.updatedAt);
        
        // Calculate resolution time
        let resolutionTime = 'N/A';
        if (ticket.resolvedAt || ticket.closedAt) {
            const resolvedDate = new Date(ticket.resolvedAt || ticket.closedAt);
            const hours = Math.round((resolvedDate - timeCreated) / (1000 * 60 * 60));
            resolutionTime = `${hours}h`;
        }
        
        tableHTML += `
            <tr onclick="ticketSystem.viewTicketDetails('${ticket.id}')" style="cursor: pointer;" title="Click to view details">
                <td><strong>${ticket.id}</strong></td>
                <td>${ticket.type}</td>
                <td><span class="ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span></td>
                <td><span class="severity-badge severity-${ticket.severity.toLowerCase()}">${ticket.severity}</span></td>
                <td>${ticket.department || 'Unknown'}</td>
                <td>${ticket.requestor}</td>
                <td>${ticket.assignedTo || 'Unassigned'}</td>
                <td>${timeCreated.toLocaleDateString()}</td>
                <td>${timeUpdated.toLocaleDateString()}</td>
                <td>${resolutionTime}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    reportTable.innerHTML = tableHTML;
};

// Global function for dashboard filtering
function filterDashboard() {
    if (window.ticketSystem && window.ticketSystem.dashboard) {
        window.ticketSystem.dashboard.filterDashboard();
    }
}
