const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Veritabanı dosyasının yolu
const dbPath = path.join(__dirname, 'kisisel_web.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Veritabanına bağlanılamadı:', err.message);
    } else {
        console.log('SQLite veritabanına bağlanıldı.');
        initDb();
    }
});

function initDb() {
    // Kullanıcılar Tablosu
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin'
    )`);

    // Mesajlar Tablosu (Artık db.json yerine burayı kullanacağız)
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        subject TEXT,
        message TEXT,
        date TEXT,
        is_read INTEGER DEFAULT 0
    )`);

    // Varsayılan Admin Kullanıcısını Oluştur
    const adminUsername = 'admin';
    const adminPasswordRaw = '123456';
    const misafirUsername = 'misafir';
    const misafirPasswordRaw = '123456';

    db.get("SELECT * FROM users WHERE username = ?", [adminUsername], (err, row) => {
        if (!row) {
            const hashedPassword = bcrypt.hashSync(adminPasswordRaw, 10);
            db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [adminUsername, hashedPassword, 'admin'], (err) => {
                if (err) console.error(err.message);
                else console.log('Varsayılan admin kullanıcısı oluşturuldu.');
            });
        }
    });

    db.get("SELECT * FROM users WHERE username = ?", [misafirUsername], (err, row) => {
        if (!row) {
            const hashedPassword = bcrypt.hashSync(misafirPasswordRaw, 10);
            db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [misafirUsername, hashedPassword, 'guest'], (err) => {
                if (err) console.error(err.message);
                else console.log('Varsayılan misafir kullanıcısı oluşturuldu.');
            });
        }
    });
}

module.exports = db;
