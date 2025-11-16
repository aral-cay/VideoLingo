import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { TelemetryData } from '../utils/telemetry';
import './TelemetryViewer.css';

export function TelemetryViewer() {
  const { userId, username } = useAuth();
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVersion, setFilterVersion] = useState<'all' | 'experimental' | 'control'>('all');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterPage, setFilterPage] = useState<'all' | 'home' | 'video_player'>('all');
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    loadTelemetryData();
  }, [filterVersion, filterEvent, filterUser, filterPage]);

  const loadTelemetryData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('telemetry')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (filterVersion !== 'all') {
        query = query.eq('version', filterVersion);
      }

      if (filterEvent !== 'all') {
        query = query.eq('event_type', filterEvent);
      }

      if (filterUser !== 'all') {
        query = query.eq('username', filterUser);
      }

      if (filterPage !== 'all') {
        query = query.eq('page', filterPage);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading telemetry:', error);
      } else {
        setTelemetryData(data || []);
      }
    } catch (error) {
      console.error('Failed to load telemetry:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load unique event types and users for filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const { data: eventsData } = await supabase
          .from('telemetry')
          .select('event_type')
          .order('event_type');

        const { data: usersData } = await supabase
          .from('telemetry')
          .select('username')
          .order('username');

        if (eventsData) {
          const uniqueEvents = [...new Set(eventsData.map(e => e.event_type))];
          setEventTypes(uniqueEvents);
        }

        if (usersData) {
          const uniqueUsers = [...new Set(usersData.map(u => u.username))];
          setUsers(uniqueUsers);
        }
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };

    loadFilters();
  }, []);

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Version', 'Event Type', 'Page', 'Video ID', 'Data'];
    const rows = telemetryData.map(item => [
      item.timestamp,
      item.username,
      item.version,
      item.event_type,
      item.page,
      item.video_id || '',
      JSON.stringify(item.data || {}),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatData = (data: any) => {
    if (!data || Object.keys(data).length === 0) return '-';
    return JSON.stringify(data, null, 2);
  };

  if (!userId || !username) {
    return <div>Please log in to view telemetry data.</div>;
  }

  return (
    <div className="telemetry-viewer-page">
      <div className="telemetry-viewer-container">
        <div className="telemetry-viewer-header">
          <h1>Telemetry Data Viewer</h1>
          <div className="telemetry-actions">
            <button onClick={loadTelemetryData} className="telemetry-refresh-btn">
              Refresh
            </button>
            <button onClick={exportToCSV} className="telemetry-export-btn">
              Export CSV
            </button>
          </div>
        </div>

        <div className="telemetry-filters">
          <div className="filter-group">
            <label>Version:</label>
            <select value={filterVersion} onChange={(e) => setFilterVersion(e.target.value as any)}>
              <option value="all">All</option>
              <option value="experimental">Experimental</option>
              <option value="control">Control</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Event Type:</label>
            <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
              <option value="all">All</option>
              {eventTypes.map(event => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>User:</label>
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
              <option value="all">All</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Page:</label>
            <select value={filterPage} onChange={(e) => setFilterPage(e.target.value as any)}>
              <option value="all">All</option>
              <option value="home">Home</option>
              <option value="video_player">Video Player</option>
            </select>
          </div>
        </div>

        <div className="telemetry-stats">
          <div className="stat-card">
            <div className="stat-label">Total Events</div>
            <div className="stat-value">{telemetryData.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Experimental</div>
            <div className="stat-value">
              {telemetryData.filter(t => t.version === 'experimental').length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Control</div>
            <div className="stat-value">
              {telemetryData.filter(t => t.version === 'control').length}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="telemetry-loading">Loading telemetry data...</div>
        ) : (
          <div className="telemetry-table-container">
            <table className="telemetry-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Version</th>
                  <th>Event Type</th>
                  <th>Page</th>
                  <th>Video ID</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {telemetryData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="telemetry-empty">
                      No telemetry data found. Make sure the telemetry table exists in Supabase.
                    </td>
                  </tr>
                ) : (
                  telemetryData.map((item, index) => (
                    <tr key={index}>
                      <td>{formatTimestamp(item.timestamp)}</td>
                      <td>{item.username}</td>
                      <td>
                        <span className={`version-badge version-${item.version}`}>
                          {item.version}
                        </span>
                      </td>
                      <td className="event-type-cell">{item.event_type}</td>
                      <td>{item.page}</td>
                      <td>{item.video_id || '-'}</td>
                      <td className="data-cell">
                        <pre>{formatData(item.data)}</pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

