// Three-Tier Authentication and User Management
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
                    email: 'admin@techsupport.com',
                    role: 'admin',
                    department: 'IT',
                    isFirstLogin: true
                },
                {
                    username: 'itteam1',
                    password: 'team123',
                    email: 'john.doe@techsupport.com',
                    role: 'team',
                    department: 'IT',
                    isFirstLogin: false,
                    fullName: 'John Doe'
                },
                {
                    username: 'itteam2',
                    password: 'team123',
                    email: 'jane.smith@techsupport.com',
                    role: 'team',
                    department: 'IT',
                    isFirstLogin: false,
                    fullName: 'Jane Smith'
                },
                {
                    username: 'user1',
                    password: 'user123',
                    email: 'alice.johnson@company.com',
                    role: 'user',
                    department: 'HR',
                    isFirstLogin: false,
                    fullName: 'Alice Johnson'
                },
                {
                    username: 'user2',
                    password: 'user123',
                    email: 'bob.wilson@company.com',
                    role: 'user',
                    department: 'Finance',
                    isFirstLogin: false,
                    fullName: 'Bob Wilson'
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
            
            if (user.isFirstLogin && (user.role === 'admin' || user.role === 'team')) {
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

    resetPassword(username, email) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.email === email);
        
        if (user) {
            const tempPassword = 'temp' + Math.random().toString(36).substr(2, 8);
            const userIndex = users.findIndex(u => u.username === username);
            users[userIndex].password = tempPassword;
            users[userIndex].isFirstLogin = true;
            
            localStorage.setItem('users', JSON.stringify(users));
            
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

    canAssignTickets() {
        return this.isAdmin();
    }

    canResolveTickets() {
        return this.isAdmin() || this.isTeamMember();
    }

    canCloseTickets() {
        return this.isAdmin();
    }

    canManageUsers() {
        return this.isAdmin();
    }

    logout() {
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

        const newUser = {
            username: userData.username,
            password: userData.password || 'temp123',
            email: userData.email,
            role: userData.role,
            department: userData.department,
            fullName: userData.fullName || userData.username,
            isFirstLogin: true
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        return newUser;
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    getTeamMembers() {
        return this.getUsers().filter(u => u.role === 'team' || u.role === 'admin');
    }

    deleteUser(username) {
        if (username === 'admin') {
            throw new Error('Cannot delete admin user');
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const filteredUsers = users.filter(u => u.username !== username);
        localStorage.setItem('users', JSON.stringify(filteredUsers));
        return true;
    }

    updateUser(username, userData) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...userData };
            localStorage.setItem('users', JSON.stringify(users));
            return true;
        }
        
        return false;
    }
}

// Initialize auth system
const auth = new AuthSystem();
