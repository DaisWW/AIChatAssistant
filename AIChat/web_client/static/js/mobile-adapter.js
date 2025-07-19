/**
 * 移动端适配工具
 * 处理键盘弹出、视口变化等问题
 */

class MobileAdapter {
    constructor() {
        this.initialViewportHeight = window.innerHeight;
        this.isKeyboardOpen = false;
        this.init();
    }

    init() {
        this.setupViewportMeta();
        this.handleViewportChanges();
        this.handleInputFocus();
        this.handleOrientationChange();
        this.preventZoom();
    }

    /**
     * 设置视口meta标签
     */
    setupViewportMeta() {
        // 确保视口meta标签存在且正确
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        // 设置视口属性
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }

    /**
     * 处理视口变化（键盘弹出/收起）
     */
    handleViewportChanges() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 100);
        });

        // 监听视觉视口变化（更准确地检测键盘状态）
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.handleVisualViewportChange();
            });
        }
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        const currentHeight = window.innerHeight;
        const heightDifference = this.initialViewportHeight - currentHeight;
        
        // 如果高度减少超过150px，认为键盘弹出
        if (heightDifference > 150) {
            this.isKeyboardOpen = true;
            this.adjustForKeyboard(true);
        } else {
            this.isKeyboardOpen = false;
            this.adjustForKeyboard(false);
        }
    }

    /**
     * 处理视觉视口变化
     */
    handleVisualViewportChange() {
        if (window.visualViewport) {
            const currentHeight = window.visualViewport.height;
            const heightDifference = this.initialViewportHeight - currentHeight;
            
            if (heightDifference > 150) {
                this.isKeyboardOpen = true;
                this.adjustForKeyboard(true);
            } else {
                this.isKeyboardOpen = false;
                this.adjustForKeyboard(false);
            }
        }
    }

    /**
     * 处理输入框焦点事件
     */
    handleInputFocus() {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('focus', () => {
                // 延迟滚动，确保键盘完全弹出
                setTimeout(() => {
                    this.scrollToInput();
                }, 300);
            });

            messageInput.addEventListener('blur', () => {
                // 键盘收起时恢复
                setTimeout(() => {
                    this.adjustForKeyboard(false);
                }, 100);
            });
        }
    }

    /**
     * 滚动到输入框
     */
    scrollToInput() {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    /**
     * 根据键盘状态调整布局
     */
    adjustForKeyboard(isOpen) {
        const chatContainer = document.querySelector('.chat-container');
        const chatMessages = document.querySelector('.chat-messages');
        const inputArea = document.querySelector('.input-area');
        
        if (!chatContainer || !chatMessages || !inputArea) return;

        if (isOpen) {
            // 键盘弹出时的调整
            chatContainer.style.height = '100vh';
            chatContainer.style.borderRadius = '0';
            
            // 确保输入区域可见
            inputArea.style.position = 'relative';
            inputArea.style.zIndex = '20';
            
            // 调整消息区域高度
            const headerHeight = document.querySelector('.header').offsetHeight;
            const inputHeight = inputArea.offsetHeight;
            const availableHeight = window.innerHeight - headerHeight - inputHeight;
            
            chatMessages.style.height = `${availableHeight}px`;
            chatMessages.style.maxHeight = `${availableHeight}px`;
            
            // 滚动到最新消息
            this.scrollToBottom();
        } else {
            // 键盘收起时的恢复
            chatContainer.style.height = '';
            chatContainer.style.borderRadius = '';
            
            chatMessages.style.height = '';
            chatMessages.style.maxHeight = '';
            
            inputArea.style.position = '';
            inputArea.style.zIndex = '';
        }
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    /**
     * 处理屏幕方向变化
     */
    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            // 延迟处理，等待方向变化完成
            setTimeout(() => {
                this.initialViewportHeight = window.innerHeight;
                this.handleResize();
            }, 500);
        });
    }

    /**
     * 防止页面缩放
     */
    preventZoom() {
        // 防止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // 防止双指缩放
        document.addEventListener('gesturestart', (event) => {
            event.preventDefault();
        });

        document.addEventListener('gesturechange', (event) => {
            event.preventDefault();
        });

        document.addEventListener('gestureend', (event) => {
            event.preventDefault();
        });
    }

    /**
     * 获取当前设备信息
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
            isAndroid: /Android/.test(navigator.userAgent),
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            pixelRatio: window.devicePixelRatio
        };
    }

    /**
     * 设置安全区域样式
     */
    setSafeAreaStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .safe-area-top {
                padding-top: env(safe-area-inset-top);
            }
            .safe-area-bottom {
                padding-bottom: env(safe-area-inset-bottom);
            }
            .safe-area-left {
                padding-left: env(safe-area-inset-left);
            }
            .safe-area-right {
                padding-right: env(safe-area-inset-right);
            }
        `;
        document.head.appendChild(style);
    }
}

// 初始化移动端适配
document.addEventListener('DOMContentLoaded', () => {
    window.mobileAdapter = new MobileAdapter();
    
    // 输出设备信息（调试用）
    console.log('设备信息:', window.mobileAdapter.getDeviceInfo());
});

// 导出适配器类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileAdapter;
} 