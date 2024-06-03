export const peerJsConfig ={
    host: "0.peerjs.com",
    port: 443,
    path: "/",
    pingInterval: 5000,
    debug: 3,
    //secure: true,
    config: {'iceServers': [
        { urls: 'stun:stun.l.google.com:19302' },
        //    { url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }
        ]} /* Sample servers, please use appropriate ones */
};