const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // HTML dosyalarını serve et

// SQLite veritabanı bağlantısı
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err.message);
    } else {
        console.log('SQLite veritabanına bağlandı.');
    }
});

// Kullanıcılar tablosunu oluştur
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Kayıt API
app.post('/api/register', (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Tüm alanları doldurun!' 
        });
    }

    // E-posta zaten kayıtlı mı kontrol et
    db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Veritabanı hatası!' 
            });
        }
        
        if (row) {
            return res.status(409).json({ 
                success: false, 
                message: 'Bu e-posta adresi zaten kayıtlı!' 
            });
        }

        // Yeni kullanıcıyı ekle
        db.run('INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)', 
            [firstName, lastName, email, password], 
            function(err) {
                if (err) {
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Kayıt sırasında hata oluştu!' 
                    });
                }
                
                res.status(201).json({ 
                    success: true, 
                    message: 'Hesap başarıyla oluşturuldu!',
                    userId: this.lastID 
                });
            }
        );
    });
});

// Giriş API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'E-posta ve şifre gerekli!' 
        });
    }

    // Kullanıcıyı bul
    db.get('SELECT * FROM users WHERE email = ? AND password = ?', 
        [email, password], 
        (err, row) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Veritabanı hatası!' 
                });
            }
            
            if (!row) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'E-posta veya şifre yanlış!' 
                });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Giriş başarılı!',
                user: {
                    id: row.id,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    email: row.email
                }
            });
        }
    );
});

// E-posta kontrol API
app.post('/api/check-email', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            success: false, 
            message: 'E-posta gerekli!' 
        });
    }

    db.get('SELECT id, firstName, lastName FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Veritabanı hatası!' 
            });
        }
        
        if (row) {
            res.status(200).json({ 
                success: true, 
                found: true,
                message: 'E-posta bulundu',
                user: {
                    firstName: row.firstName,
                    lastName: row.lastName
                }
            });
        } else {
            res.status(200).json({ 
                success: true, 
                found: false,
                message: 'E-posta kayıtlı değil' 
            });
        }
    });
});

// Tüm kullanıcıları listele (test için)
app.get('/api/users', (req, res) => {
    db.all('SELECT id, firstName, lastName, email, createdAt FROM users', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Veritabanı hatası!' 
            });
        }
        
        res.status(200).json({ 
            success: true, 
            users: rows 
        });
    });
});

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Server başlat
app.listen(PORT, () => {
    console.log(`🚀 Server http://localhost:${PORT} adresinde çalışıyor`);
    console.log('📁 Ana sayfa: http://localhost:3000');
    console.log('📝 Kayıt: http://localhost:3000/register.html');
    console.log('🔐 Giriş: http://localhost:3000/login.html');
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Veritabanı bağlantısı kapatıldı.');
        process.exit(0);
    });
});