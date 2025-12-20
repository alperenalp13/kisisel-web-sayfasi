const express = require('express');
const path = require('path');
const db = require('./database'); // pg pool
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Basit bir "In-Memory" session deposu
const sessions = {}; 

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

// --- Auth Middleware ---
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token && sessions[token]) {
        req.user = sessions[token];
        next();
    } else {
        res.status(401).json({ message: 'Yetkisiz erişim! Lütfen giriş yapın.' });
    }
};

// --- Routes ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Fix for random "undefined" requests
app.get('/undefined', (req, res) => {
    res.redirect('/');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- API Endpoints ---

// 1. GİRİŞ YAP (Login)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Hatalı şifre.' });

        const token = uuidv4();
        sessions[token] = { id: user.id, username: user.username, role: user.role };

        res.json( {
            message: 'Giriş başarılı!', 
            token: token, 
            role: user.role 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

// 1.1 KULLANICI OLUŞTUR (Sadece Admin)
app.post('/api/users', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkisiz işlem.' });
    }

    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Eksik bilgi.' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = role || 'guest';

    try {
        const result = await db.query(
            "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id",
            [username, hashedPassword, userRole]
        );
        res.status(201).json({ message: 'Kullanıcı oluşturuldu.', id: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation code in Postgres
            return res.status(400).json({ message: 'Kullanıcı adı zaten var.' });
        }
        console.error(err);
        res.status(500).json({ message: 'Veritabanı hatası.' });
    }
});

// 2. İÇERİK GETİR (Veritabanından)
app.get('/api/content', async (req, res) => {
    try {
        const heroRes = await db.query("SELECT * FROM hero WHERE id = 1");
        const aboutRes = await db.query("SELECT * FROM about WHERE id = 1");
        const aboutParaRes = await db.query("SELECT content FROM about_paragraphs ORDER BY order_index ASC");
        const skillsMetaRes = await db.query("SELECT * FROM skills_meta WHERE id = 1");
        const skillsRes = await db.query("SELECT name, value FROM skills");
        const pfMetaRes = await db.query("SELECT * FROM portfolio_meta WHERE id = 1");
        const projectsRes = await db.query("SELECT * FROM projects ORDER BY id ASC");
        const contactRes = await db.query("SELECT type, title, text, href FROM contacts ORDER BY id ASC");

        // Veritabanından gelen küçük harfli sütunları frontend'in beklediği camelCase formata çeviriyoruz
        const heroRow = (heroRes && heroRes.rows && heroRes.rows.length > 0) ? heroRes.rows[0] : {};
        
        const hero = {
            title: heroRow.title || "",
            subtitle: heroRow.subtitle || "",
            profileImage: heroRow.profileimage || "profil1.jpg" 
        };

        const projects = (projectsRes && projectsRes.rows) ? projectsRes.rows.map(p => ({
            id: p.id,
            cardTitle: p.cardtitle || "",
            cardDescription: p.carddescription || "",
            cardImage: p.cardimage || "placeholder.png",
            modalTitle: p.modaltitle || "",
            modalImage: p.modalimage || "placeholder.png",
            modalDescription: p.modaldescription || ""
        })) : [];

        const data = {
            hero: hero,
            about: {
                title: aboutRes.rows[0] ? aboutRes.rows[0].title : "",
                paragraphs: aboutParaRes.rows.map(p => p.content)
            },
            skills: {
                title: skillsMetaRes.rows[0] ? skillsMetaRes.rows[0].title : "",
                skillList: skillsRes.rows
            },
            portfolio: {
                title: pfMetaRes.rows[0] ? pfMetaRes.rows[0].title : "",
                projects: projects
            },
            contact: contactRes.rows,
            messages: []
        };

        res.json(data);
    } catch (error) {
        console.error('İçerik okuma hatası:', error);
        res.status(500).json({ message: 'Veritabanı okunamadı' });
    }
});

// 3. İÇERİK GÜNCELLE (Sadece Admin - Transaction Mantığı)
app.post('/api/content', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkisiz işlem.' });
    }

    const newData = req.body;
    
    // Basit transaction benzeri yapı (Postgres client ile tam transaction yapılabilir ama burada sıralı await yeterli olur)
    try {
        // 1. Hero
        if (newData.hero) {
            await db.query("UPDATE hero SET title = $1, subtitle = $2, profileImage = $3 WHERE id = 1", 
                [newData.hero.title, newData.hero.subtitle, newData.hero.profileImage]);
        }

        // 2. About
        if (newData.about) {
            await db.query("UPDATE about SET title = $1 WHERE id = 1", [newData.about.title]);
            
            await db.query("DELETE FROM about_paragraphs");
            if (newData.about.paragraphs && Array.isArray(newData.about.paragraphs)) {
                for (let i = 0; i < newData.about.paragraphs.length; i++) {
                    await db.query("INSERT INTO about_paragraphs (content, order_index) VALUES ($1, $2)", 
                        [newData.about.paragraphs[i], i]);
                }
            }
        }

        // 3. Skills
        if (newData.skills) {
            await db.query("UPDATE skills_meta SET title = $1 WHERE id = 1", [newData.skills.title]);
            
            await db.query("DELETE FROM skills");
            if (newData.skills.skillList) {
                for (const s of newData.skills.skillList) {
                    await db.query("INSERT INTO skills (name, value) VALUES ($1, $2)", [s.name, s.value]);
                }
            }
        }

        // 4. Portfolio
        if (newData.portfolio) {
            await db.query("UPDATE portfolio_meta SET title = $1 WHERE id = 1", [newData.portfolio.title]);
            
            await db.query("DELETE FROM projects");
            if (newData.portfolio.projects) {
                for (const p of newData.portfolio.projects) {
                    await db.query("INSERT INTO projects (cardTitle, cardDescription, cardImage, modalTitle, modalImage, modalDescription) VALUES ($1, $2, $3, $4, $5, $6)",
                        [p.cardTitle, p.cardDescription, p.cardImage, p.modalTitle, p.modalImage, p.modalDescription]);
                }
            }
        }

        // 5. Contact
        if (newData.contact) {
            await db.query("DELETE FROM contacts");
            for (const c of newData.contact) {
                await db.query("INSERT INTO contacts (type, title, text, href) VALUES ($1, $2, $3, $4)",
                    [c.type, c.title, c.text, c.href]);
            }
        }

        res.json({ message: 'Güncellendi.' });

    } catch (err) {
        console.error('Update hatası:', err);
        res.status(500).json({ message: 'Güncelleme sırasında hata oluştu.' });
    }
});

// 4. MESAJ GÖNDER
app.post('/api/messages', async (req, res) => {
    const { name, email, subject, message, date } = req.body;
    if (!name || !email || !message) return res.status(400).json({ message: 'Eksik bilgi.' });

    try {
        const result = await db.query(
            "INSERT INTO messages (name, email, subject, message, date) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [name, email, subject, message, date]
        );

        // E-posta Gönderimi
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'alperenalp216@gmail.com',
                    pass: process.env.EMAIL_PASS || 'otgv mrfu vvkt mrns' 
                }
            });

            const mailOptions = {
                from: 'alperenalp216@gmail.com',
                to: 'alperenalp216@gmail.com',
                subject: `Yeni Görüş/Öneri: ${subject}`,
                text: `Gönderen: ${name}\nE-posta: ${email}\nTarih: ${date}\n\nMesaj:\n${message}`
            };

            await transporter.sendMail(mailOptions);
            console.log('E-posta başarıyla gönderildi.');
            return res.status(201).json({ message: 'Mesajınız alındı ve e-posta gönderildi.', id: result.rows[0].id });

        } catch (mailErr) {
            console.error('Mail gönderim hatası:', mailErr);
            return res.status(201).json({ 
                message: 'Mesaj kaydedildi ancak e-posta iletilemedi. Şifre veya bağlantı sorunu olabilir.', 
                id: result.rows[0].id, 
                warning: true 
            });
        }

    } catch (err) {
        console.error('Veritabanı kayıt hatası:', err);
        res.status(500).json({ message: 'Sunucu hatası: Mesaj kaydedilemedi.' });
    }
});

// 5. MESAJLARI GETİR (Admin)
app.get('/api/messages', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Yetkisiz.' });

    try {
        const result = await db.query("SELECT * FROM messages ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Hata.' });
    }
});

// 6. MESAJ SİL (Admin)
app.delete('/api/messages/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Yetkisiz.' });

    try {
        await db.query("DELETE FROM messages WHERE id = $1", [req.params.id]);
        res.json({ message: 'Silindi.' });
    } catch (err) {
        res.status(500).json({ message: 'Hata.' });
    }
});

// Catch-all route for SPA behavior
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
