// 聊天功能相关代码

// 全局变量，用于跟踪当前对话的文件名
let currentConversationFile = null;

// 发送消息
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isTyping) return;

    // 添加用户消息到界面
    addMessage(message, 'user');
    
    // 清空输入框
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // 显示打字指示器
    showTypingIndicator();

    // 发送到服务器
    fetch('/api/send_message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: message,
            user_id: userId
        })
    })
    .then(response => response.json())
    .then(data => {
        hideTypingIndicator();
        
        if (data.success) {
            const response = data.response;
            addMessage(response, 'bot', data.timestamp);
            
            // 使用语音朗读AI回复
            if (window.speechModule) {
                window.speechModule.speakAIResponse(response);
            }
            
            // 自动保存聊天记录
            autoSaveConversation();
        } else {
            addMessage('❌ ' + data.error, 'bot');
        }
    })
    .catch(error => {
        hideTypingIndicator();
        addMessage('❌ 网络错误，请重试', 'bot');
        console.error('Error:', error);
    });
}

// 重置对话
function resetConversation() {
    if (conversationHistory.length > 0) {
        // 自动保存当前对话
        autoSaveConversation();
        // 重置当前对话文件名
        currentConversationFile = null;
    }
    
    if (confirm('确定要开始新对话吗？这将清空所有当前聊天记录。')) {
        fetch('/api/reset_conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                conversationHistory = [];
                chatMessages.innerHTML = `
                    <div class="welcome-message">
                        <h3>对话已重置！</h3>
                        <p>我是小甜心，重新开始聊天吧～ 😊</p>
                    </div>
                `;
            }
        });
    }
}

// 自动保存对话（不显示提示）
function autoSaveConversation() {
    if (conversationHistory.length === 0) {
        return;
    }

    fetch('/api/save_conversation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            conversation: conversationHistory,
            filename: currentConversationFile
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`聊天记录已自动保存到：${data.filename}`);
            // 更新当前对话文件名
            currentConversationFile = data.filename;
        } else {
            console.error('自动保存失败：', data.error);
        }
    })
    .catch(error => {
        console.error('保存时出现错误：', error);
    });
}

// 加载对话历史列表
function loadConversationList() {
    historyLoading.style.display = 'block';
    historyEmpty.style.display = 'none';
    historyList.innerHTML = ''; // 清空列表

    fetch('/api/get_conversation_files', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        historyLoading.style.display = 'none';
        
        if (data.success && data.files && data.files.length > 0) {
            // 过滤出当前用户的对话记录
            const userFiles = data.files.filter(file => {
                // 检查文件名是否包含当前用户ID
                // 用户ID可能是完整的或者是哈希后的部分
                const userIdPart = userId.split('_')[1]; // 获取设备信息部分
                return file.filename.includes(userId) || file.filename.includes(userIdPart);
            });
            
            if (userFiles.length > 0) {
                // 创建历史记录列表
                userFiles.forEach(file => {
                    const item = document.createElement('li');
                    item.className = 'history-item';
                    item.dataset.filename = file.filename;
                    
                    // 从文件名提取时间信息
                    let displayName = formatDate(file.modified_time);
                    
                    item.innerHTML = `
                        <div class="history-item-title">${displayName}</div>
                        <div class="history-item-meta">
                            <span>${formatFileSize(file.size)}</span>
                            <span>${file.modified_time}</span>
                        </div>
                    `;
                    
                    // 点击选择
                    item.addEventListener('click', function() {
                        // 移除其他项的选中状态
                        document.querySelectorAll('.history-item').forEach(el => {
                            el.classList.remove('selected');
                        });
                        // 添加选中状态
                        this.classList.add('selected');
                    });
                    
                    historyList.appendChild(item);
                });
            } else {
                historyEmpty.style.display = 'block';
            }
        } else {
            historyEmpty.style.display = 'block';
        }
    })
    .catch(error => {
        historyLoading.style.display = 'none';
        historyEmpty.style.display = 'block';
        console.error('Error loading history:', error);
    });
}

// 加载特定对话
function loadConversation(filename) {
    // 显示加载中
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <h3>加载中...</h3>
            <p>正在加载对话记录，请稍候...</p>
        </div>
    `;

    fetch('/api/load_conversation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filename: filename,
            user_id: userId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 清空当前聊天界面
            chatMessages.innerHTML = '';
            
            // 重置对话历史
            conversationHistory = [];
            
            // 添加加载的消息到界面
            if (data.conversation && data.conversation.length > 0) {
                data.conversation.forEach(msg => {
                    // 将assistant角色转换为bot（前端使用bot表示机器人消息）
                    const role = msg.role === 'assistant' ? 'bot' : msg.role;
                    addMessage(msg.content, role, msg.timestamp || null);
                });
                
                // 显示加载成功提示
                const loadSuccessMsg = document.createElement('div');
                loadSuccessMsg.className = 'system-message';
                loadSuccessMsg.innerHTML = `
                    <div class="system-message-content">
                        ✅ 已加载对话记录：${filename}
                    </div>
                `;
                chatMessages.appendChild(loadSuccessMsg);
            } else {
                // 如果没有消息，显示欢迎消息
                chatMessages.innerHTML = `
                    <div class="welcome-message">
                        <h3>对话记录已加载</h3>
                        <p>但没有找到任何消息，开始新的对话吧！</p>
                    </div>
                `;
            }
            
            // 滚动到底部
            scrollToBottom();
        } else {
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <h3>加载失败</h3>
                    <p>${data.error || '无法加载对话记录'}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <h3>加载失败</h3>
                <p>网络错误，请重试</p>
            </div>
        `;
        console.error('Error loading conversation:', error);
    });
}

