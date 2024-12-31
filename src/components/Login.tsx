import React, { useState } from 'react';
import { Form, Input, Button, Card, message, FloatButton } from 'antd';
import { UserOutlined, LockOutlined, CompassOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';


const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shine = keyframes`
  0% { 
    opacity: 0.7;
    filter: drop-shadow(0 0 8px #FFB347);
  }
  50% { 
    opacity: 1;
    filter: drop-shadow(0 0 15px #FFB347);
  }
  100% { 
    opacity: 0.7;
    filter: drop-shadow(0 0 8px #FFB347);
  }
`;

const moonShine = keyframes`
  0% { 
    opacity: 0.7;
    filter: drop-shadow(0 0 8px #C1C1D1);
  }
  50% { 
    opacity: 1;
    filter: drop-shadow(0 0 15px #C1C1D1);
  }
  100% { 
    opacity: 0.7;
    filter: drop-shadow(0 0 8px #C1C1D1);
  }
`;

const SunIconStyled = styled(SunOutlined)`
  font-size: 38px;
  color: #FFB347;
  animation: ${rotate} 12s linear infinite, ${shine} 3s ease-in-out infinite;
`;

const MoonIconStyled = styled(MoonOutlined)`
  font-size: 38px;
  color: #FFD700;
  animation: ${moonShine} 3s ease-in-out infinite;
`;

interface StyledProps {
  colors?: {
    secondary: string;
    inputBg: string;
    inputText: string;
    primary: string;
    shadow: string;
  };
}

const StyledInput = styled(Input)<StyledProps>`
  border-radius: 12px;
  border: 1px solid ${props => props.colors?.secondary};
  background-color: ${props => props.colors?.inputBg};
  color: ${props => props.colors?.inputText};
  height: 45px;
  transition: all 0.3s ease;
  box-shadow: none;

  &:hover, &:focus {
    border-color: ${props => props.colors?.primary};
    box-shadow: 0 0 0 2px ${props => props.colors?.shadow};
  }
`;

const StyledPasswordInput = styled(Input.Password)<StyledProps>`
  border-radius: 12px;
  border: 1px solid ${props => props.colors?.secondary};
  background-color: ${props => props.colors?.inputBg};
  color: ${props => props.colors?.inputText};
  height: 45px;
  transition: all 0.3s ease;
  box-shadow: none;

  &:hover, &:focus {
    border-color: ${props => props.colors?.primary};
    box-shadow: 0 0 0 2px ${props => props.colors?.shadow};
  }

  .ant-input {
    background-color: ${props => props.colors?.inputBg};
    color: ${props => props.colors?.inputText};
  }
`;

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 淺色主題配色 - 清新莫蘭迪色系
  const lightColors = {
    primary: '#E4A07B',      // 溫暖的莫蘭迪橘
    secondary: '#D4C4B7',    // 高級灰棕色
    background: '#F6F0EA',   // 溫潤的米色背景
    text: '#7A6563',         // 優雅的深褐色
    inputBg: '#FFFFFF',      // 純白輸入框
    inputText: '#7A6563',    // 輸入框文字
    buttonBg: '#FFFFFF',     // 按鈕背景
    shadow: 'rgba(228, 160, 123, 0.2)',  // 橘色陰影
    cardBg: '#FFFFFF'        // 卡片背景
  };

  // 深色主題配色 - 高級深色莫蘭迪
  const darkColors = {
    primary: '#E4A07B',      // 同淺色主題的主色調
    secondary: '#4D4544',    // 深沉的灰褐
    background: '#2B2625',   // 深褐色背景
    text: '#E5D3C8',         // 溫暖的淺褐色文字
    inputBg: '#363130',      // 深色輸入框
    inputText: '#E5D3C8',    // 輸入框文字
    buttonBg: '#363130',     // 按鈕背景
    shadow: 'rgba(228, 160, 123, 0.15)',  // 橘色陰影
    cardBg: '#312C2B'        // 卡片背景
  };

  const colors = isDarkMode ? darkColors : lightColors;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const onFinish = (values: { username: string; password: string }) => {
    setLoading(true);
    setTimeout(() => {
      if (values.username && values.password) {
        onLogin(values.username);
        message.success({
          content: '登入成功！',
          style: {
            marginTop: '20vh',
            color: colors.text
          }
        });
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background} 100%)`,
      padding: '20px'
    }}>
      <FloatButton
        style={{
          top: 24,
          left: 24,
          width: '48px',
          height: '48px',
          backgroundColor: isDarkMode ? '#363130' : '#FFFFFF',
          boxShadow: `0 4px 12px ${colors.shadow}, 0 0 25px ${isDarkMode ? 'rgba(228, 160, 123, 0.2)' : 'rgba(228, 160, 123, 0.25)'}`,
          transition: 'all 0.3s ease'
        }}
        onClick={toggleTheme}
        icon={isDarkMode ? 
          <MoonOutlined style={{ 
            fontSize: '38px',
            color: '#E4A07B',  // 使用主色調
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }} /> : 
          <SunOutlined style={{ 
            fontSize: '38px',
            color: '#E4A07B',  // 使用主色調
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }} />
        }
      />

      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '24px',
          border: 'none',
          backgroundColor: colors.cardBg,
          boxShadow: `0 8px 32px ${colors.shadow}, 0 2px 8px rgba(0, 0, 0, 0.1)`,
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <img 
              src="/OrangeLogo.png" 
              alt="Orange Electronic" 
              style={{ 
                height: '80px',
                marginBottom: '16px',
                objectFit: 'contain'
              }} 
            />
          </div>
          
         
          <h2 style={{ 
            color: colors.primary,
            fontSize: '28px',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '0.5px'
          }}>
            歡迎使用地圖導航系統
          </h2>
          <p style={{ 
            color: colors.text,
            opacity: 0.8,
            marginTop: '8px',
            fontSize: '15px',
            letterSpacing: '0.5px'
          }}>
            請登入以開始您的旅程
          </p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '請輸入使用者名稱！' }]}
          >
            <StyledInput 
              prefix={<UserOutlined style={{ color: colors.primary }} />} 
              placeholder="使用者名稱"
              colors={colors}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '請輸入密碼！' }]}
          >
            <StyledPasswordInput 
              prefix={<LockOutlined style={{ color: colors.primary }} />} 
              placeholder="密碼"
              colors={colors}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: '12px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{
                width: '100%',
                height: '45px',
                borderRadius: '12px',
                backgroundColor: colors.primary,
                border: 'none',
                boxShadow: `0 4px 12px ${colors.shadow}`,
                fontSize: '16px',
                fontWeight: 500,
                letterSpacing: '1px',
                transition: 'all 0.3s ease'
              }}
            >
              登入
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;