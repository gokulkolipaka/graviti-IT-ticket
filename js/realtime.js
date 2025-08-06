// Real-time synchronization system for multi-user support
class RealTimeSync {
    constructor() {
        this.isOnline = navigator.onLine;
        this.lastSync = Date.now();
        this.syncInterval = null;
        this.setupEventListeners();
        this.startSyncMonitoring();
        this.updateConnectionStatus();
    }

    setupEventListeners() {
        // Listen for storage changes across tabs/windows
        window.addEventListener('storage', (e) => {
            this.handleStorageChange(e);
        });

        // Listen for custom events within the same tab
        window.addEventListener('ticketsUpdated', () => {
            this.handleTicketsUpdate();
        });

        window.addEventListener('usersUpdated', () => {
            this.handleUsersUpdate();
        });

        // Connection status monitoring
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.showSyncNotification('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
            this.showSyncNotification('Working offline', 'warning');
        });

        // Page visibility API for tab switching
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.syncData();
            }
        });
    }

    handleStorageChange(e) {
        if (e.key === 'tickets' && e.newValue !== e.oldValue) {
            this.handleTicketsUpdate();
        } else if (e.key === 'users' && e.newValue !== e.oldValue) {
            this.handleUsersUpdate();
        } else if (e.key === 'currentUser' && !e.newValue) {
            // User logged out in another tab
            this.handleLogout();
        }
    }

    handleTicketsUpdate() {
        if (window.ticketSystem) {
            window.ticketSystem.loadTickets();
            
            // Refresh current view if showing tickets
            const activePages = document.querySelectorAll('.content-page.active');
            if (activePages.length > 0) {
                const pageId = activePages[0].id;
                if (['myTickets', 'adminDashboard', 'kanban'].includes(pageId)) {
                    window.ticketSystem.refreshCurrentView();
                }
            }
            
            this.showSyncNotification('Tickets updated', 'info');
        }
    }

    handleUsersUpdate() {
        if (window.ticketSystem) {
            // Refresh user management view if active
            const activePages = document.querySelectorAll('.content-page.active');
            if (activePages.length > 0) {
                const pageId = activePages[0].id;
                if (pageId === 'userManagement') {
                    window.ticketSystem.loadUsersList();
                }
            }
        }
    }

    handleLogout() {
        if (window.ticketSystem && auth.getCurrentUser()) {
            window.ticketSystem.showNotification('Logged out from another session', 'warning');
            setTimeout(() => {
                window.ticketSystem.logout();
            }, 2000);
        }
    }

    startSyncMonitoring() {
        // Check for updates every 30 seconds
        this.syncInterval = setInterval(() => {
            this.syncData();
        }, 30000);
    }

    syncData() {
        if (!this.isOnline) return;

        try {
            // Simulate checking for server updates
            const lastTicketUpdate = localStorage.getItem('lastTicketUpdate');
            const lastUserUpdate = localStorage.getItem('lastUserUpdate');
            
            // In a real implementation, this would check with the server
            // For now, we'll just update the last sync time
            this.lastSync = Date.now();
            localStorage.setItem('lastSync', this.lastSync.toString());
            
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    updateConnectionStatus() {
        const indicator = document.getElementById('statusIndicator');
        const statusDot = indicator?.querySelector('.status-dot');
        const statusText = indicator?.querySelector('span:last-child');
        
        if (statusDot && statusText) {
            if (this.isOnline) {
                statusDot.className = 'status-dot online';
                statusText.textContent = 'Connected';
            } else {
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'Offline';
            }
        }
    }

    showSyncNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `sync-notification ${type}`;
        notification.innerHTML = `
            <span class="sync-icon">${this.getSyncIcon(type)}</span>
            <span>${message}</span>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            z-index: 1001;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideIn 0.3s ease;
            max-width: 250px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getSyncIcon(type) {
        switch(type) {
            case 'success': return '✓';
            case 'warning': return '⚠️';
            case 'error': return '✕';
            default: return 'ℹ️';
        }
    }

    getNotificationColor(type) {
        switch(type) {
            case 'success': return '#27ae60';
            case 'warning': return '#f39c12';
            case 'error': return '#e74c3c';
            default: return '#3498db';
        }
    }

    sendEmailNotification(ticket, assignee) {
        // Enhanced email notification simulation
        console.log('📧 EMAIL NOTIFICATION SENT');
        console.log('=========================');
        console.log(`To: ${assignee.email}`);
        console.log(`Subject: New Ticket Assigned - ${ticket.id}`);
        console.log(`\nDear ${assignee.username},\n`);
        console.log(`You have been assigned a new support ticket:\n`);
        console.log(`Ticket ID: ${ticket.id}`);
        console.log(`Type: ${ticket.type}`);
        console.log(`Severity: ${ticket.severity}`);
        console.log(`Department: ${ticket.department}`);
        console.log(`Requestor: ${ticket.requestor}`);
        console.log(`Description: ${ticket.description}\n`);
        console.log(`Please log into the support system to view and manage this ticket.\n`);
        console.log(`Best regards,`);
        console.log(`Support System`);
        console.log('=========================');
        
        // Store notification in local storage for demo purposes
        this.storeNotification({
            to: assignee.email,
            subject: `New Ticket Assigned - ${ticket.id}`,
            ticketId: ticket.id,
            timestamp: new Date().toISOString(),
            type: 'assignment'
        });
        
        // Show success notification
        this.showSyncNotification(`Email sent to ${assignee.username}`, 'success');
    }

    storeNotification(notification) {
        const notifications = JSON.parse(localStorage.getItem('emailNotifications') || '[]');
        notifications.push(notification);
        
        // Keep only last 50 notifications
        if (notifications.length > 50) {
            notifications.splice(0, notifications.length - 50);
        }
        
        localStorage.setItem('emailNotifications', JSON.stringify(notifications));
    }

    getEmailNotifications() {
        return JSON.parse(localStorage.getItem('emailNotifications') || '[]');
    }

    broadcastTicketUpdate(ticket, action) {
        // Simulate broadcasting to other users
        const updateData = {
            ticketId: ticket.id,
            action: action, // 'created', 'updated', 'assigned', 'resolved', 'closed'
            timestamp: new Date().toISOString(),
            user: auth.getCurrentUser()?.username
        };

        console.log('📢 BROADCAST UPDATE:', updateData);
        
        // In a real implementation, this would use WebSockets or Server-Sent Events
        // For now, we'll just trigger local storage event
        localStorage.setItem('ticketBroadcast', JSON.stringify(updateData));
        localStorage.removeItem('ticketBroadcast'); // Trigger storage event
    }

    simulateMultiUserActivity() {
        // Simulate other users working on tickets (for demo purposes)
        if (Math.random() < 0.1) { // 10% chance every sync interval
            this.showSyncNotification('Another user updated a ticket', 'info');
        }
    }

    // WebSocket simulation for real-time updates
    initializeWebSocket() {
        // In a real implementation, you would connect to a WebSocket server
        // For demo purposes, we'll simulate this with periodic checks
        
        this.wsSimulation = setInterval(() => {
            this.simulateWebSocketMessage();
        }, 60000); // Every minute
    }

    simulateWebSocketMessage() {
        const messages = [
            { type: 'ticket_assigned', message: 'Ticket assigned to team member' },
            { type: 'ticket_resolved', message: 'Ticket marked as resolved' },
            { type: 'user_online', message: 'Team member came online' },
            { type: 'ticket_overdue', message: 'Ticket is now overdue' }
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        if (Math.random() < 0.3) { // 30% chance
            this.showSyncNotification(randomMessage.message, 'info');
        }
    }

    // Performance monitoring
    trackPerformance(action, startTime) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`⏱️ Performance: ${action} took ${duration}ms`);
        
        if (duration > 1000) {
            console.warn(`⚠️ Slow operation detected: ${action} took ${duration}ms`);
        }
    }

    // Data integrity checks
    validateDataIntegrity() {
        try {
            const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            // Check for data corruption
            let isValid = true;
            
            tickets.forEach(ticket => {
                if (!ticket.id || !ticket.createdAt || !ticket.status) {
                    console.error('Invalid ticket data:', ticket);
                    isValid = false;
                }
            });
            
            users.forEach(user => {
                if (!user.username || !user.email || !user.role) {
                    console.error('Invalid user data:', user);
                    isValid = false;
                }
            });
            
            if (!isValid) {
                this.showSyncNotification('Data integrity issue detected', 'error');
            }
            
            return isValid;
        } catch (error) {
            console.error('Data validation error:', error);
            this.showSyncNotification('Data validation failed', 'error');
            return false;
        }
    }

    // Backup and restore functionality
    createBackup() {
        const backupData = {
            tickets: localStorage.getItem('tickets'),
            users: localStorage.getItem('users'),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const backupString = JSON.stringify(backupData);
        const backupBlob = new Blob([backupString], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(backupBlob);
        link.download = `ticketing_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showSyncNotification('Backup created successfully', 'success');
    }

    restoreFromBackup(backupFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                
                if (backupData.tickets) localStorage.setItem('tickets', backupData.tickets);
                if (backupData.users) localStorage.setItem('users', backupData.users);
                
                this.showSyncNotification('Backup restored successfully', 'success');
                
                // Refresh the application
                if (window.ticketSystem) {
                    window.ticketSystem.loadTickets();
                    window.ticketSystem.refreshCurrentView();
                }
            } catch (error) {
                console.error('Backup restore error:', error);
                this.showSyncNotification('Failed to restore backup', 'error');
            }
        };
        reader.readAsText(backupFile);
    }

    // Cleanup function
    cleanup() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.wsSimulation) {
            clearInterval(this.wsSimulation);
        }
    }
}

// Initialize real-time sync system
const realTimeSync = new RealTimeSync();

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
    realTimeSync.cleanup();
});

// Export for use in other modules
window.realTimeSync = realTimeSync;
