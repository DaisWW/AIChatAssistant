import requests
import json
from typing import List, Dict, Any
from .config import DEEPSEEK_API_URL, API_KEY, GIRLFRIEND_PRESET

class DeepSeekAPI:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or API_KEY
        self.api_url = DEEPSEEK_API_URL
        self.conversation_history = []
        
        # 初始化预设角色
        self._initialize_preset()
    
    def _initialize_preset(self):
        """初始化预设角色"""
        system_prompt = f"""你是一个AI助手，现在你要扮演{GIRLFRIEND_PRESET['name']}。

{GIRLFRIEND_PRESET['personality']}

{GIRLFRIEND_PRESET['style']}

请始终保持这个角色设定，用可爱温柔的语气与用户对话。"""
        
        self.conversation_history = [
            {"role": "system", "content": system_prompt}
        ]
    
    def send_message(self, message: str) -> str:
        """发送消息到DeepSeek API并获取回复"""
        if not self.api_key:
            return "❌ 错误：请先在config.py中设置API密钥"
        
        # 添加用户消息到对话历史
        self.conversation_history.append({
            "role": "user",
            "content": message
        })
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": "deepseek-chat",
                "messages": self.conversation_history,
                "temperature": 0.7,
                "max_tokens": 1000,
                "stream": False
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                assistant_message = result['choices'][0]['message']['content']
                
                # 添加助手回复到对话历史
                self.conversation_history.append({
                    "role": "assistant",
                    "content": assistant_message
                })
                
                return assistant_message
            else:
                error_msg = f"API请求失败，状态码：{response.status_code}"
                if response.text:
                    error_msg += f"，错误信息：{response.text}"
                return f"❌ {error_msg}"
                
        except requests.exceptions.RequestException as e:
            return f"❌ 网络请求错误：{str(e)}"
        except Exception as e:
            return f"❌ 未知错误：{str(e)}"
    
    def reset_conversation(self):
        """重置对话历史"""
        self._initialize_preset()
    
    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """获取对话历史"""
        return self.conversation_history.copy()
    
    def set_conversation_history(self, history: List[Dict[str, Any]]):
        """设置对话历史"""
        self.conversation_history = history.copy() 