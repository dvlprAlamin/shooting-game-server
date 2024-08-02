// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//     cors: {
//         origin: "http://localhost:5173"
//     }
// });
// -0.005, 0.005, 0
const generateRandomPosition = () => {
    return [Math.random() * 20 - 25, 20, Math.random() * 10 + 10]
    // return [Math.random() - 0.5, 0.005, Math.random() - 0.5]
    // return [Math.random() * 20 - 10, Math.random() * 10 + 10, Math.random() * 20 - 10]
};

// const players = {}

// io.on('connection', (socket) => {
//     console.log(socket.id, 'user connected');
//     const position = generateRandomPosition()
//     players[socket.id] = {
//         id: socket.id,
//         position: position,
//     }

//     socket.emit("initialize", {
//         players,
//         id: socket.id,
//         position: position
//     });

//     io.emit("players", players);


//     socket.on("move", (newPosition) => {
//         // const player = players.find(
//         //     (player) => player.id === socket.id
//         // ); 
//         if (players[socket.id]) {
//             players[socket.id].position = newPosition;

//             io.emit("playerMove", players);
//         }
//         // console.log("newPosition", newPosition);
//         // player.position = newPosition;
//     });

//     socket.on("disconnect", () => {
//         console.log(socket.id, "user disconnected");
//         delete players[socket.id];
//         // players.splice(
//         //     players.findIndex((player) => player.id === socket.id),
//         //     1
//         // );
//         io.emit("players", players);
//     });
// });

// const players = {};
// const randomPositions = [
//     { x: -13, y: 4, z: 20 },
//     { x: -8, y: 4, z: 10 },
//     { x: -2, y: 4, z: 5 },
//     { x: -20, y: 4, z: 30 },
// ]
// io.on('connection', (socket) => {
//     console.log('New client connected', socket.id);

//     // Add new player
//     players[socket.id] = {
//         position: randomPositions[Math.floor(Math.random() * 4)],
//         rotation: { x: 0, y: 0, z: 0 },
//     };

//     // Send existing players to the new player
//     socket.emit('existingPlayers', players);

//     // Broadcast new player to existing players
//     socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

//     socket.on('move', (data) => {
//         players[socket.id] = { ...players[socket.id], ...data };
//         socket.broadcast.emit('move', { id: socket.id, ...data });
//         console.log("players", Object.keys(players).length);

//     });

//     socket.on('disconnect', () => {
//         delete players[socket.id];
//         socket.broadcast.emit('playerDisconnected', socket.id);
//     });
// });

// server.listen(4000, () => console.log('Server listening on port 4000'));


const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173"
    }
});

const rayIntersectsBox = (rayOrigin, rayDirection, boxMin, boxMax) => {
    let tmin = (boxMin.x - rayOrigin.x) / rayDirection.x;
    let tmax = (boxMax.x - rayOrigin.x) / rayDirection.x;

    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

    let tymin = (boxMin.y - rayOrigin.y) / rayDirection.y;
    let tymax = (boxMax.y - rayOrigin.y) / rayDirection.y;

    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

    if ((tmin > tymax) || (tymin > tmax)) return false;

    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (boxMin.z - rayOrigin.z) / rayDirection.z;
    let tzmax = (boxMax.z - rayOrigin.z) / rayDirection.z;

    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

    if ((tmin > tzmax) || (tzmin > tmax)) return false;

    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;

    return tmax > 0;
};


const players = {};
const randomPositions = [
    { x: -13, y: 4, z: 20 },
    { x: -8, y: 4, z: 10 },
    { x: -2, y: 4, z: 5 },
    { x: -20, y: 4, z: 30 },
]
io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    // Add the new player to the players object
    players[socket.id] = {
        position: randomPositions[Math.floor(Math.random() * 4)],
        rotation: { x: 0, y: 0, z: 0 },
        health: 100
    };

    // Send the current players to the new player
    socket.emit('currentPlayers', players);

    // Broadcast a new player to all other players
    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        position: players[socket.id].position,
        rotation: players[socket.id].rotation,
        health: players[socket.id].health
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].position = data.position;
            players[socket.id].rotation = data.rotation;
            // players[socket.id].health = data.health;
            // Broadcast the player's movement to other players
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                position: data.position,
                rotation: data.rotation,
                health: data.health
            });

        }
    });
    socket.on('shoot', (data) => {
        console.log('Player shot:', socket.id);
        console.log('Shooting data:', data); // Debugging statement
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
                        target.health -= 10; // Reduce health by 10 (adjust as needed)
                        io.to(playerId).emit('hit', { health: target.health });

                        if (target.health <= 0) {
                            console.log(`Player ${playerId} is dead`);
                            io.emit('playerDead', { id: playerId });
                        }
                    }
                }
            }
        }
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
