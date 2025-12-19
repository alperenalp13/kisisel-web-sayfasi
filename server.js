const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const AUTH_TOKEN = 'secret-admin-token'; // Simple token for auth

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

// Serve static files (HTML, CSS, JS, images) from the current directory
app.use(express.static(__dirname));

// --- Routes ---

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- API Endpoints ---

// GET endpoint to fetch all content
app.get('/api/content', async (req, res) => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading database:', error);
        res.status(500).json({ message: 'Error reading database' });
    }
});

// POST endpoint to handle contact messages
app.post('/api/messages', async (req, res) => {
    try {
        const message = req.body;
        if (!message.name || !message.email || !message.message) {
            return res.status(400).json({ message: 'Eksik bilgi!' });
        }

        const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
        if (!data.messages) data.messages = [];
        
        data.messages.push({
            id: Date.now(),
            ...message,
            read: false
        });

        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        res.status(201).json({ message: 'Mesaj alındı.' });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

// GET endpoint to fetch messages (Admin only)
app.get('/api/messages', async (req, res) => {
    const token = req.headers['authorization'];
    if (token !== AUTH_TOKEN) {
        return res.status(403).json({ message: 'Yetkisiz erişim!' });
    }

    try {
        const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
        res.json(data.messages || []);
    } catch (error) {
        res.status(500).json({ message: 'Hata oluştu.' });
    }
});

// DELETE endpoint to remove a message (Admin only)
app.delete('/api/messages/:id', async (req, res) => {
    const token = req.headers['authorization'];
    if (token !== AUTH_TOKEN) {
        return res.status(403).json({ message: 'Yetkisiz erişim!' });
    }

    try {
        const id = parseInt(req.params.id);
        const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
        if (data.messages) {
            data.messages = data.messages.filter(m => m.id !== id);
            await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        }
        res.json({ message: 'Mesaj silindi.' });
    } catch (error) {
        res.status(500).json({ message: 'Hata oluştu.' });
    }
});

// POST endpoint to update all content
app.post('/api/content', async (req, res) => {
    // Simple authentication
    const token = req.headers['authorization'];
    if (token !== AUTH_TOKEN) {
        return res.status(403).json({ message: 'Forbidden: Invalid authentication token.' });
    }

    try {
        const newData = req.body;
        // Basic validation to ensure we're not writing garbage
        if (!newData || !newData.hero || !newData.portfolio) {
            return res.status(400).json({ message: 'Bad Request: Invalid data structure.' });
        }
        await fs.writeFile(DB_PATH, JSON.stringify(newData, null, 2), 'utf8');
        res.json({ message: 'Content updated successfully!' });
    } catch (error) {
        console.error('Error writing to database:', error);
        res.status(500).json({ message: 'Error writing to database' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Sitenizi görüntülemek için bu adresi tarayıcınızda açın.');
});
