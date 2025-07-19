// 全局变量
let userId; // 用户ID
let conversationHistory = []; // 聊天历史
let isTyping = false; // 是否正在输入

// DOM元素
let chatMessages;
let messageInput;
let sendBtn;
let resetBtn;
let saveBtn;
let loadBtn;
let clearBtn;
let typingIndicator;
let historyBtn;
let infoBtn;
let historyModal;
let closeHistoryModal;
let historyLoading;
let historyEmpty;
let historyList;
let loadHistoryBtn;
let closeHistoryBtn;
let infoModal;
let closeInfoModal;
let closeInfoBtn;

// 初始化Socket.IO
const socket = io();

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化DOM元素引用
    initDomReferences();
    
    // 初始化用户ID
    initUserId();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 初始化UI
    initUI();
    
    // 初始化Socket连接
    initSocketConnection();
    
    // 初始化语音功能（如果浏览器支持）
    if (window.speechModule) {
        window.speechModule.init();
    }
});

// 初始化DOM元素引用
function initDomReferences() {
    chatMessages = document.getElementById('chatMessages');
    messageInput = document.getElementById('messageInput');
    sendBtn = document.getElementById('sendBtn');
    resetBtn = document.getElementById('resetBtn');
    saveBtn = document.getElementById('saveBtn');
    loadBtn = document.getElementById('loadBtn');
    clearBtn = document.getElementById('clearBtn');
    typingIndicator = document.getElementById('typingIndicator');
    historyBtn = document.getElementById('historyBtn');
    infoBtn = document.getElementById('infoBtn');
    historyModal = document.getElementById('historyModal');
    closeHistoryModal = document.getElementById('closeHistoryModal');
    historyLoading = document.getElementById('historyLoading');
    historyEmpty = document.getElementById('historyEmpty');
    historyList = document.getElementById('historyList');
    loadHistoryBtn = document.getElementById('loadHistoryBtn');
    closeHistoryBtn = document.getElementById('closeHistoryBtn');
    infoModal = document.getElementById('infoModal');
    closeInfoModal = document.getElementById('closeInfoModal');
    closeInfoBtn = document.getElementById('closeInfoBtn');
}

// 初始化用户ID
function initUserId() {
    // 尝试从本地存储获取用户ID
    userId = localStorage.getItem('chatUserId');
    
    // 如果没有用户ID，则生成一个新的
    if (!userId) {
        userId = generateUserId();
        // 保存到本地存储
        localStorage.setItem('chatUserId', userId);
    }
    
    console.log('用户ID:', userId);
    
    // 在页面显示用户ID（可选）
    const userIdElement = document.getElementById('userId');
    if (userIdElement) {
        userIdElement.textContent = `ID: ${userId.substring(0, 8)}...`;
    }
}

// 生成用户ID
function generateUserId() {
    // 获取设备信息
    const deviceInfo = getDeviceInfo();
    
    // 生成随机ID
    const randomPart = Date.now() + Math.random().toString(36).substring(2, 10);
    
    // 组合设备信息和随机部分
    return `user_${deviceInfo}_${randomPart}`;
}

// 获取设备信息
function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    // 创建设备指纹
    const deviceInfo = [
        userAgent.replace(/\s+/g, ''),
        platform,
        language,
        `${screenWidth}x${screenHeight}`
    ].join('_');
    
    // 使用简单的哈希函数生成设备ID
    return simpleHash(deviceInfo);
}

// 简单的哈希函数
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
}

// 初始化事件监听器
function initEventListeners() {
    // 输入框事件
    messageInput.addEventListener('input', autoResizeInput);
    messageInput.addEventListener('keydown', handleInputKeydown);
    messageInput.addEventListener('focus', handleInputFocus);
    
    // 按钮事件
    sendBtn.addEventListener('click', sendMessage);
    resetBtn.addEventListener('click', resetConversation);
    saveBtn.addEventListener('click', saveConversation);
    loadBtn.addEventListener('click', showHistoryModal);
    clearBtn.addEventListener('click', clearInterface);
    
    // 弹窗事件
    historyBtn.addEventListener('click', showHistoryModal);
    closeHistoryModal.addEventListener('click', hideHistoryModal);
    closeHistoryBtn.addEventListener('click', hideHistoryModal);
    loadHistoryBtn.addEventListener('click', loadSelectedConversation);
    
    infoBtn.addEventListener('click', showInfoModal);
    closeInfoModal.addEventListener('click', hideInfoModal);
    closeInfoBtn.addEventListener('click', hideInfoModal);
    
    // 移动端优化
    setupMobileOptimizations();
}

