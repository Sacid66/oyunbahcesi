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

// Products.json dosyasını serve et
// Products.json dosyasını serve et
app.get('/products.json', async (req, res) => {
    try {
        // Birden fazla path dene
        const possiblePaths = [
            path.join(__dirname, 'build', 'products.json'),
            path.join(__dirname, 'products.json'),
            path.join(__dirname, 'public', 'products.json'),
            path.join(__dirname, 'data', 'products.json'),
            './build/products.json',
            './products.json',
            './public/products.json',
            './data/products.json'
        ];
        
        let productsData = null;
        let foundPath = null;
        
        for (const testPath of possiblePaths) {
            try {
                const data = await fs.readFile(testPath, 'utf8');
                productsData = JSON.parse(data);
                foundPath = testPath;
                console.log(`Products.json bulundu: ${testPath}`);
                break;
            } catch (err) {
                // Bu path'te dosya yok, devam et
                continue;
            }
        }
        
        if (!productsData) {
            // Hiçbir yerde bulunamadı, varsayılan boş veri döndür
            console.log('Products.json bulunamadı, boş veri döndürülüyor');
            productsData = {};
        }
        
        res.status(200).json(productsData);
    } catch (error) {
        console.error('Products.json okuma hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürünler yüklenirken hata oluştu!' 
        });
    }
});

// Hero products dosyasını serve et
// Hero products dosyasını serve et
app.get('/hero-products.json', async (req, res) => {
    try {
        const possiblePaths = [
            path.join(__dirname, 'build', 'hero-products.json'),
            path.join(__dirname, 'hero-products.json'),
            path.join(__dirname, 'public', 'hero-products.json'),
            path.join(__dirname, 'data', 'hero-products.json'),
            './build/hero-products.json',
            './hero-products.json',
            './public/hero-products.json',
            './data/hero-products.json'
        ];
        
        let heroData = null;
        
        for (const testPath of possiblePaths) {
            try {
                const data = await fs.readFile(testPath, 'utf8');
                heroData = JSON.parse(data);
                console.log(`Hero-products.json bulundu: ${testPath}`);
                break;
            } catch (err) {
                continue;
            }
        }
        
        if (!heroData) {
            // Varsayılan hero verisi
            heroData = {
                "slide1": {
                    "code": "ORM 0040",
                    "image": "hero/kaydırak sevenler buraya!!.jpg",
                    "productId": 121,
                    "title": "Alaçatı Ev"
                },
                "slide2": {
                    "code": "ORM 0055",
                    "image": "hero/kaydırak sevenler buraya!! (2).jpg",
                    "productId": 125,
                    "title": "Kızıldağ Ahşap Oyun Evi"
                },
                "slide3": {
                    "code": "ORM 0044",
                    "image": "hero/Adsız tasarım.png",
                    "productId": 120,
                    "title": "Kral ve Bahçesi"
                },
                "slide4": {
                    "code": "AKO600403",
                    "image": "hero/kaydırak sevenler buraya!! (3).jpg",
                    "productId": 126,
                    "title": "Kütük Minik Ev"
                }
            };
        }
        
        res.status(200).json(heroData);
    } catch (error) {
        console.error('Hero-products.json okuma hatası:', error);
        res.status(200).json({});
    }
});

// Products.json güncelleme API (Qt uygulaması için)
// Products.json güncelleme API (Qt uygulaması için)
// HTTP alternatif endpoint ekle (Qt SSL sorunu için)
app.post('/api/update-products-http', async (req, res) => {
    try {
        const newProductsData = req.body;
        
        if (!newProductsData) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ürün verisi gerekli!' 
            });
        }

        // Mevcut products.json dosyasını bul
        const possiblePaths = [
            path.join(__dirname, 'build', 'products.json'),
            path.join(__dirname, 'products.json'),
            path.join(__dirname, 'public', 'products.json'),
            path.join(__dirname, 'data', 'products.json')
        ];
        
        let targetPath = possiblePaths[0]; // Varsayılan
        
        // Mevcut dosyayı bul
        for (const testPath of possiblePaths) {
            try {
                await fs.access(testPath);
                targetPath = testPath;
                break;
            } catch (err) {
                continue;
            }
        }
        
        // products.json dosyasını güncelle
        await fs.writeFile(targetPath, JSON.stringify(newProductsData, null, 2));
        
        console.log(`Products.json dosyası güncellendi: ${targetPath}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Ürün veritabanı başarıyla güncellendi!' 
        });
    } catch (error) {
        console.error('Products.json güncelleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürün veritabanı güncellenirken hata oluştu!' 
        });
    }
});

// Products.json güncelleme API (Qt uygulaması için) - HTTPS
app.post('/api/update-products', async (req, res) => {
    try {
        const newProductsData = req.body;
        
        if (!newProductsData) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ürün verisi gerekli!' 
            });
        }

        // Mevcut products.json dosyasını bul
        const possiblePaths = [
            path.join(__dirname, 'build', 'products.json'),
            path.join(__dirname, 'products.json'),
            path.join(__dirname, 'public', 'products.json'),
            path.join(__dirname, 'data', 'products.json')
        ];
        
        let targetPath = possiblePaths[0]; // Varsayılan
        
        // Mevcut dosyayı bul
        for (const testPath of possiblePaths) {
            try {
                await fs.access(testPath);
                targetPath = testPath;
                break;
            } catch (err) {
                continue;
            }
        }
        
        // products.json dosyasını güncelle
        await fs.writeFile(targetPath, JSON.stringify(newProductsData, null, 2));
        
        console.log(`Products.json dosyası güncellendi: ${targetPath}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Ürün veritabanı başarıyla güncellendi!' 
        });
    } catch (error) {
        console.error('Products.json güncelleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürün veritabanı güncellenirken hata oluştu!' 
        });
    }
});

// Hero products güncelleme API (Qt uygulaması için)
app.post('/api/update-hero-products', async (req, res) => {
    try {
        const newHeroData = req.body;
        
        if (!newHeroData) {
            return res.status(400).json({ 
                success: false, 
                message: 'Hero ürün verisi gerekli!' 
            });
        }

        // hero-products.json dosyasını güncelle
        const heroPath = path.join(__dirname, 'hero-products.json');
        await fs.writeFile(heroPath, JSON.stringify(newHeroData, null, 2));
        
        console.log('Hero-products.json dosyası güncellendi');
        
        res.status(200).json({ 
            success: true, 
            message: 'Hero ürünler başarıyla güncellendi!' 
        });
    } catch (error) {
        console.error('Hero-products.json güncelleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Hero ürünler güncellenirken hata oluştu!' 
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