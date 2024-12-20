const APP_ID = "633e8137e6ce4fb8936bea3c8c53f5a3"

let uid = sessionStorage.getItem('uid')
if(!uid){
    uid = String(Math.floor(Math.random() * 10000))
    sessionStorage.getItem('uid',uid)
}

let token = null;

let client;
let channel;

let localScreenTracks;
let sharingScreen = false;

let localTracks = []
let remoteUsers = {}
let roomId = 'main'
let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}


let constraints = {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080},
    },
    audio:true
}

let init = async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById('user-1').srcObject = localStream;
    } catch (error) {
        console.error('無法獲取視訊鏡頭權限:', error);
        return;
    }

    client = await AgoraRTM.createInstance(APP_ID)
    client1 = AgoraRTC.createClient({mode:'rtc', codec:'vp8'})
    await client.login({uid, token})
    await client1.join(APP_ID,roomId,token,uid)

    channel = client.createChannel('main')
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)

    joinStream()
}

let joinStream = async () => {
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({}, {
        encoderConfig: {
            width: { min: 640, ideal: 1920, max: 1920 },
            height: { min: 480, ideal: 1080, max: 1080 }
        }
    });

    // 添加本地軌道到 Agora RTC 頻道中
    localTracks.forEach(track => {
        client1.publish(track);
    });

    // 在本地播放本地視訊流
    localTracks[1].play('user-1');
}

let handleUserLeft = (MemberId) => {
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallFrame')
}

let handleMessageFromPeer = async (message, MemberId) => {

    message = JSON.parse(message.text)

    if(message.type === 'offer'){
        createAnswer(MemberId, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }


}

let handleUserJoined = async (MemberId) => {
    console.log('A new user joined the channel:', MemberId)
    createOffer(MemberId)
}


let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block'

    document.getElementById('user-1').classList.add('smallFrame')


    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
        document.getElementById('user-1').srcObject = localStream
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, MemberId)
        }
    }
}

let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'offer', 'offer':offer})}, MemberId)
}


let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId)
}


let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}


let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

let toggleMic = async () => {
    let audioTrack = localStream?.getTracks().find(track => track.kind === 'audio');

    if (audioTrack) {
        if (audioTrack.enabled) {
            audioTrack.enabled = false;
            document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)';
        } else {
            audioTrack.enabled = true;
            document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)';
        }
    } else {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            document.getElementById('user-1').srcObject = localStream;

            document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)';
        } catch (error) {
            console.error('get the audio error.', error);
        }
    }
}

let toggleCamera = async () => {
    let videoTrack = localStream?.getTracks().find(track => track.kind === 'video');

    if (videoTrack) {
        if (videoTrack.enabled) {
            videoTrack.enabled = false;
            document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)';
        } else {
            videoTrack.enabled = true;
            document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)';
        }
    } else {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true });
            document.getElementById('user-1').srcObject = localStream;

            document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)';
        } catch (error) {
            console.error('get the stream error.', error);
        }
    }
}

let toggleScreen = async(e) =>{
    let screenButton = e.currentTarget
    let cameraButton = document.getElementById('camera-btn')

    if(!sharingScreen){
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            console.error('無法獲取麥克風權限:', error);
            return;
        }

        sharingScreen = true

        screenButton.classList.add('active')
        cameraButton.classList.remove('active')
        cameraButton.style.display = 'none'

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'application',
                    cursor: 'always'
                },
                audio: false
            });

            // 临时关闭本地视频流
            localStream.getVideoTracks().forEach(track => {
                track.enabled = false;
            });

            // 顯示屏幕分享的視頻流
            const videoElement = document.getElementById('user-1');
            videoElement.srcObject = stream;

        } catch (error) {
            console.error('無法獲取屏幕分享許可權:', error);
        }

    } else {
        sharingScreen = false;
        cameraButton.style.display = 'block';

        // 恢复本地视频流
        localStream.getVideoTracks().forEach(track => {
            track.enabled = true;
        });

        // 重新设置本地视频流
        const videoElement = document.getElementById('user-1');
        videoElement.srcObject = localStream;
    }
}



window.addEventListener('beforeunload', leaveChannel)
document.getElementById("settings-btn").addEventListener('click', toggleStudentCamera)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
document.getElementById('screen-btn').addEventListener('click', toggleScreen)

init()
