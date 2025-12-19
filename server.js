const express = require('express');
const fs = require('fs').promises; // Sadece içerik (portfolio) için kullanacağız
const path = require('path');
const db = require('./database'); // Veritabanı bağlantısı
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DB_JSON_PATH = path.join(__dirname, 'db.json'); // Sadece içerik verisi

// Basit bir "In-Memory" session deposu (Sunucu kapanınca silinir, gerçek projede Redis kullanılır)
const sessions = {}; 

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// --- Auth Middleware ---
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token && sessions[token]) {
        req.user = sessions[token]; // Kullanıcı bilgisini request'e ekle
        next();
    } else {
        res.status(401).json({ message: 'Yetkisiz erişim! Lütfen giriş yapın.' });
    }
};

// --- Routes ---

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- API Endpoints ---

// 1. GİRİŞ YAP (Login)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ message: 'Sunucu hatası.' });
        if (!user) return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });

        // Şifre kontrolü
        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Hatalı şifre.' });

        // Token oluştur ve kaydet
        const token = uuidv4();
        sessions[token] = { id: user.id, username: user.username, role: user.role };

        res.json({ 
            message: 'Giriş başarılı!', 
            token: token, 
            role: user.role 
        });
    });
});

// 1.1 KULLANICI OLUŞTUR (Sadece Admin)
app.post('/api/users', authenticate, (req, res) => {
    // Sadece admin yeni kullanıcı oluşturabilir
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkisiz işlem.' });
    }

    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Kullanıcı adı ve şifre zorunludur.' });
    }

    // Şifreyi hashle
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = role || 'guest';

    db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, hashedPassword, userRole], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ message: 'Bu kullanıcı adı zaten mevcut.' });
            }
            return res.status(500).json({ message: 'Veritabanı hatası.' });
        }
        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.', id: this.lastID });
    });
});

// 2. İÇERİK GETİR (Herkese Açık)
app.get('/api/content', async (req, res) => {
    try {
        const data = await fs.readFile(DB_JSON_PATH, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Veritabanı okuma hatası:', error);
        res.status(500).json({ message: 'Veritabanı okunamadı' });
    }
});

// 3. İÇERİK GÜNCELLE (Sadece Admin)
app.post('/api/content', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Sadece adminler düzenleyebilir.' });
    }

    try {
        const newData = req.body;
        // db.json sadece portfolio/hero datası tutar, mesajları buradan sildik
        // Client'tan gelen datada "messages" varsa onu temizleyelim ki db.json şişmesin
        delete newData.messages; 

        await fs.writeFile(DB_JSON_PATH, JSON.stringify(newData, null, 2), 'utf8');
        res.json({ message: 'İçerik güncellendi!' });
    } catch (error) {
        console.error('Yazma hatası:', error);
        res.status(500).json({ message: 'Yazma hatası' });
    }
});

// 4. MESAJ GÖNDER (Herkese Açık)
app.post('/api/messages', (req, res) => {
    const { name, email, subject, message, date } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'Eksik bilgi!' });
    }

    const sql = "INSERT INTO messages (name, email, subject, message, date) VALUES (?, ?, ?, ?, ?)";
    db.run(sql, [name, email, subject, message, date], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Mesaj kaydedilemedi.' });
        }
        res.status(201).json({ message: 'Mesaj alındı.', id: this.lastID });
    });
});

// 5. MESAJLARI GETİR (Sadece Admin)
app.get('/api/messages', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkisiz erişim.' });
    }

    db.all("SELECT * FROM messages ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Hata oluştu.' });
        res.json(rows);
    });
});

// 6. MESAJ SİL (Sadece Admin)
app.delete('/api/messages/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkisiz erişim.' });
    }

    const id = req.params.id;
    db.run("DELETE FROM messages WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ message: 'Silinemedi.' });
        res.json({ message: 'Mesaj silindi.' });
    });
});

app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});