'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * ANYFREEBOOK Live — our own WebRTC classroom stage. No Jitsi, no Daily,
 * no sign-ins, no third-party servers.
 *
 * Topology: one-way broadcast. The host publishes camera/mic/screen; each
 * viewer gets a direct peer connection from the host (TikTok-Live style —
 * students interact through our own chat). Signaling rides the existing
 * Supabase Realtime infrastructure. Practical ceiling is ~10-15 concurrent
 * viewers per class (host upload bandwidth); beyond that we'd add an SFU.
 */

const FALLBACK_ICE: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
};

/** Server-provided ICE config: STUN always, plus TURN relay when configured (see /api/rtc-ice). */
async function fetchIceConfig(): Promise<RTCConfiguration> {
  try {
    const res = await fetch('/api/rtc-ice', { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (Array.isArray(data.iceServers) && data.iceServers.length) return { iceServers: data.iceServers };
  } catch { /* fall through */ }
  return FALLBACK_ICE;
}

/**
 * Cap the outgoing video bitrate so one host upload serves many viewers.
 * Uncapped 720p (~2.5Mbps/viewer) chokes after 2-3 viewers; capped streams
 * stay smooth to ~8-12 on a normal connection. Screen shares get more budget
 * (text must stay legible), cameras less.
 */
async function capVideoBitrate(pc: RTCPeerConnection, mode: 'camera' | 'screen'): Promise<void> {
  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  if (!sender) return;
  try {
    const params = sender.getParameters();
    params.encodings = params.encodings?.length ? params.encodings : [{}];
    params.encodings[0].maxBitrate = mode === 'screen' ? 1_200_000 : 500_000;
    params.degradationPreference = mode === 'screen' ? 'maintain-resolution' : 'maintain-framerate';
    await sender.setParameters(params);
  } catch { /* older browsers: best effort */ }
}

type Signal =
  | { kind: 'join'; from: string; to: 'host' }
  | { kind: 'offer'; from: 'host'; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; from: string; to: 'host'; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit };

interface Props {
  classroomId: string;
  isHost: boolean;
}

export function LiveStage({ classroomId, isHost }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'live' | 'waiting' | 'error'>(isHost ? 'connecting' : 'waiting');
  const [needTap, setNeedTap] = useState(false);

  // Long-lived plumbing kept in refs so re-renders never touch connections
  const plumbing = useRef<{
    stream: MediaStream | null;
    screenTrack: MediaStreamTrack | null;
    pcs: Map<string, RTCPeerConnection>;
    channel: ReturnType<ReturnType<typeof createClient>['channel']> | null;
    myId: string;
    connected: boolean;
    joinTimer: ReturnType<typeof setInterval> | null;
  }>({ stream: null, screenTrack: null, pcs: new Map(), channel: null, myId: Math.random().toString(36).slice(2, 10), connected: false, joinTimer: null });

  useEffect(() => {
    const p = plumbing.current;
    const sb = createClient();
    const channel = sb.channel(`rtc-${classroomId}`, { config: { broadcast: { self: false } } });
    p.channel = channel;

    const send = (payload: Signal) => channel.send({ type: 'broadcast', event: 'signal', payload });

    // ---------- HOST: publish to every viewer that says "join" ----------
    const runHost = async () => {
      try {
        p.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        setStatus('error');
        return;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = p.stream;
        videoRef.current.muted = true; // never monitor your own mic
        videoRef.current.play().catch(() => {});
      }
      setStatus('live');

      channel
        .on('broadcast', { event: 'signal' }, async ({ payload }: { payload: Signal }) => {
          if (payload.to !== 'host' || !p.stream) return;
          const viewerId = payload.from;
          if (payload.kind === 'join') {
            p.pcs.get(viewerId)?.close();
            const pc = new RTCPeerConnection(await fetchIceConfig());
            p.pcs.set(viewerId, pc);
            p.stream.getTracks().forEach(t => pc.addTrack(t, p.stream!));
            // Late joiner while a screen share is running: swap the fresh sender too
            if (p.screenTrack) {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              sender?.replaceTrack(p.screenTrack);
            }
            // Bitrate cap: keeps the host's upload healthy across many viewers
            capVideoBitrate(pc, p.screenTrack ? 'screen' : 'camera');
            // Reap dead viewers so they stop consuming upload budget
            pc.onconnectionstatechange = () => {
              if (['failed', 'closed'].includes(pc.connectionState)) {
                pc.close();
                if (p.pcs.get(viewerId) === pc) p.pcs.delete(viewerId);
              }
            };
            pc.onicecandidate = e => { if (e.candidate) send({ kind: 'ice', from: 'host', to: viewerId, candidate: e.candidate.toJSON() }); };
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send({ kind: 'offer', from: 'host', to: viewerId, sdp: offer });
          } else if (payload.kind === 'answer') {
            await p.pcs.get(viewerId)?.setRemoteDescription(payload.sdp).catch(() => {});
          } else if (payload.kind === 'ice') {
            await p.pcs.get(viewerId)?.addIceCandidate(payload.candidate).catch(() => {});
          }
        })
        .subscribe();
    };

    // ---------- VIEWER: ask to join, keep asking until video flows ----------
    const runViewer = () => {
      let pc: RTCPeerConnection | null = null;

      channel
        .on('broadcast', { event: 'signal' }, async ({ payload }: { payload: Signal }) => {
          if (payload.to !== p.myId) return;
          if (payload.kind === 'offer') {
            pc?.close();
            pc = new RTCPeerConnection(await fetchIceConfig());
            pc.ontrack = e => {
              const v = videoRef.current;
              if (!v) return;
              v.srcObject = e.streams[0];
              v.play().then(() => setNeedTap(false)).catch(() => setNeedTap(true));
              p.connected = true;
              setStatus('live');
            };
            pc.onconnectionstatechange = () => {
              if (pc && ['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
                p.connected = false;
                setStatus('waiting'); // host refreshed or dropped — the join loop below recovers
              }
            };
            pc.onicecandidate = e => { if (e.candidate) send({ kind: 'ice', from: p.myId, to: 'host', candidate: e.candidate.toJSON() }); };
            await pc.setRemoteDescription(payload.sdp);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send({ kind: 'answer', from: p.myId, to: 'host', sdp: answer });
          } else if (payload.kind === 'ice') {
            await pc?.addIceCandidate(payload.candidate).catch(() => {});
          }
        })
        .subscribe(s => {
          if (s === 'SUBSCRIBED') {
            send({ kind: 'join', from: p.myId, to: 'host' });
            p.joinTimer = setInterval(() => {
              if (!p.connected) send({ kind: 'join', from: p.myId, to: 'host' });
            }, 6000);
          }
        });
    };

    if (isHost) runHost(); else runViewer();

    return () => {
      if (p.joinTimer) clearInterval(p.joinTimer);
      p.pcs.forEach(pc => pc.close());
      p.pcs.clear();
      p.screenTrack?.stop();
      p.stream?.getTracks().forEach(t => t.stop());
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId, isHost]);

  // ---------- Host controls (track toggles — no renegotiation needed) ----------
  const toggleMic = () => {
    const t = plumbing.current.stream?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
  };
  const toggleCam = () => {
    const t = plumbing.current.stream?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); }
  };

  const stopShare = () => {
    const p = plumbing.current;
    p.screenTrack?.stop();
    p.screenTrack = null;
    const camTrack = p.stream?.getVideoTracks()[0] || null;
    p.pcs.forEach(pc => {
      pc.getSenders().find(s => s.track?.kind === 'video' || s.track === null)?.replaceTrack(camTrack);
      capVideoBitrate(pc, 'camera');
    });
    if (videoRef.current && p.stream) videoRef.current.srcObject = p.stream;
    setSharing(false);
  };

  const shareScreen = async () => {
    const p = plumbing.current;
    if (p.screenTrack) { stopShare(); return; }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      p.screenTrack = track;
      track.onended = stopShare; // browser's own "Stop sharing" button
      p.pcs.forEach(pc => {
        pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(track);
        capVideoBitrate(pc, 'screen');
      });
      if (videoRef.current) videoRef.current.srcObject = display;
      setSharing(true);
    } catch { /* user cancelled the picker */ }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full object-contain bg-black"
        style={{ height: '65vh', minHeight: 420 }}
      />

      {status === 'waiting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-sm gap-2 bg-black/70">
          <span className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Connecting to the host&apos;s stream…
        </div>
      )}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm bg-black/70">
          Starting your camera — allow access when your browser asks.
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 text-sm gap-2 bg-black/80 p-6 text-center">
          <p className="font-semibold">Couldn&apos;t access your camera or microphone.</p>
          <p className="text-white/60 text-xs">Check browser permissions (the 🔒 icon in the address bar), then reload this page.</p>
        </div>
      )}
      {needTap && (
        <button
          onClick={() => { videoRef.current?.play().then(() => setNeedTap(false)).catch(() => {}); }}
          className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-bold text-lg"
        >
          ▶ Tap to watch
        </button>
      )}

      {isHost && status === 'live' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          <button onClick={toggleMic} className={`px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-colors ${micOn ? 'bg-white/90 text-slate-900' : 'bg-red-500 text-white'}`}>
            {micOn ? '🎙 Mic on' : '🔇 Mic off'}
          </button>
          <button onClick={toggleCam} className={`px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-colors ${camOn ? 'bg-white/90 text-slate-900' : 'bg-red-500 text-white'}`}>
            {camOn ? '📷 Cam on' : '🚫 Cam off'}
          </button>
          <button onClick={shareScreen} className={`px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-colors ${sharing ? 'bg-emerald-500 text-white' : 'bg-white/90 text-slate-900'}`}>
            {sharing ? '🖥 Stop share' : '🖥 Share screen'}
          </button>
        </div>
      )}
    </div>
  );
}
