
const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
myVideo.muted = true;

backBtn.addEventListener("click", () => {
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".main__left").style.flex = "1";
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
});

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});

const user = prompt("Enter your name");
const isHost = confirm("Are you the host?");

var peer = new Peer({
  host: '127.0.0.1',
  port: 3030,
  path: '/peerjs',
  config: {
    'iceServers': [
      { url: 'stun:stun01.sipphone.com' },
      { url: 'stun:stun.ekiga.net' },
      { url: 'stun:stunserver.org' },
      { url: 'stun:stun.softjoys.com' },
      { url: 'stun:stun.voiparound.com' },
      { url: 'stun:stun.voipbuster.com' },
      { url: 'stun:stun.voipstunt.com' },
      { url: 'stun:stun.voxgratia.org' },
      { url: 'stun:stun.xten.com' },
      {
        url: 'turn:192.158.29.39:3478?transport=udp',
        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        username: '28224511:1379330808'
      },
      {
        url: 'turn:192.158.29.39:3478?transport=tcp',
        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        username: '28224511:1379330808'
      }
    ]
  },
  debug: 3
});

let myVideoStream;
let participants = new Map();
let handRaised = false;

navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, peer.id, user, isHost);

    peer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, call.peer);
      });
    });

    socket.on("user-connected", (userId, userName, userIsHost) => {
      connectToNewUser(userId, stream, userName, userIsHost);
    });
  });

const connectToNewUser = (userId, stream, userName, userIsHost) => {
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId, userName, userIsHost);
  });
};

peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id, user, isHost);
});

const addVideoStream = (video, stream, userId, userName, userIsHost) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    if (userIsHost || isHost) {
      const videoWrapper = document.createElement("div");
      videoWrapper.className = "video-wrapper";
      videoWrapper.appendChild(video);
      
      const nameTag = document.createElement("div");
      nameTag.className = "name-tag";
      nameTag.textContent = userName || "Anonymous";
      videoWrapper.appendChild(nameTag);
      
      const handRaiseIcon = document.createElement("div");
      handRaiseIcon.className = "hand-raise-icon";
      handRaiseIcon.innerHTML = "✋";
      handRaiseIcon.style.display = "none";
      videoWrapper.appendChild(handRaiseIcon);
      
      videoGrid.append(videoWrapper);
    }
    participants.set(userId, { video: video, name: userName, handRaised: false, isHost: userIsHost });
    updateParticipantList();
  });
};

const updateParticipantList = () => {
  const participantList = document.getElementById("participant-list");
  participantList.innerHTML = "";
  participants.forEach((participant, userId) => {
    const li = document.createElement("li");
    li.textContent = `${participant.name} ${participant.isHost ? "(Host)" : ""}`;
    if (isHost && !participant.isHost) {
      const muteButton = document.createElement("button");
      muteButton.textContent = participant.isMuted ? "Unmute" : "Mute";
      muteButton.onclick = () => {
        if (participant.isMuted) {
          socket.emit("unmute-participant", userId);
        } else {
          socket.emit("mute-participant", userId);
        }
      };
      li.appendChild(muteButton);
    }
    participantList.appendChild(li);
  });
  document.getElementById("participant-count").textContent = participants.size;
};

socket.on("update-participant-list", (participantArray) => {
  participants = new Map(participantArray);
  updateParticipantList();
});

let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");

send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");
const raiseHandButton = document.querySelector("#raiseHandButton");
const muteAllButton = document.querySelector("#muteAllButton");
const unmuteAllButton = document.querySelector("#unmuteAllButton");

muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = `<i class="fas fa-microphone-slash"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<i class="fas fa-microphone"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
});

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = `<i class="fas fa-video-slash"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = `<i class="fas fa-video"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});

raiseHandButton.addEventListener("click", () => {
  handRaised = !handRaised;
  socket.emit("raise-hand", handRaised);
  raiseHandButton.classList.toggle("background__blue");
  const handIcon = raiseHandButton.querySelector("i");
  handIcon.classList.toggle("fa-hand-paper");
  handIcon.classList.toggle("fa-hand-rock");
});

if (isHost) {
  muteAllButton.style.display = "block";
  unmuteAllButton.style.display = "block";

  muteAllButton.addEventListener("click", () => {
    socket.emit("mute-all");
  });

  unmuteAllButton.addEventListener("click", () => {
    socket.emit("unmute-all");
  });
} else {
  muteAllButton.style.display = "none";
  unmuteAllButton.style.display = "none";
}

inviteButton.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
});

socket.on("createMessage", (message, userName) => {
  messages.innerHTML +=
    `<div class="message">
        <b><i class="far fa-user-circle"></i> <span> ${userName === user ? "me" : userName}</span> </b>
        <span>${message}</span>
    </div>`;
});

socket.on("user-disconnected", (userId) => {
  if (participants.has(userId)) {
    const videoWrapper = participants.get(userId).video.parentElement;
    if (videoWrapper) videoWrapper.remove();
    participants.delete(userId);
    updateParticipantList();
  }
});

socket.on("raise-hand", (userId, isRaised) => {
  if (participants.has(userId)) {
    const videoWrapper = participants.get(userId).video.parentElement;
    if (videoWrapper) {
      const handRaiseIcon = videoWrapper.querySelector(".hand-raise-icon");
      handRaiseIcon.style.display = isRaised ? "block" : "none";
    }
    participants.get(userId).handRaised = isRaised;
    updateParticipantList();
  }
});

socket.on("mute-all", () => {
  if (!isHost && myVideoStream.getAudioTracks()[0].enabled) {
    muteButton.click();
  }
});

socket.on("unmute-all", () => {
  if (!isHost && !myVideoStream.getAudioTracks()[0].enabled) {
    muteButton.click();
  }
});

socket.on("mute-participant", (participantId) => {
  if (participantId === peer.id && myVideoStream.getAudioTracks()[0].enabled) {
    muteButton.click();
  }
});

socket.on("unmute-participant", (participantId) => {
  if (participantId === peer.id && !myVideoStream.getAudioTracks()[0].enabled) {
    muteButton.click();
  }
});