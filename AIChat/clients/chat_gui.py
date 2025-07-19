import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
import json
import threading
from datetime import datetime
from typing import List, Dict, Any

from core.config import WINDOW_TITLE, WINDOW_SIZE, CHAT_HISTORY_FILE, COLORS, GIRLFRIEND_PRESET
from core.deepseek_api import DeepSeekAPI

class ChatGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title(WINDOW_TITLE)
        self.root.geometry(WINDOW_SIZE)
        self.root.configure(bg=COLORS['bg'])
        
        # 初始化API
        self.api = DeepSeekAPI()
        
        # 创建界面
        self._create_widgets()
        self._load_chat_history()
        
        # 绑定回车键发送消息 - 将在创建输入框后绑定
    
    def _create_widgets(self):
        """创建界面组件"""
        # 主框架
        main_frame = tk.Frame(self.root, bg=COLORS['bg'])
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 标题栏
        title_frame = tk.Frame(main_frame, bg=COLORS['bg'])
        title_frame.pack(fill=tk.X, pady=(0, 10))
        
        title_label = tk.Label(
            title_frame,
            text=f"💕 {GIRLFRIEND_PRESET['name']} 💕",
            font=("微软雅黑", 16, "bold"),
            fg=COLORS['button_bg'],
            bg=COLORS['bg']
        )
        title_label.pack(side=tk.LEFT)
        
        # 按钮框架
        button_frame = tk.Frame(title_frame, bg=COLORS['bg'])
        button_frame.pack(side=tk.RIGHT)
        
        # 重置按钮
        reset_btn = tk.Button(
            button_frame,
            text="🔄 重置对话",
            command=self._reset_conversation,
            bg=COLORS['button_bg'],
            fg=COLORS['button_fg'],
            font=("微软雅黑", 10),
            relief=tk.FLAT,
            padx=10
        )
        reset_btn.pack(side=tk.LEFT, padx=(0, 5))
        
        # 保存按钮
        save_btn = tk.Button(
            button_frame,
            text="💾 保存对话",
            command=self._save_chat_history,
            bg=COLORS['button_bg'],
            fg=COLORS['button_fg'],
            font=("微软雅黑", 10),
            relief=tk.FLAT,
            padx=10
        )
        save_btn.pack(side=tk.LEFT, padx=(0, 5))
        
        # 加载按钮
        load_btn = tk.Button(
            button_frame,
            text="📂 加载对话",
            command=self._load_chat_history_dialog,
            bg=COLORS['button_bg'],
            fg=COLORS['button_fg'],
            font=("微软雅黑", 10),
            relief=tk.FLAT,
            padx=10
        )
        load_btn.pack(side=tk.LEFT)
        
        # 聊天显示区域
        chat_frame = tk.Frame(main_frame, bg=COLORS['chat_bg'], relief=tk.RAISED, bd=2)
        chat_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # 聊天文本框
        self.chat_text = scrolledtext.ScrolledText(
            chat_frame,
            wrap=tk.WORD,
            font=("微软雅黑", 11),
            bg=COLORS['chat_bg'],
            fg=COLORS['text_color'],
            state=tk.DISABLED,
            padx=10,
            pady=10
        )
        self.chat_text.pack(fill=tk.BOTH, expand=True)
        
        # 输入区域
        input_frame = tk.Frame(main_frame, bg=COLORS['bg'])
        input_frame.pack(fill=tk.X, pady=(0, 10))
        
        # 输入提示
        input_label = tk.Label(
            input_frame,
            text="💬 输入消息 (Enter发送，Ctrl+Enter换行):",
            font=("微软雅黑", 10),
            fg=COLORS['text_color'],
            bg=COLORS['bg']
        )
        input_label.pack(anchor=tk.W)
        
        # 输入框
        self.input_text = tk.Text(
            input_frame,
            height=3,
            wrap=tk.WORD,
            font=("微软雅黑", 11),
            bg=COLORS['input_bg'],
            fg=COLORS['text_color'],
            relief=tk.SUNKEN,
            bd=2
        )
        self.input_text.pack(fill=tk.X, pady=(5, 0))
        
        # 绑定键盘事件到输入框
        self.input_text.bind('<Return>', self._on_enter_pressed)
        self.input_text.bind('<Control-Return>', self._on_shift_enter_pressed)
        
        # 发送按钮
        send_btn = tk.Button(
            input_frame,
            text="发送 💕",
            command=self._send_message,
            bg=COLORS['button_bg'],
            fg=COLORS['button_fg'],
            font=("微软雅黑", 12, "bold"),
            relief=tk.FLAT,
            padx=20,
            pady=5
        )
        send_btn.pack(pady=(10, 0))
        
        # 状态栏
        self.status_label = tk.Label(
            main_frame,
            text="就绪",
            font=("微软雅黑", 9),
            fg=COLORS['timestamp_color'],
            bg=COLORS['bg']
        )
        self.status_label.pack(anchor=tk.W)
        
        # 显示欢迎消息
        self._add_message("小甜心", f"亲爱的，你好呢！我是{GIRLFRIEND_PRESET['name']}，很高兴见到你哦～ 😊\n\n有什么想和我聊的吗？", is_user=False)
    
    def _add_message(self, sender: str, message: str, is_user: bool = True):
        """添加消息到聊天窗口"""
        self.chat_text.config(state=tk.NORMAL)
        
        # 添加时间戳
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.chat_text.insert(tk.END, f"[{timestamp}] ", "timestamp")
        
        # 添加发送者名称
        if is_user:
            self.chat_text.insert(tk.END, f"你: ", "user")
        else:
            self.chat_text.insert(tk.END, f"{sender}: ", "assistant")
        
        # 添加消息内容
        self.chat_text.insert(tk.END, f"{message}\n\n")
        
        # 配置标签样式
        self.chat_text.tag_config("timestamp", foreground=COLORS['timestamp_color'])
        self.chat_text.tag_config("user", foreground="#0066cc", font=("微软雅黑", 11, "bold"))
        self.chat_text.tag_config("assistant", foreground=COLORS['button_bg'], font=("微软雅黑", 11, "bold"))
        
        self.chat_text.config(state=tk.DISABLED)
        self.chat_text.see(tk.END)
    
    def _send_message(self):
        """发送消息"""
        message = self.input_text.get("1.0", tk.END).strip()
        if not message:
            return
        
        # 清空输入框
        self.input_text.delete("1.0", tk.END)
        
        # 显示用户消息
        self._add_message("你", message, is_user=True)
        
        # 更新状态
        self.status_label.config(text="正在思考中...")
        self.root.update()
        
        # 在新线程中发送API请求
        threading.Thread(target=self._send_api_request, args=(message,), daemon=True).start()
    
    def _send_api_request(self, message: str):
        """发送API请求"""
        try:
            response = self.api.send_message(message)
            self.root.after(0, lambda: self._handle_response(response))
        except Exception as e:
            error_msg = f"发送消息时出错：{str(e)}"
            self.root.after(0, lambda: self._handle_response(error_msg))
    
    def _handle_response(self, response: str):
        """处理API响应"""
        self._add_message(GIRLFRIEND_PRESET['name'], response, is_user=False)
        self.status_label.config(text="就绪")
    
    def _on_enter_pressed(self, event):
        """回车键发送消息"""
        # 检查是否按住了Ctrl键
        if event.state & 0x4:  # Ctrl键被按下
            return  # 让Ctrl+Enter处理换行
        else:
            self._send_message()
            return "break"  # 阻止默认的换行行为
    
    def _on_shift_enter_pressed(self, event):
        """Ctrl+Enter换行"""
        # 在光标位置插入换行符
        self.input_text.insert(tk.INSERT, "\n")
        return "break"  # 阻止默认行为
    
    def _reset_conversation(self):
        """重置对话"""
        if messagebox.askyesno("确认", "确定要重置对话吗？这将清空所有聊天记录。"):
            self.api.reset_conversation()
            self.chat_text.config(state=tk.NORMAL)
            self.chat_text.delete("1.0", tk.END)
            self.chat_text.config(state=tk.DISABLED)
            self._add_message("小甜心", f"对话已重置！我是{GIRLFRIEND_PRESET['name']}，重新开始聊天吧～ 😊", is_user=False)
    
    def _save_chat_history(self):
        """保存聊天历史"""
        try:
            history = self.api.get_conversation_history()
            with open(CHAT_HISTORY_FILE, 'w', encoding='utf-8') as f:
                json.dump(history, f, ensure_ascii=False, indent=2)
            messagebox.showinfo("成功", f"聊天历史已保存到 {CHAT_HISTORY_FILE}")
        except Exception as e:
            messagebox.showerror("错误", f"保存失败：{str(e)}")
    
    def _load_chat_history(self):
        """加载聊天历史"""
        try:
            with open(CHAT_HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
                self.api.set_conversation_history(history)
                
                # 显示历史消息
                for msg in history:
                    if msg['role'] == 'user':
                        self._add_message("你", msg['content'], is_user=True)
                    elif msg['role'] == 'assistant':
                        self._add_message(GIRLFRIEND_PRESET['name'], msg['content'], is_user=False)
        except FileNotFoundError:
            pass  # 文件不存在，使用默认设置
        except Exception as e:
            messagebox.showerror("错误", f"加载聊天历史失败：{str(e)}")
    
    def _load_chat_history_dialog(self):
        """通过对话框加载聊天历史"""
        filename = filedialog.askopenfilename(
            title="选择聊天历史文件",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if filename:
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    history = json.load(f)
                    self.api.set_conversation_history(history)
                
                # 清空聊天窗口
                self.chat_text.config(state=tk.NORMAL)
                self.chat_text.delete("1.0", tk.END)
                self.chat_text.config(state=tk.DISABLED)
                
                # 显示历史消息
                for msg in history:
                    if msg['role'] == 'user':
                        self._add_message("你", msg['content'], is_user=True)
                    elif msg['role'] == 'assistant':
                        self._add_message(GIRLFRIEND_PRESET['name'], msg['content'], is_user=False)
                
                messagebox.showinfo("成功", "聊天历史已加载")
            except Exception as e:
                messagebox.showerror("错误", f"加载失败：{str(e)}")
    
    def run(self):
        """运行GUI"""
        self.root.mainloop() 