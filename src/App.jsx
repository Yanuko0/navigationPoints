import { Layout } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MapComponent from './components/Map';
import SearchBar from './components/SearchBar';
import Login from './components/Login';
import NavigationStats from './components/NavigationStats';
import React, { useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import './App.css';

const { Header, Content } = Layout;

// 創建一個新的 Header 組件
const CustomHeader = ({ currentLocation, handleDestinationSelect }) => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/stats') {
    return (
      <Header style={{
        // background: '#fff',
        // padding: '1rem',
        // position: 'fixed',
        // zIndex: 1,
        // width: '100%',
        height: 'auto',
        // boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        // display: 'flex',
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
    <Router>
      <Layout>
        <CustomHeader 
          currentLocation={currentLocation}
          handleDestinationSelect={handleDestinationSelect}
        />
        <Content style={{
          padding: '1rem',
          // height: '100vh',
          // border: `20px solid black`,
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
  );
}

export default App;