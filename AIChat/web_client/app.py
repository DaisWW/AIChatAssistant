#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepSeek聊天网页客户端
基于Flask的Web界面
"""

import sys
import os
import json
import threading
import glob
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.deepseek_api import DeepSeekAPI
from core.config import GIRLFRIEND_PRESET

app = Flask(__name__)
app.config['SECRET_KEY'] = 'deepseek_chat_secret_key_2024'
socketio = SocketIO(app, cors_allowed_origins="*")

# 存储用户会话
user_sessions = {}

# 聊天历史目录
CHAT_HISTORY_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chat_history")

# 确保聊天历史目录存在
os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)

@app.route('/')
def index():
    """主页"""
    return render_template('index.html', 
                         bot_name=GIRLFRIEND_PRESET['name'],
                         bot_personality=GIRLFRIEND_PRESET['personality'])

@app.route('/api/send_message', methods=['POST'])
def send_message():
    """发送消息API"""
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        user_id = data.get('user_id', 'default')
        
        if not message:
            return jsonify({'error': '消息不能为空'}), 400
        
        # 获取或创建用户会话
        if user_id not in user_sessions:
            user_sessions[user_id] = DeepSeekAPI()
        
        api = user_sessions[user_id]
        
        # 发送消息到DeepSeek API
        response = api.send_message(message)
        
        return jsonify({
            'success': True,
            'response': response,
            'timestamp': datetime.now().strftime("%H:%M:%S")
        })
        
    except Exception as e:
        return jsonify({'error': f'发送消息失败：{str(e)}'}), 500

@app.route('/api/reset_conversation', methods=['POST'])
def reset_conversation():
    """重置对话"""
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'default')
        
        if user_id in user_sessions:
            user_sessions[user_id].reset_conversation()
        
        return jsonify({'success': True, 'message': '对话已重置'})
        
    except Exception as e:
        return jsonify({'error': f'重置失败：{str(e)}'}), 500

@app.route('/api/save_conversation', methods=['POST'])
def save_conversation():
    """保存对话"""
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'default')
        conversation_data = data.get('conversation', [])
        existing_filename = data.get('filename')
        
        # 确保用户ID安全（移除可能的路径注入字符）
        safe_user_id = "".join([c for c in user_id if c.isalnum() or c in ['_', '-']])
        
        # 如果客户端提供了现有文件名，则使用该文件名覆盖保存
        if existing_filename and os.path.basename(existing_filename) == existing_filename:
            filename = existing_filename
        else:
            # 否则生成新的文件名
            filename = f"chat_history_{safe_user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # 完整的文件路径
        file_path = os.path.join(CHAT_HISTORY_DIR, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(conversation_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'success': True, 'filename': filename})
        
    except Exception as e:
        return jsonify({'error': f'保存失败：{str(e)}'}), 500

@app.route('/api/get_conversation_files', methods=['GET'])
def get_conversation_files():
    """获取对话文件列表"""
    try:
        # 查找所有聊天历史文件
        pattern = os.path.join(CHAT_HISTORY_DIR, "chat_history_*.json")
        files = glob.glob(pattern)
        
        file_list = []
        for file_path in files:
            try:
                # 获取文件信息
                stat = os.stat(file_path)
                filename = os.path.basename(file_path)
                
                # 解析文件名获取时间信息
                if filename.startswith('chat_history_'):
                    parts = filename.replace('.json', '').split('_')
                    if len(parts) >= 4:
                        try:
                            date_str = f"{parts[-2]}_{parts[-1]}"
                            file_time = datetime.strptime(date_str, '%Y%m%d_%H%M%S')
                            formatted_time = file_time.strftime('%Y年%m月%d日 %H:%M:%S')
                        except:
                            formatted_time = datetime.fromtimestamp(stat.st_mtime).strftime('%Y年%m月%d日 %H:%M:%S')
                    else:
                        formatted_time = datetime.fromtimestamp(stat.st_mtime).strftime('%Y年%m月%d日 %H:%M:%S')
                else:
                    formatted_time = datetime.fromtimestamp(stat.st_mtime).strftime('%Y年%m月%d日 %H:%M:%S')
                
                file_list.append({
                    'filename': filename,
                    'filepath': file_path,
                    'size': stat.st_size,
                    'modified_time': formatted_time,
                    'timestamp': stat.st_mtime
                })
            except Exception as e:
                print(f"处理文件 {file_path} 时出错: {e}")
                continue
        
        # 按修改时间倒序排列
        file_list.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({
            'success': True,
            'files': file_list
        })
        
    except Exception as e:
        return jsonify({'error': f'获取文件列表失败：{str(e)}'}), 500

@app.route('/api/load_conversation', methods=['POST'])
def load_conversation():
    """加载对话文件"""
    try:
        data = request.get_json()
        filename = data.get('filename', '')
        user_id = data.get('user_id', 'default')
        
        if not filename:
            return jsonify({'error': '文件名不能为空'}), 400
        
        # 构建完整文件路径
        file_path = os.path.join(CHAT_HISTORY_DIR, filename)
        
        # 兼容旧版本，如果新目录下不存在文件，尝试从旧位置加载
        if not os.path.exists(file_path):
            old_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), filename)
            if os.path.exists(old_path):
                file_path = old_path
            else:
                return jsonify({'error': '文件不存在'}), 404
        
        # 读取对话文件
        with open(file_path, 'r', encoding='utf-8') as f:
            conversation_data = json.load(f)
        
        # 重置用户会话并加载对话历史
        if user_id in user_sessions:
            user_sessions[user_id].reset_conversation()
        
        # 过滤掉system消息，只保留user和assistant消息用于显示
        display_messages = []
        for msg in conversation_data:
            if msg.get('role') in ['user', 'assistant']:
                display_messages.append({
                    'role': msg['role'],
                    'content': msg['content'],
                    'timestamp': msg.get('timestamp', '')
                })
        
        return jsonify({
            'success': True,
            'conversation': display_messages,
            'filename': filename
        })
        
    except Exception as e:
        return jsonify({'error': f'加载对话失败：{str(e)}'}), 500

@socketio.on('connect')
def handle_connect():
    """客户端连接"""
    print(f"客户端连接：{request.sid}")
    emit('connected', {'message': '连接成功！'})

@socketio.on('disconnect')
def handle_disconnect():
    """客户端断开连接"""
    print(f"客户端断开：{request.sid}")

@socketio.on('join')
def handle_join(data):
    """加入房间"""
    room = data.get('room', 'default')
    join_room(room)
    emit('status', {'msg': f'已加入房间：{room}'})

@socketio.on('leave')
def handle_leave(data):
    """离开房间"""
    room = data.get('room', 'default')
    leave_room(room)
    emit('status', {'msg': f'已离开房间：{room}'})

if __name__ == '__main__':
    print("=" * 50)
    print("🌐 DeepSeek聊天网页服务器")
    print("=" * 50)
    print("服务器启动中...")
    print("访问地址：http://localhost:5000")
    print("局域网访问：http://你的IP地址:5000")
    print("按Ctrl+C停止服务器")
    print("=" * 50)
    
    # 启动服务器，允许局域网访问
    socketio.run(app, host='0.0.0.0', port=5000, debug=True) 