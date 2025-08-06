// Enhanced data storage and management system with archive and backup capabilities
class DataStorage {
    constructor() {
        this.storagePrefix = 'ticketing_system_';
        this.compressionEnabled = true;
        this.encryptionEnabled = false;
        this.maxStorageSize = 50 * 1024 * 1024; // 50MB limit
        this.backupRetention = 30; // days
        this.archiveRetention = 365; // days
        this.init();
    }

    init() {
        this.checkStorageSupport();
        this.setupStorageQuotaMonitoring();
        this.migrateOldData();
        this.setupPeriodicCleanup();
        this.initializeBackupSystem();
    }

    checkStorageSupport() {
        if (typeof Storage === 'undefined') {
            console.error('❌ LocalStorage is not supported in this browser');
            throw new Error('Storage not supported');
        }
        
        // Test storage functionality
        try {
            const testKey = 'storage_test_' + Date.now();
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            console.log('✅ Storage system initialized successfully');
        } catch (e) {
            console.error('❌ LocalStorage is not accessible:', e);
            throw new Error('Storage not accessible: ' + e.message);
        }
    }

    setupStorageQuotaMonitoring() {
        // Modern quota API
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                const usage = estimate.usage || 0;
                const quota = estimate.quota || 0;
                
                console.log(`💾 Storage: ${(usage / 1024 / 1024).toFixed(2)} MB of ${(quota / 1024 / 1024).toFixed(2)} MB used`);
                
                if (usage / quota > 0.8) {
                    this.showStorageWarning(usage, quota);
                }
                
                // Store quota info
                this.save('storageQuota', {
                    usage: usage,
                    quota: quota,
                    usagePercentage: ((usage / quota) * 100).toFixed(2),
                    lastCheck: new Date().toISOString()
                });
            }).catch(err => {
                console.warn('⚠️ Could not estimate storage quota:', err);
            });
        }
    }

    showStorageWarning(usage, quota) {
        const usagePercent = ((usage / quota) * 100).toFixed(1);
        console.warn(`⚠️ Storage is ${usagePercent}% full. Consider cleaning up old data.`);
        
        if (window.realTimeSync) {
            window.realTimeSync.showSyncNotification(
                `Storage ${usagePercent}% full - Consider cleanup`,
                'warning',
                5000
            );
        }
        
        // Trigger automatic cleanup
        this.performAutomaticCleanup();
    }

    migrateOldData() {
        const currentVersion = this.load('dataVersion') || '1.0';
        
        console.log(`🔄 Checking data migration from version ${currentVersion}`);
        
        if (this.compareVersions(currentVersion, '1.1') < 0) {
            console.log('⬆️ Migrating to version 1.1');
            this.migrateToV1_1();
        }
        
        if (this.compareVersions(currentVersion, '1.2') < 0) {
            console.log('⬆️ Migrating to version 1.2');
            this.migrateToV1_2();
        }
        
        this.save('dataVersion', '1.2');
        console.log('✅ Data migration completed');
    }

    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            
            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }
        return 0;
    }

    migrateToV1_1() {
        // Add new fields to existing tickets
        const tickets = this.load('tickets');
        if (tickets && Array.isArray(tickets)) {
            const updatedTickets = tickets.map(ticket => {
                const updates = {};
                
                if (!ticket.priority) {
                    updates.priority = this.mapSeverityToPriority(ticket.severity);
                }
                if (!ticket.tags) {
                    updates.tags = [];
                }
                if (!ticket.department && !ticket.category) {
                    updates.department = 'Others';
                }
                
                return { ...ticket, ...updates };
            });
            
            this.save('tickets', updatedTickets);
            console.log('✅ Migrated tickets to version 1.1');
        }
    }

    migrateToV1_2() {
        // Initialize archive system
        const archivedTickets = this.load('archivedTickets');
        if (!archivedTickets) {
            this.save('archivedTickets', []);
            console.log('✅ Initialized archive system');
        }
        
        // Initialize backup history
        const backupHistory = this.load('backupHistory');
        if (!backupHistory) {
            this.save('backupHistory', []);
            console.log('✅ Initialized backup system');
        }
        
        // Add timestamps to existing users
        const users = this.load('users');
        if (users && Array.isArray(users)) {
            const updatedUsers = users.map(user => {
                if (!user.createdAt) {
                    user.createdAt = new Date().toISOString();
                }
                if (!user.updatedAt) {
                    user.updatedAt = user.createdAt;
                }
                return user;
            });
            
            this.save('users', updatedUsers);
            console.log('✅ Added timestamps to users');
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

    save(key, data, options = {}) {
        try {
            const fullKey = this.storagePrefix + key;
            
            // Create metadata
            const metadata = {
                data: data,
                timestamp: new Date().toISOString(),
                version: '1.2',
                size: 0,
                compressed: false,
                checksum: ''
            };
            
            // Calculate checksum for data integrity
            metadata.checksum = this.calculateChecksum(JSON.stringify(data));
            
            let dataToStore = JSON.stringify(metadata);
            metadata.size = new Blob([dataToStore]).size;
            
            // Compress if enabled and data is large
            if (this.compressionEnabled && metadata.size > 1024) {
                try {
                    const compressed = this.compress(dataToStore);
                    if (compressed.length < dataToStore.length) {
                        dataToStore = compressed;
                        metadata.compressed = true;
                    }
                } catch (compressionError) {
                    console.warn('⚠️ Compression failed:', compressionError);
                }
            }
            
            // Check storage limits
            this.checkStorageLimits(dataToStore, key);
            
            // Store the data
            localStorage.setItem(fullKey, dataToStore);
            
            // Update storage statistics
            this.updateStorageStats(key, metadata.size);
            
            // Log successful save
            this.logStorageOperation('save', key, metadata.size);
            
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to save data for key '${key}':`, error);
            
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded(key);
            }
            
            return false;
        }
    }

    load(key, options = {}) {
        try {
            const fullKey = this.storagePrefix + key;
            const stored = localStorage.getItem(fullKey);
            
            if (!stored) return null;
            
            let parsedData;
            
            try {
                // Try to parse as new format with metadata
                parsedData = JSON.parse(stored);
                
                // Handle compressed data
                if (parsedData.compressed) {
                    const decompressed = this.decompress(stored);
                    parsedData = JSON.parse(decompressed);
                }
                
                // Verify checksum if available
                if (parsedData.checksum && parsedData.data) {
                    const calculatedChecksum = this.calculateChecksum(JSON.stringify(parsedData.data));
                    if (calculatedChecksum !== parsedData.checksum) {
                        console.warn(`⚠️ Data integrity warning for key '${key}' - checksum mismatch`);
                        this.logStorageOperation('integrity_warning', key);
                    }
                }
                
            } catch (parseError) {
                // Fallback for old data format
                console.log(`🔄 Loading legacy data format for key '${key}'`);
                try {
                    parsedData = { data: JSON.parse(stored) };
                } catch (legacyError) {
                    console.error(`❌ Failed to parse data for key '${key}':`, legacyError);
                    return null;
                }
            }
            
            // Log successful load
            this.logStorageOperation('load', key);
            
            // Return data (handle both new and legacy formats)
            return parsedData.data !== undefined ? parsedData.data : parsedData;
            
        } catch (error) {
            console.error(`❌ Failed to load data for key '${key}':`, error);
            return null;
        }
    }

    remove(key) {
        try {
            const fullKey = this.storagePrefix + key;
            const existed = localStorage.getItem(fullKey) !== null;
            
            localStorage.removeItem(fullKey);
            
            if (existed) {
                this.updateStorageStats(key, 0, true);
                this.logStorageOperation('remove', key);
            }
            
            return true;
        } catch (error) {
            console.error(`❌ Failed to remove data for key '${key}':`, error);
            return false;
        }
    }

    clear(confirmation = false) {
        if (!confirmation) {
            throw new Error('Clear operation requires confirmation parameter');
        }
        
        try {
            const keys = this.getAllKeys();
            let removedCount = 0;
            
            keys.forEach(key => {
                if (this.remove(key)) {
                    removedCount++;
                }
            });
            
            console.log(`🗑️ Cleared ${removedCount} storage entries`);
            this.logStorageOperation('clear_all', 'system', 0, { removedCount });
            
            return true;
        } catch (error) {
            console.error('❌ Failed to clear storage:', error);
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
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith(this.storagePrefix)) {
                total += localStorage[key].length;
            }
        });
        
        return total;
    }

    getStorageInfo() {
        const keys = this.getAllKeys();
        const size = this.getStorageSize();
        const stats = this.load('storageStats') || {};
        
        return {
            keys: keys,
            keyCount: keys.length,
            totalSize: size,
            sizeInMB: (size / 1024 / 1024).toFixed(2),
            stats: stats,
            lastCleanup: this.load('lastCleanup'),
            version: this.load('dataVersion')
        };
    }

    checkStorageLimits(dataToStore, key) {
        const currentSize = this.getStorageSize();
        const newDataSize = new Blob([dataToStore]).size;
        const totalSize = currentSize + newDataSize;
        
        if (totalSize > this.maxStorageSize) {
            console.warn(`⚠️ Storage limit approaching: ${(totalSize/1024/1024).toFixed(2)}MB / ${(this.maxStorageSize/1024/1024).toFixed(2)}MB`);
            
            // Try automatic cleanup
            this.performAutomaticCleanup();
            
            // Check again after cleanup
            const newCurrentSize = this.getStorageSize();
            if (newCurrentSize + newDataSize > this.maxStorageSize) {
                throw new Error(`Storage quota would be exceeded. Current: ${(newCurrentSize/1024/1024).toFixed(2)}MB, Adding: ${(newDataSize/1024).toFixed(2)}KB`);
            }
        }
    }

    updateStorageStats(key, size, isRemoval = false) {
        const stats = this.load('storageStats') || {};
        
        if (isRemoval) {
            delete stats[key];
        } else {
            stats[key] = {
                size: size,
                lastModified: new Date().toISOString()
            };
        }
        
        // Don't save stats using the regular save method to avoid recursion
        localStorage.setItem(this.storagePrefix + 'storageStats', JSON.stringify(stats));
    }

    // Compression methods (simple implementation)
    compress(data) {
        // In a real implementation, you would use a proper compression library like pako
        // This is a simple placeholder
        try {
            return btoa(unescape(encodeURIComponent(data)));
        } catch (error) {
            console.warn('⚠️ Compression failed:', error);
            return data;
        }
    }

    decompress(data) {
        // Simple decompression placeholder
        try {
            return decodeURIComponent(escape(atob(data)));
        } catch (error) {
            console.warn('⚠️ Decompression failed:', error);
            return data;
        }
    }

    // Checksum calculation for data integrity
    calculateChecksum(data) {
        let hash = 0;
        if (data.length === 0) return hash.toString();
        
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(16);
    }

    handleStorageQuotaExceeded(key) {
        console.warn(`⚠️ Storage quota exceeded while saving '${key}'. Attempting cleanup...`);
        
        if (window.realTimeSync) {
            window.realTimeSync.showSyncNotification(
                'Storage full - Cleaning up old data',
                'warning'
            );
        }
        
        this.performAutomaticCleanup();
    }

    performAutomaticCleanup() {
        console.log('🧹 Performing automatic cleanup...');
        
        let cleanedSize = 0;
        
        // Clean old notifications
        cleanedSize += this.cleanupOldNotifications();
        
        // Clean old logs
        cleanedSize += this.cleanupOldLogs();
        
        // Clean old performance metrics
        cleanedSize += this.cleanupOldMetrics();
        
        // Clean old backup history
        cleanedSize += this.cleanupOldBackups();
        
        // Update last cleanup timestamp
        this.save('lastCleanup', {
            timestamp: new Date().toISOString(),
            cleanedSize: cleanedSize,
            trigger: 'automatic'
        });
        
        console.log(`✅ Cleanup completed. Freed ${(cleanedSize/1024).toFixed(2)} KB`);
        
        if (cleanedSize > 0 && window.realTimeSync) {
            window.realTimeSync.showSyncNotification(
                `Cleanup completed - Freed ${(cleanedSize/1024).toFixed(2)} KB`,
                'success'
            );
        }
        
        return cleanedSize;
    }

    cleanupOldNotifications() {
        const notifications = this.load('emailNotifications') || [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days
        
        const originalSize = JSON.stringify(notifications).length;
        const recentNotifications = notifications.filter(notif => 
            new Date(notif.timestamp) > cutoffDate
        );
        
        if (recentNotifications.length !== notifications.length) {
            this.save('emailNotifications', recentNotifications);
            const cleanedSize = originalSize - JSON.stringify(recentNotifications).length;
            console.log(`🗑️ Cleaned up ${notifications.length - recentNotifications.length} old notifications`);
            return cleanedSize;
        }
        
        return 0;
    }

    cleanupOldLogs() {
        const logs = this.load('syncLogs') || [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days
        
        const originalSize = JSON.stringify(logs).length;
        const recentLogs = logs.filter(log => 
            new Date(log.timestamp) > cutoffDate
        );
        
        if (recentLogs.length !== logs.length) {
            this.save('syncLogs', recentLogs);
            const cleanedSize = originalSize - JSON.stringify(recentLogs).length;
            console.log(`🗑️ Cleaned up ${logs.length - recentLogs.length} old log entries`);
            return cleanedSize;
        }
        
        return 0;
    }

    cleanupOldMetrics() {
        const metrics = this.load('performanceMetrics') || [];
        
        if (metrics.length > 100) {
            const originalSize = JSON.stringify(metrics).length;
            const recentMetrics = metrics.slice(-50); // Keep last 50
            this.save('performanceMetrics', recentMetrics);
            
            const cleanedSize = originalSize - JSON.stringify(recentMetrics).length;
            console.log(`🗑️ Cleaned up ${metrics.length - recentMetrics.length} old performance metrics`);
            return cleanedSize;
        }
        
        return 0;
    }

    cleanupOldBackups() {
        const backupHistory = this.load('backupHistory') || [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.backupRetention);
        
        const originalSize = JSON.stringify(backupHistory).length;
        const recentBackups = backupHistory.filter(backup => 
            new Date(backup.timestamp) > cutoffDate
        );
        
        if (recentBackups.length !== backupHistory.length) {
            this.save('backupHistory', recentBackups);
            const cleanedSize = originalSize - JSON.stringify(recentBackups).length;
            console.log(`🗑️ Cleaned up ${backupHistory.length - recentBackups.length} old backup entries`);
            return cleanedSize;
        }
        
        return 0;
    }

    setupPeriodicCleanup() {
        // Run cleanup every 6 hours
        setInterval(() => {
            const lastCleanup = this.load('lastCleanup');
            const sixHoursAgo = new Date();
            sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
            
            if (!lastCleanup || new Date(lastCleanup.timestamp) < sixHoursAgo) {
                console.log('⏰ Running scheduled cleanup...');
                this.performAutomaticCleanup();
            }
        }, 6 * 60 * 60 * 1000); // 6 hours
    }

    initializeBackupSystem() {
        // Ensure backup system is ready
        const backupHistory = this.load('backupHistory');
        if (!backupHistory) {
            this.save('backupHistory', []);
        }
        
        // Set up automatic backup reminder
        const lastBackup = this.getLastBackupTime();
        if (!lastBackup || this.daysSince(lastBackup) > 7) {
            console.log('💾 Backup reminder: Consider creating a system backup');
        }
    }

    getLastBackupTime() {
        const backupHistory = this.load('backupHistory') || [];
        if (backupHistory.length === 0) return null;
        
        const latest = backupHistory.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        )[0];
        
        return new Date(latest.timestamp);
    }

    daysSince(date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Enhanced export/import with compression
    export(includeArchive = true, compress = true) {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                version: '1.2',
                exportedBy: this.getCurrentUser(),
                includesArchive: includeArchive,
                data: {}
            };
            
            // Get all relevant data
            const keys = this.getAllKeys();
            const dataKeys = keys.filter(key => 
                !key.startsWith('temp_') && 
                key !== 'storageStats' &&
                (includeArchive || key !== 'archivedTickets')
            );
            
            dataKeys.forEach(key => {
                const data = this.load(key);
                if (data !== null) {
                    exportData.data[key] = data;
                }
            });
            
            let result = JSON.stringify(exportData, null, 2);
            
            // Compress if requested
            if (compress) {
                try {
                    const compressed = this.compress(result);
                    if (compressed.length < result.length) {
                        exportData.compressed = true;
                        result = compressed;
                    }
                } catch (compressionError) {
                    console.warn('⚠️ Export compression failed:', compressionError);
                }
            }
            
            console.log(`📤 Export completed: ${(result.length/1024).toFixed(2)} KB`);
            
            return {
                success: true,
                data: result,
                size: result.length,
                compressed: exportData.compressed || false
            };
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    import(importData, clearExisting = false) {
        try {
            let data;
            
            // Parse import data
            try {
                data = JSON.parse(importData);
            } catch (parseError) {
                // Try decompression first
                try {
                    const decompressed = this.decompress(importData);
                    data = JSON.parse(decompressed);
                } catch (decompError) {
                    throw new Error('Invalid import data format');
                }
            }
            
            // Validate import data
            if (!data.data || !data.version) {
                throw new Error('Invalid import data structure');
            }
            
            console.log(`📥 Importing data from version ${data.version}`);
            
            // Backup current data before import
            const backupResult = this.createPreImportBackup();
            if (!backupResult.success) {
                console.warn('⚠️ Could not create pre-import backup');
            }
            
            // Clear existing data if requested
            if (clearExisting) {
                console.log('🗑️ Clearing existing data...');
                this.clear(true);
            }
            
            // Import data
            let importedCount = 0;
            Object.keys(data.data).forEach(key => {
                try {
                    this.save(key, data.data[key]);
                    importedCount++;
                } catch (saveError) {
                    console.error(`❌ Failed to import key '${key}':`, saveError);
                }
            });
            
            console.log(`✅ Import completed: ${importedCount} items imported`);
            
            // Log the import
            this.logStorageOperation('import', 'system', 0, {
                importedCount: importedCount,
                sourceVersion: data.version,
                clearExisting: clearExisting
            });
            
            return {
                success: true,
                importedCount: importedCount,
                sourceVersion: data.version
            };
            
        } catch (error) {
            console.error('❌ Import failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    createPreImportBackup() {
        const backupData = {
            timestamp: new Date().toISOString(),
            type: 'pre_import_backup',
            automatic: true
        };
        
        const exportResult = this.export(true, true);
        if (exportResult.success) {
            // Store backup reference
            const backupHistory = this.load('backupHistory') || [];
            backupHistory.push(backupData);
            this.save('backupHistory', backupHistory);
            
            return { success: true, backup: backupData };
        }
        
        return { success: false };
    }

    getCurrentUser() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return currentUser.username || 'anonymous';
        } catch {
            return 'anonymous';
        }
    }

    logStorageOperation(operation, key, size = 0, details = {}) {
        const logs = JSON.parse(localStorage.getItem(this.storagePrefix + 'operationLogs') || '[]');
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation: operation,
            key: key,
            size: size,
            user: this.getCurrentUser(),
            details: details
        };
        
        logs.push(logEntry);
        
        // Keep only last 200 operation logs
        if (logs.length > 200) {
            logs.splice(0, logs.length - 200);
        }
        
        localStorage.setItem(this.storagePrefix + 'operationLogs', JSON.stringify(logs));
    }

    getOperationLogs(limit = 50) {
        const logs = JSON.parse(localStorage.getItem(this.storagePrefix + 'operationLogs') || '[]');
        return logs.slice(-limit).reverse();
    }

    // Health check system
    performHealthCheck() {
        const results = {
            timestamp: new Date().toISOString(),
            storageAvailable: true,
            dataIntegrity: true,
            quotaStatus: 'OK',
            version: this.load('dataVersion'),
            issues: [],
            metrics: {}
        };
        
        try {
            // Test storage
            const testKey = 'health_check_' + Date.now();
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        } catch (e) {
            results.storageAvailable = false;
            results.issues.push('Storage not accessible: ' + e.message);
        }
        
        // Check data integrity
        try {
            const criticalKeys = ['tickets', 'users', 'archivedTickets'];
            criticalKeys.forEach(key => {
                const data = this.load(key);
                if (data && !Array.isArray(data)) {
                    results.dataIntegrity = false;
                    results.issues.push(`${key} data corrupted - not an array`);
                }
            });
        } catch (e) {
            results.dataIntegrity = false;
            results.issues.push('Data parsing error: ' + e.message);
        }
        
        // Check storage quota
        const storageInfo = this.getStorageInfo();
        const usageMB = parseFloat(storageInfo.sizeInMB);
        
        if (usageMB > 40) { // 40MB warning threshold
            results.quotaStatus = 'CRITICAL';
            results.issues.push('Storage usage critical: ' + usageMB + 'MB');
        } else if (usageMB > 20) { // 20MB warning threshold
            results.quotaStatus = 'WARNING';
            results.issues.push('Storage usage high: ' + usageMB + 'MB');
        }
        
        // Collect metrics
        results.metrics = {
            storageSize: storageInfo.sizeInMB + 'MB',
            keyCount: storageInfo.keyCount,
            lastCleanup: this.load('lastCleanup')?.timestamp,
            lastBackup: this.getLastBackupTime()?.toISOString()
        };
        
        console.log('🏥 Storage health check completed:', results);
        
        // Store health check result
        this.logStorageOperation('health_check', 'system', 0, results);
        
        return results;
    }

    // Repair functions
    repairCorruptedData() {
        console.log('🔧 Starting data repair process...');
        
        let repaired = 0;
        const keys = this.getAllKeys();
        
        keys.forEach(key => {
            try {
                const data = this.load(key);
                if (data === null) {
                    console.log(`⚠️ Could not load data for key: ${key}`);
                    // Attempt to load raw data and repair
                    const rawData = localStorage.getItem(this.storagePrefix + key);
                    if (rawData) {
                        // Try basic JSON repair
                        const repairedData = this.attemptJSONRepair(rawData);
                        if (repairedData) {
                            this.save(key, repairedData);
                            repaired++;
                            console.log(`✅ Repaired data for key: ${key}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Could not repair key '${key}':`, error);
            }
        });
        
        console.log(`🔧 Data repair completed. Repaired ${repaired} entries.`);
        return repaired;
    }

    attemptJSONRepair(rawData) {
        // Basic JSON repair attempts
        const repairStrategies = [
            // Remove trailing comma
            data => data.replace(/,(\s*[}\]])/g, '$1'),
            // Fix missing quotes on keys
            data => data.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":'),
            // Remove extra commas
            data => data.replace(/,+/g, ','),
        ];
        
        for (let strategy of repairStrategies) {
            try {
                const repaired = strategy(rawData);
                const parsed = JSON.parse(repaired);
                return parsed;
            } catch (error) {
                // Continue to next strategy
            }
        }
        
        return null;
    }
}

// Initialize storage system
const dataStorage = new DataStorage();

// Make it globally available
window.dataStorage = dataStorage;

// Periodic health checks (every 5 minutes)
setInterval(() => {
    const health = dataStorage.performHealthCheck();
    if (health.issues.length > 0) {
        console.warn('🚨 Storage health issues detected:', health.issues);
        
        if (window.realTimeSync) {
            window.realTimeSync.showSyncNotification(
                `Storage issues detected (${health.issues.length})`,
                'warning'
            );
        }
    }
}, 5 * 60 * 1000); // 5 minutes

// Global functions for debugging
window.getStorageHealth = () => dataStorage.performHealthCheck();
window.repairStorage = () => dataStorage.repairCorruptedData();
window.cleanupStorage = () => dataStorage.performAutomaticCleanup();

console.log('💾 Enhanced Data Storage System initialized');
