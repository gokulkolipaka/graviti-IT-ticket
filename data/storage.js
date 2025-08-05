// Data storage and management
class DataStorage {
    constructor() {
        this.storagePrefix = 'ticketing_system_';
    }

    save(key, data) {
        try {
            localStorage.setItem(this.storagePrefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            return false;
        }
    }

    load(key) {
        try {
            const data = localStorage.getItem(this.storagePrefix + key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load data:', error);
            return null;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(this.storagePrefix + key);
            return true;
        } catch (error) {
            console.error('Failed to remove data:', error);
            return false;
        }
    }

    clear() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.storagePrefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    export() {
        const data = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.storagePrefix)) {
                const cleanKey = key.replace(this.storagePrefix, '');
                data[cleanKey] = JSON.parse(localStorage.getItem(key));
            }
        });
        return data;
    }

    import(data) {
        try {
            Object.keys(data).forEach(key => {
                this.save(key, data[key]);
            });
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}

// Initialize storage
const dataStorage = new DataStorage();
