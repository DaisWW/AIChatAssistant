@echo off
chcp 65001 >nul
echo ================================================
echo 🌐 DeepSeek聊天网页服务器
echo ================================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到Python，请先安装Python 3.7+
    pause
    exit /b 1
)

REM 检查依赖是否安装
echo 🔍 检查依赖包...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo 📦 安装依赖包...
    pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo ✅ 环境检查完成
echo 🚀 启动网页服务器...
echo.

python main.py --client web

pause 