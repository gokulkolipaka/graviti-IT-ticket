// Real-time synchronization system
class RealtimeSystem {
    constructor() {
        this.lastUpdate = Date.now();
        this.syncInterval = null;
        this.isConnected = true;
        this.init();
    }

    init() {
        // Listen for localStorage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'tickets') {
                this.handleTicketUpdate();
            }
        });

        // Start periodic sync
        this.startSync();
    }

    startSync() {
        this.syncInterval = setInterval(() => {
            this.checkForUpdates();
        }, 2000); // Check every 2 seconds
    }

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    checkForUpdates() {
        // Simulate checking for updates
        const currentTime = Date.now();
        const timeDiff = currentTime - this.lastUpdate;
        
        // Update connection status
        this.updateConnectionStatus(true);
        
        // Check if tickets were updated
        if (window.ticketSystem && window.ticketSystem.needsRefresh) {
            this.handleTicketUpdate();
            window.ticketSystem.needsRefresh = false;
        }
    }

    handleTicketUpdate() {
        if (window.ticketSystem) {
            // Flash indicator for new updates
            this.flashUpdateIndicator();
            
            // Refresh current view
            window.ticketSystem.refreshCurrentView();
        }
    }

    flashUpdateIndicator() {
        const statusDot = document.getElementById('connectionStatus');
        if (statusDot) {
            statusDot.style.background = '#f39c12';
            setTimeout(() => {
                statusDot.style.background = '#27ae60';
            }, 500);
        }
    }

    updateConnectionStatus(connected) {
        const statusDot = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        if (statusDot && statusText) {
            if (connected) {
                statusDot.classList.remove('disconnected');
                statusText.textContent = 'Connected';
                this.isConnected = true;
            } else {
                statusDot.classList.add('disconnected');
                statusText.textContent = 'Disconnected';
                this.isConnected = false;
            }
        }
    }

    broadcastUpdate(type, data) {
        // Trigger custom event for cross-tab communication
        localStorage.setItem('lastUpdate', JSON.stringify({
            type: type,
            data: data,
            timestamp: Date.now()
        }));
        
        // Remove the item to trigger storage event again next time
        setTimeout(() => {
            localStorage.removeItem('lastUpdate');
        }, 100);
    }

    sendEmailNotification(ticket, assignedUser) {
        // Simulate email sending
        console.log(`📧 EMAIL NOTIFICATION SENT TO: ${assignedUser.email}`);
        console.log(`Subject: New Ticket Assigned - ${ticket.id}`);
        console.log(`Body: You have been assigned a new support ticket:
        
Ticket ID: ${ticket.id}
Type: ${ticket.type}
Severity: ${ticket.severity}
Department: ${ticket.department}
Description: ${ticket.description}
Requested by: ${ticket.requestor}

Please log in to the ticketing system to view full details and begin work.

Best regards,
Support Team`);
        
        // In a real implementation, this would call an email API
        this.showNotification(`Email sent to ${assignedUser.username} (${assignedUser.email})`, 'success');
        
        return true;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                ${message}
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1002;
            max-width: 300px;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize realtime system
const realtimeSystem = new RealtimeSystem();
