import React, { useState, useEffect, useRef } from 'react';
import { Tabs, Card, List, Statistic, Row, Col, Timeline, Tag, FloatButton, Progress, Button } from 'antd';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TrophyOutlined, ClockCircleOutlined, DollarOutlined, CarOutlined, EnvironmentOutlined, CompassOutlined, ArrowLeftOutlined, CheckOutlined, FireOutlined, CrownOutlined } from '@ant-design/icons';
import { Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Line, Bar, Column } from '@ant-design/charts';

interface UserStats {
  username: string;
  totalDistance: number;
  totalDuration: number;
  totalFuelCost: number;
  totalNavigations: number;
}

interface NavigationRecord {
  username: string;
  distance: number;
  duration: number;
  fuelCost: number;
  timestamp: Date;
  destinationName: string;
}

interface WeeklyTask {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  type: 'distance' | 'trips' | 'navigations';
}

interface RankingItem {
  username: string;
  totalDistance: number;
  totalDuration: number;
  totalFuelCost: number;
  totalNavigations: number;
  totalPoints: number;
}

interface Achievement {
  id: string;
  title: string;
  current: number;
  target: number;
  points: number;
  type: 'usage' | 'distance' | 'total_points';
  icon: string;
}

interface UserRecord {
  records: NavigationRecord[];
  stats: {
    totalDistance: number;
    totalDuration: number;
    totalFuelCost: number;
    count: number;
    totalPoints: number;
  };
}

const colors = {
  primary: '#E3A587',     // 柔和的橘色
  secondary: '#D4B0A2',   // 莫蘭迪粉色
  background: '#F5F0EC',  // 淺米色背景
  text: '#5C4D44',        // 深棕色文字
  accent: '#FF8B5E',      // 亮橘色強調
  cardBg: '#FFFFFF',      // 純白卡片背景
  gold: '#FFD700',        // 金色
  silver: '#C0C0C0',      // 銀色
  bronze: '#CD7F32',      // 銅色
  border: '#E8E0D9'       // 邊框色
};

const styles = {
  '.stats-tabs': {
    '.ant-tabs-nav': {
      marginBottom: '24px'
    },
    '.ant-tabs-tab': {
      color: colors.text
    },
    '.ant-tabs-tab-active': {
      color: colors.primary
    },
    '.ant-tabs-ink-bar': {
      background: colors.primary
    }
  }
};

const ChartContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      // 清除之前的 timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // 設置新的 timeout，防止頻繁觸發
      resizeTimeoutRef.current = setTimeout(() => {
        if (containerRef.current) {
          window.dispatchEvent(new Event('resize'));
        }
      }, 100);
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '300px',  // 固定高度
        maxHeight: '500px',  // 最大高度限制
        overflow: 'hidden'  // 防止內容溢出
      }}
    >
      {children}
    </div>
  );
};

