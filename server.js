
const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const { ExpressPeerServer } = require("peer");
const opinions = {
  debug: true,
};

app.set("view engine", "ejs");
app.use(express.static("public"));

app.use("/peerjs", ExpressPeerServer(server, opinions));

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

const participants = new Map();

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName, isHost) => {
    socket.join(roomId);
    participants.set(userId, { userName, roomId, isHost, isMuted: false });
    
    setTimeout(() => {
      socket.to(roomId).emit("user-connected", userId, userName, isHost);
      io.to(roomId).emit("update-participant-list", Array.from(participants.entries()));
    }, 1000);

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });

    socket.on("raise-hand", (isRaised) => {
      socket.to(roomId).emit("raise-hand", userId, isRaised);
    });

    socket.on("mute-all", () => {
      socket.to(roomId).emit("mute-all");
      for (let [id, participant] of participants) {
        if (!participant.isHost) {
          participant.isMuted = true;
        }
      }
      io.to(roomId).emit("update-participant-list", Array.from(participants.entries()));
    });

    socket.on("unmute-all", () => {
      socket.to(roomId).emit("unmute-all");
      for (let [id, participant] of participants) {
        if (!participant.isHost) {
          participant.isMuted = false;
        }
      }
      io.to(roomId).emit("update-participant-list", Array.from(participants.entries()));
    });

    socket.on("mute-participant", (participantId) => {
      if (participants.get(userId).isHost) {
        socket.to(roomId).emit("mute-participant", participantId);
        participants.get(participantId).isMuted = true;
        io.to(roomId).emit("update-participant-list", Array.from(participants.entries()));
      }
    });

    socket.on("unmute-participant", (participantId) => {
      if (participants.get(userId).isHost) {
        socket.to(roomId).emit("unmute-participant", participantId);
        participants.get(participantId).isMuted = false;
        io.to(roomId).emit("update-participant-list", Array.from(participants.entries()));
      }
    });

    socket.on("disconnect", () => {
      participants.delete(userId);
      socket.to(roomId).emit("user-disconnected", userId);
      io.to(roomId).emit("update-participant-list", Array.from(participants.entries()));
    });
  });
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});