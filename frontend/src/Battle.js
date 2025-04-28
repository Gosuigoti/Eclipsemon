import { useState, useEffect } from 'react';

function Battle({ battle, socket, username }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasSelected, setHasSelected] = useState(false);
  const [opponentSelected, setOpponentSelected] = useState(false);
  const player = battle.players.find(p => p.username === username);
  const opponent = battle.players.find(p => p.username !== username);

  useEffect(() => {
    console.log('Battle component mounted, initializing timer');
    // Initialiser le timer pour le premier tour
    let timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Écouter les nouveaux tours
    socket.on('newTurn', () => {
      console.log('Received newTurn event');
      setTimeLeft(30);
      setHasSelected(false);
      setOpponentSelected(false);
      clearInterval(timer); // Arrêter le timer précédent
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('moveSelected', ({ playerId }) => {
      console.log('Received moveSelected event for player:', playerId);
      if (playerId !== socket.id) {
        setOpponentSelected(true);
      }
    });

    return () => {
      console.log('Battle component unmounted, cleaning up');
      clearInterval(timer);
      socket.off('newTurn');
      socket.off('moveSelected');
    };
  }, [socket]);

  const handleMove = (moveIndex) => {
    if (!hasSelected) {
      console.log('Player selected move:', moveIndex);
      socket.emit('move', { battleId: battle.id, moveIndex });
      setHasSelected(true);
    }
  };

  return (
    <div>
      <h2>Battle: {player.pokemon.name} vs {opponent.pokemon.name}</h2>
      <p>Your HP: {player.pokemon.currentHp}</p>
      <p>Opponent HP: {opponent.pokemon.currentHp}</p>
      <p>Time left: {timeLeft}s</p>
      <p>{hasSelected ? 'You have selected your move' : 'Choose your move'}</p>
      <p>{opponentSelected ? 'Opponent has selected their move' : 'Waiting for opponent to choose'}</p>
      <h3>Your moves:</h3>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        {player.pokemon.moves.map((move, index) => (
          <button
            key={move.name}
            onClick={() => handleMove(index)}
            disabled={hasSelected}
            style={{ padding: '10px', cursor: hasSelected ? 'not-allowed' : 'pointer' }}
          >
            {move.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Battle;