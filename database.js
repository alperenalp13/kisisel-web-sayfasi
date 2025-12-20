const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// PostgreSQL Bağlantı Ayarları
let pool;

if (process.env.DATABASE_URL) {
    // PROD (Render.com vb.)
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    // LOCAL (Senin Bilgisayarın)
    pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'kisisel_web',
        password: '123456', 
        port: 5432,
    });
}

pool.on('error', (err) => {
    console.error('Beklenmeyen veritabanı hatası:', err);
});

const initialData = {
  "hero": {
    "title": "Muhammet Alperen Alp",
    "subtitle": "Computer Programmer | IT Developer",
    "profileImage": "profil1.jpg"
  },
  "about": {
    "title": "Hakkımda",
    "paragraphs": [
      "Merhaba, ben Muhammet Alperen Alp. Hitit Üniversitesi Bilgisayar Programcılığı bölümünden mezun olan bir bilgisayar programcısı adayıyım.",
      "Lise yıllarımda Salihli Sistem Bilgisayar'da iki yıl boyunca teknik servis ve donanım stajyeri olarak görev aldım.",
      "İokul Anonim Şirketi'nde uzaktan yazılım stajyeri olarak görevime devam ediyorum.",
      "Teknik becerilerim arasında C#, Java, PHP ve HTML dillerinde orta düzeyde yetkinlik; MySQL veritabanı bilgisi bulunmaktadır.",
      "Donanım ve yazılım alanındaki birikimim ile projelerine katkıda bulunmak için sabırsızlanıyorum."
    ]
  },
  "skills": {
    "title": "Yeteneklerim",
    "skillList": [
      { "name": "Java", "value": "60" },
      { "name": "C#", "value": "50" },
      { "name": "SQL", "value": "40" },
      { "name": "HTML & CSS", "value": "80" }
    ]
  },
  "portfolio": {
    "title": "Portfolyo",
    "projects": [
      {
        "id": 1,
        "cardTitle": "Proje 1",
        "cardDescription": "Örnek proje açıklaması.",
        "cardImage": "placeholder.png",
        "modalTitle": "Proje 1 Detayları",
        "modalImage": "placeholder.png",
        "modalDescription": "Detaylı proje açıklaması."
      }
    ]
  },
  "contact": [
    { "type": "email", "title": "Email", "text": "alperenalp216@gmail.com", "href": "mailto:alperenalp216@gmail.com" },
    { "type": "telefon", "title": "Telefon", "text": "+90 552 579 27 13", "href": null },
    { "type": "instagram", "title": "Instagram", "text": "@alperenalp2706", "href": "https://www.instagram.com/alperenalp2706/" },
    { "type": "youtube", "title": "YouTube", "text": "@muhammetalperenalp5451", "href": "https://www.youtube.com/@muhammetalperenalp5451" },
    { "type": "linkedin", "title": "LinkedIn", "text": "/in/alperen-alp-253b0528b", "href": "https://www.linkedin.com/in/alperen-alp-253b0528b/" },
    { "type": "github", "title": "GitHub", "text": "alperenalp13", "href": "https://github.com/alperenalp13" }
  ]
};

async function initDb() {
    try {
        const client = await pool.connect();
        console.log('PostgreSQL veritabanına bağlanıldı.');

        // Kullanıcılar
        await client.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'admin'
        )`);

        // Mesajlar
        await client.query(`CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255),
            subject VARCHAR(255),
            message TEXT,
            date VARCHAR(255),
            is_read INTEGER DEFAULT 0
        )`);

        // --- İÇERİK TABLOLARI ---
        await client.query(`CREATE TABLE IF NOT EXISTS hero (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            title TEXT,
            subtitle TEXT,
            profileImage TEXT
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS about (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            title TEXT
        )`);
        
        await client.query(`CREATE TABLE IF NOT EXISTS about_paragraphs (
            id SERIAL PRIMARY KEY,
            content TEXT,
            order_index INTEGER
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS skills_meta (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            title TEXT
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS skills (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            value VARCHAR(50)
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS portfolio_meta (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            title TEXT
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            cardTitle VARCHAR(255),
            cardDescription TEXT,
            cardImage TEXT,
            modalTitle VARCHAR(255),
            modalImage TEXT,
            modalDescription TEXT
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50),
            title VARCHAR(255),
            text VARCHAR(255),
            href TEXT
        )`);

        await seedData(client);
        client.release();
    } catch (err) {
        console.error('Veritabanı başlatma hatası:', err);
    }
}

async function seedData(client) {
    const adminCheck = await client.query("SELECT * FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
        const hashedPassword = bcrypt.hashSync('123456', 10);
        await client.query("INSERT INTO users (username, password, role) VALUES ('admin', $1, 'admin')", [hashedPassword]);
    }

    const heroCheck = await client.query("SELECT * FROM hero WHERE id = 1");
    if (heroCheck.rows.length === 0) {
        await client.query("INSERT INTO hero (id, title, subtitle, profileImage) VALUES (1, $1, $2, $3)", 
            [initialData.hero.title, initialData.hero.subtitle, initialData.hero.profileImage]);
    } else if (heroCheck.rows[0].profileimage && heroCheck.rows[0].profileimage.includes('localhost')) {
        await client.query("UPDATE hero SET profileImage = $1 WHERE id = 1", [initialData.hero.profileImage]);
    }

    const aboutCheck = await client.query("SELECT count(*) as count FROM about");
    if (parseInt(aboutCheck.rows[0].count) === 0) {
        await client.query("INSERT INTO about (id, title) VALUES (1, $1)", [initialData.about.title]);
        for (let i = 0; i < initialData.about.paragraphs.length; i++) {
            await client.query("INSERT INTO about_paragraphs (content, order_index) VALUES ($1, $2)", [initialData.about.paragraphs[i], i]);
        }
    }

    const skillsCheck = await client.query("SELECT count(*) as count FROM skills_meta");
    if (parseInt(skillsCheck.rows[0].count) === 0) {
        await client.query("INSERT INTO skills_meta (id, title) VALUES (1, $1)", [initialData.skills.title]);
        for (const s of initialData.skills.skillList) {
            await client.query("INSERT INTO skills (name, value) VALUES ($1, $2)", [s.name, s.value]);
        }
    }

    const pfCheck = await client.query("SELECT count(*) as count FROM portfolio_meta");
    if (parseInt(pfCheck.rows[0].count) === 0) {
        await client.query("INSERT INTO portfolio_meta (id, title) VALUES (1, $1)", [initialData.portfolio.title]);
        for (const p of initialData.portfolio.projects) {
            await client.query("INSERT INTO projects (cardTitle, cardDescription, cardImage, modalTitle, modalImage, modalDescription) VALUES ($1, $2, $3, $4, $5, $6)", 
                [p.cardTitle, p.cardDescription, p.cardImage, p.modalTitle, p.modalImage, p.modalDescription]);
        }
    }
}

initDb();

module.exports = {
    query: (text, params) => pool.query(text, params),
};