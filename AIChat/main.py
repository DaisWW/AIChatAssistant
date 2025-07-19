#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepSeek聊天对话程序
预设：活泼可爱的小女友

作者：AI助手
版本：2.0 - 支持多种客户端
"""

import sys
import os
import argparse

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import API_KEY

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='DeepSeek聊天对话程序')
    parser.add_argument('--client', '-c', 
                       choices=['gui', 'web'], 
                       default='gui',
                       help='选择客户端类型: gui(桌面版) 或 web(网页版)')
    parser.add_argument('--port', '-p', 
                       type=int, 
                       default=5000,
                       help='网页服务器端口 (默认: 5000)')
    
    args = parser.parse_args()
    
    print("=" * 50)
    print("💕 DeepSeek聊天对话程序 v2.0 💕")
    print("预设：活泼可爱的小女友")
    print("=" * 50)
    
    # 检查API密钥
    if not API_KEY:
        print("\n❌ 错误：请在core/config.py中设置DeepSeek API密钥")
        print("请按照以下步骤操作：")
        print("1. 访问 https://platform.deepseek.com/")
        print("2. 注册并登录账号")
        print("3. 获取API密钥")
        print("4. 将API密钥填入core/config.py中的API_KEY变量")
        print("\n按任意键退出...")
        input()
        return
    
    print(f"\n✅ API密钥已配置")
    
    if args.client == 'gui':
        # 启动桌面GUI客户端
        print("🚀 启动桌面聊天界面...")
        print("\n使用说明：")
        print("- 在输入框中输入消息，按Enter发送")
        print("- 按Ctrl+Enter可以在输入框中换行")
        print("- 点击'重置对话'可以清空聊天记录")
        print("- 点击'保存对话'可以保存聊天历史")
        print("- 点击'加载对话'可以加载之前的聊天记录")
        print("\n开始聊天吧！💕")
        
        try:
            from clients.chat_gui import ChatGUI
            app = ChatGUI()
            app.run()
        except KeyboardInterrupt:
            print("\n\n👋 程序已退出")
        except Exception as e:
            print(f"\n❌ 程序运行出错：{str(e)}")
            print("请检查网络连接和API密钥是否正确")
    
    elif args.client == 'web':
        # 启动网页服务器
        print(f"🌐 启动网页聊天服务器...")
        print(f"本地访问：http://localhost:{args.port}")
        print(f"局域网访问：http://你的IP地址:{args.port}")
        print("\n功能特点：")
        print("- 支持多用户同时聊天")
        print("- 美观的网页界面")
        print("- 支持手机、平板访问")
        print("- 实时打字指示器")
        print("\n按Ctrl+C停止服务器")
        
        try:
            from web_client.app import app, socketio
            socketio.run(app, host='0.0.0.0', port=args.port, debug=False)
        except KeyboardInterrupt:
            print("\n\n👋 服务器已停止")
        except Exception as e:
            print(f"\n❌ 服务器启动失败：{str(e)}")
            print("请检查端口是否被占用")

if __name__ == "__main__":
    main() 