const NavigationStats: React.FC<{ username: string }> = ({ username }) => {
  const [personalStats, setPersonalStats] = useState<UserStats | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<NavigationRecord[]>([]);
  const [rankings, setRankings] = useState<{
    distance: UserStats[];
    duration: UserStats[];
    fuelCost: UserStats[];
    navigations: UserStats[];
    totalPoints: UserStats[];
  }>({
    distance: [],
    duration: [],
    fuelCost: [],
    navigations: [],
    totalPoints: []
  });
  const [allUsersData, setAllUsersData] = useState<NavigationRecord[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([
    {
      id: 'distance',
      title: '週累積里程',
      target: 100,
      current: 0,
      unit: 'km',
      type: 'distance'
    },
    {
      id: 'trips',
      title: '週出差次數',
      target: 3,
      current: 0,
      unit: '次',
      type: 'trips'
    },
    {
      id: 'navigations',
      title: '週導航次數',
      target: 5,
      current: 0,
      unit: '次',
      type: 'navigations'
    }
  ]);
  const [activeRanking, setActiveRanking] = useState<string>('distance');
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'usage_100',
      title: '導航達人',
      current: 0,
      target: 100,
      points: 10,
      type: 'usage',
      icon: '🎯'
    },
    {
      id: 'distance_10',
      title: '里程碑',
      current: 0,
      target: 10,
      points: 5,
      type: 'distance',
      icon: '🚗'
    },
    {
      id: 'total_points',
      title: '積分王者',
      current: 0,
      target: 10000,
      points: 50,
      type: 'total_points',
      icon: '👑'
    }
  ]);

  // 獲取個人統計
  const fetchPersonalStats = async () => {
    try {
      const q = query(
        collection(db, 'navigation_records'),
        where('username', '==', username)
      );
      const querySnapshot = await getDocs(q);
      
      const stats = querySnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        return {
          username: username,
          totalDistance: acc.totalDistance + (parseFloat(data.distance) || 0),
          totalDuration: acc.totalDuration + (parseFloat(data.duration) || 0),
          totalFuelCost: acc.totalFuelCost + (parseFloat(data.fuelCost) || 0),
          totalNavigations: acc.totalNavigations + 1
        };
      }, {
        username: username,
        totalDistance: 0,
        totalDuration: 0,
        totalFuelCost: 0,
        totalNavigations: 0
      });

      // 確保所有值都是數字
      const validStats = {
        ...stats,
        totalDistance: stats.totalDistance || 0,
        totalDuration: stats.totalDuration || 0,
        totalFuelCost: stats.totalFuelCost || 0
      };

      setPersonalStats(validStats);
      setNavigationHistory(querySnapshot.docs.map(doc => ({
        username: doc.data().username,
        destinationName: doc.data().destinationName,
        timestamp: doc.data().timestamp.toDate(),
        distance: parseFloat(doc.data().distance) || 0,
        duration: parseFloat(doc.data().duration) || 0,
        fuelCost: parseFloat(doc.data().fuelCost) || 0
      })));
    } catch (error) {
      console.error("Error fetching personal stats:", error);
    }
  };

  // 獲取排名
  const fetchRankings = async () => {
    try {
      const recordsSnapshot = await getDocs(collection(db, 'navigation_records'));
      const userRecords = new Map<string, UserRecord>();

      // 初始化用戶記錄
      recordsSnapshot.forEach(doc => {
        const data = doc.data();
        const username = data.username;
        
        if (!userRecords.has(username)) {
          userRecords.set(username, {
            records: [],
            stats: {
              totalDistance: 0,
              totalDuration: 0,
              totalFuelCost: 0,
              count: 0,
              totalPoints: 0
            }
          });
        }

        const userRecord = userRecords.get(username);
        if (userRecord) {
          userRecord.stats.totalDistance += Number(data.distance) || 0;
          userRecord.stats.totalDuration += Number(data.duration) || 0;
          userRecord.stats.totalFuelCost += Number(data.fuelCost) || 0;
          userRecord.stats.count += 1;
        }
      });

      // 計算成就積分
      userRecords.forEach((userRecord, username) => {
        const achievements = [
          { target: 100, points: 10, current: userRecord.stats.count },
          { target: 10, points: 5, current: userRecord.stats.totalDistance },
          { target: 10000, points: 50, current: userRecord.stats.totalPoints }
        ];

        userRecord.stats.totalPoints = achievements.reduce((total, achievement) => {
          const completedTimes = Math.floor(achievement.current / achievement.target);
          return total + (completedTimes * achievement.points);
        }, 0);
      });

      // 轉換為排行榜數據
      const rankingsData = Array.from(userRecords.entries()).map(([username, record]) => ({
        username,
        totalDistance: record.stats.totalDistance,
        totalDuration: record.stats.totalDuration,
        totalFuelCost: record.stats.totalFuelCost,
        totalNavigations: record.stats.count,
        totalPoints: record.stats.totalPoints
      }));

      setRankings({
        distance: [...rankingsData].sort((a, b) => b.totalDistance - a.totalDistance),
        duration: [...rankingsData].sort((a, b) => b.totalDuration - a.totalDuration),
        fuelCost: [...rankingsData].sort((a, b) => b.totalFuelCost - a.totalFuelCost),
        navigations: [...rankingsData].sort((a, b) => b.totalNavigations - a.totalNavigations),
        totalPoints: [...rankingsData].sort((a, b) => b.totalPoints - a.totalPoints)
      });

    } catch (error) {
      console.error("Error fetching rankings:", error);
    }
  };

  useEffect(() => {
    fetchPersonalStats();
    fetchRankings();
  }, [username]);

  const navigate = useNavigate();
  
  // 莫蘭迪色系配色
  const colors = {
    primary: '#FF9B7D', // 溫暖的橙色
    secondary: '#E6D5C9', // 莫蘭迪米色
    background: '#F8F5F2', // 淺米色背景
    text: '#5C5552', // 莫蘭迪灰
    accent: '#FFB597', // 淺橙色
    cardBg: '#FFFFFF',
    gold: '#D4B483', // 莫蘭迪金
    silver: '#B5C4C0', // 莫蘭迪銀
    bronze: '#C1A69B', // 莫蘭迪銅
    border: '#E8E0D9'       // 邊框色
  };

  // 計算 Z-Score
  const calculateZScore = (value: number) => {
    const values = navigationHistory.map(r => r.fuelCost / r.distance);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    );
    return (value - mean) / std;
  };

  // 計算用戶平均值
  const calculateUserAverages = (data: any[]) => {
    const userStats = new Map();
    
    data.forEach(record => {
      if (!userStats.has(record.username)) {
        userStats.set(record.username, {
          totalCost: 0,
          totalDistance: 0,
          totalDuration: 0,
          count: 0
        });
      }
      const stats = userStats.get(record.username);
      stats.totalCost += record.fuelCost;
      stats.totalDistance += record.distance;
      stats.totalDuration += record.duration;
      stats.count += 1;
    });

    return Array.from(userStats.entries()).flatMap(([username, stats]) => [
      {
        username,
        value: stats.totalCost / stats.totalDistance,
        metric: '平均油費/公里'
      },
      {
        username,
        value: stats.totalDuration / stats.totalDistance,
        metric: '平均時間/公里'
      }
    ]);
  };

  // 在組件加載時獲取所有用戶數據
  useEffect(() => {
    const fetchAllUsersData = async () => {
      try {
        const recordsSnapshot = await getDocs(collection(db, 'navigation_records'));
        const records: NavigationRecord[] = [];
        
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
        
        setAllUsersData(records);
      } catch (error) {
        console.error("Error fetching all users data:", error);
      }
    };

    fetchAllUsersData();
  }, []);

  const chartConfig = {
    autoFit: true,
    height: 300,
    padding: [30, 30, 50, 60], // 上右下左
    responsive: true,
    theme: {
      maxColumnWidth: 40,
      minColumnWidth: 10
    },
    xAxis: {
      label: {
        autoRotate: true,
        autoHide: true,
        autoEllipsis: true,
        formatter: (text: string) => text.substring(0, 10)
      }
    },
    legend: {
      position: 'top-left',
      flipPage: true,
      maxRow: 2,
      marker: {
        symbol: 'circle'
      }
    },
    tooltip: {
      shared: true,
      showMarkers: false
    }
  };

  // 計算本週任務進度
  const calculateWeeklyProgress = async () => {
    try {
      // 獲取本週開始時間（週日凌晨）
      const startOfWeek = new Date();
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      // 獲取本週結束時間（下週凌晨）
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      console.log('Calculating progress for:', username);
      console.log('Start of week:', startOfWeek);
      console.log('End of week:', endOfWeek);

      // 查詢本週的記錄
      const q = query(
        collection(db, 'navigation_records'),
        where('username', '==', username)
        // 暫時移除時間過濾器以檢查是否有數據
      );

      const querySnapshot = await getDocs(q);
      console.log('Total records found:', querySnapshot.size);

      const weekData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const record = {
          distance: parseFloat(data.distance) || 0,
          destinationName: data.destinationName,
          timestamp: data.timestamp.toDate()
        };
        console.log('Record:', record);
        return record;
      });

      // 手動過濾時間範圍
      const filteredData = weekData.filter(record => {
        const recordTime = record.timestamp.getTime();
        const isInRange = recordTime >= startOfWeek.getTime() && 
                         recordTime < endOfWeek.getTime();
        console.log('Record date:', record.timestamp, 'In range:', isInRange);
        return isInRange;
      });

      console.log('Filtered records:', filteredData.length);

      setWeeklyTasks(prev => {
        const updated = prev.map(task => {
          let current = 0;
          switch (task.type) {
            case 'distance':
              current = Number(filteredData.reduce((sum, record) => sum + record.distance, 0).toFixed(1));
              console.log('Total distance:', current);
              break;
            case 'trips':
              current = new Set(filteredData
                .filter(record => record.destinationName)
                .map(record => record.destinationName)
              ).size;
              console.log('Unique trips:', current);
              break;
            case 'navigations':
              current = filteredData.length;
              console.log('Total navigations:', current);
              break;
          }
          return { ...task, current };
        });
        console.log('Updated tasks:', updated);
        return updated;
      });

    } catch (error) {
      console.error("Error calculating weekly progress:", error);
    }
  };

  // 確保在組件掛載時調用
  useEffect(() => {
    console.log('Effect triggered with username:', username);
    calculateWeeklyProgress();
  }, [username]);

  const [activeChart, setActiveChart] = useState<string>('1');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, 'navigation_records'),
          where('username', '==', username)
        );
        const querySnapshot = await getDocs(q);
        const records: NavigationRecord[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const record = {
            username: data.username,
            distance: Number(data.distance) || 0,
            duration: Number(data.duration) || 0,
            fuelCost: Number(data.fuelCost) || 0,
            timestamp: data.timestamp.toDate(),
            destinationName: data.destinationName
          };
          console.log('Processed record:', record);
          return record;
        });
        console.log('All records:', records);
        setNavigationHistory(records);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [username]);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!username) return;

      try {
        const q = query(
          collection(db, 'navigation_records'),
          where('username', '==', username)
        );
        const querySnapshot = await getDocs(q);
        
        let totalUsage = querySnapshot.size;
        let totalDistance = 0;
        let totalPoints = 0;

        querySnapshot.forEach(doc => {
          const data = doc.data();
          totalDistance += Number(data.distance) || 0;
        });

        setAchievements(prev => prev.map(achievement => {
          let current = 0;
          switch (achievement.type) {
            case 'usage':
              current = totalUsage;
              break;
            case 'distance':
              current = Math.floor(totalDistance);
              break;
            case 'total_points':
              current = totalPoints;
              break;
          }
          return { ...achievement, current };
        }));

      } catch (error) {
        console.error('Error fetching achievements:', error);
      }
    };

    fetchAchievements();
  }, [username]);

  return (
    <div style={{ 
      padding: '13px',
      backgroundColor: colors.background,
    }}>
      <FloatButton
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{
          top: 24,
          left: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
            // border: `1px solid black`
        }}
      />
      
      <div style={{
        backgroundColor: colors.cardBg,
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        // border: `1px solid ${colors.secondary}`
      }}>
        <h2 style={{ 
          color: colors.text,
          marginBottom: '16px',
          fontSize: '24px',
          fontWeight: 600,
        //   border: `1px solid ${colors.secondary}`
        }}>導航統計</h2>

        <Tabs 
          defaultActiveKey="1" 
          type="card"
          style={{ color: colors.text ,
          }}
          items={[
            {
              key: "1",
              label: "個人統計",
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24}>
                    <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                      <Col xs={24} sm={12} md={6}>
                        <Card
                          style={{ 
                            backgroundColor: colors.secondary,
                            borderRadius: '12px',
                            border: 'none',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            // border: `1px solid black`
                          }}
                        >
                          <Statistic
                            title={<span style={{ color: colors.text }}
                            >總里程</span>}
                            value={Number(personalStats?.totalDistance || 0).toFixed(1)}
                            suffix="km"
                            prefix={<CarOutlined style={{ color: colors.primary }} />}
                            valueStyle={{ 
                              color: colors.primary,
                            //   fontSize: '20px',
                            //   whiteSpace: 'nowrap'
                            }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card
                          style={{ 
                            backgroundColor: colors.secondary,
                            borderRadius: '12px',
                            border: 'none',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <Statistic
                            title={<span style={{ color: colors.text }}>總時間</span>}
                            value={Number(personalStats?.totalDuration || 0).toFixed(1)}
                            suffix="分鐘"
                            prefix={<ClockCircleOutlined style={{ color: colors.primary }} />}
                            valueStyle={{ 
                              color: colors.primary,
                             
                            //   whiteSpace: 'nowrap'
                            }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card
                          style={{ 
                            backgroundColor: colors.secondary,
                            borderRadius: '12px',
                            border: 'none',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <Statistic
                            title={<span style={{ color: colors.text }}>總油費</span>}
                            value={personalStats?.totalFuelCost || 0}
                            prefix={<DollarOutlined style={{ color: colors.primary }} />}
                            suffix="€"
                            valueStyle={{ 
                                color: colors.primary,
                                
                                // whiteSpace: 'nowrap'
                              }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card
                          style={{ 
                            backgroundColor: colors.secondary,
                            borderRadius: '12px',
                            border: 'none',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Statistic
                            title={<span style={{ color: colors.text }}>導航次數</span>}
                            value={personalStats?.totalNavigations || 0}
                            prefix={<CompassOutlined style={{ color: colors.primary }} />}
                            valueStyle={{ 
                                color: colors.primary,
                               
                                // whiteSpace: 'nowrap'
                              }}
                          />
                        </Card>
                      </Col>
                    </Row>
                    <List
                      style={{
                        backgroundColor: colors.cardBg,
                        borderRadius: '12px',
                        padding: '8px',
                        //  border: `1px solid black`
                        
                      }}
                      dataSource={navigationHistory}
                      renderItem={record => (
                        <List.Item
                          style={{
                            borderBottom: `1px solid ${colors.secondary}`,
                            padding: '16px',
                            display: 'flex',
                            //  border: `1px solid black`
                          }}
                        >
                          <List.Item.Meta
                            title={
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                width: '100%'
                              }}>
                                <span style={{ 
                                  color: colors.text, 
                                  fontWeight: 'bold' 
                                }}>
                                  {record.destinationName}
                                </span>
                                <span style={{ 
                                  color: colors.text, 
                                  fontSize: '12px' 
                                }}>
                                  {new Date(record.timestamp).toLocaleString()}
                                </span>
                              </div>
                            }
                            description={
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'start', 
                                alignItems: 'center',
                                width: '100%'
                              }}>
                                <Tag color={colors.primary}>{record.distance.toFixed(1)} km</Tag>
                                <Tag color={colors.secondary}>{record.duration.toFixed(0)} 分鐘</Tag>
                                <Tag color={colors.accent}>{record.fuelCost.toFixed(2)} €</Tag>
                              </div>
                            }
                          />
                         
                        </List.Item>
                      )}
                    />
                  </Col>
                </Row>
              )
            },
            {
              key: "2",
              label: "每週任務",
              children: (
                <div style={{ padding: '20px' }}>
                  <Card 
                    style={{ 
                      background: colors.cardBg,
                      borderColor: colors.secondary,
                      margin: '20px 0'
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <Progress
                        type="dashboard"
                        percent={Math.round(
                          (weeklyTasks.filter(task => task.current >= task.target).length / weeklyTasks.length) * 100
                        )}
                        format={percent => (
                          <div>
                            <div style={{ fontSize: '24px', color: colors.primary }}>{percent}%</div>
                            <div style={{ fontSize: '14px', color: colors.text }}>完成進度</div>
                          </div>
                        )}
                      />
                    </div>

                    <List
                      dataSource={weeklyTasks}
                      renderItem={task => {
                        const progress = Math.min((task.current / task.target) * 100, 100);
                        const isCompleted = task.current >= task.target;
                        
                        return (
                          <List.Item>
                            <Card
                              style={{
                                width: '100%',
                                background: isCompleted ? 'rgba(82, 196, 26, 0.1)' : colors.background,
                                borderRadius: '12px',
                                border: `2px solid ${isCompleted ? '#52c41a' : colors.secondary}`,
                                transform: isCompleted ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.3s ease'
                              }}
                              hoverable
                            >
                              <div style={{ position: 'relative' }}>
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '12px'
                                }}>
                                  <div>
                                    <span style={{ 
                                      fontSize: '16px', 
                                      fontWeight: 600,
                                      marginRight: '8px'
                                    }}>
                                      {task.title}
                                    </span>
                                    {isCompleted && (
                                      <Tag color="#52c41a">
                                        <CheckOutlined /> 已完成
                                      </Tag>
                                    )}
                                  </div>
                                  <span style={{ 
                                    fontSize: '18px',
                                    color: isCompleted ? '#52c41a' : colors.primary,
                                    fontWeight: 600
                                  }}>
                                    {task.current}/{task.target} {task.unit}
                                  </span>
                                </div>

                                <Progress
                                  percent={progress}
                                  status={isCompleted ? 'success' : 'active'}
                                  strokeColor={{
                                    '0%': colors.primary,
                                    '100%': isCompleted ? '#52c41a' : colors.accent
                                  }}
                                  showInfo={false}
                                />

                                {/* 任務獎勵標籤 */}
                                <div style={{ 
                                  marginTop: '8px',
                                  display: 'flex',
                                  gap: '8px'
                                }}>
                                  <Tag color={colors.gold}>
                                    <TrophyOutlined /> {Math.round(task.target * 10)} 積分
                                  </Tag>
                                  {progress >= 50 && !isCompleted && (
                                    <Tag color={colors.primary}>
                                      <FireOutlined /> 衝刺中
                                    </Tag>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </List.Item>
                        );
                      }}
                    />

                    {/* 成就展示區 */}
                    <div style={{ 
                      marginTop: '24px',
                      padding: '16px',
                      background: colors.background,
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <h3 style={{ color: colors.text, marginBottom: '16px' }}>
                        <CrownOutlined style={{ color: colors.gold, marginRight: '8px' }} />
                        本週成就
                      </h3>
                      <Row gutter={[16, 16]}>
                        <Col span={8}>
                          <Statistic
                            title="完成任務"
                            value={weeklyTasks.filter(t => t.current >= t.target).length}
                            suffix={`/ ${weeklyTasks.length}`}
                            valueStyle={{ color: colors.primary }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="累計里程"
                            value={weeklyTasks.find(t => t.type === 'distance')?.current || 0}
                            suffix="km"
                            valueStyle={{ color: colors.primary }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="總任務積分"
                            value={weeklyTasks.reduce((acc, task) => 
                              acc + (task.current >= task.target ? Math.round(task.target * 10) : 0), 0
                            )}
                            prefix={<TrophyOutlined />}
                            valueStyle={{ color: colors.gold }}
                          />
                        </Col>
                      </Row>
                    </div>
                  </Card>
                </div>
              )
            },
            {
              key: "3",
              label: "排行榜",
              children: (
                <div style={{ padding: '20px' }}>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px',
                    marginBottom: '24px' 
                  }}>
                    {[
                      { key: 'distance', label: '總里程排名', color: '#FF9B7D' },
                      { key: 'duration', label: '總時間排名', color: '#7DBAFF' },
                      { key: 'fuelCost', label: '總油費排名', color: '#95DE64' },
                      { key: 'navigations', label: '導航次數排名', color: '#B37FEB' },
                      { key: 'totalPoints', label: '成就積分排名', color: '#FFD700' }
                    ].map(item => (
                      <Button
                        key={item.key}
                        style={{
                          background: activeRanking === item.key ? item.color : 'white',
                          color: activeRanking === item.key ? 'white' : item.color,
                          borderColor: item.color,
                          borderRadius: '20px',
                          padding: '4px 16px',
                          flex: '1 1 auto',
                          minWidth: '120px',
                          maxWidth: '200px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => setActiveRanking(item.key)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>

                  {/* 顯示對應的排行榜內容 */}
                  <List
                    style={{
                      backgroundColor: colors.cardBg,
                      borderRadius: '12px',
                      padding: '16px'
                    }}
                    dataSource={rankings[activeRanking] as RankingItem[]}
                    renderItem={(item: RankingItem, index) => (
                      <List.Item
                        style={{
                          borderBottom: `1px solid ${colors.secondary}`,
                          padding: '16px'
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <Tag 
                              color={
                                index === 0 ? colors.gold :
                                index === 1 ? colors.silver :
                                index === 2 ? colors.bronze :
                                colors.secondary
                              }
                              style={{
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {index + 1}
                            </Tag>
                          }
                          title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {index < 3 && (
                                <span style={{
                                  color: index === 0 ? colors.gold : 
                                        index === 1 ? colors.silver : colors.bronze
                                }}>
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              )}
                              <span>{item.username}</span>
                            </div>
                          }
                          description={
                            <span style={{ color: colors.primary }}>
                              {activeRanking === 'distance' && `總里程：${Number(item.totalDistance).toFixed(1)} km`}
                              {activeRanking === 'duration' && `總時間：${Number(item.totalDuration).toFixed(0)} 分鐘`}
                              {activeRanking === 'fuelCost' && `總油費：${Number(item.totalFuelCost).toFixed(2)} €`}
                              {activeRanking === 'navigations' && `導航次數：${item.totalNavigations} 次`}
                              {activeRanking === 'totalPoints' && `成就積分：${item.totalPoints} 分`}
                            </span>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )
            },
            {
              key: "4",
              label: "效率分析",
              children: (
                <div style={{ padding: '20px' }}>
                  {/* 彩色按鈕組 */}
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px',
                    marginBottom: '24px' 
                  }}>
                    {[
                      { key: '1', label: '油耗效率', color: '#FF9B7D', icon: '⛽' },
                      { key: '2', label: '時間效率', color: '#7DBAFF', icon: '⏱️' },
                      { key: '4', label: '綜合效率', color: '#95DE64', icon: '📊' },
                      { key: '5', label: '路線分析', color: '#B37FEB', icon: '🛣️' },
                      { key: '6', label: '成本分析', color: '#FFB980', icon: '💰' },
                      { key: '7', label: '異常分析', color: '#FF85C0', icon: '⚠️' }
                    ].map(item => (
                      <Button
                        key={item.key}
                        style={{
                          background: activeChart === item.key ? item.color : 'white',
                          color: activeChart === item.key ? 'white' : item.color,
                          borderColor: item.color,
                          borderRadius: '20px',
                          padding: '4px 16px',
                          flex: '1 1 auto',
                          minWidth: '120px',
                          maxWidth: '200px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.3s ease',
                          boxShadow: activeChart === item.key ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}
                        onClick={() => setActiveChart(item.key)}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </Button>
                    ))}
                  </div>

                  {/* 圖表內容 */}
                  <div style={{ 
                    background: colors.cardBg, 
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {activeChart === '1' && (
                      <ChartContainer>
                        <Column {...chartConfig}
                          data={(() => {
                            console.log('All Users Data:', allUsersData);
                            const validData = allUsersData
                              .filter(record => record && record.distance > 0 && record.fuelCost > 0)
                              .map(record => {
                                const value = Number(record.fuelCost) / Number(record.distance);
                                return {
                                  date: new Date(record.timestamp).toLocaleDateString(),
                                  value: value,
                                  username: record.username
                                };
                              })
                              .filter(item => !isNaN(item.value) && item.value !== null);
                            return validData;
                          })()}
                          xField="date"
                          yField="value"
                          seriesField="username"
                          isGroup={true}
                          label={{
                            position: 'top',
                            formatter: (datum: any) => {
                              if (datum && typeof datum.value === 'number') {
                                return datum.value.toFixed(2);
                              }
                              return '';
                            },
                            style: { fontSize: 10 }
                          }}
                        />
                      </ChartContainer>
                    )}
                    {activeChart === '2' && (
                      <ChartContainer>
                        <Column
                          data={allUsersData
                            .filter(record => record.distance > 0 && record.duration > 0)
                            .map(record => ({
                              date: new Date(record.timestamp).toLocaleDateString(),
                              value: Number((record.duration / record.distance).toFixed(2)),
                              username: record.username
                            }))
                            .filter(item => !isNaN(item.value))}
                          xField="date"
                          yField="value"
                          seriesField="username"
                          isGroup={true}
                          label={{
                            position: 'top',
                            formatter: (datum) => `${datum.value.toFixed(2)}`,
                            style: {
                              fontSize: 10
                            }
                          }}
                        />
                      </ChartContainer>
                    )}
                    {activeChart === '4' && (
                      <ChartContainer>
                        <Line
                          data={allUsersData
                            .filter(record => 
                              record.distance > 0 && 
                              record.duration > 0 && 
                              record.fuelCost > 0
                            )
                            .map(record => ({
                              date: new Date(record.timestamp).toLocaleDateString(),
                              value: Number((record.fuelCost / (record.distance * record.duration)).toFixed(4)),
                              username: record.username
                            }))
                            .filter(item => !isNaN(item.value))}
                          xField="date"
                          yField="value"
                          seriesField="username"
                          label={{
                            position: 'top',
                            formatter: (datum) => `${datum.value.toFixed(4)}`
                          }}
                        />
                      </ChartContainer>
                    )}
                    {activeChart === '5' && (
                      <ChartContainer>
                        <Column
                          data={navigationHistory.map(record => ({
                            date: new Date(record.timestamp).toLocaleDateString(),
                            value: record.distance,
                            theoreticalDistance: record.distance * 0.9,
                            difference: (record.distance * 0.1 / record.distance * 100).toFixed(1),
                            username: record.username
                          }))}
                          xField="date"
                          yField="value"
                          seriesField="username"
                          isGroup={true}
                        />
                      </ChartContainer>
                    )}
                    {activeChart === '6' && (
                      <ChartContainer>
                        <Line
                          data={navigationHistory.map(record => ({
                            date: new Date(record.timestamp).toLocaleDateString(),
                            value: record.fuelCost / (record.distance * record.duration),
                            username: record.username
                          }))}
                          xField="date"
                          yField="value"
                          seriesField="username"
                        />
                      </ChartContainer>
                    )}
                    {activeChart === '7' && (
                      <ChartContainer>
                        <Column
                          data={navigationHistory.map(record => {
                            const costPerKm = record.fuelCost / record.distance;
                            const zScore = calculateZScore(costPerKm);
                            return {
                              date: new Date(record.timestamp).toLocaleDateString(),
                              value: costPerKm,
                              isAnomaly: Math.abs(zScore) > 2,
                              username: record.username
                            };
                          })}
                          xField="date"
                          yField="value"
                          seriesField="username"
                          isGroup={true}
                        />
                      </ChartContainer>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: "5",
              label: "累積成就",
              children: (
                <div style={{ padding: '20px' }}>
                  <Card 
                    style={{ 
                      background: colors.cardBg,
                      borderColor: colors.secondary,
                      margin: '20px 0'
                    }}
                  >
                    {/* 累積成就積分卡片 */}
                    <div style={{ 
                      textAlign: 'center', 
                      marginBottom: '24px',
                      borderBottom: `1px solid ${colors.secondary}`,
                      paddingBottom: '24px'
                    }}>
                      <div style={{ 
                        fontSize: '32px', 
                        color: colors.gold,
                        marginBottom: '8px'
                      }}>
                        <TrophyOutlined style={{ marginRight: '8px' }} />
                        {achievements.reduce((total, achievement) => {
                          const completedTimes = Math.floor(achievement.current / achievement.target);
                          return total + (completedTimes * achievement.points);
                        }, 0)}
                      </div>
                      <div style={{ 
                        fontSize: '16px',
                        color: colors.text
                      }}>
                        累積成就積分
                      </div>
                    </div>

                    {/* 原有的進度儀表板和成就列表 */}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <Progress
                        type="dashboard"
                        percent={Math.round(
                          (achievements.filter(achievement => 
                            achievement.current >= achievement.target
                          ).length / achievements.length) * 100
                        )}
                        format={percent => (
                          <div>
                            <div style={{ fontSize: '24px', color: colors.primary }}>{percent}%</div>
                            <div style={{ fontSize: '14px', color: colors.text }}>完成進度</div>
                          </div>
                        )}
                      />
                    </div>

                    {/* 原有的成就列表 */}
                    <List
                      dataSource={achievements}
                      renderItem={achievement => {
                        const progress = Math.min(
                          Math.round((achievement.current / achievement.target) * 100),
                          100
                        );
                        const isCompleted = achievement.current >= achievement.target;

                        return (
                          <List.Item>
                            <Card
                              style={{
                                width: '100%',
                                background: colors.background,
                                borderColor: colors.border
                              }}
                            >
                              <div style={{ marginBottom: '16px' }}>
                                <span style={{ 
                                  fontSize: '20px',
                                  marginRight: '8px' 
                                }}>
                                  {achievement.icon}
                                </span>
                                <span style={{ 
                                  color: colors.text,
                                  fontSize: '16px',
                                  fontWeight: 500
                                }}>
                                  {achievement.title}
                                </span>
                              </div>

                              <div style={{ marginBottom: '8px' }}>
                                <span style={{ color: colors.text }}>
                                  進度: {achievement.current} / {achievement.target}
                                  {achievement.type === 'distance' ? ' km' : 
                                   achievement.type === 'total_points' ? ' 分' : ' 次'}
                                </span>
                              </div>

                              <Progress
                                percent={progress}
                                status={isCompleted ? 'success' : 'active'}
                                strokeColor={{
                                  '0%': colors.primary,
                                  '100%': isCompleted ? '#52c41a' : colors.accent
                                }}
                                showInfo={false}
                              />

                              <div style={{ 
                                marginTop: '8px',
                                display: 'flex',
                                gap: '8px'
                              }}>
                                <Tag color={colors.gold}>
                                  <TrophyOutlined /> {achievement.points} 積分
                                </Tag>
                                {progress >= 50 && !isCompleted && (
                                  <Tag color={colors.primary}>
                                    <FireOutlined /> 努力中
                                  </Tag>
                                )}
                                {isCompleted && (
                                  <Tag color="#52c41a">
                                    <CheckOutlined /> 已完成
                                  </Tag>
                                )}
                              </div>
                            </Card>
                          </List.Item>
                        );
                      }}
                    />
                  </Card>
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default NavigationStats;