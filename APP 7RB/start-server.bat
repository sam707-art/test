@echo off
chcp 65001 >nul
echo ========================================
echo   تشغيل خادم BLOOD HUNT للسجلات
echo ========================================
echo.

cd /d "%~dp0"

echo جارٍ التحقق من Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ Node.js غير مثبت!
    echo.
    echo يرجى تثبيت Node.js من:
    echo https://nodejs.org/
    echo.
    echo بعد التثبيت، أعد تشغيل هذا الملف.
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js موجود
echo.

if not exist "node_modules" (
    echo جارٍ تثبيت التبعيات...
    call npm install
    echo.
)

echo 🚀 بدء تشغيل الخادم...
echo.
echo 📊 صفحة السجلات: http://localhost:3000/logs-viewer
echo 🛒 المتجر: http://localhost:3000/blood-hent-store.html
echo.
echo اضغط Ctrl+C لإيقاف الخادم
echo.

call npm start