// 自动滚动到底部
function scrollToBottom() {
    const scrollHeight = chatMessages.scrollHeight;
    const clientHeight = chatMessages.clientHeight;
    const maxScrollTop = scrollHeight - clientHeight;
    
    // 使用平滑滚动
    chatMessages.scrollTo({
        top: maxScrollTop,
        behavior: 'smooth'
    });
    
    // 确保输入区域可见
    ensureInputAreaVisible();
}

// 确保输入区域可见
function ensureInputAreaVisible() {
    // 在移动设备上，确保输入区域可见
    if (window.innerWidth <= 768) {
        // 延迟执行，确保DOM已经更新
        setTimeout(() => {
            const inputArea = document.querySelector('.input-area');
            if (inputArea) {
                // 确保输入区域在视口中
                inputArea.scrollIntoView(false);
            }
        }, 100);
    }
}

// 检查是否在底部附近
function isNearBottom() {
    const scrollTop = chatMessages.scrollTop;
    const scrollHeight = chatMessages.scrollHeight;
    const clientHeight = chatMessages.clientHeight;
    const threshold = 100; // 100px阈值
    
    return (scrollTop + clientHeight) >= (scrollHeight - threshold);
}

// 添加消息到界面
function addMessage(content, sender, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const time = timestamp || new Date().toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });

    // 如果是机器人消息，添加朗读按钮
    let speakButton = '';
    if (sender === 'bot' && window.speechModule) {
        // 使用内联事件处理器改为直接调用函数，避免可能的作用域问题
        speakButton = `<button class="speak-btn" title="朗读消息" onclick="window.speechModule.speak(this.closest('.message').querySelector('.message-text').textContent)">🔊</button>`;
    }

    messageDiv.innerHTML = `
        ${sender === 'user' ? '' : '<div class="avatar bot">💕</div>'}
        <div class="message-content">
            <div class="message-text">${content.replace(/\n/g, '<br>')}</div>
            <div class="message-footer">
                <div class="message-time">${time}</div>
                ${speakButton}
            </div>
        </div>
        ${sender === 'user' ? '<div class="avatar user">👤</div>' : ''}
    `;

    // 为朗读按钮添加事件监听器（作为备用方案）
    const speakBtn = messageDiv.querySelector('.speak-btn');
    if (speakBtn) {
        speakBtn.addEventListener('click', function() {
            const messageText = this.closest('.message').querySelector('.message-text').textContent;
            if (window.speechModule) {
                window.speechModule.speak(messageText);
            }
        });
    }

    chatMessages.appendChild(messageDiv);
    
    // 总是自动滚动到底部
    scrollToBottom();

    // 添加到历史记录
    conversationHistory.push({
        role: sender === 'bot' ? 'assistant' : sender, // 将bot转换为assistant（后端使用assistant表示机器人消息）
        content: content,
        timestamp: time
    });
}

// 显示打字指示器
function showTypingIndicator() {
    isTyping = true;
    typingIndicator.style.display = 'block';
    // 总是自动滚动到底部
    scrollToBottom();
}

// 隐藏打字指示器
function hideTypingIndicator() {
    isTyping = false;
    typingIndicator.style.display = 'none';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
} 

// 格式化日期
function formatDate(dateStr) {
    try {
        // 尝试解析日期字符串
        const date = new Date(dateStr);
        if (isNaN(date)) {
            // 如果无法解析，尝试解析中文格式
            const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/);
            if (match) {
                const [_, year, month, day, hour, minute, second] = match;
                return `${year}年${month}月${day}日 ${hour}:${minute}`;
            }
            return dateStr;
        }
        
        // 格式化日期
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

// 保存对话
function saveConversation() {
    if (conversationHistory.length === 0) {
        alert('没有聊天记录可保存');
        return;
    }

    fetch('/api/save_conversation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            conversation: conversationHistory
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`聊天记录已保存到：${data.filename}`);
        } else {
            alert('保存失败：' + data.error);
        }
    });
}

// 清空界面
function clearInterface() {
    if (confirm('确定要清空界面吗？')) {
        conversationHistory = [];
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <h3>界面已清空</h3>
                <p>我是小甜心，有什么想聊的吗？</p>
            </div>
        `;
    }
} 