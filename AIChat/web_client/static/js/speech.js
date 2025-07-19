// 语音功能相关代码

// 语音合成对象
let speechSynthesis = window.speechSynthesis;
let speechUtterance = null;
let isSpeaking = false;
let isPaused = false;
let voiceOptions = [];
let selectedVoice = null;
let speechRate = 1.0;
let speechPitch = 1.0;
let speechVolume = 1.0;
let autoSpeak = true; // 是否自动朗读AI回复

// 语音识别对象
let recognition = null;
let isRecognizing = false;

// 创建语音模块
const speechModule = {
    init: function() {
        return initSpeech();
    },
    speak: function(text) {
        speak(text);
    },
    stopSpeaking: function() {
        stopSpeaking();
    },
    togglePause: function() {
        togglePause();
    },
    setVoice: function(voiceName) {
        setVoice(voiceName);
    },
    setRate: function(rate) {
        setRate(rate);
    },
    setPitch: function(pitch) {
        setPitch(pitch);
    },
    setVolume: function(volume) {
        setVolume(volume);
    },
    setAutoSpeak: function(value) {
        setAutoSpeak(value);
    },
    speakAIResponse: function(text) {
        speakAIResponse(text);
    },
    startVoiceInput: function() {
        startVoiceInput();
    },
    stopVoiceInput: function() {
        stopVoiceInput();
    }
};

// 导出语音模块
window.speechModule = speechModule;

// 初始化语音功能
function initSpeech() {
    console.log("初始化语音功能...");
    
    // 检查浏览器是否支持语音合成
    if (!('speechSynthesis' in window)) {
        console.error('浏览器不支持语音合成');
        return false;
    }
    
    // 强制取消任何可能挂起的语音
    speechSynthesis.cancel();
    
    // 加载可用的语音
    loadVoices();
    
    // 监听语音列表变化（某些浏览器可能会延迟加载语音）
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // 从本地存储加载语音设置
    loadSpeechSettings();
    
    // 测试语音功能是否正常
    testSpeechSynthesis();
    
    // 初始化语音识别
    initSpeechRecognition();
    
    return true;
}

// 初始化语音识别
function initSpeechRecognition() {
    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('浏览器不支持语音识别');
        return false;
    }
    
    // 创建语音识别对象
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    
    // 设置语音识别参数
    recognition.continuous = false; // 不持续识别
    recognition.interimResults = true; // 显示中间结果
    recognition.maxAlternatives = 1; // 返回最可能的识别结果
    recognition.lang = 'zh-CN'; // 设置语言为中文
    
    // 设置事件处理
    recognition.onstart = function() {
        console.log('语音识别已开始');
        isRecognizing = true;
        updateVoiceInputButton(true);
    };
    
    recognition.onend = function() {
        console.log('语音识别已结束');
        isRecognizing = false;
        updateVoiceInputButton(false);
    };
    
    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript) {
            // 将最终识别结果添加到输入框
            addRecognitionResultToInput(finalTranscript);
        } else if (interimTranscript) {
            // 显示临时识别结果
            showInterimResult(interimTranscript);
        }
    };
    
    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        isRecognizing = false;
        updateVoiceInputButton(false);
        
        // 显示错误提示
        if (event.error === 'no-speech') {
            showRecognitionError('未检测到语音');
        } else if (event.error === 'audio-capture') {
            showRecognitionError('无法访问麦克风');
        } else if (event.error === 'not-allowed') {
            showRecognitionError('麦克风访问被拒绝');
        } else {
            showRecognitionError('语音识别错误: ' + event.error);
        }
    };
    
    return true;
}

// 开始语音识别
function startVoiceInput() {
    if (!recognition) {
        initSpeechRecognition();
    }
    
    if (recognition && !isRecognizing) {
        try {
            recognition.start();
            showRecognitionFeedback('正在聆听...');
        } catch (e) {
            console.error('启动语音识别失败:', e);
            showRecognitionError('启动语音识别失败');
        }
    } else if (isRecognizing) {
        stopVoiceInput();
    }
}

// 停止语音识别
function stopVoiceInput() {
    if (recognition && isRecognizing) {
        try {
            recognition.stop();
        } catch (e) {
            console.error('停止语音识别失败:', e);
        }
        hideRecognitionFeedback();
        
        // 确保状态被正确重置
        isRecognizing = false;
        updateVoiceInputButton(false);
    }
}

// 显示临时识别结果
function showInterimResult(text) {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.placeholder = '识别中: ' + text;
    }
    
    // 可以添加一个临时显示的气泡
    const feedback = document.getElementById('recognitionFeedback');
    if (feedback) {
        feedback.textContent = text || '正在聆听...';
        feedback.style.display = 'block';
    }
}

// 添加识别结果到输入框
function addRecognitionResultToInput(text) {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        // 恢复占位符
        messageInput.placeholder = '输入消息... (Enter发送，Shift+Enter换行)';
        
        // 添加识别文本到输入框
        const currentText = messageInput.value;
        messageInput.value = currentText ? currentText + ' ' + text : text;
        
        // 触发输入事件以调整输入框高度
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        messageInput.dispatchEvent(event);
        
        // 聚焦输入框
        messageInput.focus();
    }
    
    // 隐藏反馈
    hideRecognitionFeedback();
}

