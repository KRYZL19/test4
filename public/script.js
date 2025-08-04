document.addEventListener('DOMContentLoaded', () => {
    const bingoBoard1 = document.getElementById('bingo-board-1');
    const bingoBoard2 = document.getElementById('bingo-board-2');
    const currentDrawnNumberSpan = document.getElementById('current-drawn-number');
    const drawnNumbersListSpan = document.getElementById('drawn-numbers-list');
    const resetButton = document.getElementById('reset-button');
    const winnerDisplay = document.getElementById('winner-display');

    let drawnNumbers = new Set();
    let drawnNumbersArray = [];
    let intervalId;
    let winner = null;

    const winConditions = [
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
    ];

    function generateBingoCard(boardElement) {
        const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
        shuffleArray(allNumbers);
        const cardNumbers = allNumbers.slice(0, 25);
        
        boardElement.innerHTML = '';
        cardNumbers.forEach(number => {
            const cell = document.createElement('div');
            cell.classList.add('bingo-cell');
            cell.textContent = number;
            cell.dataset.number = number;
            cell.addEventListener('click', markNumber);
            boardElement.appendChild(cell);
        });
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function markNumber(event) {
        if (winner) return;
        const cell = event.target;
        const number = parseInt(cell.dataset.number);

        if (drawnNumbers.has(number)) {
            cell.classList.add('marked');
            checkForWin(cell.parentNode.id);
        } else {
            alert('Diese Zahl wurde noch nicht gezogen!');
        }
    }

    function checkForWin(boardId) {
        if (winner) return;
        
        const board = document.getElementById(boardId);
        const cells = Array.from(board.children);
        const boardState = cells.map(cell => cell.classList.contains('marked'));

        for (const condition of winConditions) {
            if (condition.every(index => boardState[index])) {
                winner = boardId === 'bingo-board-1' ? 'Spieler 1' : 'Spieler 2';
                clearInterval(intervalId);
                winnerDisplay.textContent = `${winner} hat gewonnen!`;
                
                // Fügt eine Klasse zum Gewinner-Brett hinzu, um Hover-Effekt zu deaktivieren
                board.classList.add('win-active');

                // Deaktiviert die Klicks nach dem Gewinn
                cells.forEach(cell => cell.removeEventListener('click', markNumber));
                
                alert(`BINGO! ${winner} hat gewonnen!`);
                return;
            }
        }
    }

    function startGame() {
        winner = null;
        drawnNumbers.clear();
        drawnNumbersArray = [];
        currentDrawnNumberSpan.textContent = '?';
        drawnNumbersListSpan.textContent = '';
        winnerDisplay.textContent = '';
        
        // Entfernt die 'win-active' Klasse, um Hover-Effekt wieder zu aktivieren
        bingoBoard1.classList.remove('win-active');
        bingoBoard2.classList.remove('win-active');

        generateBingoCard(bingoBoard1);
        generateBingoCard(bingoBoard2);
        
        startDrawingNumbers();
    }

    function startDrawingNumbers() {
        const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
        shuffleArray(allNumbers);
        let drawIndex = 0;

        intervalId = setInterval(() => {
            if (drawIndex < allNumbers.length && !winner) {
                const number = allNumbers[drawIndex];
                currentDrawnNumberSpan.textContent = number;
                drawnNumbers.add(number);
                drawnNumbersArray.push(number);
                drawnNumbersListSpan.textContent = drawnNumbersArray.join(', ');
                drawIndex++;
            } else if (!winner) {
                clearInterval(intervalId);
                winnerDisplay.textContent = 'Alle Zahlen wurden gezogen! Kein Gewinner dieses Mal.';
            }
        }, 5000); // 5 Sekunden
    }

    resetButton.addEventListener('click', startGame);

    // Initiales Spiel starten
    startGame();
});