// Enhanced data storage and management system
class DataStorage {
    constructor() {
        this.storagePrefix = 'ticketing_system_';
        this.compressionEnabled = true;
        this.encryptionEnabled = false; // Set to true for production
        this.maxStorageSize = 10 * 1024 * 1024; // 10MB limit
        this.init();
    }

    init() {
        this.checkStorageSupport();
        this.setupStorageQuotaMonitoring();
        this.migrateOldData();
    }

    checkStorageSupport() {
        if (typeof Storage === 'undefined') {
            console.error('LocalStorage is not supported in this browser');
            throw new Error('Storage not supported');
        }
        
        // Check if localStorage is actually working
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (e) {
            console.error('LocalStorage is not accessible:', e);
            throw new Error('Storage not accessible');
        }
    }

    setupStorageQuotaMonitoring() {
        // Monitor storage usage
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                const usage = estimate.usage || 0;
                const quota = estimate.quota || 0;
                
                console.log(`Storage usage: ${(usage / 1024 / 1024).toFixed(2)} MB of ${(quota / 1024 / 1024).toFixed(2)} MB`);
                
                if (usage / quota > 0.8) {
                    this.showStorageWarning();
                }
            });
        }
    }

    showStorageWarning() {
        console.warn('Storage is nearly full. Consider cleaning up old data.');
        // You could show a user notification here
    }

    migrateOldData() {
        // Handle data migrations for version updates
        const currentVersion = this.load('dataVersion') || '1.0';
        
        if (currentVersion < '1.1') {
            this.migrateToV1_1();
        }
        
        this.save('dataVersion', '1.1');
    }

    migrateToV1_1() {
        // Example migration: add new fields to existing tickets
        const tickets = this.load('tickets');
        if (tickets && Array.isArray(tickets)) {
            const updatedTickets = tickets.map(ticket => {
                if (!ticket.priority) {
                    ticket.priority = this.mapSeverityToPriority(ticket.severity);
                }
                if (!ticket.tags) {
                    ticket.tags = [];
                }
                return ticket;
            });
            this.save('tickets', updatedTickets);
            console.log('Migrated tickets to version 1.1');
        }
    }

    mapSeverityToPriority(severity) {
        const mapping = {
            'High': 'P1',
            'Medium': 'P2',
            'Low': 'P3'
        };
        return mapping[severity] || 'P3';
    }

    save(key, data) {
        try {
            const fullKey = this.storagePrefix + key;
            let dataToStore = data;
            
            // Add metadata
            const metadata = {
                data: dataToStore,
                timestamp: new Date().toISOString(),
                version: '1.1'
            };
            
            // Compress data if enabled
            if (this.compressionEnabled) {
                metadata.compressed = true;
                // Simple compression simulation - in production use proper compression
                dataToStore = this.compress(JSON.stringify(metadata));
            } else {
                dataToStore = JSON.stringify(metadata);
            }
            
            // Check storage size
            const currentSize = this.getStorageSize();
            const newDataSize = new Blob([dataToStore]).size;
            
            if (currentSize + newDataSize > this.maxStorageSize) {
                this.cleanupOldData();
            }
            
            localStorage.setItem(fullKey, dataToStore);
            return true;
            
        } catch (error) {
            console.error('Failed to save data:', error);
            
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
            
            return false;
        }
    }

    load(key) {
        try {
            const fullKey = this.storagePrefix + key;
            const stored = localStorage.getItem(fullKey);
            
            if (!stored) return null;
            
            let parsedData;
            
            // Check if data is compressed
            try {
                parsedData = JSON.parse(stored);
                if (parsedData.compressed) {
                    parsedData = JSON.parse(this.decompress(stored));
                }
            } catch (e) {
                // Fallback for old data format
                parsedData = JSON.parse(stored);
            }
            
            // Return data with metadata if available
            if (parsedData.data !== undefined) {
                return parsedData.data;
            }
            
            return parsedData;
            
        } catch (error) {
            console.error('Failed to load data:', error);
            return null;
        }
    }

    remove(key) {
        try {
            const fullKey = this.storagePrefix + key;
            localStorage.removeItem(fullKey);
            return true;
        } catch (error) {
            console.error('Failed to remove data:', error);
            return false;
        }
    }

    clear() {
        try {
            const keys = Object.keys(localStorage).filter(key => 
                key.startsWith(this.storagePrefix)
            );
            
            keys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    getAllKeys() {
        return Object.keys(localStorage)
            .filter(key => key.startsWith(this.storagePrefix))
            .map(key => key.replace(this.storagePrefix, ''));
    }

    getStorageSize() {
        let total = 0;
        
        for (let key in localStorage) {
            if (key.startsWith(this.storagePrefix)) {
                total += localStorage[key].length;
            }
        }
        
        return total;
    }

    getStorageInfo() {
        const keys = this.getAllKeys();
        const size = this.getStorageSize();
        
        return {
            keys: keys,
            keyCount: keys.length,
            totalSize: size,
            sizeInMB: (size / 1024 / 1024).toFixed(2)
        };
    }

    compress(data) {
        // Simple compression simulation
        // In production, use a proper compression library like pako
        return data;
    }

    decompress(data) {
        // Simple decompression simulation
        // In production, use a proper compression library like pako
        return data;
    }

    handleStorageQuotaExceeded() {
        console.warn('Storage quota exceeded. Cleaning up old data...');
        this.cleanupOldData();
    }

    cleanupOldData() {
        try {
            // Remove old notifications
            const notifications = this.load('emailNotifications') || [];
            if (notifications.length > 20) {
                const recentNotifications = notifications.slice(-20);
                this.save('emailNotifications', recentNotifications);
            }
            
            // Remove old logs
            this.remove('applicationLogs');
            
            console.log('Old data cleaned up');
            
        } catch (error) {
            console.error('Failed to cleanup old data:', error);
        }
    }

    export() {
        try {
            const data = {};
            const keys = this.getAllKeys();
            
            keys.forEach(key => {
                data[key] = this.load(key);
            });
            
            return {
                data: data,
                exportDate: new Date().toISOString(),
                version: '1.1'
            };
            
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }

    import(importData) {
        try {
            if (!importData.data) {
                throw new Error('Invalid import data format');
            }
            
            // Validate data before import
            this.validateImportData(importData.data);
            
            // Clear existing data
            this.clear();
            
            // Import new data
            Object.keys(importData.data).forEach(key => {
                this.save(key, importData.data[key]);
            });
            
            return true;
            
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    validateImportData(data) {
        // Validate tickets
        if (data.tickets && Array.isArray(data.tickets)) {
            data.tickets.forEach(ticket => {
                if (!ticket.id || !ticket.createdAt || !ticket.status) {
                    throw new Error('Invalid ticket data in import');
                }
            });
        }
        
        // Validate users
        if (data.users && Array.isArray(data.users)) {
            data.users.forEach(user => {
                if (!user.username || !user.email || !user.role) {
                    throw new Error('Invalid user data in import');
                }
            });
        }
    }

    // Backup functionality
    createBackup() {
        const exportData = this.export();
        if (!exportData) return false;
        
        const backupString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([backupString], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ticketing_system_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
    }

    restoreBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    const success = this.import(backupData);
                    
                    if (success) {
                        resolve(true);
                    } else {
                        reject(new Error('Failed to restore backup'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read backup file'));
            };
            
            reader.readAsText(file);
        });
    }

    // Search functionality
    searchTickets(query) {
        const tickets = this.load('tickets') || [];
        const searchTerm = query.toLowerCase();
        
        return tickets.filter(ticket => 
            ticket.id.toLowerCase().includes(searchTerm) ||
            ticket.description.toLowerCase().includes(searchTerm) ||
            ticket.type.toLowerCase().includes(searchTerm) ||
            ticket.requestor.toLowerCase().includes(searchTerm) ||
            (ticket.assignedTo && ticket.assignedTo.toLowerCase().includes(searchTerm))
        );
    }

    // Analytics
    getAnalytics() {
        const tickets = this.load('tickets') || [];
        const users = this.load('users') || [];
        
        return {
            totalTickets: tickets.length,
            openTickets: tickets.filter(t => t.status === 'Open').length,
            closedTickets: tickets.filter(t => t.status === 'Closed').length,
            totalUsers: users.length,
            adminUsers: users.filter(u => u.role === 'admin').length,
            teamMembers: users.filter(u => u.role === 'team').length,
            avgResolutionTime: this.calculateAvgResolutionTime(tickets),
            ticketsByMonth: this.getTicketsByMonth(tickets)
        };
    }

    calculateAvgResolutionTime(tickets) {
        const closedTickets = tickets.filter(t => t.status === 'Closed');
        if (closedTickets.length === 0) return 0;
        
        const totalTime = closedTickets.reduce((sum, ticket) => {
            const created = new Date(ticket.createdAt);
            const updated = new Date(ticket.updatedAt);
            return sum + (updated - created);
        }, 0);
        
        return Math.round(totalTime / closedTickets.length / (1000 * 60 * 60)); // Hours
    }

    getTicketsByMonth(tickets) {
        const monthlyData = {};
        
        tickets.forEach(ticket => {
            const month = new Date(ticket.createdAt).toISOString().slice(0, 7);
            monthlyData[month] = (monthlyData[month] || 0) + 1;
        });
        
        return monthlyData;
    }

    // Health check
    performHealthCheck() {
        const results = {
            storageAvailable: true,
            dataIntegrity: true,
            quotaStatus: 'OK',
            issues: []
        };
        
        try {
            // Test storage
            localStorage.setItem('health_check', 'test');
            localStorage.removeItem('health_check');
        } catch (e) {
            results.storageAvailable = false;
            results.issues.push('Storage not accessible');
        }
        
        // Check data integrity
        try {
            const tickets = this.load('tickets');
            const users = this.load('users');
            
            if (tickets && !Array.isArray(tickets)) {
                results.dataIntegrity = false;
                results.issues.push('Tickets data corrupted');
            }
            
            if (users && !Array.isArray(users)) {
                results.dataIntegrity = false;
                results.issues.push('Users data corrupted');
            }
        } catch (e) {
            results.dataIntegrity = false;
            results.issues.push('Data parsing error');
        }
        
        // Check storage quota
        const storageInfo = this.getStorageInfo();
        if (parseInt(storageInfo.sizeInMB) > 8) {
            results.quotaStatus = 'WARNING';
            results.issues.push('Storage usage high');
        }
        
        return results;
    }
}

// Initialize storage system
const dataStorage = new DataStorage();

// Make it globally available
window.dataStorage = dataStorage;

// Periodic health checks
setInterval(() => {
    const health = dataStorage.performHealthCheck();
    if (health.issues.length > 0) {
        console.warn('Storage health issues:', health.issues);
    }
}, 300000); // Every 5 minutes