// 显示识别反馈
function showRecognitionFeedback(message) {
    let feedback = document.getElementById('recognitionFeedback');
    
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'recognitionFeedback';
        feedback.className = 'recognition-feedback';
        document.body.appendChild(feedback);
    }
    
    feedback.textContent = message;
    feedback.style.display = 'block';
}

// 隐藏识别反馈
function hideRecognitionFeedback() {
    const feedback = document.getElementById('recognitionFeedback');
    if (feedback) {
        feedback.style.display = 'none';
    }
    
    // 恢复输入框占位符
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.placeholder = '输入消息... (Enter发送，Shift+Enter换行)';
    }
}

// 显示识别错误
function showRecognitionError(message) {
    showRecognitionFeedback('🔴 ' + message);
    
    // 3秒后自动隐藏
    setTimeout(hideRecognitionFeedback, 3000);
}

// 更新语音输入按钮状态
function updateVoiceInputButton(active) {
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    if (voiceInputBtn) {
        if (active) {
            voiceInputBtn.classList.add('active');
        } else {
            voiceInputBtn.classList.remove('active');
        }
    }
}

// 测试语音合成功能
function testSpeechSynthesis() {
    try {
        const testUtterance = new SpeechSynthesisUtterance('测试');
        testUtterance.volume = 0; // 静音测试
        testUtterance.onend = () => console.log("语音合成功能正常");
        testUtterance.onerror = (e) => console.error("语音合成测试失败", e);
        speechSynthesis.speak(testUtterance);
    } catch (e) {
        console.error("语音合成测试异常", e);
    }
}

// 加载可用的语音
function loadVoices() {
    console.log("加载语音选项...");
    
    // 获取所有可用的语音
    voiceOptions = speechSynthesis.getVoices();
    console.log(`找到${voiceOptions.length}个语音选项`);
    
    // 如果没有选择过语音，默认选择婷婷中文语音
    if (!selectedVoice) {
        // 首先尝试查找"婷婷"语音
        selectedVoice = voiceOptions.find(voice => 
            voice.name.includes('婷婷') || 
            voice.name.includes('Tingting') || 
            voice.name.includes('Ting-Ting')
        );
        
        // 如果没有找到婷婷语音，则尝试查找其他中文语音
        if (!selectedVoice) {
            selectedVoice = voiceOptions.find(voice => 
                voice.lang.includes('zh') || 
                voice.name.includes('Chinese') || 
                voice.name.includes('中文')
            );
        }
        
        // 如果没有找到中文语音，使用默认语音
        if (!selectedVoice && voiceOptions.length > 0) {
            selectedVoice = voiceOptions[0];
        }
        
        if (selectedVoice) {
            console.log(`已选择语音: ${selectedVoice.name} (${selectedVoice.lang})`);
        } else {
            console.warn("未找到可用语音");
        }
    }
    
    // 更新语音选择器（如果存在）
    updateVoiceSelector();
}

// 更新语音选择器
function updateVoiceSelector() {
    const voiceSelector = document.getElementById('voiceSelector');
    if (!voiceSelector) return;
    
    // 清空当前选项
    voiceSelector.innerHTML = '';
    
    // 添加可用的语音选项
    voiceOptions.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        option.selected = selectedVoice && voice.name === selectedVoice.name;
        voiceSelector.appendChild(option);
    });
}

// 从本地存储加载语音设置
function loadSpeechSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('speechSettings') || '{}');
        
        // 加载语音设置
        const voiceName = settings.voiceName;
        if (voiceName) {
            selectedVoice = voiceOptions.find(voice => voice.name === voiceName);
        }
        
        // 加载其他设置
        speechRate = settings.rate || 1.0;
        speechPitch = settings.pitch || 1.0;
        speechVolume = settings.volume || 1.0;
        autoSpeak = settings.autoSpeak !== undefined ? settings.autoSpeak : true;
        
        // 更新UI
        updateSpeechUI();
        
        console.log("语音设置已加载");
    } catch (e) {
        console.error("加载语音设置失败", e);
    }
}

// 保存语音设置到本地存储
function saveSpeechSettings() {
    try {
        const settings = {
            voiceName: selectedVoice ? selectedVoice.name : null,
            rate: speechRate,
            pitch: speechPitch,
            volume: speechVolume,
            autoSpeak: autoSpeak
        };
        
        localStorage.setItem('speechSettings', JSON.stringify(settings));
        console.log("语音设置已保存");
    } catch (e) {
        console.error("保存语音设置失败", e);
    }
}

