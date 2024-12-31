import { Layout } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MapComponent from './components/Map';
import SearchBar from './components/SearchBar';
import Login from './components/Login';
import NavigationStats from './components/NavigationStats';
import React, { useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import './App.css';
import { LanguageProvider } from './context/LanguageContext';

const { Header, Content } = Layout;

// 創建一個新的 Header 組件
const CustomHeader = ({ currentLocation, handleDestinationSelect }) => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/stats') {
    return (
      <Header style={{
        height: 'auto',
        alignItems: 'center'
      }}>
      </Header>
    );
  }

  return null;
};

function App() {
  const [currentLocation] = useState({
    lat: 24.2254,
    lng: 120.6281
  });
  const [destination, setDestination] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  const handleDestinationSelect = (value, option) => {
    if (option && option.coordinates) {
      setDestination(option.coordinates);
    }
  };

  const handleLogin = (username) => {
    setIsLoggedIn(true);
    setUsername(username);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <LanguageProvider>
    <Router>
      <Layout>
        <CustomHeader 
          currentLocation={currentLocation}
          handleDestinationSelect={handleDestinationSelect}
        />
        <Content style={{
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Routes>
            <Route 
              path="/" 
              element={
                <SearchBar 
                  onSelect={handleDestinationSelect}
                  currentLocation={currentLocation}
                  placeholder="輸入目的地..."
                  username={username}
                />
              } 
            />
            <Route 
              path="/stats" 
              element={
                <NavigationStats 
                  username={username}
                />
              } 
            />
            <Route 
              path="*" 
              element={<Navigate to="/" replace />} 
            />
          </Routes>
        </Content>
      </Layout>
    </Router>
    </LanguageProvider>
  );
}

export default App;