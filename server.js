const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const rayIntersectsBox = require('./utils/rayIntersectsBox');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const rooms = {}; // To store players by room
// const randomPositions = [
//     { x: -13, y: 20, z: 20 },
//     { x: -8, y: 20, z: 10 },
//     { x: -2, y: 20, z: 5 },
//     { x: -20, y: 20, z: 30 },
//     { x: 10, y: 20, z: -10 },
//     { x: 15, y: 20, z: 25 },
//     { x: 5, y: 20, z: 15 },
//     { x: -10, y: 20, z: -20 },
// ];


const randomPositions = [
    {
        x: -45.62518310546875,
        y: -8.443558692932129,
        z: 21.901233673095703
    },
    {
        x: -27.604557037353516,
        y: -7.8375468254089355,
        z: 6.595322132110596
    },
    {
        x: 1.2871710062026978,
        y: -5.710155487060547,
        z: -15.965947151184082
    },
    {
        x: 23.793689727783203,
        y: -1.4231683015823364,
        z: -23.991069793701172
    },
    { x: -6.467380046844482, y: 3.295560121536255, z: -22.08796501159668 },
    { x: 5.820116996765137, y: -10.840858459472656, z: -3.90596866607666 }
]
const getRandomPosition = () => randomPositions[Math.floor(Math.random() * randomPositions.length)];

const updateAllPlayersForLeaderboard = (roomId) => {
    io.to(roomId).emit('leaderboardAllPlayers', rooms[roomId].players);
}

const respawnPlayer = (roomId, playerId) => {
    const newPosition = getRandomPosition();
    rooms[roomId].players[playerId].position = newPosition;
    rooms[roomId].players[playerId].health = 100;
    rooms[roomId].players[playerId].deaths += 1;
    rooms[roomId].players[playerId].damagedBy = [];

    io.to(roomId).emit('playerRespawned', {
        id: playerId,
        playerName: rooms[roomId].players[playerId].playerName,
        position: newPosition,
        rotation: { x: 0, y: 0, z: 0 },
        health: 100,
        deaths: rooms[roomId].players[playerId].deaths,
        kills: rooms[roomId].players[playerId].kills,
        damagedBy: [],
    });
};

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    // Join or create a room
    socket.on('joinRoom', ({ roomId, playerName, isCreate, duration, playersLimit }) => {

        if (!isCreate && !rooms[roomId]) {
            io.to(socket.id).emit('notification', { message: "Room not exist!" });
            return
        }

        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: {},
                playersLimit,
                duration: duration * 60
            };
        }

        if (!isCreate && (Number(rooms[roomId].playersLimit) <= Object.keys(rooms[roomId].players)?.length)) {
            io.to(socket.id).emit('notification', { message: "Room is full!" });
            return
        }

        socket.join(roomId);

        // Start the game timer if it's not already running
        if (!rooms[roomId].timer) {
            rooms[roomId].timer = setInterval(() => {
                rooms[roomId].duration -= 1;

                // Broadcast remaining time to all players in the room
                io.to(roomId).emit('timerUpdate', rooms[roomId].duration);

                if (rooms[roomId].duration <= 0) {
                    clearInterval(rooms[roomId].timer);
                    io.to(roomId).emit('gameOver');
                    // Handle end of game, e.g., determine winner, reset room, etc.
                }
            }, 1000);
        }




        io.to(socket.id).emit('joinedRoom', { message: "Joined Room Successful!" });
        const initialPosition = getRandomPosition();
        rooms[roomId].players[socket.id] = {
            id: socket.id,
            playerName: playerName,
            position: initialPosition,
            rotation: { x: 0, y: 0, z: 0 },
            health: 100,
            deaths: 0,
            kills: 0,
            damagedBy: [],
        };

        // Send the current players in the room to the new player
        socket.emit('currentPlayers', rooms[roomId].players);

        // Broadcast a new player to all other players in the room
        socket.to(roomId).emit('newPlayer', {
            id: socket.id,
            playerName: playerName,
            position: initialPosition,
            rotation: { x: 0, y: 0, z: 0 },
            health: 100,
            deaths: 0,
            kills: 0,
            damagedBy: [],
        });
        updateAllPlayersForLeaderboard(roomId)
        socket.on('move', (data) => {
            if (rooms[roomId]?.players[socket.id]) {
                rooms[roomId].players[socket.id].position = data.position;
                rooms[roomId].players[socket.id].rotation = data.rotation;

                // Broadcast the player's movement to other players in the room
                socket.to(roomId).emit('playerMoved', {
                    id: socket.id,
                    position: data.position,
                    rotation: data.rotation,
                });
            }
        });

        socket.on('shoot', (data) => {
            const shooter = rooms[roomId]?.players[socket.id];

            if (shooter) {
                for (let playerId in rooms[roomId].players) {
                    if (playerId !== socket.id) {
                        const target = rooms[roomId].players[playerId];

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
                                    io.to(roomId).emit('playerDead', { id: playerId, shooter: socket.id, playerName: rooms[roomId].players[playerId].playerName, shooterName: rooms[roomId].players[socket.id].playerName });
                                    io.to(roomId).emit('playerKilled', { id: socket.id, kills: shooter.kills });
                                    updateAllPlayersForLeaderboard(roomId)
                                }
                            }
                        }
                    }
                }
            }
        });

        socket.on('respawn', () => {
            respawnPlayer(roomId, socket.id);
            updateAllPlayersForLeaderboard(roomId)
        });

        socket.on('disconnect', () => {
            console.log('user disconnected', socket.id);

            // Remove the player from the room
            delete rooms[roomId].players[socket.id];
            updateAllPlayersForLeaderboard(roomId)
            // Broadcast the player disconnect to other players in the room
            io.to(roomId).emit('playerDisconnected', socket.id);

            // If no players left in the room, remove the room
            if (Object.keys(rooms[roomId].players).length === 0) {
                clearInterval(rooms[roomId].timer);
                delete rooms[roomId];
            }
        });
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
