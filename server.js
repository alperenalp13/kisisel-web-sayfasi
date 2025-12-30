const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
const AUTH_TOKEN = 'secret-admin-token'; 

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

/* -------------------------------------------------------------------------- */
/*                              Database Helpers                              */
/* -------------------------------------------------------------------------- */

// Sağlamlaştırılmış veritabanı yazma fonksiyonu
// 1. Önce mevcut verinin yedeğini alır.
// 2. Yeni veriyi geçici bir dosyaya yazar.
// 3. Geçici dosyayı asıl dosyanın üzerine yazar (Atomic Write).
// Bu sayede yazma sırasında elektrik kesilse bile 'db.json' bozulmaz.
async function writeDatabaseSafe(data) {
    try {
        // Yedekleme klasörünün varlığından emin ol
        await fs.mkdir(BACKUP_DIR, { recursive: true });

        // Mevcut dosya varsa yedeğini al
        try {
            await fs.access(DB_PATH); // Dosya var mı kontrol et
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(BACKUP_DIR, `db-${timestamp}.json`);
            await fs.copyFile(DB_PATH, backupPath);
            
            // Yedek sayısını kontrol et, çok fazlaysa eskileri sil (Opsiyonel temizlik - son 50 yedek kalsın)
            const files = await fs.readdir(BACKUP_DIR);
            if (files.length > 50) {
                files.sort(); // En eski dosyalar başta olur (isim formatı sayesinde)
                const filesToDelete = files.slice(0, files.length - 50);
                for (const file of filesToDelete) {
                    await fs.unlink(path.join(BACKUP_DIR, file)).catch(() => {});
                }
            }
        } catch (err) {
            // İlk kez çalışıyorsa veya dosya yoksa yedekleme hatasını görmezden gel
            if (err.code !== 'ENOENT') console.error('[DB] Backup warning:', err);
        }

        // Atomik Yazma: Önce .tmp dosyasına yaz, sonra rename yap
        const tempPath = `${DB_PATH}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tempPath, DB_PATH);
        
        return true;
    } catch (error) {
        console.error('[DB] Critical Write Error:', error);
        throw error;
    }
}

/* -------------------------------------------------------------------------- */
/*                                 Page Routes                                */
/* -------------------------------------------------------------------------- */

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

/* -------------------------------------------------------------------------- */
/*                                API Endpoints                               */
/* -------------------------------------------------------------------------- */

app.get('/api/content', async (req, res) => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('[API] Error reading database:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/api/content', async (req, res) => {
    const token = req.headers['authorization'];
    
    if (token !== AUTH_TOKEN) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
        const newData = req.body;
        if (!newData || !newData.hero || !newData.portfolio) {
            return res.status(400).json({ message: 'Invalid payload structure' });
        }
        
        // Güvenli yazma fonksiyonunu kullan
        await writeDatabaseSafe(newData);
        
        res.json({ message: 'Content updated successfully' });
    } catch (error) {
        console.error('[API] Error writing to database:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
