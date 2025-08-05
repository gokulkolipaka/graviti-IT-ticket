// Authentication and User Management
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
                    email: 'admin@graviti.com',
                    role: 'admin',
                    department: 'IT',
                    isFirstLogin: true
                },
                {
                    username: 'user1',
                    password: 'user123',
                    email: 'user1@graviti.com',
                    role: 'user',
                    department: 'HR',
                    isFirstLogin: false
                }
            ];
            localStorage.setItem('users', JSON.stringify(defaultUsers));
        }
    }

    async authenticate(username, password) {
        // In a real implementation, this would connect to LDAP
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            // Check if first login for admin
            if (user.isFirstLogin && user.role === 'admin') {
                this.showPasswordChangeModal();
                return false;
            }
            
            return true;
        }
        
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
                users[userIndex].password = newPassword;
                users[userIndex].isFirstLogin = false;
                this.currentUser.isFirstLogin = false;
                
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                document.getElementById('passwordChangeModal').style.display = 'none';
                return true;
            }
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

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    addUser(userData) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Check if username already exists
        if (users.find(u => u.username === userData.username)) {
            throw new Error('Username already exists');
        }

        const newUser = {
            username: userData.username,
            password: userData.password || 'temp123',
            email: userData.email,
            role: userData.role,
            department: userData.department,
            isFirstLogin: true
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        return newUser;
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }
}

// Initialize auth system
const auth = new AuthSystem();
