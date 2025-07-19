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

:: 尝试批量安装
call :install_with_mirrors requirements.txt
if errorlevel 1 (
    echo.
    echo 批量安装失败，尝试逐个安装依赖包...
    call :install_packages_individually
)

echo.
echo ========================================
echo 验证依赖安装状态
echo ========================================
echo.

:: 验证关键依赖包
call :verify_package "requests" "requests"
call :verify_package "Pillow" "PIL"
call :verify_package "Flask" "flask"
call :verify_package "Flask-SocketIO" "flask_socketio"
call :verify_package "python-socketio" "socketio"

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
exit /b 0

:: ========================================
:: 函数: 使用多个镜像源安装
:: ========================================
:install_with_mirrors
set "package_file=%1"
echo 尝试使用清华源安装 %package_file%...
pip install -r %package_file% -i https://pypi.tuna.tsinghua.edu.cn/simple/
if not errorlevel 1 exit /b 0

echo 清华源失败，尝试阿里云源...
pip install -r %package_file% -i https://mirrors.aliyun.com/pypi/simple/
if not errorlevel 1 exit /b 0

echo 阿里云源失败，尝试豆瓣源...
pip install -r %package_file% -i https://pypi.douban.com/simple/
if not errorlevel 1 exit /b 0

echo 豆瓣源失败，尝试中科大源...
pip install -r %package_file% -i https://pypi.mirrors.ustc.edu.cn/simple/
if not errorlevel 1 exit /b 0

echo 中科大源失败，尝试强制重新下载...
pip install -r %package_file% -i https://pypi.tuna.tsinghua.edu.cn/simple/ --no-cache-dir
exit /b %errorlevel%

:: ========================================
:: 函数: 逐个安装依赖包
:: ========================================
:install_packages_individually
echo 正在逐个安装依赖包...

:: 安装基础依赖
call :install_single_package "requests==2.31.0"
call :install_single_package "tkinter-tooltip==2.0.0"
call :install_single_package "Pillow==10.0.0"
call :install_single_package "Flask==2.3.3"

:: 特殊处理Flask-SocketIO
echo.
echo 正在尝试多种方法安装Flask-SocketIO...
call :install_flask_socketio

:: 安装python-socketio
call :install_single_package "python-socketio==5.8.0"

echo.
echo 逐个安装完成！
exit /b 0

:: ========================================
:: 函数: 安装单个包
:: ========================================
:install_single_package
set "package=%1"
pip install %package% -i https://pypi.tuna.tsinghua.edu.cn/simple/
if errorlevel 1 (
    pip install %package% -i https://mirrors.aliyun.com/pypi/simple/
    if errorlevel 1 (
        pip install %package% -i https://pypi.douban.com/simple/
        if errorlevel 1 (
            echo 警告: %package% 安装失败
        )
    )
)
exit /b 0

:: ========================================
:: 函数: 特殊安装Flask-SocketIO
:: ========================================
:install_flask_socketio
:: 方法1: 清华源
pip install Flask-SocketIO==5.3.6 -i https://pypi.tuna.tsinghua.edu.cn/simple/
if not errorlevel 1 exit /b 0

:: 方法2: 阿里云源
pip install Flask-SocketIO==5.3.6 -i https://mirrors.aliyun.com/pypi/simple/
if not errorlevel 1 exit /b 0

:: 方法3: 豆瓣源
pip install Flask-SocketIO==5.3.6 -i https://pypi.douban.com/simple/
if not errorlevel 1 exit /b 0

:: 方法4: 中科大源
pip install Flask-SocketIO==5.3.6 -i https://pypi.mirrors.ustc.edu.cn/simple/
if not errorlevel 1 exit /b 0

:: 方法5: 信任主机
pip install Flask-SocketIO==5.3.6 -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn
if not errorlevel 1 exit /b 0

:: 方法6: 强制重新下载
pip install Flask-SocketIO==5.3.6 -i https://pypi.tuna.tsinghua.edu.cn/simple/ --no-cache-dir
if not errorlevel 1 exit /b 0

:: 方法7: 不指定版本
pip install Flask-SocketIO -i https://pypi.tuna.tsinghua.edu.cn/simple/
if not errorlevel 1 exit /b 0

echo 警告: Flask-SocketIO安装失败
exit /b 1

:: ========================================
:: 函数: 验证包安装状态
:: ========================================
:verify_package
set "package_name=%1"
set "import_name=%2"
echo 验证%package_name%...
python -c "import %import_name%; print('✓ %package_name%版本:', %import_name%.__version__)" 2>nul
if errorlevel 1 echo ✗ %package_name%安装失败
exit /b 0 