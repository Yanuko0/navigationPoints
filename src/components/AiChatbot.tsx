import React, { useState, useEffect } from 'react';
import { CommentOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import './css/DraggableChatbot.css';
// @ts-ignore
import chatbotIcon from '../assets/chatbot-icon.png';

const DraggableChatbot: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: string, message: JSX.Element | string }[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [weeklyTaskAnalysis, setWeeklyTaskAnalysis] = useState<string>('');
  const [optionsVisible, setOptionsVisible] = useState(true);
  const [availableOptions, setAvailableOptions] = useState([1, 2]);
  const [typingMessage, setTypingMessage] = useState<string>('');
  const navigate = useNavigate();

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // 阻止默認行為以防止文字選取
    setIsDragging(true);
    const offsetX = e.clientX - position.x;
    const offsetY = e.clientY - position.y;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        console.log('Mouse move');
        setPosition({
          x: e.clientX - offsetX,
          y: e.clientY - offsetY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      snapToEdge();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const snapToEdge = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const left = position.x;
    const right = windowWidth - (position.x + 100); // 假設組件寬度為100
    const top = position.y;
    const bottom = windowHeight - (position.y + 100); // 假設組件高度為100

    const min = Math.min(left, right, top, bottom);
    if (min === left) {
      setPosition((prev) => ({ ...prev, x: 0 }));
    } else if (min === right) {
      setPosition((prev) => ({ ...prev, x: windowWidth - 100 }));
    } else if (min === top) {
      setPosition((prev) => ({ ...prev, y: 0 }));
    } else {
      setPosition((prev) => ({ ...prev, y: windowHeight - 100 }));
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const recordsSnapshot = await getDocs(collection(db, 'navigation_records'));
        const records: any[] = [];
        
        recordsSnapshot.forEach(doc => {
          const data = doc.data();
          records.push({
            username: data.username,
            distance: Number(data.distance) || 0,
            duration: Number(data.duration) || 0,
            fuelCost: Number(data.fuelCost) || 0,
            timestamp: data.timestamp.toDate(),
            destinationName: data.destinationName
          });
        });
        
        setUserData(records);
        analyzeData(records);
        analyzeWeeklyTasks(records);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const analyzeData = (data: any[]) => {
    const totalDistance = data.reduce((sum, record) => sum + (record.distance || 0), 0).toFixed(1);
    const totalDuration = data.reduce((sum, record) => sum + (record.duration || 0), 0).toFixed(1);
    const totalFuelCost = data.reduce((sum, record) => sum + (record.fuelCost || 0), 0).toFixed(1);

    const result = `總里程: ${totalDistance} 公里\n總時間: ${totalDuration} 小時\n總油費: ${totalFuelCost} 元`.trim();

    console.log('Analysis Result:', result);
    setAnalysisResult(result);
  };

  const analyzeWeeklyTasks = (data: any[]) => {
    const weeklyTarget = 100;
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // 週一
    startOfWeek.setHours(0, 0, 0, 0); // 設置時間為午夜

    const weeklyDistance = data
      .filter(record => record.timestamp >= startOfWeek)
      .reduce((sum, record) => sum + record.distance, 0);

    const difference = weeklyTarget - weeklyDistance;

    const result = difference > 0
      ? `距離每週任務目標還差: ${difference.toFixed(1)} 公里`
      : `恭喜！您已經超過每週任務目標 ${Math.abs(difference).toFixed(1)} 公里`;

    setWeeklyTaskAnalysis(result);
  };

  const typeMessage = (message: string) => {
    if (typeof message !== 'string') {
      console.error('Message is not a string:', message);
      return;
    }
    let index = -1;
    setTypingMessage(''); // 確保在開始時清空
    const interval = setInterval(() => {
      if (index < message.length -1) {
        setTypingMessage((prev) => prev + message[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50); // 每50毫秒顯示一個字符
  };

  const handleOptionClick = (option: number) => {
    if (option === 1) {
      setChatHistory(prev => [
        ...prev, 
        { sender: 'user', message: '分析個人數據統計' }
      ]);
      typeMessage(analysisResult);
    } else if (option === 2) {
      setChatHistory(prev => [
        ...prev, 
        { sender: 'user', message: '計算每週任務還差了幾公里' }
      ]);
      typeMessage(weeklyTaskAnalysis);
    }
    setAvailableOptions(prev => {
      const newOptions = prev.filter(opt => opt !== option);
      return newOptions.length === 0 ? [1, 2] : newOptions; // 重置選項
    });
    setOptionsVisible(false);
  };

  useEffect(() => {
    if (chatHistory.length === 0) {
      setChatHistory([{ sender: 'ai', message: '請問需要什麼服務呢？' }]);
    } else if (!optionsVisible) {
      setChatHistory(prev => [
        ...prev,
        { sender: 'ai', message: '還需要什麼服務呢？' }
      ]);
      setOptionsVisible(true);
    }
  }, [optionsVisible]);
  

  useEffect(() => {
    const chatContainer = document.querySelector('.chatbot > div:nth-child(2)');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [chatHistory, optionsVisible]);

  const renderMessage = (entry: { sender: string, message: JSX.Element | string }, index: number) => {
    const isUser = entry.sender === 'user';
    const bubbleStyle = {
      backgroundColor: 'rgba(211, 211, 211, 0.5)',
      borderRadius: '15px',
      padding: '10px',
      maxWidth: '80%',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '10px',
      display: 'inline-block'
    };

    return (
      <div key={index} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {isUser ? "" : <img src={chatbotIcon} alt="Chatbot" style={{ marginRight: '-1px', width: '48px', height: '48px' }} />}
        <div style={bubbleStyle}>
          {entry.sender === 'ai' && index === chatHistory.length - 1 && typingMessage ? typingMessage : entry.message}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{ userSelect: 'none' }}
    >
      <div
        className="draggable"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '16px',
          transition: 'background-color 0.3s',
        }}
        onClick={() => setShowChatbot(!showChatbot)}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'}
        onMouseDown={handleMouseDown}
      >
        <CommentOutlined style={{ fontSize: '20px' }} />
      </div>
      {showChatbot && (
        <div className="chatbot" style={{
          position: 'fixed',
          bottom: '65px',
          right: '5%',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '500px',
          height: '75%',
          backgroundColor: '#f9f9f9',
          borderRadius: '15px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          zIndex: 1000,
          padding: '15px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h3 style={{
            margin: '0 0 10px 0',
            padding: '0',
            fontSize: '18px',
            color: '#333',
            borderBottom: '1px solid #ddd',
            paddingBottom: '10px',
          }}>AI 小幫手</h3>
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '10px', 
            backgroundColor: '#fff', 
            borderRadius: '10px',
            boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.1)',
          }}>
            {chatHistory.map(renderMessage)}
            {optionsVisible && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                {availableOptions.includes(1) && (
                  <button onClick={() => handleOptionClick(1)} style={buttonStyle}>分析個人數據統計</button>
                )}
                {availableOptions.includes(2) && (
                  <button onClick={() => handleOptionClick(2)} style={buttonStyle}>計算每週任務還差了幾公里</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  margin: '5px 0',
  padding: '5px 10px',
  borderRadius: '15px',
  border: 'none',
  backgroundColor: '#E3A587',
  color: 'white',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'background-color 0.3s',
  width: 'auto',
  textAlign: 'left'
};

export default DraggableChatbot;