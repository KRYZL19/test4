// client.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const lobbySection = document.getElementById('lobby');
    const gameSection = document.getElementById('game');
    const roomIdInput = document.getElementById('roomIdInput');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const errorMessage = document.getElementById('error-message');
    const playerStatus = document.getElementById('player-status');
    
    const bingoBoard = document.getElementById('bingo-board');
    const currentDrawnNumberSpan = document.getElementById('current-drawn-number');
    const drawnNumbersListSpan = document.getElementById('drawn-numbers-list');
    const winnerDisplay = document.getElementById('winner-display');

    let currentRoomId = null;

    // --- Lobby-Logik ---
    createRoomBtn.addEventListener('click', () => {
        const roomId = roomIdInput.value.trim();
        if (roomId) {
            socket.emit('createRoom', roomId);
        }
    });

    joinRoomBtn.addEventListener('click', () => {
        const roomId = roomIdInput.value.trim();
        if (roomId) {
            socket.emit('joinRoom', roomId);
        }
    });
    
    // --- Server-Events ---
    socket.on('roomCreated', (roomId) => {
        currentRoomId = roomId;
        lobbySection.classList.add('hidden');
        gameSection.classList.remove('hidden');
        playerStatus.textContent = `Du bist Spieler 1 in Raum ${roomId}. Warte auf Spieler 2...`;
    });

    socket.on('playerJoined', (message) => {
        playerStatus.textContent = `${message}. Spiel startet...`;
    });

    socket.on('gameInfo', (data) => {
        currentRoomId = roomIdInput.value.trim();
        lobbySection.classList.add('hidden');
        gameSection.classList.remove('hidden');
        playerStatus.textContent = `Du bist Spieler ${data.playerIndex} in Raum ${currentRoomId}.`;
        renderBingoCard(data.card);
    });

    socket.on('roomError', (message) => {
        errorMessage.textContent = message;
    });

    socket.on('gameStarted', () => {
        console.log('Spiel gestartet!');
    });

    socket.on('numberDrawn', (data) => {
        currentDrawnNumberSpan.textContent = data.number;
        drawnNumbersListSpan.textContent = data.drawnNumbers.join(', ');
    });

    socket.on('cardUpdated', (data) => {
        renderBingoCard(data.card);
    });

    socket.on('gameOver', (data) => {
        winnerDisplay.textContent = `${data.winnerName} hat gewonnen!`;
        alert(`BINGO! ${data.winnerName} hat gewonnen!`);
        // Deaktiviert das Klicken nach dem Spielende
        const cells = Array.from(bingoBoard.children);
        cells.forEach(cell => cell.removeEventListener('click', markNumber));
    });

    socket.on('roomClosed', (message) => {
        alert(message);
        window.location.reload(); // Seite neu laden, um zur Lobby zurückzukehren
    });

    // --- Spielbrett-Logik ---
    function renderBingoCard(card) {
        bingoBoard.innerHTML = '';
        card.forEach(number => {
            const cell = document.createElement('div');
            cell.classList.add('bingo-cell');
            
            let displayValue = number;
            let isMarked = false;
            if (typeof number === 'string' && number.startsWith('marked_')) {
                displayValue = number.split('_')[1];
                cell.classList.add('marked');
                isMarked = true;
            }

            cell.textContent = displayValue;
            cell.dataset.number = displayValue;
            
            if (!isMarked) {
                cell.addEventListener('click', markNumber);
            }
            bingoBoard.appendChild(cell);
        });
    }

    function markNumber(event) {
        const cell = event.target;
        const number = parseInt(cell.dataset.number);

        if (currentRoomId) {
            socket.emit('markNumber', { roomId: currentRoomId, number: number });
        }
    }
});