// خادم Node.js لتخزين سجلات متجر BLOOD HUNT
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const LOGS_DIR = path.join(__dirname, 'logs');

// إنشاء مجلد السجلات إذا لم يكن موجوداً
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// دالة للحصول على عنوان IP الحقيقي
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           'Unknown';
}

// دالة للحصول على اسم ملف السجل اليومي
function getLogFileName() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(LOGS_DIR, `bloodhunt-${dateStr}.log`);
}

// دالة لكتابة السجل في الملف
function writeLog(logData, clientIP) {
    const logEntry = {
        ...logData,
        ip: clientIP,
        serverTimestamp: new Date().toISOString()
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    const logFile = getLogFileName();

    // إلحاق السجل بالملف
    fs.appendFileSync(logFile, logLine, 'utf8');
    
    // طباعة في console أيضاً
    console.log(`[${new Date().toLocaleString('ar-SA')}] ${logData.type}:`, logData);
}

// API endpoint لاستقبال السجلات
app.post('/api/logs', (req, res) => {
    try {
        const logData = req.body;
        const clientIP = getClientIP(req);
        
        // إضافة عنوان IP
        logData.ip = clientIP;
        
        // كتابة السجل
        writeLog(logData, clientIP);
        
        res.status(200).json({ 
            success: true, 
            message: 'تم حفظ السجل بنجاح',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('خطأ في حفظ السجل:', error);
        res.status(500).json({ 
            success: false, 
            error: 'فشل في حفظ السجل',
            message: error.message 
        });
    }
});

// API endpoint للحصول على السجلات
app.get('/api/logs', (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const logFile = path.join(LOGS_DIR, `bloodhunt-${date}.log`);
        
        if (!fs.existsSync(logFile)) {
            return res.json({ logs: [], date: date });
        }

        const fileContent = fs.readFileSync(logFile, 'utf8');
        const lines = fileContent.trim().split('\n').filter(line => line.trim());
        const logs = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(log => log !== null);

        res.json({ 
            logs: logs, 
            date: date,
            count: logs.length 
        });
    } catch (error) {
        console.error('خطأ في قراءة السجلات:', error);
        res.status(500).json({ 
            success: false, 
            error: 'فشل في قراءة السجلات',
            message: error.message 
        });
    }
});

// API endpoint للحصول على جميع ملفات السجلات
app.get('/api/logs/files', (req, res) => {
    try {
        const files = fs.readdirSync(LOGS_DIR)
            .filter(file => file.startsWith('bloodhunt-') && file.endsWith('.log'))
            .map(file => {
                const filePath = path.join(LOGS_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    date: file.replace('bloodhunt-', '').replace('.log', ''),
                    size: stats.size,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({ files: files });
    } catch (error) {
        console.error('خطأ في قراءة ملفات السجلات:', error);
        res.status(500).json({ 
            success: false, 
            error: 'فشل في قراءة ملفات السجلات',
            message: error.message 
        });
    }
});

// API endpoint للحصول على إحصائيات
app.get('/api/logs/stats', (req, res) => {
    try {
        const files = fs.readdirSync(LOGS_DIR)
            .filter(file => file.startsWith('bloodhunt-') && file.endsWith('.log'));

        let totalLogs = 0;
        let pageVisits = 0;
        let registrations = 0;
        let logins = 0;
        let failedLogins = 0;
        let addToCart = 0;
        const uniqueIPs = new Set();
        const uniqueEmails = new Set();

        files.forEach(file => {
            const filePath = path.join(LOGS_DIR, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const lines = fileContent.trim().split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
                try {
                    const log = JSON.parse(line);
                    totalLogs++;
                    
                    if (log.ip) uniqueIPs.add(log.ip);
                    
                    switch(log.type) {
                        case 'PAGE_VISIT':
                            pageVisits++;
                            break;
                        case 'REGISTRATION':
                            registrations++;
                            if (log.userData?.email) uniqueEmails.add(log.userData.email);
                            break;
                        case 'LOGIN':
                            logins++;
                            if (log.email) uniqueEmails.add(log.email);
                            break;
                        case 'LOGIN_ATTEMPT_FAILED':
                            failedLogins++;
                            break;
                        case 'ADD_TO_CART':
                            addToCart++;
                            break;
                    }
                } catch (e) {
                    // تجاهل السطور غير الصالحة
                }
            });
        });

        res.json({
            totalLogs: totalLogs,
            pageVisits: pageVisits,
            registrations: registrations,
            logins: logins,
            failedLogins: failedLogins,
            addToCart: addToCart,
            uniqueVisitors: uniqueIPs.size,
            uniqueUsers: uniqueEmails.size
        });
    } catch (error) {
        console.error('خطأ في حساب الإحصائيات:', error);
        res.status(500).json({ 
            success: false, 
            error: 'فشل في حساب الإحصائيات',
            message: error.message 
        });
    }
});

// صفحة عرض السجلات
app.get('/logs-viewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'logs-viewer.html'));
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`🚀 خادم BLOOD HUNT يعمل على http://localhost:${PORT}`);
    console.log(`📊 عرض السجلات: http://localhost:${PORT}/logs-viewer`);
    console.log(`📁 مجلد السجلات: ${LOGS_DIR}`);
});
