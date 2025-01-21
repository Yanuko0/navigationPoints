import { Input, List, Button, Space } from 'antd';
import { SearchOutlined, CompassOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import React from 'react';
import { LoadScript, Libraries } from '@react-google-maps/api';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Map from './Map';
import { useCallback } from 'react';

interface LocationOption {
  key: string;
  value: string;
  label: string;
  address?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface SearchBarProps {
  onSelect: (value: string, option: LocationOption) => void;
  currentLocation?: { lat: number; lng: number };
  setCurrentLocation: (location: { lat: number; lng: number }) => void;
  placeholder?: string;
  username?: string;
}

const libraries: Libraries = ["places"];

const SearchBar: React.FC<SearchBarProps> = ({ onSelect, currentLocation, setCurrentLocation, placeholder = "搜尋地點...", username }) => {
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [routeData, setRouteData] = useState<{
    distance: number;
    duration: number;
    fuelCost: number;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const checkGoogleMapsLoaded = () => {
      if (window.google && window.google.maps) {
        setIsLoaded(true);
      } else {
        setTimeout(checkGoogleMapsLoaded, 100);
      }
    };
    checkGoogleMapsLoaded();
  }, []);

  const handleRouteCalculated = useCallback((data: {
    distance: number;
    duration: number;
    fuelCost: number;
  }) => {
    setRouteData(data);
  }, []); // 空依賴數組，因為函數不需要依賴任何值

  const handleSearch = async (value: string) => {
    if (!value) return;
    
    setIsSearching(true);
    try {
      const service = new window.google.maps.places.AutocompleteService();
      const placesService = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );
      
      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        service.getPlacePredictions(
          {
            input: value,
            componentRestrictions: { country: 'tw' },
          },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              reject(status);
            }
          }
        );
      });

      // 使用 placeId 作為唯一 key
      const newOptions = await Promise.all(
        predictions.map(async (prediction) => {
          const details = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
            placesService.getDetails(
              { placeId: prediction.place_id },
              (result, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
                  resolve(result);
                } else {
                  reject(status);
                }
              }
            );
          });

          return {
            key: prediction.place_id,  // 添加唯一 key
            value: prediction.structured_formatting.main_text,
            label: prediction.description,
            address: details.formatted_address,
            coordinates: {
              lat: details.geometry?.location?.lat() || 0,
              lng: details.geometry?.location?.lng() || 0,
            },
          };
        })
      );

      setOptions(newOptions);
      setShowResults(true);
    } catch (error) {
      console.error('搜尋地點時發生錯誤:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && window.google) {
      handleSearch(inputValue);
    }
  };

  const handleLocationSelect = (location: LocationOption) => {
    setInputValue(location.value);
    setSelectedLocation(location);
    onSelect(location.value, location);
  };

  const openGoogleMaps = async (location: LocationOption) => {
    if (!currentLocation) {
      console.log('無法獲取當前位置');
      return;
    }

    try {
      await saveNavigationRecord(location);  // 先保存記錄
      const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${location.coordinates.lat},${location.coordinates.lng}&travelmode=driving`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('打開導航時發生錯誤:', error);
    }
  };

  const saveNavigationRecord = async (location: LocationOption) => {
    if (!currentLocation || !username || !routeData) return;

    try {
      const navigationRecord = {
        username: username,
        distance: routeData.distance,
        duration: routeData.duration,
        fuelCost: routeData.fuelCost,
        timestamp: new Date(),
        startPoint: currentLocation,
        endPoint: location.coordinates,
        destinationName: location.value
      };

      await addDoc(collection(db, 'navigation_records'), navigationRecord);
      setHasNavigated(true);
      console.log('導航記錄已保存:', navigationRecord);
    } catch (error) {
      console.error('保存導航記錄時發生錯誤:', error);
    }
  };

  if (!isLoaded) {
    return <div>載入中...</div>;
  }

  return (
    <>
      <div style={{ position: 'relative', width: '100%' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="large"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            prefix={<SearchOutlined />}
          />
          <Button
            size="large"
            type="primary"
            onClick={() => handleSearch(inputValue)}
            icon={<SearchOutlined />}
            loading={isSearching}
            style={{
              backgroundColor: '#f4a261', // 柔和的橙色
              color: '#ffffff', // 白色字體
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // 更柔和的按鈕陰影
            }}
          />
        </Space.Compact>
        
        {showResults && options.length > 0 && (
          <List
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              width: '100%',
              zIndex: 1000,
              background: 'linear-gradient(135deg, rgba(211, 192, 182, 0.7), rgba(232, 211, 195, 0.7))',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              marginTop: '1px',
              color: '#4f4f4f', // 柔和的深灰色
            }}
          >
            {options.map((option) => (
              <List.Item
                key={option.key}
                style={{
                  padding: '12px 24px',
                  cursor: 'pointer',
                  color: '#4f4f4f', // 柔和的深灰色
                  backgroundColor: 'rgba(240, 229, 222, 0.7)', // 柔和的莫蘭迪色系背景
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                onClick={() => handleLocationSelect(option)}
                actions={[
                  selectedLocation?.value === option.value && (
                    <Button
                      key="navigate"
                      type="primary"
                      style={{
                        backgroundColor: '#f4a261', // 柔和的橙色
                        color: '#ffffff', // 白色字體
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // 更柔和的按鈕陰影
                      }}
                      icon={<CompassOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openGoogleMaps(option);
                      }}
                      disabled={hasNavigated}
                    >
                      {hasNavigated ? '已導航' : '導航'}
                    </Button>
                  )
                ]}
              >
                <List.Item.Meta
                  title={<span style={{ color: '#4f4f4f' }}>{option.value}</span>} // 柔和的深灰色
                  description={<span style={{ color: '#7d7d7d' }}>{option.address}</span>} // 柔和的灰色
                />
              </List.Item>
            ))}
          </List>
        )}
      </div>
      <Map
        center={currentLocation}
        destination={selectedLocation?.coordinates}
        setCurrentLocation={setCurrentLocation}
        username={username}
        onRouteCalculated={handleRouteCalculated}
      />
    </>
  );
};

export default SearchBar; 