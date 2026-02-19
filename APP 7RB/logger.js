// نظام السجلات الكامل لمتجر BLOOD HUNT
// يتتبع جميع الزوار وتسجيلات الحسابات والأنشطة

class BloodHuntLogger {
    constructor() {
        this.apiEndpoint = 'http://localhost:3000/api/logs';
        this.init();
    }

    init() {
        // تسجيل زيارة الصفحة عند التحميل
        this.logPageVisit();
        
        // تسجيل أي نشاط على الصفحة
        this.trackUserActivity();
        
        // تسجيل معلومات المتصفح والجهاز
        this.logDeviceInfo();
    }

    // تسجيل زيارة الصفحة
    logPageVisit() {
        const logData = {
            type: 'PAGE_VISIT',
            page: window.location.pathname || window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'Direct',
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            ip: 'N/A' // سيتم الحصول عليه من الخادم
        };

        this.sendLog(logData);
    }

    // تسجيل تسجيل حساب جديد
    logRegistration(userData) {
        const logData = {
            type: 'REGISTRATION',
            timestamp: new Date().toISOString(),
            userData: {
                email: userData.email || 'N/A',
                username: userData.username || 'N/A',
                name: userData.name || 'N/A',
                phone: userData.phone || 'N/A'
            },
            page: window.location.pathname || window.location.href,
            userAgent: navigator.userAgent,
            ip: 'N/A'
        };

        this.sendLog(logData);
        
        // إشعار في console
        console.log('✅ تم تسجيل حساب جديد:', userData);
    }

    // تسجيل تسجيل الدخول
    logLogin(email, method = 'email') {
        const logData = {
            type: 'LOGIN',
            timestamp: new Date().toISOString(),
            email: email,
            loginMethod: method, // email, google, facebook
            page: window.location.pathname || window.location.href,
            userAgent: navigator.userAgent,
            ip: 'N/A'
        };

        this.sendLog(logData);
        console.log('✅ تم تسجيل الدخول:', email, 'بواسطة', method);
    }

    // تسجيل محاولة تسجيل دخول فاشلة
    logLoginAttempt(email, reason) {
        const logData = {
            type: 'LOGIN_ATTEMPT_FAILED',
            timestamp: new Date().toISOString(),
            email: email,
            reason: reason,
            page: window.location.pathname || window.location.href,
            userAgent: navigator.userAgent,
            ip: 'N/A'
        };

        this.sendLog(logData);
        console.warn('⚠️ محاولة تسجيل دخول فاشلة:', email, '- السبب:', reason);
    }

    // تسجيل إضافة منتج للسلة
    logAddToCart(productName, productPrice) {
        const logData = {
            type: 'ADD_TO_CART',
            timestamp: new Date().toISOString(),
            product: {
                name: productName,
                price: productPrice
            },
            page: window.location.pathname || window.location.href,
            userAgent: navigator.userAgent,
            ip: 'N/A'
        };

        this.sendLog(logData);
    }

    // تسجيل النقر على رابط
    logLinkClick(linkUrl, linkText) {
        const logData = {
            type: 'LINK_CLICK',
            timestamp: new Date().toISOString(),
            link: {
                url: linkUrl,
                text: linkText
            },
            page: window.location.pathname || window.location.href,
            userAgent: navigator.userAgent,
            ip: 'N/A'
        };

        this.sendLog(logData);
    }

    // تسجيل معلومات الجهاز والمتصفح
    logDeviceInfo() {
        const deviceInfo = {
            type: 'DEVICE_INFO',
            timestamp: new Date().toISOString(),
            device: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                colorDepth: window.screen.colorDepth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            page: window.location.pathname || window.location.href,
            ip: 'N/A'
        };

        // إرسال معلومات الجهاز مرة واحدة فقط
        if (!sessionStorage.getItem('deviceInfoLogged')) {
            this.sendLog(deviceInfo);
            sessionStorage.setItem('deviceInfoLogged', 'true');
        }
    }

    // تتبع نشاط المستخدم
    trackUserActivity() {
        // تتبع النقرات على الروابط
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href) {
                this.logLinkClick(link.href, link.textContent.trim());
            }
        });

        // تتبع إضافة المنتجات للسلة
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart')) {
                const productCard = e.target.closest('.product-card');
                if (productCard) {
                    const productName = productCard.querySelector('.product-title')?.textContent || 'Unknown';
                    const productPrice = productCard.querySelector('.product-price')?.textContent || 'N/A';
                    this.logAddToCart(productName, productPrice);
                }
            }
        });

        // تتبع الوقت الذي يقضيه المستخدم على الصفحة
        let startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const timeSpent = Math.round((Date.now() - startTime) / 1000);
            const logData = {
                type: 'PAGE_TIME_SPENT',
                timestamp: new Date().toISOString(),
                timeSpentSeconds: timeSpent,
                page: window.location.pathname || window.location.href,
                userAgent: navigator.userAgent,
                ip: 'N/A'
            };
            
            // إرسال سريع قبل إغلاق الصفحة
            navigator.sendBeacon ? 
                navigator.sendBeacon(this.apiEndpoint, JSON.stringify(logData)) :
                this.sendLog(logData);
        });
    }

    // إرسال السجل إلى الخادم
    async sendLog(logData) {
        try {
            // محاولة إرسال إلى الخادم
            if (navigator.sendBeacon) {
                navigator.sendBeacon(this.apiEndpoint, JSON.stringify(logData));
            } else {
                fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(logData)
                }).catch(err => {
                    // في حالة فشل الإرسال، حفظ في localStorage كنسخة احتياطية
                    this.saveToLocalStorage(logData);
                });
            }
        } catch (error) {
            console.error('خطأ في إرسال السجل:', error);
            // حفظ في localStorage كنسخة احتياطية
            this.saveToLocalStorage(logData);
        }
    }

    // حفظ السجلات في localStorage كنسخة احتياطية
    saveToLocalStorage(logData) {
        try {
            let logs = JSON.parse(localStorage.getItem('bloodHuntLogs') || '[]');
            logs.push(logData);
            
            // الاحتفاظ بآخر 1000 سجل فقط
            if (logs.length > 1000) {
                logs = logs.slice(-1000);
            }
            
            localStorage.setItem('bloodHuntLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('خطأ في حفظ السجل محلياً:', error);
        }
    }

    // الحصول على السجلات المحلية
    getLocalLogs() {
        try {
            return JSON.parse(localStorage.getItem('bloodHuntLogs') || '[]');
        } catch (error) {
            console.error('خطأ في قراءة السجلات المحلية:', error);
            return [];
        }
    }
}

// تهيئة نظام السجلات
const bloodHuntLogger = new BloodHuntLogger();

// تصدير للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BloodHuntLogger;
}
