import React, { useEffect, useRef } from "react";
import { useParams } from "react-router";
import io from "socket.io-client";
import { useStore } from "../store";

const pc_config = {
  iceServers: [
    // {
    //   urls: 'stun:[STUN_IP]:[PORT]',
    //   'credentials': '[YOR CREDENTIALS]',
    //   'username': '[USERNAME]'
    // },
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};
const SOCKET_SERVER_URL = "ws://localhost:4000";

const Room = () => {
  const { nickname } = useStore();
  const socketRef = useRef();
  const pcRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  let test123 = 0;
  const params = useParams();
  const roomId = params.roomId;

  const setVideoTracks = async () => {
    try {
      console.log("init");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (!(pcRef.current && socketRef.current)) return;

      stream.getTracks().forEach((track) => {
        if (!pcRef.current) return;
        pcRef.current.addTrack(track, stream);
      });

      pcRef.current.onicecandidate = (e) => {
        if (e.candidate) {
          if (!socketRef.current) return;
          console.log("onicecandidate   " + e.candidate);
          socketRef.current.emit("candidate", e.candidate);
        }
      };
      pcRef.current.oniceconnectionstatechange = (e) => {
        console.log(e);
      };
      pcRef.current.ontrack = (ev) => {
        console.log("add remotetrack success" + ev.streams);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = ev.streams[0];
        }
      };
      socketRef.current.emit("join_room", {
        room: roomId,
        nickname: nickname,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const createOffer = async () => {
    console.log("create offer");
    if (!(pcRef.current && socketRef.current)) return;

    try {
      const sdp = await pcRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pcRef.current.setLocalDescription(new RTCSessionDescription(sdp));
      socketRef.current.emit("offer", sdp);
    } catch (err) {
      console.error(err);
    }
  };

  const createAnswer = async (sdp) => {
    console.log("createAnswer");
    if (!(pcRef.current && socketRef.current)) return;
    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log("answer set sdp success");

      const mySdp = await pcRef.current.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      console.log("create answer");
      await pcRef.current.setLocalDescription(new RTCSessionDescription(mySdp));
      socketRef.current.emit("answer", mySdp);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    socketRef.current = io.connect("http://localhost:4000", {
      transports: ["websocket"],
    });
    pcRef.current = new RTCPeerConnection(pc_config);

    socketRef.current.on("all_users", (allUsers) => {
      console.log(allUsers);
      if (allUsers.length > 0) {
        createOffer();
      }
    });

    socketRef.current.on("getOffer", (sdp) => {
      //console.log(sdp);
      console.log("get offer");
      createAnswer(sdp);
    });

    socketRef.current.on("getAnswer", (sdp) => {
      console.log("get answer");
      if (!pcRef.current) return;
      pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      //console.log(sdp);
    });

    socketRef.current.on("getCandidate", async (candidate) => {
      if (!pcRef.current) return;
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("candidate add success");
    });

    setVideoTracks();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      <div>nickname: {nickname}</div>
      <video
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        muted
        ref={localVideoRef}
        autoPlay
      />
      <video
        id="remotevideo"
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        ref={remoteVideoRef}
        autoPlay
      />
    </div>
  );
};

export default Room;
