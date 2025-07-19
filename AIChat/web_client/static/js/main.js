// 全局变量
let userId; // 用户ID
let conversationHistory = []; // 聊天历史
let isTyping = false; // 是否正在输入
window.currentConversationFile = null; // 全局当前对话文件名

// DOM元素
let chatMessages;
let messageInput;
let sendBtn;
let typingIndicator;
let historyBtn;
let newChatBtn; // 新建对话按钮
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
let voiceInputBtn; // 语音输入按钮

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
    
    // 添加页面关闭时自动保存功能
    window.addEventListener('beforeunload', function(event) {
        // 如果存在聊天记录，则自动保存
        if (conversationHistory && conversationHistory.length > 0) {
            try {
                // 如果autoSaveConversation函数存在则使用它
                if (typeof autoSaveConversation === 'function') {
                    // 设置一个标志表明这是页面关闭时的保存
                    window.isClosingSave = true;
                    autoSaveConversation();
                    window.isClosingSave = false;
                } else {
                    // 备用方案：同步保存
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', '/api/save_conversation', false); // 同步请求
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    
                    // 创建请求体，与autoSaveConversation函数一致
                    const requestBody = {
                        user_id: userId,
                        conversation: conversationHistory
                    };
                    
                    // 只有在window.currentConversationFile有值时才传递文件名
                    if (window.currentConversationFile) {
                        requestBody.filename = window.currentConversationFile;
                    }
                    
                    xhr.send(JSON.stringify(requestBody));
                }
            } catch (e) {
                console.error("页面关闭时保存失败:", e);
            }
        }
    });
});

// 初始化DOM元素引用
function initDomReferences() {
    chatMessages = document.getElementById('chatMessages');
    messageInput = document.getElementById('messageInput');
    sendBtn = document.getElementById('sendBtn');
    typingIndicator = document.getElementById('typingIndicator');
    historyBtn = document.getElementById('historyBtn');
    newChatBtn = document.getElementById('newChatBtn');
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
    voiceInputBtn = document.getElementById('voiceInputBtn'); // 语音输入按钮
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
    
    // 顶部导航按钮
    newChatBtn.addEventListener('click', resetConversation);
    historyBtn.addEventListener('click', showHistoryModal);
    infoBtn.addEventListener('click', showInfoModal);
    
    // 语音输入按钮事件
    if (voiceInputBtn) {
        voiceInputBtn.addEventListener('click', toggleVoiceInput);
    }
    
    // 弹窗事件
    closeHistoryModal.addEventListener('click', hideHistoryModal);
    closeHistoryBtn.addEventListener('click', hideHistoryModal);
    loadHistoryBtn.addEventListener('click', loadSelectedConversation);
    
    closeInfoModal.addEventListener('click', hideInfoModal);
    closeInfoBtn.addEventListener('click', hideInfoModal);
    
    // 移动端优化
    setupMobileOptimizations();
}

// 切换语音输入
function toggleVoiceInput() {
    if (window.speechModule) {
        window.speechModule.startVoiceInput();
    } else {
        alert('您的浏览器不支持语音识别功能');
    }
}

// 初始化UI
function initUI() {
    messageInput.focus();
    
    // 确保初始时滚动到底部
    setTimeout(scrollToBottom, 100);
    
    // 检查浏览器是否支持语音识别
    checkSpeechRecognitionSupport();
}

// 检查语音识别支持
function checkSpeechRecognitionSupport() {
    const isSupported = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    
    if (!isSupported && voiceInputBtn) {
        // 如果不支持语音识别，禁用语音输入按钮
        voiceInputBtn.style.display = 'none';
        console.warn('此浏览器不支持语音识别功能');
    }
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