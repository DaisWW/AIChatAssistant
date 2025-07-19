// 聊天功能相关代码

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
        // 保存当前对话，并设置一个特殊标记以区分来自重置的保存
        const currentFile = window.currentConversationFile;
        // 自动保存当前对话
        autoSaveConversation();
    }
    
    // 重置当前对话文件名，这样下次保存时会创建新文件
    window.currentConversationFile = null;
    
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
                
                // 确保文件名已重置，这样下一次保存将创建新文件
                window.currentConversationFile = null;
            }
        });
    } else {
        // 如果用户取消重置，恢复原来的文件名
        if (conversationHistory.length > 0) {
            // 这里不需要做什么，因为我们没有提前改变currentConversationFile
        }
    }
}

// 自动保存对话（不显示提示）
function autoSaveConversation() {
    if (conversationHistory.length === 0) {
        return;
    }
    
    // 确保我们有正确的保存请求体
    const requestBody = {
        user_id: userId,
        conversation: conversationHistory
    };
    
    // 只有在window.currentConversationFile有值时才传递，保证新对话一定会创建新文件
    if (window.currentConversationFile) {
        requestBody.filename = window.currentConversationFile;
    }

    // 页面关闭时需要同步保存
    if (window.isClosingSave) {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/save_conversation', false); // 同步请求
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(requestBody));
            
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    console.log(`页面关闭前已保存对话：${response.filename}`);
                    window.currentConversationFile = response.filename;
                }
            }
        } catch (e) {
            console.error('页面关闭时保存失败:', e);
        }
        return;
    }

    // 正常情况下异步保存
    fetch('/api/save_conversation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`聊天记录已自动保存到：${data.filename}`);
            // 更新当前对话文件名
            window.currentConversationFile = data.filename;
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
                        <div class="history-item-content">
                            <div class="history-item-title">${displayName}</div>
                            <div class="history-item-meta">
                                <span>${formatFileSize(file.size)}</span>
                                <span>${file.modified_time}</span>
                            </div>
                        </div>
                        <div class="history-item-actions">
                            <button class="history-delete-btn" title="删除此记录">🗑️</button>
                        </div>
                    `;
                    
                    // 点击选择
                    item.querySelector('.history-item-content').addEventListener('click', function() {
                        // 移除其他项的选中状态
                        document.querySelectorAll('.history-item').forEach(el => {
                            el.classList.remove('selected');
                        });
                        // 添加选中状态
                        item.classList.add('selected');
                    });
                    
                    // 删除按钮点击事件
                    const deleteBtn = item.querySelector('.history-delete-btn');
                    deleteBtn.addEventListener('click', function(e) {
                        e.stopPropagation(); // 阻止事件冒泡，防止触发项目选中事件
                        deleteConversation(file.filename);
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

    // 加载新对话时，设置当前文件名为加载的文件
    window.currentConversationFile = filename;

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

// 删除对话历史记录
function deleteConversation(filename) {
    if (!confirm('确定要删除这条对话记录吗？此操作不可撤销。')) {
        return;
    }
    
    fetch('/api/delete_conversation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filename: filename
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 如果删除的是当前正在查看的对话，需要重置对话
            if (window.currentConversationFile === filename) {
                window.currentConversationFile = null;
                resetConversation();
            }
            
            // 重新加载对话列表
            loadConversationList();
        } else {
            alert('删除失败：' + data.error);
        }
    })
    .catch(error => {
        console.error('删除对话时出错：', error);
        alert('删除失败：网络错误');
    });
} 