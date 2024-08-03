const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const rayIntersectsBox = require('./utils/rayIntersectsBox');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173"
    }
});

const players = {};
const randomPositions = [
    { x: -13, y: 20, z: 20 },
    { x: -8, y: 20, z: 10 },
    { x: -2, y: 20, z: 5 },
    { x: -20, y: 20, z: 30 },
    { x: 10, y: 20, z: -10 },
    { x: 15, y: 20, z: 25 },
    { x: 5, y: 20, z: 15 },
    { x: -10, y: 20, z: -20 },
];

const getRandomPosition = () => randomPositions[Math.floor(Math.random() * randomPositions.length)];

const respawnPlayer = (playerId) => {
    const newPosition = getRandomPosition();
    players[playerId].position = newPosition;
    players[playerId].health = 100;
    players[playerId].deaths += 1;
    players[playerId].damagedBy = []; // Reset the damagedBy array on respawn

    io.emit('playerRespawned', {
        id: playerId,
        position: newPosition,
        health: 100,
        deaths: players[playerId].deaths,
        kills: players[playerId].kills,
    });
};

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    // Assign a random initial position to the new player
    const initialPosition = getRandomPosition();
    players[socket.id] = {
        position: initialPosition,
        rotation: { x: 0, y: 0, z: 0 },
        health: 100,
        deaths: 0,
        kills: 0,
        damagedBy: [], // Keep track of bullets that have already damaged this player
    };

    // Send the current players to the new player
    socket.emit('currentPlayers', players);

    // Broadcast a new player to all other players
    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        position: players[socket.id].position,
        rotation: players[socket.id].rotation,
        health: players[socket.id].health,
        deaths: players[socket.id].deaths,
        kills: players[socket.id].kills,
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].position = data.position;
            players[socket.id].rotation = data.rotation;

            // Broadcast the player's movement to other players
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                position: data.position,
                rotation: data.rotation,
            });
        }
    });

    socket.on('shoot', (data) => {
        const shooter = players[socket.id];

        if (shooter) {
            for (let playerId in players) {
                if (playerId !== socket.id) {
                    const target = players[playerId];

                    // Define a bounding box around the player for hit detection
                    const playerSize = 0.5; // Adjust as needed
                    const boxMin = {
                        x: target.position.x - playerSize,
                        y: target.position.y - playerSize,
                        z: target.position.z - playerSize
                    };
                    const boxMax = {
                        x: target.position.x + playerSize,
                        y: target.position.y + playerSize,
                        z: target.position.z + playerSize
                    };

                    const rayOrigin = data.position;
                    const rayDirection = data.direction;

                    if (rayIntersectsBox(rayOrigin, rayDirection, boxMin, boxMax)) {
                        if (!target.damagedBy.includes(data.bulletId) && target.damagedBy?.length < 10) {
                            target.damagedBy.push(data.bulletId);
                            target.health -= 10;

                            io.to(playerId).emit('hit', { health: target.health });

                            if (target.health <= 0) {
                                shooter.kills += 1;
                                io.emit('playerDead', { id: playerId, shooter: socket.id });
                                io.emit('playerKilled', { id: socket.id, kills: shooter.kills });
                            }
                        }
                    }
                }
            }
        }
    });

    socket.on('respawn', (playerId) => {
        respawnPlayer(playerId);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
        // Remove the player from the players object
        delete players[socket.id];
        // Broadcast the player disconnect to other players
        io.emit('playerDisconnected', socket.id);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