// 更新语音UI
function updateSpeechUI() {
    // 更新语音选择器
    const voiceSelector = document.getElementById('voiceSelector');
    if (voiceSelector && selectedVoice) {
        voiceSelector.value = selectedVoice.name;
    }
    
    // 更新语速滑块
    const rateSlider = document.getElementById('rateSlider');
    if (rateSlider) {
        rateSlider.value = speechRate;
    }
    
    // 更新音调滑块
    const pitchSlider = document.getElementById('pitchSlider');
    if (pitchSlider) {
        pitchSlider.value = speechPitch;
    }
    
    // 更新音量滑块
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.value = speechVolume;
    }
    
    // 更新自动朗读开关
    const autoSpeakToggle = document.getElementById('autoSpeakToggle');
    if (autoSpeakToggle) {
        autoSpeakToggle.checked = autoSpeak;
    }
}

// 朗读文本
function speak(text) {
    console.log(`准备朗读文本: ${text.substring(0, 20)}...`);
    
    // 如果当前正在朗读，先停止
    stopSpeaking();
    
    // 如果文本为空，不执行朗读
    if (!text || text.trim() === '') {
        console.warn("文本为空，不执行朗读");
        return;
    }
    
    try {
        // 创建语音对象
        speechUtterance = new SpeechSynthesisUtterance(text);
        
        // 设置语音参数
        if (selectedVoice) {
            speechUtterance.voice = selectedVoice;
            console.log(`使用语音: ${selectedVoice.name}`);
        } else {
            console.warn("未选择语音，使用默认语音");
        }
        
        speechUtterance.rate = speechRate;
        speechUtterance.pitch = speechPitch;
        speechUtterance.volume = speechVolume;
        
        // 设置语音事件
        speechUtterance.onstart = () => {
            console.log("语音播放开始");
            isSpeaking = true;
            updateSpeakButton(true);
        };
        
        speechUtterance.onend = () => {
            console.log("语音播放结束");
            isSpeaking = false;
            isPaused = false;
            updateSpeakButton(false);
        };
        
        speechUtterance.onerror = (event) => {
            console.error('语音合成错误:', event);
            isSpeaking = false;
            isPaused = false;
            updateSpeakButton(false);
        };
        
        // 开始朗读
        speechSynthesis.speak(speechUtterance);
        
        // 修复Safari浏览器中的语音合成问题
        if (isSafari()) {
            fixSafariSpeechSynthesis();
        }
    } catch (e) {
        console.error("语音朗读失败", e);
    }
}

// 检测是否为Safari浏览器
function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// 修复Safari浏览器中的语音合成问题
function fixSafariSpeechSynthesis() {
    const interval = setInterval(() => {
        if (!isSpeaking) {
            clearInterval(interval);
            return;
        }
        
        // Safari需要不断重新启动语音合成以避免停止
        speechSynthesis.pause();
        speechSynthesis.resume();
    }, 5000);
}

// 停止朗读
function stopSpeaking() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
        console.log("已停止所有语音");
    }
    
    isSpeaking = false;
    isPaused = false;
    updateSpeakButton(false);
}

// 暂停/恢复朗读
function togglePause() {
    if (!isSpeaking) return;
    
    if (isPaused) {
        speechSynthesis.resume();
        isPaused = false;
        console.log("已恢复语音");
    } else {
        speechSynthesis.pause();
        isPaused = true;
        console.log("已暂停语音");
    }
    
    updateSpeakButton(true);
}

// 更新朗读按钮状态
function updateSpeakButton(speaking) {
    const speakBtns = document.querySelectorAll('.speak-btn');
    speakBtns.forEach(btn => {
        if (speaking) {
            if (isPaused) {
                btn.innerHTML = '▶️';
                btn.title = '继续朗读';
            } else {
                btn.innerHTML = '⏸️';
                btn.title = '暂停朗读';
            }
        } else {
            btn.innerHTML = '🔊';
            btn.title = '朗读消息';
        }
    });
}

// 设置语音
function setVoice(voiceName) {
    const voice = voiceOptions.find(v => v.name === voiceName);
    if (voice) {
        selectedVoice = voice;
        saveSpeechSettings();
        console.log(`已设置语音: ${voice.name}`);
    }
}

// 设置语速
function setRate(rate) {
    speechRate = parseFloat(rate);
    saveSpeechSettings();
    console.log(`已设置语速: ${speechRate}`);
}

// 设置音调
function setPitch(pitch) {
    speechPitch = parseFloat(pitch);
    saveSpeechSettings();
    console.log(`已设置音调: ${speechPitch}`);
}

// 设置音量
function setVolume(volume) {
    speechVolume = parseFloat(volume);
    saveSpeechSettings();
    console.log(`已设置音量: ${speechVolume}`);
}

// 设置自动朗读
function setAutoSpeak(value) {
    autoSpeak = value;
    saveSpeechSettings();
    console.log(`已设置自动朗读: ${autoSpeak ? '开启' : '关闭'}`);
}

// 朗读AI回复
function speakAIResponse(text) {
    // 检查是否启用了自动朗读
    if (autoSpeak && text) {
        // 如果当前正在进行语音识别，先停止
        if (isRecognizing) {
            stopVoiceInput();
        }
        
        // 开始朗读
        speak(text);
    }
} 