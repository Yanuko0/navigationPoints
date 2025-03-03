import { useState, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Card, Button, Modal, Upload, Form, Input, Row, Col, message } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, doc, setDoc, getDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import AvatarEditor from 'react-avatar-editor';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';


interface MapProps {
  center?: {
    lat: number;
    lng: number;
  };
  destination?: {
    lat: number;
    lng: number;
  };
  username?: string;
  onRouteCalculated?: (routeData: {
    distance: number;
    duration: number;
    fuelCost: number;
    timestamp: Timestamp;
    username: string;
  }) => void;
}

const colors = {
  primary: '#E3A587',     // 柔和的橘色
  secondary: '#D4B0A2',   // 莫蘭迪粉色
  background: '#F5F0EC',  // 淺米色背景
  text: '#5C4D44',        // 深棕色文字
  accent: '#FF8B5E',      // 亮橘色強調
  cardBg: '#FFFFFF',      // 純白卡片背景
  border: '#E8E0D9'       // 邊框色
};

const MapComponent = ({ center, destination, username, onRouteCalculated, setCurrentLocation }: MapProps & { setCurrentLocation: (location: { lat: number, lng: number }) => void }) => {
  const navigate = useNavigate();
  const [mapCenter, setMapCenter] = useState({
    lat: 24.2254,
    lng: 120.6283
  });
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [showCard, setShowCard] = useState(false);
  const [fuelCost, setFuelCost] = useState('');
  const [userStats, setUserStats] = useState({
    dailyUses: 0,
    totalDuration: 0,
    totalDistance: 0
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [userInfo, setUserInfo] = useState({
    name: '',
    age: '',
    address: '',
    carType: ''
  });
  const [image, setImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editor, setEditor] = useState<AvatarEditor | null>(null);

  const auth = getAuth();

  useEffect(() => {
    if (center) {
      setMapCenter(center);
    }
  }, [center]);

  useEffect(() => {
    if (center && destination && window.google) {
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin: center,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        async (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result && username) {
            setDirections(result);
            const route = result.routes[0];
            if (route?.legs?.[0]) {
              const distanceInKm = route.legs[0].distance?.value ? route.legs[0].distance.value / 1000 : 0;
              const durationInMinutes = route.legs[0].duration?.value ? route.legs[0].duration.value / 60 : 0;
              
              const fuelConsumption = 8;
              const fuelPrice = 1.85;
              const totalFuelCost = (distanceInKm * fuelConsumption / 100) * fuelPrice;
              
              setDistance(route.legs[0].distance?.text || '');
              setDuration(route.legs[0].duration?.text || '');
              setFuelCost(totalFuelCost.toFixed(2));

              setUserStats(prev => {
                const newStats = {
                  dailyUses: prev.dailyUses + 1,
                  totalDuration: prev.totalDuration + durationInMinutes,
                  totalDistance: prev.totalDistance + distanceInKm
                };
                console.log('Updating stats:', newStats);
                return newStats;
              });

              const routeData = {
                username,
                distance: distanceInKm,
                duration: durationInMinutes,
                fuelCost: Number(totalFuelCost.toFixed(2)),
                timestamp: Timestamp.now(),
                destinationName: destination.toString()
              };

              console.log('Saving route data:', routeData);
              await onRouteCalculated?.(routeData);

              fetchUserStats();
            }
          }
        }
      );
    }
  }, [center, destination, username]);

  useEffect(() => {
    if (distance && duration) {
      setShowCard(true);
    }
  }, [distance, duration]);

  // 實時更新位置
  // useEffect(() => {
  //   let watchId: number;

  //   if (navigator.geolocation) {
  //     watchId = navigator.geolocation.watchPosition(
  //       (position) => {
  //         const pos = {
  //           lat: position.coords.latitude,
  //           lng: position.coords.longitude
  //         };
  //         setMapCenter(pos);
  //         setCurrentLocation(pos);
  //       },
  //       (error) => {
  //         console.error("Error watching position:", error);
  //       },
  //       {
  //         enableHighAccuracy: true,
  //         maximumAge: 0,
  //         timeout: 5000
  //       }
  //     );
  //   }

  //   // 清除監聽器
  //   return () => {
  //     if (navigator.geolocation && watchId !== undefined) {
  //       navigator.geolocation.clearWatch(watchId);
  //     }
  //   };
  // }, []);

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter(pos);
          setCurrentLocation(pos);
        },
        (error) => {
          console.error("Error getting current location:", error);
        }
      );
    }
  };

  const handleCardClick = () => {
    navigate('/stats');
  };

  const fetchUserStats = async () => {
    if (!username) return;

      try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

      console.log('Fetching stats for:', {
        username,
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString()
      });

      const dailyQuery = query(
        collection(db, 'routes'),
        where('username', '==', username),
        where('timestamp', '>=', Timestamp.fromDate(today)),
        where('timestamp', '<', Timestamp.fromDate(tomorrow))
      );

      const dailySnapshot = await getDocs(dailyQuery);
      console.log('Found documents:', dailySnapshot.size);
      
      let dailyDuration = 0;
      let dailyDistance = 0;
      
      dailySnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Document data:', data);
        dailyDuration += Number(data.duration || 0);
        dailyDistance += Number(data.distance || 0);
      });

      const newStats = {
        dailyUses: dailySnapshot.size,
        totalDuration: dailyDuration,
        totalDistance: dailyDistance
      };

      console.log('Setting new stats:', newStats);
      setUserStats(newStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, [username]);

  const handleAvatarClick = () => {
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const userId = auth.currentUser ? auth.currentUser.uid : "defaultUserId";
        await setDoc(doc(db, "users", userId), values);
        setUserInfo(values);
        setIsModalVisible(false);
        console.log('資料已成功保存到 Firebase');
      } catch (error) {
        console.error('保存到 Firebase 時出錯:', error);
      }
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleAvatarChange = (info: any) => {
    if (info.file.status === 'done') {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setIsEditing(true);

        // 僅顯示圖片，不上傳到 Firebase
        setAvatar(reader.result as string);
        console.log('圖片已加載，未上傳到 Firebase');
      };
      reader.readAsDataURL(info.file.originFileObj);
    }
  };

  const handleSave = async () => {
    if (editor) {
      const canvas = editor.getImageScaledToCanvas().toDataURL();
      const userId = auth.currentUser ? auth.currentUser.uid : "defaultUserId"; // 確保使用實際的用戶ID
      const avatarRef = ref(storage, `avatars/${userId}.png`);
      const response = await fetch(canvas);
      const blob = await response.blob();
      await uploadBytes(avatarRef, blob);
      const url = await getDownloadURL(avatarRef);
      setAvatar(url);
      setIsEditing(false);
      console.log('圖片已成功上傳到 Firebase');
    }
  };

  // 個人資料初始值
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userId = auth.currentUser ? auth.currentUser.uid : "defaultUserId";
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const userData = {
            name: data.name || '',
            age: data.age || '',
            address: data.address || '',
            carType: data.carType || ''
          };
          setUserInfo(userData);
          form.setFieldsValue(userData);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, []);

  // 確保在使用 setEditor 時，傳入的參數是 AvatarEditor 的實例
  const handleEditorRef = (instance: InstanceType<typeof AvatarEditor> | null) => {
    setEditor(instance);
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%',
      background: colors.background 
    }}>
      <GoogleMap
        mapContainerStyle={{
          height: "calc(100vh - 96px)",
          width: "100%"
        }}
        zoom={13}
        center={mapCenter}
        options={{
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google?.maps.ControlPosition.RIGHT_CENTER || 3,
          },
          scrollwheel: true,
          gestureHandling: 'greedy'
        }}
      >
        {directions ? (
          <DirectionsRenderer 
            directions={directions}
            options={{
              suppressMarkers: false,
              polylineOptions: {
                strokeColor: "#1890ff",
                strokeWeight: 6,
                strokeOpacity: 0.8
              },
              markerOptions: {
                zIndex: 100
              }
            }}
          />
        ) : (
          <>
            {center && <Marker position={center} label="目前位置" />}
            {destination && <Marker position={destination} label="目的地" />}
          </>
        )}
      </GoogleMap>

      <Button
        type="primary"
        icon={<AimOutlined style={{ color: colors.primary }} />}
        style={{
          position: 'absolute',
          top: 'calc(65% - 60px)',
          right: '10px',
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          background: '#fff',
          border: 'none',
          zIndex: 1000
        }}
        onClick={handleCurrentLocation}
      />

      {distance && duration && (
        <Card
          onClick={handleCardClick}
          style={{
            cursor: 'pointer',
            position: 'absolute',
            bottom: showCard ? '12px' : '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '800px',
            // background: colors.cardBg,
            backgroundColor: 'rgba(240, 229, 222, 0.9)',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            transition: 'bottom 0.3s ease-in-out',
            zIndex: 1000,
            // border: `1px solid ${colors.border}`
          }}
          styles={{ 
            body: { 
              padding: '16px',
              overflow: 'auto'
            }
          }}
        >
          <div style={{ 
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '16px',
            // border: `1px solid ${colors.border}`,
          }}>
            <div style={{
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: colors.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.cardBg,
                fontSize: '20px',
                fontWeight: '500',
                border: `2px solid ${colors.primary}`
              }}>
                {username?.[0]?.toUpperCase()}
              </div>
              <span style={{ 
                color: colors.text,
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {username}
              </span>
            </div>

            <div style={{
              display: 'flex',
              // flexDirection: window.innerWidth < 768 ? 'column' : 'row',
              gap: '12px',
              justifyContent: 'center',
              width: '100%'
            }}>
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '12px',
                background: colors.background,
                borderRadius: '12px',
                minWidth: window.innerWidth < 768 ? 'auto' : '100px',
                width: window.innerWidth < 768 ? '100%' : 'auto'
              }}>
                 <span style={{ 
                  fontSize: '15px',
                  color: colors.text
                }}>總距離</span>
                <span style={{ 
                  fontSize: '18px',
                  fontWeight: '500',
                  color: colors.primary
                }}>{distance}</span>
              </div>

              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '12px',
                background: colors.background,
                borderRadius: '12px',
                minWidth: window.innerWidth < 768 ? 'auto' : '100px',
                width: window.innerWidth < 768 ? '100%' : 'auto'
              }}>
                <span style={{ 
                  fontSize: '15px',
                  color: colors.text
                }}>預計時間</span>
                <span style={{ 
                  fontSize: '18px',
                  fontWeight: '500',
                  color: colors.primary
                }}>{duration}</span>
              </div>

              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '12px',
                background: colors.background,
                borderRadius: '12px',
                minWidth: window.innerWidth < 768 ? 'auto' : '100px',
                width: window.innerWidth < 768 ? '100%' : 'auto'
              }}>
                
                <span style={{ 
                  fontSize: '15px',
                  color: colors.text
                }}>預估油費</span>
                <span style={{ 
                  fontSize: '18px',
                  fontWeight: '500',
                  color: colors.primary
                }}>€{fuelCost}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '10px',
          background: colors.cardBg,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 999,
          cursor: 'pointer'
        }}
        onClick={() => navigate('/stats')}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: colors.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.cardBg,
              fontSize: '14px',
              fontWeight: '500',
              border: `2px solid ${colors.primary}`,
              cursor: 'pointer'
            }}
            onClick={(event) => {
              event.stopPropagation();
              handleAvatarClick();
            }}
          >
            {username?.[0]?.toUpperCase()}
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span style={{ 
              fontSize: '14px',
              fontWeight: '500',
              color: colors.text
            }}>
              {username}
            </span>
            <span style={{ 
              fontSize: '12px',
              color: colors.text,
              opacity: 0.8
            }}>
              已登入
            </span>
          </div>
        </div>
      </div>

      <Modal
        title="編輯個人資料"
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        footer={null}
        centered
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: colors.background,
          padding: '0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: 'none'
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '20px',
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: colors.background
        }}>
          {isEditing ? (
            <div>
              {image && (
                <AvatarEditor
                  ref={setEditor}
                  image={image}
                  width={150}
                  height={150}
                  border={50}
                  borderRadius={75} // 圓形裁切
                  scale={1.2}
                />
              )}
              <Button onClick={handleSave}>保存裁切後的圖片</Button>
            </div>
          ) : (
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              beforeUpload={(file) => {
                const isLt5M = file.size / 1024 / 1024 < 5;
                if (!isLt5M) {
                  message.error('圖片必須小於 5MB!');
                }
                return isLt5M;
              }}
              customRequest={({ file, onSuccess }) => {
                // 檢查 file 是否是 File 類型
                if (file instanceof File) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setImage(reader.result as string);
                    setIsEditing(true);

                    // 僅顯示圖片，不上傳到 Firebase
                    setAvatar(reader.result as string);
                    console.log('圖片已加載，未上傳到 Firebase');
                    
                    if (onSuccess) {
                      onSuccess("ok"); // 通知上傳成功
                    }
                  };
                  reader.readAsDataURL(file);
                } else {
                  console.error("File is not of type File");
                }
              }}
            >
              {avatar ? (
                <img src={avatar} alt="avatar" style={{ width: '100%' }} />
              ) : (
                <div>上傳新頭像</div>
              )}
            </Upload>
          )}

          <Form
            form={form}
            layout="vertical"
            initialValues={userInfo}
            style={{ width: '100%', maxWidth: '400px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="姓名"
                  name="name"
                >
                  <Input style={{ borderRadius: '8px', borderColor: colors.border, padding: '8px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="年齡"
                  name="age"
                >
                  <Input type="number" style={{ borderRadius: '8px', borderColor: colors.border, padding: '8px' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label="居住地址"
              name="address"
            >
              <Input style={{ borderRadius: '8px', borderColor: colors.border, padding: '8px' }} />
            </Form.Item>
            <Form.Item
              label="車種"
              name="carType"
            >
              <Input style={{ borderRadius: '8px', borderColor: colors.border, padding: '8px' }} />
            </Form.Item>
          </Form>

          <Button 
            type="primary" 
            onClick={handleModalOk} 
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              backgroundColor: colors.accent, 
              borderColor: colors.accent, 
              borderRadius: '8px',
              padding: '10px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            保存
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MapComponent;