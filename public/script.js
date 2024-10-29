const socket = io();
let localStream;
let peerConnection;
let roomId;

// Elementos HTML
const startScreen = document.getElementById('start-screen');
const videoChat = document.getElementById('video-chat');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Función para iniciar el stream local
async function startLocalStream() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
}

// Función para crear una sala
async function createRoom() {
    const response = await fetch('/create-room');
    const data = await response.json();
    roomId = data.roomId;

    // Cambiar la URL sin recargar la página
    history.pushState(null, '', `/room/${roomId}`);
    
    // Iniciar el video local y conectar a la sala
    await startLocalStream();
    joinRoom();
}

// Función para unirse a una sala existente
async function joinRoom() {
    socket.emit('joinRoom', roomId);

    // Configurar el video local y remoto con WebRTC
    setupPeerConnection();
    startScreen.style.display = 'none';
    videoChat.style.display = 'block';
}

// Configuración de WebRTC
function setupPeerConnection() {
    peerConnection = new RTCPeerConnection();

    // Añadir la pista de video local
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Generar una oferta
    peerConnection.createOffer().then((offer) => {
        peerConnection.setLocalDescription(offer);
        socket.emit('offer', roomId, offer);
    });

    // Escuchar por respuestas y candidatos
    socket.on('answer', (answer) => {
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', (candidate) => {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // Enviar candidatos de ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', roomId, event.candidate);
        }
    };
}

// Eventos para los botones
document.getElementById('createRoomButton').onclick = async () => {
    await startLocalStream(); // Iniciar el stream local antes de crear sala
    createRoom();
};

document.getElementById('joinRoomButton').onclick = async () => {
    roomId = prompt('Introduce el ID de la sala:');
    await startLocalStream(); // Iniciar el stream local antes de unirse
    joinRoom();
};

// Escuchar ofertas de otros usuarios
socket.on('offer', async (offer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    peerConnection.setLocalDescription(answer);
    socket.emit('answer', roomId, answer);
});

// Escuchar el evento popstate para manejar la navegación hacia atrás
window.onpopstate = (event) => {
    console.log("Back button pressed");
    // Aquí puedes manejar el estado de la aplicación si es necesario
};
