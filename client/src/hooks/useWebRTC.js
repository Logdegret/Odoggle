import { useRef, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export function useWebRTC(roomId, isInitiator) {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);
  const canvasRef      = useRef(null);
  const channelRef     = useRef(null);

  const [connectionState, setConnectionState] = useState('new');
  const [cameraError, setCameraError]         = useState(null);

  const captureFrame = useCallback(() => {
    const video = localVideoRef.current;
    if (!video || !video.videoWidth) return null;
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera access and try again.'
          : `Camera error: ${err.message}`
      );
      return null;
    }
  }, []);

  const broadcast = useCallback((event, payload) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const createPC = useCallback((stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = ({ streams: [remote] }) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) broadcast('ice', { candidate });
    };

    pc.onconnectionstatechange = () => setConnectionState(pc.connectionState);

    return pc;
  }, [broadcast]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload: { offer } }) => {
        if (!pcRef.current) {
          const stream = localStreamRef.current || await startCamera();
          if (!stream) return;
          createPC(stream);
        }
        await pcRef.current.setRemoteDescription(offer);
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        broadcast('answer', { answer });
      })
      .on('broadcast', { event: 'answer' }, async ({ payload: { answer } }) => {
        if (pcRef.current) await pcRef.current.setRemoteDescription(answer);
      })
      .on('broadcast', { event: 'ice' }, async ({ payload: { candidate } }) => {
        if (pcRef.current && candidate) {
          try { await pcRef.current.addIceCandidate(candidate); } catch {}
        }
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;

        const stream = await startCamera();
        if (!stream) return;

        if (isInitiator) {
          const pc    = createPC(stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          broadcast('offer', { offer });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [roomId, isInitiator, startCamera, createPC, broadcast]);

  return { localVideoRef, remoteVideoRef, connectionState, cameraError, captureFrame };
}
