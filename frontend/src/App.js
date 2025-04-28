import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Login from './Login';
import Battle from './Battle';

const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });

function App() {
  const [username, setUsername] = useState('');
  const [battle, setBattle] = useState(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    console.log('App useEffect: Registering Socket.IO events');
    socket.on('connect', () => console.log('Socket.IO connected'));
    socket.on('connect_error', (err) => console.error('Socket.IO connection error:', err));
    socket.on('waiting', () => {
      console.log('Received waiting event');
      setWaiting(true);
    });
    socket.on('battleStart', (battleData) => {
      console.log('Received battleStart event:', battleData);
      setWaiting(false);
      setBattle(battleData);
    });
    socket.on('newTurn', (battleData) => {
      console.log('Received newTurn event:', battleData);
      setBattle(battleData);
    });
    socket.on('turnResult', ({ battle, results }) => {
      console.log('Received turnResult event:', battle, results);
      setBattle(battle);
      results.forEach(result => {
        alert(`${result.attacker} used ${result.move} on ${result.defender}, dealing ${result.damage} damage!`);
      });
    });
    socket.on('battleEnd', ({ winner, reason }) => {
      console.log('Received battleEnd event:', winner, reason);
      alert(winner ? `${winner} wins!` : reason || 'Draw!');
      setBattle(null);
    });

    return () => socket.off();
  }, []);

  const handleLogin = (name) => {
    console.log('Login with username:', name);
    setUsername(name);
    socket.emit('login', name);
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      {!username && <Login onLogin={handleLogin} />}
      {waiting && <p>Waiting for an opponent...</p>}
      {battle && <Battle battle={battle} socket={socket} username={username} />}
    </div>
  );
}

export default App;