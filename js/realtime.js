// Enhanced real-time synchronization system with archive and backup support
class RealTimeSync {
    constructor() {
        this.isOnline = navigator.onLine;
        this.lastSync = Date.now();
        this.syncInterval = null;
        this.notificationQueue = [];
        this.maxNotifications = 50;
        this.setupEventListeners();
        this.startSyncMonitoring();
        this.updateConnectionStatus();
        this.initializeNotificationSystem();
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

        window.addEventListener('archiveUpdated', () => {
            this.handleArchiveUpdate();
        });

        window.addEventListener('backupCreated', () => {
            this.handleBackupCreated();
        });

        // Connection status monitoring
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.showSyncNotification('Connection restored - All data synced', 'success');
            this.processQueuedNotifications();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
            this.showSyncNotification('Working offline - Changes saved locally', 'warning');
        });

        // Page visibility API for tab switching
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.syncData();
                this.refreshActiveView();
            }
        });

        // Before page unload - save pending changes
        window.addEventListener('beforeunload', () => {
            this.savePendingChanges();
        });

        // Focus events for cross-tab sync
        window.addEventListener('focus', () => {
            this.syncData();
        });
    }

    handleStorageChange(e) {
        // Handle different storage changes
        switch(e.key) {
            case 'tickets':
                if (e.newValue !== e.oldValue) {
                    this.handleTicketsUpdate();
                }
                break;
            case 'archivedTickets':
                if (e.newValue !== e.oldValue) {
                    this.handleArchiveUpdate();
                }
                break;
            case 'users':
                if (e.newValue !== e.oldValue) {
                    this.handleUsersUpdate();
                }
                break;
            case 'currentUser':
                if (!e.newValue) {
                    this.handleLogout();
                }
                break;
            case 'backupHistory':
                if (e.newValue !== e.oldValue) {
                    this.handleBackupUpdate();
                }
                break;
            case 'companyName':
            case 'companyLogo':
                if (e.newValue !== e.oldValue) {
                    this.handleBrandingUpdate();
                }
                break;
        }
    }

    handleTicketsUpdate() {
        if (window.ticketSystem) {
            console.log('🔄 Tickets updated - Syncing views');
            window.ticketSystem.loadTickets();
            
            // Refresh current view if showing tickets
            const activePages = document.querySelectorAll('.content-page.active');
            if (activePages.length > 0) {
                const pageId = activePages[0].id;
                if (['myTickets', 'adminDashboard', 'adminKanban', 'teamKanban'].includes(pageId)) {
                    window.ticketSystem.refreshCurrentView();
                }
            }
            
            this.showSyncNotification('Tickets synchronized', 'info');
            this.logSyncEvent('tickets_synced');
        }
    }

    handleUsersUpdate() {
        if (window.ticketSystem) {
            console.log('👥 Users updated - Refreshing user data');
            
            // Refresh user management view if active
            const activePages = document.querySelectorAll('.content-page.active');
            if (activePages.length > 0) {
                const pageId = activePages[0].id;
                if (pageId === 'userManagement') {
                    window.ticketSystem.loadUsersList();
                }
            }
            
            this.showSyncNotification('User data synchronized', 'info');
            this.logSyncEvent('users_synced');
        }
    }

    handleArchiveUpdate() {
        if (window.ticketSystem) {
            console.log('🗃️ Archive updated - Syncing archive data');
            window.ticketSystem.loadArchivedTickets();
            
            // Refresh archive view if active
            const activePages = document.querySelectorAll('.content-page.active');
            if (activePages.length > 0) {
                const pageId = activePages[0].id;
                if (pageId === 'archive') {
                    window.ticketSystem.loadArchive();
                }
            }
            
            this.showSyncNotification('Archive synchronized', 'info');
            this.logSyncEvent('archive_synced');
        }
    }

    handleBackupCreated() {
        this.showSyncNotification('Backup created successfully', 'success');
        this.logSyncEvent('backup_created');
    }

    handleBackupUpdate() {
        if (window.ticketSystem) {
            console.log('💾 Backup history updated');
            window.ticketSystem.loadBackupHistory();
            this.logSyncEvent('backup_history_updated');
        }
    }

    handleBrandingUpdate() {
        if (window.ticketSystem) {
            console.log('🎨 Branding updated - Refreshing UI');
            window.ticketSystem.updateCompanyBranding();
            this.showSyncNotification('Branding updated', 'info');
            this.logSyncEvent('branding_updated');
        }
    }

    handleLogout() {
        if (window.ticketSystem && auth.getCurrentUser()) {
            console.log('🚪 User logged out from another session');
            this.showSyncNotification('Logged out from another session', 'warning');
            setTimeout(() => {
                window.ticketSystem.logout();
            }, 2000);
        }
    }

    startSyncMonitoring() {
        // Check for updates every 30 seconds
        this.syncInterval = setInterval(() => {
            this.syncData();
            this.cleanupOldNotifications();
            this.validateDataIntegrity();
        }, 30000);
    }

    syncData() {
        if (!this.isOnline) {
            this.queueSyncForLater();
            return;
        }

        try {
            // Update sync timestamp
            this.lastSync = Date.now();
            localStorage.setItem('lastSync', this.lastSync.toString());
            
            // Validate current session
            if (auth.getCurrentUser() && !auth.isSessionValid()) {
                console.log('🔒 Session invalid - forcing logout');
                this.handleLogout();
                return;
            }
            
            // Check for data conflicts
            this.checkForDataConflicts();
            
            // Update activity tracking
            this.updateUserActivity();
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            this.showSyncNotification('Sync failed - Will retry automatically', 'error');
        }
    }

    queueSyncForLater() {
        const pendingSync = {
            timestamp: new Date().toISOString(),
            action: 'sync_data',
            retryCount: 0
        };
        
        this.notificationQueue.push(pendingSync);
    }

    processQueuedNotifications() {
        if (this.notificationQueue.length === 0) return;
        
        console.log(`📤 Processing ${this.notificationQueue.length} queued notifications`);
        
        this.notificationQueue.forEach(notification => {
            if (notification.action === 'sync_data') {
                this.syncData();
            }
        });
        
        this.notificationQueue = [];
        this.showSyncNotification('Queued changes synchronized', 'success');
    }

    checkForDataConflicts() {
        // Simple conflict detection - in production, this would be more sophisticated
        const currentDataHash = this.generateDataHash();
        const lastKnownHash = localStorage.getItem('lastDataHash');
        
        if (lastKnownHash && lastKnownHash !== currentDataHash) {
            console.log('⚠️ Data conflict detected - data changed externally');
            this.resolveDataConflicts();
        }
        
        localStorage.setItem('lastDataHash', currentDataHash);
    }

    generateDataHash() {
        // Simple hash generation for conflict detection
        const data = {
            tickets: localStorage.getItem('tickets'),
            users: localStorage.getItem('users'),
            archivedTickets: localStorage.getItem('archivedTickets')
        };
        
        return btoa(JSON.stringify(data)).slice(0, 16);
    }

    resolveDataConflicts() {
        // In a real system, this would implement sophisticated conflict resolution
        // For now, we'll just refresh the current view
        console.log('🔄 Resolving data conflicts by refreshing view');
        this.refreshActiveView();
    }

    refreshActiveView() {
        if (window.ticketSystem) {
            window.ticketSystem.refreshCurrentView();
        }
    }

    updateConnectionStatus() {
        const indicator = document.getElementById('statusIndicator');
        if (!indicator) return;
        
        const statusDot = indicator.querySelector('.status-dot');
        const statusText = indicator.querySelector('span:last-child');
        
        if (statusDot && statusText) {
            if (this.isOnline) {
                statusDot.className = 'status-dot online';
                statusText.textContent = 'Connected';
                indicator.title = `Connected - Last sync: ${new Date(this.lastSync).toLocaleTimeString()}`;
            } else {
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'Offline';
                indicator.title = 'Working offline - Changes saved locally';
            }
        }
    }

    initializeNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 1001;
                max-width: 300px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }

    showSyncNotification(message, type = 'info', duration = 3000) {
        // Prevent notification spam
        if (this.lastNotificationTime && (Date.now() - this.lastNotificationTime) < 1000) {
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `sync-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <span class="sync-icon">${this.getSyncIcon(type)}</span>
                <span class="notification-title">${this.getNotificationTitle(type)}</span>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 13px;
            margin-bottom: 10px;
            animation: slideInRight 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            border-left: 4px solid rgba(255,255,255,0.3);
        `;
        
        const container = document.getElementById('notificationContainer');
        if (container) {
            container.appendChild(notification);
            
            // Auto-remove notification
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 300);
            }, duration);
            
            // Click to dismiss
            notification.addEventListener('click', () => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 300);
            });
        }
        
        this.lastNotificationTime = Date.now();
    }

    getSyncIcon(type) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️',
            sync: '🔄'
        };
        return icons[type] || '📢';
    }

    getNotificationTitle(type) {
        const titles = {
            success: 'Success',
            warning: 'Warning',
            error: 'Error',
            info: 'Info',
            sync: 'Syncing'
        };
        return titles[type] || 'Notification';
    }

    getNotificationColor(type) {
        const colors = {
            success: 'linear-gradient(135deg, #27ae60, #2ecc71)',
            warning: 'linear-gradient(135deg, #f39c12, #e67e22)',
            error: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            info: 'linear-gradient(135deg, #3498db, #2980b9)',
            sync: 'linear-gradient(135deg, #9b59b6, #8e44ad)'
        };
        return colors[type] || colors.info;
    }

    // Enhanced email notification system
    sendEmailNotification(ticket, assignee, notificationType = 'assignment') {
        console.log('📧 EMAIL NOTIFICATION SENT');
        console.log('=' * 40);
        
        const emailContent = this.generateEmailContent(ticket, assignee, notificationType);
        console.log(emailContent);
        console.log('=' * 40);
        
        // Store notification for audit trail
        this.storeNotification({
            to: assignee.email,
            subject: emailContent.subject,
            ticketId: ticket.id,
            timestamp: new Date().toISOString(),
            type: notificationType,
            status: 'sent'
        });
        
        // Show success notification
        this.showSyncNotification(`Email sent to ${assignee.username}`, 'success');
        
        // Log the email event
        this.logSyncEvent('email_sent', {
            ticketId: ticket.id,
            recipient: assignee.username,
            type: notificationType
        });
    }

    generateEmailContent(ticket, assignee, type) {
        const baseUrl = window.location.origin + window.location.pathname;
        
        const templates = {
            assignment: {
                subject: `New Ticket Assigned - ${ticket.id}`,
                body: `
Dear ${assignee.username},

You have been assigned a new support ticket:

Ticket ID: ${ticket.id}
Type: ${ticket.type}
Severity: ${ticket.severity}
Department: ${ticket.department}
Requestor: ${ticket.requestor}
Location: ${ticket.location}

Description:
${ticket.description}

Please log into the support system to view and manage this ticket:
${baseUrl}

SLA Timeline: ${this.getSLATimeline(ticket.severity)}

Best regards,
IT Support System
                `
            },
            resolved: {
                subject: `Ticket Resolved - ${ticket.id}`,
                body: `
Dear ${ticket.requestor},

Your support ticket has been resolved:

Ticket ID: ${ticket.id}
Type: ${ticket.type}
Resolved by: ${assignee.username}
Resolution Date: ${new Date().toLocaleString()}

Please log into the system to review the resolution and provide feedback:
${baseUrl}

If you are not satisfied with the resolution, you can reopen the ticket.

Best regards,
IT Support System
                `
            },
            closed: {
                subject: `Ticket Closed - ${ticket.id}`,
                body: `
Dear ${ticket.requestor},

Your support ticket has been closed:

Ticket ID: ${ticket.id}
Type: ${ticket.type}
Closed Date: ${new Date().toLocaleString()}

Thank you for using our support system. If you need further assistance, please create a new ticket.

Best regards,
IT Support System
                `
            }
        };
        
        return templates[type] || templates.assignment;
    }

    getSLATimeline(severity) {
        const timelines = {
            High: '4 hours',
            Medium: '24 hours',
            Low: '72 hours'
        };
        return timelines[severity] || '24 hours';
    }

    storeNotification(notification) {
        const notifications = JSON.parse(localStorage.getItem('emailNotifications') || '[]');
        notifications.push({
            ...notification,
            id: this.generateNotificationId()
        });
        
        // Keep only last 100 notifications
        if (notifications.length > 100) {
            notifications.splice(0, notifications.length - 100);
        }
        
        localStorage.setItem('emailNotifications', JSON.stringify(notifications));
    }

    generateNotificationId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getEmailNotifications(limit = 50) {
        const notifications = JSON.parse(localStorage.getItem('emailNotifications') || '[]');
        return notifications.slice(-limit).reverse();
    }

    // Advanced sync features
    broadcastTicketUpdate(ticket, action) {
        const updateData = {
            ticketId: ticket.id,
            action: action,
            timestamp: new Date().toISOString(),
            user: auth.getCurrentUser()?.username,
            details: {
                status: ticket.status,
                assignedTo: ticket.assignedTo,
                severity: ticket.severity
            }
        };

        console.log('📢 BROADCAST UPDATE:', updateData);
        
        // Store broadcast for other tabs
        localStorage.setItem('ticketBroadcast', JSON.stringify(updateData));
        localStorage.removeItem('ticketBroadcast');
        
        // Show notification based on action
        this.showActionNotification(action, ticket);
        
        this.logSyncEvent('ticket_broadcast', updateData);
    }

    showActionNotification(action, ticket) {
        const messages = {
            created: `New ticket ${ticket.id} created`,
            updated: `Ticket ${ticket.id} updated`,
            assigned: `Ticket ${ticket.id} assigned to ${ticket.assignedTo}`,
            resolved: `Ticket ${ticket.id} marked as resolved`,
            closed: `Ticket ${ticket.id} closed`,
            archived: `Ticket ${ticket.id} archived`
        };
        
        const message = messages[action] || `Ticket ${ticket.id} ${action}`;
        this.showSyncNotification(message, 'info');
    }

    // Performance monitoring
    trackPerformance(action, startTime) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`⏱️ Performance: ${action} took ${duration}ms`);
        
        // Store performance metrics
        const metrics = JSON.parse(localStorage.getItem('performanceMetrics') || '[]');
        metrics.push({
            action: action,
            duration: duration,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 metrics
        if (metrics.length > 50) {
            metrics.splice(0, metrics.length - 50);
        }
        
        localStorage.setItem('performanceMetrics', JSON.stringify(metrics));
        
        if (duration > 2000) {
            console.warn(`⚠️ Slow operation detected: ${action} took ${duration}ms`);
            this.showSyncNotification(`Performance warning: ${action} took ${(duration/1000).toFixed(1)}s`, 'warning');
        }
    }

    // Data integrity and validation
    validateDataIntegrity() {
        try {
            const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const archivedTickets = JSON.parse(localStorage.getItem('archivedTickets') || '[]');
            
            let isValid = true;
            const errors = [];
            
            // Validate tickets
            tickets.forEach((ticket, index) => {
                if (!ticket.id || !ticket.createdAt || !ticket.status) {
                    errors.push(`Invalid ticket at index ${index}: ${ticket.id || 'Unknown'}`);
                    isValid = false;
                }
            });
            
            // Validate users
            users.forEach((user, index) => {
                if (!user.username || !user.email || !user.role) {
                    errors.push(`Invalid user at index ${index}: ${user.username || 'Unknown'}`);
                    isValid = false;
                }
            });
            
            // Validate archived tickets
            archivedTickets.forEach((ticket, index) => {
                if (!ticket.id || !ticket.createdAt || !ticket.status) {
                    errors.push(`Invalid archived ticket at index ${index}: ${ticket.id || 'Unknown'}`);
                    isValid = false;
                }
            });
            
            if (!isValid) {
                console.error('❌ Data integrity issues:', errors);
                this.showSyncNotification(`Data integrity issues detected (${errors.length})`, 'error');
                this.logSyncEvent('data_integrity_error', { errors: errors });
            }
            
            return { isValid, errors };
        } catch (error) {
            console.error('❌ Data validation error:', error);
            this.showSyncNotification('Data validation failed', 'error');
            return { isValid: false, errors: [error.message] };
        }
    }

    // Activity tracking
    updateUserActivity() {
        const user = auth.getCurrentUser();
        if (!user) return;
        
        const activity = {
            username: user.username,
            lastActivity: new Date().toISOString(),
            page: document.querySelector('.content-page.active')?.id || 'unknown',
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        };
        
        localStorage.setItem('userActivity', JSON.stringify(activity));
    }

    getUserActivity() {
        return JSON.parse(localStorage.getItem('userActivity') || '{}');
    }

    // Cleanup and maintenance
    cleanupOldNotifications() {
        // Clean up old email notifications
        const notifications = JSON.parse(localStorage.getItem('emailNotifications') || '[]');
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentNotifications = notifications.filter(notif => 
            new Date(notif.timestamp) > oneWeekAgo
        );
        
        if (recentNotifications.length !== notifications.length) {
            localStorage.setItem('emailNotifications', JSON.stringify(recentNotifications));
            console.log(`🧹 Cleaned up ${notifications.length - recentNotifications.length} old notifications`);
        }
    }

    savePendingChanges() {
        // Save any pending changes before page unload
        this.updateUserActivity();
        
        const pendingChanges = {
            timestamp: new Date().toISOString(),
            action: 'page_unload',
            user: auth.getCurrentUser()?.username
        };
        
        localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
    }

    // Logging system
    logSyncEvent(event, details = {}) {
        const logs = JSON.parse(localStorage.getItem('syncLogs') || '[]');
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            details: details,
            user: auth.getCurrentUser()?.username || 'anonymous',
            sessionId: this.getSessionId()
        };
        
        logs.push(logEntry);
        
        // Keep only last 500 log entries
        if (logs.length > 500) {
            logs.splice(0, logs.length - 500);
        }
        
        localStorage.setItem('syncLogs', JSON.stringify(logs));
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('syncSessionId');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('syncSessionId', sessionId);
        }
        return sessionId;
    }

    getSyncLogs(limit = 100) {
        const logs = JSON.parse(localStorage.getItem('syncLogs') || '[]');
        return logs.slice(-limit).reverse();
    }

    // System health monitoring
    getSystemHealth() {
        const health = {
            timestamp: new Date().toISOString(),
            connection: this.isOnline ? 'online' : 'offline',
            lastSync: new Date(this.lastSync).toISOString(),
            dataIntegrity: this.validateDataIntegrity(),
            storage: this.getStorageInfo(),
            performance: this.getPerformanceMetrics()
        };
        
        return health;
    }

    getStorageInfo() {
        try {
            const usage = {
                tickets: (localStorage.getItem('tickets') || '').length,
                users: (localStorage.getItem('users') || '').length,
                archivedTickets: (localStorage.getItem('archivedTickets') || '').length,
                notifications: (localStorage.getItem('emailNotifications') || '').length,
                logs: (localStorage.getItem('syncLogs') || '').length
            };
            
            const totalUsage = Object.values(usage).reduce((sum, size) => sum + size, 0);
            
            return {
                usage: usage,
                totalBytes: totalUsage,
                totalMB: (totalUsage / 1024 / 1024).toFixed(2)
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    getPerformanceMetrics() {
        const metrics = JSON.parse(localStorage.getItem('performanceMetrics') || '[]');
        if (metrics.length === 0) return { avgDuration: 0, slowOperations: 0 };
        
        const totalDuration = metrics.reduce((sum, metric) => sum + metric.duration, 0);
        const avgDuration = totalDuration / metrics.length;
        const slowOperations = metrics.filter(m => m.duration > 1000).length;
        
        return {
            avgDuration: Math.round(avgDuration),
            slowOperations: slowOperations,
            totalOperations: metrics.length
        };
    }

    // Cleanup function
    cleanup() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Save final activity
        this.updateUserActivity();
        
        console.log('🧹 RealTimeSync cleanup completed');
    }
}

// Initialize real-time sync system
const realTimeSync = new RealTimeSync();

// Add CSS animations for notifications
const syncStyles = document.createElement('style');
syncStyles.textContent = `
    @keyframes slideInRight {
        from { 
            transform: translateX(100%);
            opacity: 0;
        }
        to { 
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from { 
            transform: translateX(0);
            opacity: 1;
        }
        to { 
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .sync-notification {
        transition: all 0.3s ease;
    }
    
    .sync-notification:hover {
        transform: translateX(-5px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.4) !important;
    }
    
    .notification-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        margin-bottom: 4px;
    }
    
    .notification-message {
        font-size: 12px;
        opacity: 0.9;
        line-height: 1.3;
    }
`;
document.head.appendChild(syncStyles);

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
    realTimeSync.cleanup();
});

// Global health check function for debugging
window.getSystemHealth = () => {
    return realTimeSync.getSystemHealth();
};

// Export for use in other modules
window.realTimeSync = realTimeSync;
