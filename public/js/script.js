var socket = io();

var videoChatForm = document.getElementById('video-chat-form'); 
var videoChatRooms = document.getElementById('video-chat-rooms');
var joinBtn = document.getElementById('join');
var roomInput = document.getElementById('roomName');
var userVideo = document.getElementById('user-video');
var peerVideo = document.getElementById('peer-video');


var divBtnGroup = document.getElementById('btn-group');
var muteButton = document.getElementById('muteButton');
var hideCameraBtn = document.getElementById('hideCamera');
var leaveButton = document.getElementById('leaveButton');

var muteFlag = false;
var hideCameraFlag = false;

var roomName;

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var creator = false;

var rtcPeerConnection;
var userStream;

var iceServers = {

    iceServers : [
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]

};

joinBtn.addEventListener("click", function() {
    if (roomInput.value == "") {
        alert('Please enter a room name');
    }
    else{
        roomName = roomInput.value;
        socket.emit("join", roomName);
    }
});

muteButton.addEventListener("click", function() {
    muteFlag = !muteFlag;
    if (muteFlag) {
        userStream.getTracks()[0].enabled = false;
        muteButton.textContent = 'Unmute';
    } 
    else {
        userStream.getTracks()[0].enabled = true;
        muteButton.textContent = 'Mute';
    }
});

hideCameraBtn.addEventListener("click", function() {
    hideCameraFlag = !hideCameraFlag;
    if (hideCameraFlag) {
        userStream.getTracks()[1].enabled = false;
        hideCameraBtn.textContent = 'Turn Camera ON';
    } 
    else {
        userStream.getTracks()[1].enabled = true;
        hideCameraBtn.textContent = 'Turn Camera OFF';
    }
});

socket.on("created", function(){
    creator = true;
    navigator.getUserMedia(
        {
            audio:true,
            video:true
        },
        function(stream) {
            userStream = stream;
            videoChatForm.style = "display:none";
            divBtnGroup.style = "display:flex";
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function(e) {
                userVideo.play();           
            }
        },
        function(error) {
            alert('You cannot access media');
        }
    );

});
socket.on("joined", function(){

    creator = false;

    navigator.getUserMedia(
        {
            audio:true,
            video:true
        },
        function(stream) {
            userStream = stream;
            videoChatForm.style = "display:none";
            divBtnGroup.style = "display:flex";
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function(e) {
                userVideo.play();           
            }

            socket.emit("ready", roomName);

        },
        function(error) {
            alert('You cannot access media');
        }
    );

});
socket.on("full", function(){

    alert("Room is full");
    
});

socket.on("ready", function(){
    if (creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = OnTrackFunction;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
        rtcPeerConnection.createOffer(
            function(offer) {
                rtcPeerConnection.setLocalDescription(offer);
                socket.emit("offer", offer, roomName);
            },
            function(error) {
                console.log(error);
            }
        );
    }
});

socket.on("candidate", function(candidate){
    var iceCandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(iceCandidate);
});

socket.on("offer", function(offer){
    if (!creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = displayRemoteStream;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
        rtcPeerConnection.setRemoteDescription(offer);
        rtcPeerConnection.createAnswer(
            function(answer) {
                rtcPeerConnection.setLocalDescription(answer);
                socket.emit("answer", answer, roomName);
            },
            function(error) {
                console.log(error);
            }
        );
    }
});
socket.on("answer", function(){
    rtcPeerConnection.setRemoteDescription(answer);
});

//leave

leaveButton.addEventListener("click", function() {
    socket.emit("leave", roomName);

    videoChatForm.style = "display:block";
    divBtnGroup.style = "display:none";

    if (userVideo.srcObject) {
        userVideo.srcObject.getTracks()[0].stop();
        userVideo.srcObject.getTracks()[1].stop();
    }

    if (peerVideo.srcObject) {
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
    }

    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
    }

});

socket.on("leave", function() {
    creator = true;
    
    if (peerVideo.srcObject) {
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
    }

    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
    }

});

function OnIceCandidateFunction(event){

    if (event.candidate) {
        socket.emit("candidate", event.candidate, roomName);
    } 

}

function OnTrackFunction(event) {

    peerVideo.srcObject = event.streams[0];
    peerVideo.onloadedmetadata = function(e) {
        peerVideo.play();
    }
    
}