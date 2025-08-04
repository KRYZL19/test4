// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

let rooms = {}; // Ein Objekt, um die Spielräume zu speichern

// Helper-Funktion zum Mischen eines Arrays
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Helper-Funktion zum Generieren einer Bingokarte
function generateBingoCard() {
    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    shuffleArray(allNumbers);
    return allNumbers.slice(0, 25);
}

const winConditions = [
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
    [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
];

// Die statischen Dateien (HTML, CSS, JS) bereitstellen
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Ein Benutzer hat sich verbunden: ${socket.id}`);

    // Spieler 1 erstellt einen Raum
    socket.on('createRoom', (roomId) => {
        if (rooms[roomId]) {
            socket.emit('roomError', 'Raum existiert bereits');
            return;
        }

        rooms[roomId] = {
            players: [socket.id],
            cards: { [socket.id]: generateBingoCard() },
            drawnNumbers: new Set(),
            drawnNumbersArray: [],
            interval: null,
            winner: null
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
        socket.emit('gameInfo', { playerIndex: 1, card: rooms[roomId].cards[socket.id] });
        console.log(`Raum ${roomId} wurde von Spieler 1 erstellt`);
    });

    // Spieler 2 tritt einem Raum bei
    socket.on('joinRoom', (roomId) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('roomError', 'Raum existiert nicht');
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('roomError', 'Raum ist voll');
            return;
        }

        room.players.push(socket.id);
        room.cards[socket.id] = generateBingoCard();
        socket.join(roomId);
        socket.emit('gameInfo', { playerIndex: 2, card: room.cards[socket.id] });
        io.to(roomId).emit('playerJoined', `Spieler 2 ist beigetreten!`);
        console.log(`Spieler 2 ist Raum ${roomId} beigetreten`);

        // Startet das Spiel, wenn 2 Spieler im Raum sind
        startGame(roomId);
    });

    function startGame(roomId) {
        const room = rooms[roomId];
        if (room.players.length < 2) return;

        io.to(roomId).emit('gameStarted');
        const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
        shuffleArray(allNumbers);
        let drawIndex = 0;

        room.interval = setInterval(() => {
            if (room.winner) {
                clearInterval(room.interval);
                return;
            }
            if (drawIndex >= allNumbers.length) {
                clearInterval(room.interval);
                io.to(roomId).emit('gameFinished', { winner: null });
                return;
            }

            const number = allNumbers[drawIndex];
            room.drawnNumbers.add(number);
            room.drawnNumbersArray.push(number);

            io.to(roomId).emit('numberDrawn', { number: number, drawnNumbers: room.drawnNumbersArray });
            drawIndex++;
        }, 5000);
    }

    // Spieler markiert eine Zahl
    socket.on('markNumber', (data) => {
        const { roomId, number } = data;
        const room = rooms[roomId];
        if (!room || room.winner) return;

        if (room.drawnNumbers.has(number)) {
            // Finde die Karte des Spielers und markiere die Zahl
            const card = room.cards[socket.id];
            const numberIndex = card.indexOf(number);
            if (numberIndex !== -1) {
                // Wir verwenden ein spezielles Wert, um zu zeigen, dass die Zahl markiert ist
                card[numberIndex] = `marked_${number}`;
                socket.emit('cardUpdated', { card: card });
            }

            // Prüfe auf Gewinnbedingungen
            checkWinCondition(roomId, socket.id);
        } else {
            socket.emit('invalidMark', 'Diese Zahl wurde noch nicht gezogen.');
        }
    });

    function checkWinCondition(roomId, playerId) {
        const room = rooms[roomId];
        const card = room.cards[playerId];

        const isMarked = (index) => typeof card[index] === 'string' && card[index].startsWith('marked_');

        for (const condition of winConditions) {
            if (condition.every(isMarked)) {
                room.winner = playerId;
                clearInterval(room.interval);
                io.to(roomId).emit('gameOver', { winnerId: playerId, winnerName: `Spieler ${room.players.indexOf(playerId) + 1}` });
                return;
            }
        }
    }

    // Beim Trennen der Verbindung
    socket.on('disconnect', () => {
        console.log(`Ein Benutzer hat die Verbindung getrennt: ${socket.id}`);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                clearInterval(room.interval);
                delete rooms[roomId];
                io.to(roomId).emit('roomClosed', 'Der andere Spieler hat das Spiel verlassen.');
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});