// 初始化UI
function initUI() {
    messageInput.focus();
    
    // 确保初始时滚动到底部
    setTimeout(scrollToBottom, 100);
}

// 初始化Socket连接
function initSocketConnection() {
    socket.on('connect', function() {
        console.log('已连接到服务器');
    });

    socket.on('disconnect', function() {
        console.log('与服务器断开连接');
    });
}

// 自动调整输入框高度
function autoResizeInput() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
}

// 处理输入框按键事件
function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// 处理输入框获取焦点
function handleInputFocus() {
    // 延迟滚动到底部，确保输入框可见
    setTimeout(() => {
        scrollToBottom();
    }, 300);
}

// 移动端优化设置
function setupMobileOptimizations() {
    // 防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // 防止输入框缩放
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // 虚拟键盘处理
    let initialViewportHeight = window.innerHeight;
    window.addEventListener('resize', function() {
        if (window.innerHeight < initialViewportHeight) {
            // 虚拟键盘弹出
            document.body.style.height = window.innerHeight + 'px';
        } else {
            // 虚拟键盘收起
            document.body.style.height = '100vh';
        }
    });
    
    // 防止页面整体滚动
    document.addEventListener('touchmove', function(e) {
        // 只允许聊天消息区域滚动
        if (!chatMessages.contains(e.target)) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // 防止页面滚动
    document.addEventListener('scroll', function(e) {
        if (e.target !== chatMessages) {
            e.preventDefault();
        }
    });
    
    // 确保只有垂直滚动
    chatMessages.addEventListener('touchmove', function(e) {
        const touch = e.touches[0];
        const startY = this.touchStartY || touch.clientY;
        const startX = this.touchStartX || touch.clientX;
        
        if (!this.touchStartY) {
            this.touchStartY = touch.clientY;
            this.touchStartX = touch.clientX;
        }
        
        const deltaY = Math.abs(touch.clientY - startY);
        const deltaX = Math.abs(touch.clientX - startX);
        
        // 如果水平滑动距离大于垂直滑动距离，阻止滚动
        if (deltaX > deltaY) {
            e.preventDefault();
        }
    });
    
    chatMessages.addEventListener('touchend', function() {
        this.touchStartY = null;
        this.touchStartX = null;
    });
    
    // 防止过度滚动
    chatMessages.addEventListener('touchstart', function(e) {
        this.touchStartY = e.touches[0].clientY;
    });
    
    chatMessages.addEventListener('touchmove', function(e) {
        const touchY = e.touches[0].clientY;
        const scrollTop = chatMessages.scrollTop;
        const scrollHeight = chatMessages.scrollHeight;
        const clientHeight = chatMessages.clientHeight;
        
        // 防止过度滚动
        if (scrollTop <= 0 && touchY > this.touchStartY) {
            e.preventDefault();
        }
        if (scrollTop + clientHeight >= scrollHeight && touchY < this.touchStartY) {
            e.preventDefault();
        }
    });
}

// 显示历史对话弹窗
function showHistoryModal() {
    historyModal.classList.add('show');
    loadConversationList();
}

// 隐藏历史对话弹窗
function hideHistoryModal() {
    historyModal.classList.remove('show');
}

// 显示关于弹窗
function showInfoModal() {
    infoModal.classList.add('show');
}

// 隐藏关于弹窗
function hideInfoModal() {
    infoModal.classList.remove('show');
}

// 加载选中的对话
function loadSelectedConversation() {
    const selectedItem = document.querySelector('.history-item.selected');
    if (selectedItem) {
        const filename = selectedItem.dataset.filename;
        loadConversation(filename);
        hideHistoryModal();
    } else {
        alert('请选择一个对话记录');
    }
} 