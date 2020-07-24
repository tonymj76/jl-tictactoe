const express = require("express"),
            database = require("./config/database")(),
            User = require("./models/user"),
            http = require("http"),
             socketIo = require("socket.io"),
             fs = require("fs"),
             getUsername = require("./middleware/getUsername"),
             ejs = require("ejs");


const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const clients = {};

// Serve static resources
app.use(express.static("public"));
app.use(express.static("node_modules"));

app.get("/",(req, res) => {
    res.sendFile("home.html", { root: __dirname })
});

app.get("/game", getUsername, async (req, res) => {
    // const stream = fs.createReadStream(__dirname + "/index.html");
    // stream.pipe(res);
    const username = req.data.player;
    const user = await User.findOne({ username });
    if(!user){
        const newUser = new User({
            username: username
        });
        User.create(newUser).catch(err =>{
            return res.redirect("back");
        }).then(success =>{
            return res.render("index.ejs", {
                data: success
            });
        });
    }else{
        return res.render("index.ejs", { data: user });
    }
});

app.get("/view", (req, res) => {
    const stream = fs.createReadStream(__dirname + "/view.html");
    stream.pipe(res);
});

var players = {}; // opponent: scoket.id of the opponent, symbol = "X" | "O", socket: player's socket
var unmatched;
var viewers = [];
var leaderBoard = [];


// When a client connects
io.of("/game").on("connection", function (socket) {
    let id = socket.id;

    clients[socket.id] = socket;

    socket.on("disconnect", () => { // Bind event for that socket (player)
        delete clients[socket.id];
        socket.broadcast.emit("clientdisconnect", id);
    });

    if(socket.handshake.headers.referer === "http://localhost:5000/view") {
        viewers.push(socket)
        socket.emit("new user", "New user Joined!!")
    } else {

        join(socket); // Fill 'players' data structure

        if (opponentOf(socket)) { // If the current player has an opponent the game can begin
            socket.emit("game.begin", { // Send the game.begin event to the player
                symbol: players[socket.id].symbol,
                username1: players[socket.id].username,
                username2: players[opponentOf(socket).id].username
            });

            opponentOf(socket).emit("game.begin", { // Send the game.begin event to the opponent
                symbol: players[opponentOf(socket).id].symbol,
                username2: players[opponentOf(socket).id].username,
                // username: players[opponentOf(socket).id].username
            });
        }


        // Event for when any player makes a move
        socket.on("make.move", function (data) {
            if (!opponentOf(socket)) {
                // This shouldn't be possible since if a player doens't have an opponent the game board is disabled
                return;
            }

            // Validation of the moves can be done here

            socket.emit("move.made", data); // Emit for the player who made the move
            opponentOf(socket).emit("move.made", data); // Emit for the opponent
            viewers.forEach(socket => {
                socket.emit("move.made", data);
            });
        });

        //handle win and losses update
        socket.on("updateWin", (data)=>{
            User.findOneAndUpdate({ username: data.username }, { wins:Number( data.wins) },{ useFindAndModify:true });
            io.of("/game").emit("updateWin", data);
        });
        //update user's loss in db
        socket.on("updateLoss", (data)=>{
            User.findOneAndUpdate({ username: data.username },{ losses: Number(data.losses) },{ useFindAndModify:true });
             io.of("/game").emit("updateLoss", data);
        });

        //get all users and calculate leaderboard
        socket.on("getLeaderBoard", async(data)=>{
            leaderBoard = [];
            const allUsers = await User.find({});
            allUsers.forEach((user)=>{
                leaderBoard.push({username: user.username, wins: user.wins  });
            });
            io.of("/game").emit("getLeaderBoard", leaderBoard);
        });

        //enable spctators to send reactions
        var spectators = io.of("/view")

        //event to send happy reaction
        socket.on("happy", (data)=>{
            io.of("/game").emit("happy", data);
        });
        socket.on("love", (data)=>{
            io.of("/game").emit("love", data);
        });
        socket.on("eyes", (data)=>{
            io.of("/game").emit("eyes", data);
        });

        //event to send message
        socket.on("message", (msg)=>{
            socket.emit("message", msg);
        });

        // Event to inform player that the opponent left
        socket.on("disconnect", function () {
            if (opponentOf(socket)) {
                opponentOf(socket).emit("opponent.left");
            }
        });
    }
});

io.of("/view").on("connection", (spectator)=>{
    //event to send happy reaction
    spectator.on("happy", (data) => {
        io.of("/game").emit("happy", data);
    });
    spectator.on("love", (data) => {
        io.of("/game").emit("love", data);
    });
    spectator.on("eyes", (data) => {
        io.of("/game").emit("eyes", data);
    });

    //event to send message
    spectator.on("message", (msg) => {
        io.of("/game").emit("message", msg);
    });
});


function join(socket) {
    players[socket.id] = {
        opponent: unmatched,
        symbol: "X",
        socket: socket,
        username: socket.id
    };

    // If 'unmatched' is defined it contains the socket.id of the player who was waiting for an opponent
    // then, the current socket is player #2
    if (unmatched) {
        players[socket.id].symbol = "O";
        players[unmatched].opponent = socket.id;
        unmatched = null;
        // username[socket.id].username = socket.id;
    } else { //If 'unmatched' is not define it means the player (current socket) is waiting for an opponent (player #1)
        unmatched = socket.id;
    }
}

function opponentOf(socket) {
    if (!players[socket.id].opponent) {
        return;
    }
    return players[players[socket.id].opponent].socket;
}

//listen on server
server.listen(process.env.PORT || 5000,  ()=>{
    console.log("Server running on PORT:5000")
});