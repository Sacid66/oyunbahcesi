const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // HTML dosyalarını serve et

// Kullanıcı verilerini JSON dosyasında tut
const USERS_FILE = './users.json';

// JSON dosyasını oku
async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Dosya yoksa boş array döndür
        return [];
    }
}

// JSON dosyasına yaz
async function writeUsers(users) {
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Kullanıcı verisi yazılırken hata:', error);
        return false;
    }
}

// Kayıt API
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Tüm alanları doldurun!' 
        });
    }

    try {
        const users = await readUsers();
        
        // E-posta zaten kayıtlı mı kontrol et
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'Bu e-posta adresi zaten kayıtlı!' 
            });
        }

        // Yeni kullanıcı oluştur
        const newUser = {
            id: users.length + 1,
            firstName,
            lastName,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        
        const saved = await writeUsers(users);
        if (!saved) {
            return res.status(500).json({ 
                success: false, 
                message: 'Kayıt sırasında hata oluştu!' 
            });
        }
        
        res.status(201).json({ 
            success: true, 
            message: 'Hesap başarıyla oluşturuldu!',
            userId: newUser.id 
        });
    } catch (error) {
        console.error('Kayıt hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sunucu hatası!' 
        });
    }
});

// Giriş API
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'E-posta ve şifre gerekli!' 
        });
    }

    try {
        const users = await readUsers();
        
        // Kullanıcıyı bul
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'E-posta veya şifre yanlış!' 
            });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Giriş başarılı!',
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sunucu hatası!' 
        });
    }
});

// E-posta kontrol API
app.post('/api/check-email', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            success: false, 
            message: 'E-posta gerekli!' 
        });
    }

    try {
        const users = await readUsers();
        const user = users.find(u => u.email === email);
        
        if (user) {
            res.status(200).json({ 
                success: true, 
                found: true,
                message: 'E-posta bulundu',
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            });
        } else {
            res.status(200).json({ 
                success: true, 
                found: false,
                message: 'E-posta kayıtlı değil' 
            });
        }
    } catch (error) {
        console.error('E-posta kontrol hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sunucu hatası!' 
        });
    }
});

// Tüm kullanıcıları listele (test için)
app.get('/api/users', async (req, res) => {
    try {
        const users = await readUsers();
        const safeUsers = users.map(user => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            createdAt: user.createdAt
        }));
        
        res.status(200).json({ 
            success: true, 
            users: safeUsers 
        });
    } catch (error) {
        console.error('Kullanıcı listesi hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sunucu hatası!' 
        });
    }
});

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Server başlat
app.listen(PORT, () => {
    console.log(`🚀 Server http://localhost:${PORT} adresinde çalışıyor`);
    console.log('📁 Ana sayfa: http://localhost:' + PORT);
    console.log('📝 Kayıt: http://localhost:' + PORT + '/register.html');
    console.log('🔐 Giriş: http://localhost:' + PORT + '/login.html');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Server kapatılıyor...');
    process.exit(0);
});