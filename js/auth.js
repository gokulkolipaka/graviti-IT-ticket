// Authentication and User Management System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.initializeDefaultUsers();
    }

    initializeDefaultUsers() {
        if (!localStorage.getItem('users')) {
            const defaultUsers = [
                {
                    username: 'admin',
                    password: 'admin123',
                    email: 'admin@company.com',
                    role: 'admin',
                    department: 'Admin',
                    isFirstLogin: false
                },
                {
                    username: 'itteam1',
                    password: 'team123',
                    email: 'itteam1@company.com',
                    role: 'team',
                    department: 'Corporate',
                    isFirstLogin: false
                },
                {
                    username: 'itteam2',
                    password: 'team123',
                    email: 'itteam2@company.com',
                    role: 'team',
                    department: 'Corporate',
                    isFirstLogin: false
                },
                {
                    username: 'user1',
                    password: 'user123',
                    email: 'user1@company.com',
                    role: 'user',
                    department: 'HR',
                    isFirstLogin: false
                },
                {
                    username: 'user2',
                    password: 'user123',
                    email: 'user2@company.com',
                    role: 'user',
                    department: 'Manufacturing',
                    isFirstLogin: false
                },
                {
                    username: 'user3',
                    password: 'user123',
                    email: 'user3@company.com',
                    role: 'user',
                    department: 'Warehouse',
                    isFirstLogin: false
                }
            ];
            localStorage.setItem('users', JSON.stringify(defaultUsers));
        }
    }

    async authenticate(username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            // Log authentication event
            this.logAuthEvent('login', user.username);
            
            // Only show password change for first login
            if (user.isFirstLogin) {
                this.showPasswordChangeModal();
                return 'password_change_required';
            }
            
            return true;
        }
        
        // Log failed attempt
        this.logAuthEvent('login_failed', username);
        return false;
    }

    showPasswordChangeModal() {
        document.getElementById('passwordChangeModal').style.display = 'block';
    }

    changePassword(newPassword) {
        if (this.currentUser) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex(u => u.username === this.currentUser.username);
            
            if (userIndex !== -1) {
                const oldPassword = users[userIndex].password;
                users[userIndex].password = newPassword;
                users[userIndex].isFirstLogin = false;
                users[userIndex].passwordChangedAt = new Date().toISOString();
                this.currentUser.isFirstLogin = false;
                
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                // Log password change
                this.logAuthEvent('password_changed', this.currentUser.username);
                
                document.getElementById('passwordChangeModal').style.display = 'none';
                return true;
            }
        }
        return false;
    }

    resetPassword(username, email) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.email === email);
        
        if (user) {
            const tempPassword = 'temp' + Math.random().toString(36).substr(2, 8);
            const userIndex = users.findIndex(u => u.username === username);
            users[userIndex].password = tempPassword;
            users[userIndex].isFirstLogin = true;
            users[userIndex].passwordResetAt = new Date().toISOString();
            
            localStorage.setItem('users', JSON.stringify(users));
            
            // Log password reset
            this.logAuthEvent('password_reset', username);
            
            // In real implementation, this would send email
            alert(`Password reset successful! Your temporary password is: ${tempPassword}\nPlease change it after logging in.`);
            return true;
        }
        
        return false;
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    isTeamMember() {
        return this.currentUser && this.currentUser.role === 'team';
    }

    isUser() {
        return this.currentUser && this.currentUser.role === 'user';
    }

    getUserRole() {
        return this.currentUser ? this.currentUser.role : null;
    }

    logout() {
        if (this.currentUser) {
            this.logAuthEvent('logout', this.currentUser.username);
        }
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    addUser(userData) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        if (users.find(u => u.username === userData.username)) {
            throw new Error('Username already exists');
        }

        if (users.find(u => u.email === userData.email)) {
            throw new Error('Email already exists');
        }

        // Validate department
        const validDepartments = [
            'Corporate', 'HR', 'Manufacturing', 'Warehouse', 
            'QC', 'QA', 'Docu Cell', 'Admin', 'Engineering', 
            'Security', 'Stores', 'Others'
        ];
        
        if (!validDepartments.includes(userData.department)) {
            throw new Error('Invalid department selected');
        }

        const newUser = {
            username: userData.username,
            password: userData.password || 'temp123',
            email: userData.email,
            role: userData.role,
            department: userData.department,
            isFirstLogin: true,
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser?.username || 'system'
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Log user creation
        this.logAuthEvent('user_created', newUser.username, {
            createdBy: this.currentUser?.username,
            role: newUser.role,
            department: newUser.department
        });
        
        return newUser;
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    getTeamMembers() {
        return this.getUsers().filter(u => u.role === 'team' || u.role === 'admin');
    }

    getUsersByDepartment(department) {
        return this.getUsers().filter(u => u.department === department);
    }

    getUsersByRole(role) {
        return this.getUsers().filter(u => u.role === role);
    }

    deleteUser(username) {
        if (username === 'admin') {
            throw new Error('Cannot delete admin user');
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userToDelete = users.find(u => u.username === username);
        
        if (!userToDelete) {
            throw new Error('User not found');
        }
        
        const filteredUsers = users.filter(u => u.username !== username);
        localStorage.setItem('users', JSON.stringify(filteredUsers));
        
        // Log user deletion
        this.logAuthEvent('user_deleted', username, {
            deletedBy: this.currentUser?.username,
            role: userToDelete.role,
            department: userToDelete.department
        });
        
        return true;
    }

    updateUser(username, userData) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex !== -1) {
            const oldData = { ...users[userIndex] };
            users[userIndex] = { 
                ...users[userIndex], 
                ...userData,
                updatedAt: new Date().toISOString(),
                updatedBy: this.currentUser?.username
            };
            localStorage.setItem('users', JSON.stringify(users));
            
            // Log user update
            this.logAuthEvent('user_updated', username, {
                updatedBy: this.currentUser?.username,
                changes: this.getChangedFields(oldData, users[userIndex])
            });
            
            return true;
        }
        
        return false;
    }

    getChangedFields(oldData, newData) {
        const changes = [];
        const fieldsToCheck = ['email', 'role', 'department'];
        
        fieldsToCheck.forEach(field => {
            if (oldData[field] !== newData[field]) {
                changes.push(`${field}: ${oldData[field]} -> ${newData[field]}`);
            }
        });
        
        return changes;
    }

    getUserCounts() {
        const users = this.getUsers();
        return {
            admin: users.filter(u => u.role === 'admin').length,
            team: users.filter(u => u.role === 'team').length,
            user: users.filter(u => u.role === 'user').length,
            total: users.length
        };
    }

    getDepartmentCounts() {
        const users = this.getUsers();
        const counts = {};
        const departments = [
            'Corporate', 'HR', 'Manufacturing', 'Warehouse', 
            'QC', 'QA', 'Docu Cell', 'Admin', 'Engineering', 
            'Security', 'Stores', 'Others'
        ];
        
        departments.forEach(dept => {
            counts[dept] = users.filter(u => u.department === dept).length;
        });
        
        return counts;
    }

    // Enhanced security methods
    validatePassword(password) {
        const requirements = {
            minLength: 6,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const errors = [];
        
        if (password.length < requirements.minLength) {
            errors.push(`Password must be at least ${requirements.minLength} characters long`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            strength: this.calculatePasswordStrength(password)
        };
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        // Length bonus
        score += Math.min(password.length * 2, 25);
        
        // Character variety bonus
        if (/[a-z]/.test(password)) score += 5;
        if (/[A-Z]/.test(password)) score += 5;
        if (/[0-9]/.test(password)) score += 5;
        if (/[^A-Za-z0-9]/.test(password)) score += 10;
        
        // Repeated characters penalty
        const repeatedChars = password.match(/(.)\1+/g);
        if (repeatedChars) {
            score -= repeatedChars.length * 10;
        }
        
        score = Math.max(0, Math.min(100, score));
        
        if (score < 30) return 'Weak';
        if (score < 60) return 'Fair';
        if (score < 90) return 'Good';
        return 'Strong';
    }

    // Session management
    isSessionValid() {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        // Check if user still exists in the system
        const users = this.getUsers();
        const currentUserExists = users.find(u => u.username === user.username);
        
        if (!currentUserExists) {
            this.logout();
            return false;
        }
        
        return true;
    }

    extendSession() {
        if (this.currentUser) {
            this.currentUser.lastActivity = new Date().toISOString();
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }

    // Audit logging
    logAuthEvent(event, username, details = {}) {
        const logs = JSON.parse(localStorage.getItem('authLogs') || '[]');
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            username: username,
            ipAddress: 'localhost', // In real implementation, capture actual IP
            userAgent: navigator.userAgent,
            details: details
        };
        
        logs.push(logEntry);
        
        // Keep only last 1000 log entries
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        localStorage.setItem('authLogs', JSON.stringify(logs));
    }

    getAuthLogs(limit = 100) {
        const logs = JSON.parse(localStorage.getItem('authLogs') || '[]');
        return logs.slice(-limit).reverse(); // Return most recent first
    }

    // User permissions
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const rolePermissions = {
            admin: [
                'view_all_tickets', 'edit_all_tickets', 'delete_tickets',
                'assign_tickets', 'manage_users', 'view_reports',
                'system_settings', 'backup_restore', 'view_archive',
                'manage_archive'
            ],
            team: [
                'view_assigned_tickets', 'edit_assigned_tickets',
                'resolve_tickets', 'view_kanban'
            ],
            user: [
                'create_tickets', 'view_own_tickets', 'edit_own_tickets'
            ]
        };
        
        return rolePermissions[this.currentUser.role]?.includes(permission) || false;
    }

    // Department validation
    getValidDepartments() {
        return [
            'Corporate',
            'HR', 
            'Manufacturing',
            'Warehouse',
            'QC',
            'QA',
            'Docu Cell',
            'Admin',
            'Engineering',
            'Security',
            'Stores',
            'Others'
        ];
    }

    isValidDepartment(department) {
        return this.getValidDepartments().includes(department);
    }

    // Bulk operations
    bulkUpdateUsers(userUpdates) {
        if (!this.isAdmin()) {
            throw new Error('Admin privileges required for bulk operations');
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        let updated = 0;
        
        userUpdates.forEach(update => {
            const userIndex = users.findIndex(u => u.username === update.username);
            if (userIndex !== -1) {
                users[userIndex] = { 
                    ...users[userIndex], 
                    ...update.data,
                    updatedAt: new Date().toISOString(),
                    updatedBy: this.currentUser.username
                };
                updated++;
            }
        });
        
        if (updated > 0) {
            localStorage.setItem('users', JSON.stringify(users));
            this.logAuthEvent('bulk_update', this.currentUser.username, {
                usersUpdated: updated,
                totalRequests: userUpdates.length
            });
        }
        
        return updated;
    }

    // Export user data (admin only)
    exportUserData() {
        if (!this.isAdmin()) {
            throw new Error('Admin privileges required');
        }
        
        const users = this.getUsers().map(user => ({
            username: user.username,
            email: user.email,
            role: user.role,
            department: user.department,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        }));
        
        return {
            exportDate: new Date().toISOString(),
            exportedBy: this.currentUser.username,
            users: users,
            totalCount: users.length
        };
    }

    // Clean up old data
    cleanupOldData() {
        if (!this.isAdmin()) return;
        
        // Clean up old auth logs (keep last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const logs = JSON.parse(localStorage.getItem('authLogs') || '[]');
        const recentLogs = logs.filter(log => 
            new Date(log.timestamp) > thirtyDaysAgo
        );
        
        localStorage.setItem('authLogs', JSON.stringify(recentLogs));
        
        this.logAuthEvent('data_cleanup', this.currentUser.username, {
            logsRemoved: logs.length - recentLogs.length
        });
    }
}

// Initialize auth system
const auth = new AuthSystem();

// Auto-extend session on user activity
document.addEventListener('click', () => {
    if (auth.getCurrentUser()) {
        auth.extendSession();
    }
});

document.addEventListener('keypress', () => {
    if (auth.getCurrentUser()) {
        auth.extendSession();
    }
});

// Periodic session validation
setInterval(() => {
    if (!auth.isSessionValid()) {
        console.log('Session invalidated');
        if (window.ticketSystem) {
            window.ticketSystem.logout();
        }
    }
}, 30000); // Check every 30 seconds
