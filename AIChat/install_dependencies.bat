@echo off
chcp 65001 >nul
echo ========================================
echo 正在安装Python依赖包...
echo ========================================

:: 检查Python是否已安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python
    echo 请访问 https://www.python.org/downloads/ 下载并安装Python
    pause
    exit /b 1
)

:: 检查pip是否可用
pip --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到pip，请确保Python安装时包含了pip
    pause
    exit /b 1
)

echo 检测到Python版本:
python --version

echo.
echo 正在配置pip镜像源...
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/
pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn

echo.
echo 正在升级pip...
python -m pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple/

echo.
echo 正在安装项目依赖...
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/

if errorlevel 1 (
    echo.
    echo 清华源安装失败，尝试使用阿里云镜像源...
    pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
    
    if errorlevel 1 (
        echo.
        echo 阿里云源也失败，尝试使用豆瓣镜像源...
        pip install -r requirements.txt -i https://pypi.douban.com/simple/
        
        if errorlevel 1 (
            echo.
            echo 错误: 所有镜像源都安装失败，请检查网络连接或手动安装
            pause
            exit /b 1
        )
    )
)

echo.
echo ========================================
echo 依赖安装完成！
echo ========================================
echo.
echo 已安装的依赖包:
pip list

echo.
echo 按任意键退出...
pause >nul 