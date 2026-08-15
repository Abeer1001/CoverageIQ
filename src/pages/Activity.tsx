import { useState, useEffect } from 'react';
import { db } from '../db';
import { useAuth } from '../AuthContext';
import { Activity as ActivityIcon } from 'lucide-react';

interface ActivityEntry {
  id: string;
  description: string;
  date: string;
}

export default function Activity() {
  const { user } = useAuth();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    const projectIds = new Set(db.projects.filter(p => p.companyId === user?.companyId).map(p => p.id));
    setActivity(db.activity.filter(a => projectIds.has(a.projectId)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [user?.companyId]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Activity</h1>
          <p className="text-muted" style={{ margin: 0 }}>A timeline of actions across your projects.</p>
        </div>
      </div>

      <div className="card">
        {activity.length === 0 ? (
          <div className="empty-state">
            <ActivityIcon size={40} className="empty-icon" />
            <h3>No activity recorded yet.</h3>
            <p style={{ marginBottom: 0 }}>Actions like adding vendors and uploading documents will appear here.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column' }}>
            {activity.map(entry => (
              <li key={entry.id} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                <ActivityIcon size={18} color="var(--color-text-light)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem' }}>{entry.description}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', whiteSpace: 'nowrap' }}>
                  {new Date(entry.date).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
