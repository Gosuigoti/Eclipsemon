import { useState, useEffect } from 'react';
import './Battle.css';

function Battle({ battle, socket, username, messages }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasSelected, setHasSelected] = useState(false);
  const [opponentSelected, setOpponentSelected] = useState(false);
  const [shaking, setShaking] = useState({ player: false, opponent: false }); // Suivre les animations de secousse
  const player = battle.players.find(p => p.username === username);
  const opponent = battle.players.find(p => p.username !== username);

  // Calculer le pourcentage de HP
  const playerHpPercent = (player.pokemon.currentHp / player.pokemon.hp) * 100;
  const opponentHpPercent = (opponent.pokemon.currentHp / opponent.pokemon.hp) * 100;

  // Déterminer la couleur de la barre de vie
  const getHealthColor = (percent) => {
    if (percent > 50) return 'green';
    if (percent > 20) return 'yellow';
    return 'red';
  };

  // Sélectionner les sprites en fonction du Pokémon
  const getPokemonSprite = (pokemonName, isPlayer) => {
    const sprites = {
      Pikachu: {
        back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png',
        front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
      },
      Bulbasaur: {
        back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/1.png',
        front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'
      }
    };
    return isPlayer ? sprites[pokemonName].back : sprites[pokemonName].front;
  };

  // Déclencher la secousse lorsqu’un Pokémon est touché
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (lastMessage.includes(`${player.pokemon.name}, dealing`) && lastMessage.includes('damage')) {
        setShaking(prev => ({ ...prev, player: true }));
        setTimeout(() => setShaking(prev => ({ ...prev, player: false })), 500); // Durée de l’animation
      }
      if (lastMessage.includes(`${opponent.pokemon.name}, dealing`) && lastMessage.includes('damage')) {
        setShaking(prev => ({ ...prev, opponent: true }));
        setTimeout(() => setShaking(prev => ({ ...prev, opponent: false })), 500);
      }
    }
  }, [messages, player.pokemon.name, opponent.pokemon.name]);

  useEffect(() => {
    console.log('Battle component mounted, initializing timer');
    let timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    socket.on('newTurn', () => {
      console.log('Received newTurn event');
      setTimeLeft(30);
      setHasSelected(false);
      setOpponentSelected(false);
      clearInterval(timer);
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
    <div className="battle-container">
      <div className="battle-field">
        {/* Pokémon adverse */}
        <div className="pokemon-opponent">
          <div className="health-bar-container opponent">
            <div>{opponent.pokemon.name}</div>
            <div className="health-bar">
              <div
                className={`health-fill ${getHealthColor(opponentHpPercent)} ${shaking.opponent ? 'blink' : ''}`}
                style={{ width: `${opponentHpPercent}%` }}
              ></div>
            </div>
            <div className="health-text">{`${opponent.pokemon.currentHp}/${opponent.pokemon.hp}`}</div>
          </div>
          <img
            src={getPokemonSprite(opponent.pokemon.name, false)}
            alt={opponent.pokemon.name}
            className={`pokemon-sprite ${shaking.opponent ? 'shake' : ''}`}
          />
        </div>

        {/* Pokémon du joueur */}
        <div className="pokemon-player">
          <div className="health-bar-container">
            <div>{player.pokemon.name}</div>
            <div className="health-bar">
              <div
                className={`health-fill ${getHealthColor(playerHpPercent)} ${shaking.player ? 'blink' : ''}`}
                style={{ width: `${playerHpPercent}%` }}
              ></div>
            </div>
            <div className="health-text">{`${player.pokemon.currentHp}/${player.pokemon.hp}`}</div>
          </div>
          <img
            src={getPokemonSprite(player.pokemon.name, true)}
            alt={player.pokemon.name}
            className={`pokemon-sprite ${shaking.player ? 'shake' : ''}`}
          />
        </div>
      </div>

      {/* Messages des attaques */}
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className="message animate-message">{msg}</div>
        ))}
      </div>

      {/* Menu des attaques */}
      <div className="moves-container">
        {player.pokemon.moves.map((move, index) => (
          <button
            key={move.name}
            onClick={() => handleMove(index)}
            disabled={hasSelected}
            className={`move-button ${hasSelected ? '' : 'hover-pulse'}`}
          >
            {move.name}
          </button>
        ))}
      </div>

      {/* Statut du tour */}
      <div>
        <p>Time left: {timeLeft}s</p>
        <p>{hasSelected ? 'You have selected your move' : 'Choose your move'}</p>
        <p>{opponentSelected ? 'Opponent has selected their move' : 'Waiting for opponent to choose'}</p>
      </div>
    </div>
  );
}

export default Battle;