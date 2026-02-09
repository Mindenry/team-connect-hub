import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// TURN server credentials from environment (for production deployment)
const TURN_URL = import.meta.env.VITE_TURN_URL;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL;

// Build ICE servers list
const buildIceServers = (): RTCIceServer[] => {
    const servers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ];

    // Add TURN server if configured
    if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
        servers.push({
            urls: TURN_URL,
            username: TURN_USERNAME,
            credential: TURN_CREDENTIAL,
        });
        console.log('✅ TURN server configured');
    } else {
        console.log('⚠️ TURN server not configured - only STUN available');
    }

    return servers;
};

const ICE_SERVERS: RTCConfiguration = {
    iceServers: buildIceServers(),
    iceCandidatePoolSize: 10,
};

export interface MediaState {
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
}

export interface PeerConnection {
    peerId: string;
    peerName: string;
    connection: RTCPeerConnection;
    remoteStream: MediaStream | null;
}

type StreamCallback = (peerId: string, stream: MediaStream | null) => void;
type ParticipantCallback = (data: { peerId: string; name: string; state: MediaState }) => void;

class WebRTCService {
    private socket: Socket | null = null;
    private localStream: MediaStream | null = null;
    private screenStream: MediaStream | null = null;
    private peers: Map<string, PeerConnection> = new Map();
    private meetingId: string | null = null;
    private userId: string | null = null;
    private userName: string | null = null;
    private mediaState: MediaState = {
        isMuted: false,
        isCameraOn: true,
        isScreenSharing: false,
        isHandRaised: false,
    };

    private onRemoteStreamCallback: StreamCallback | null = null;
    private onParticipantJoinedCallback: ParticipantCallback | null = null;
    private onParticipantLeftCallback: ((peerId: string) => void) | null = null;
    private onParticipantUpdateCallback: ParticipantCallback | null = null;

    // Initialize local media stream
    async initLocalStream(video = true, audio = true): Promise<MediaStream> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
                audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
            });
            return this.localStream;
        } catch (err) {
            console.error('Failed to get local media:', err);
            // Try audio-only fallback
            if (video) {
                return this.initLocalStream(false, audio);
            }
            throw err;
        }
    }

    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    // Connect to signaling server and join meeting
    async joinMeeting(meetingId: string, userId: string, userName: string): Promise<void> {
        this.meetingId = meetingId;
        this.userId = userId;
        this.userName = userName;

        // Use existing socket connection
        this.socket = io(API_BASE, {
            transports: ['websocket'],
            reconnection: true,
        });

        this.setupSocketListeners();

        // Join the meeting room
        this.socket.emit('meeting:join', {
            meetingId,
            peerId: userId,
            peerName: userName,
            state: this.mediaState,
        });
    }

    private setupSocketListeners(): void {
        if (!this.socket) return;

        // Handle existing participants when joining 
        this.socket.on('meeting:participants', (participants: Array<{ peerId: string; name: string; state: MediaState }>) => {
            participants.forEach(p => {
                if (p.peerId !== this.userId) {
                    this.createPeerConnection(p.peerId, p.name, true);
                    this.onParticipantJoinedCallback?.(p);
                }
            });
        });

        // New participant joined
        this.socket.on('meeting:participant:joined', async (data: { peerId: string; name: string; state: MediaState }) => {
            if (data.peerId !== this.userId) {
                await this.createPeerConnection(data.peerId, data.name, true);
                this.onParticipantJoinedCallback?.(data);
            }
        });

        // Participant left
        this.socket.on('meeting:participant:left', (data: { peerId: string }) => {
            this.removePeer(data.peerId);
            this.onParticipantLeftCallback?.(data.peerId);
        });

        // Participant state update (mute/camera/hand)
        this.socket.on('meeting:participant:update', (data: { peerId: string; name: string; state: MediaState }) => {
            this.onParticipantUpdateCallback?.(data);
        });

        // WebRTC signaling: offer
        this.socket.on('webrtc:offer', async (data: { from: string; name: string; offer: RTCSessionDescriptionInit }) => {
            const peer = this.peers.get(data.from) || await this.createPeerConnection(data.from, data.name, false);
            if (peer) {
                await peer.connection.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peer.connection.createAnswer();
                await peer.connection.setLocalDescription(answer);
                this.socket?.emit('webrtc:answer', {
                    to: data.from,
                    answer: peer.connection.localDescription,
                });
            }
        });

        // WebRTC signaling: answer
        this.socket.on('webrtc:answer', async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
            const peer = this.peers.get(data.from);
            if (peer) {
                await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        // WebRTC signaling: ICE candidate
        this.socket.on('webrtc:ice-candidate', async (data: { from: string; candidate: RTCIceCandidateInit }) => {
            const peer = this.peers.get(data.from);
            if (peer && data.candidate) {
                await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });
    }

    private async createPeerConnection(peerId: string, peerName: string, initiator: boolean): Promise<PeerConnection> {
        const connection = new RTCPeerConnection(ICE_SERVERS);

        const peerData: PeerConnection = {
            peerId,
            peerName,
            connection,
            remoteStream: null,
        };

        // Add local tracks to connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                connection.addTrack(track, this.localStream!);
            });
        }

        // Handle incoming tracks
        connection.ontrack = (event) => {
            peerData.remoteStream = event.streams[0];
            this.onRemoteStreamCallback?.(peerId, event.streams[0]);
        };

        // Handle ICE candidates
        connection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket?.emit('webrtc:ice-candidate', {
                    to: peerId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle connection state changes
        connection.onconnectionstatechange = () => {
            if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
                console.log(`Peer ${peerId} disconnected`);
            }
        };

        this.peers.set(peerId, peerData);

        // If we're the initiator, create and send offer
        if (initiator) {
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            this.socket?.emit('webrtc:offer', {
                to: peerId,
                name: this.userName,
                offer: connection.localDescription,
            });
        }

        return peerData;
    }

    private removePeer(peerId: string): void {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.connection.close();
            this.peers.delete(peerId);
        }
    }

    // Toggle microphone
    toggleMute(): boolean {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            this.mediaState.isMuted = !audioTracks[0]?.enabled;
            this.broadcastStateUpdate();
        }
        return this.mediaState.isMuted;
    }

    // Toggle camera
    toggleCamera(): boolean {
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            this.mediaState.isCameraOn = videoTracks[0]?.enabled ?? false;
            this.broadcastStateUpdate();
        }
        return this.mediaState.isCameraOn;
    }

    // Toggle hand raise
    toggleHandRaise(): boolean {
        this.mediaState.isHandRaised = !this.mediaState.isHandRaised;
        this.broadcastStateUpdate();
        return this.mediaState.isHandRaised;
    }

    // Start screen sharing
    async startScreenShare(): Promise<MediaStream | null> {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' } as any,
                audio: false,
            });

            // Replace video track for all peers
            const videoTrack = this.screenStream.getVideoTracks()[0];
            this.peers.forEach((peer) => {
                const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });

            videoTrack.onended = () => {
                this.stopScreenShare();
            };

            this.mediaState.isScreenSharing = true;
            this.broadcastStateUpdate();
            return this.screenStream;
        } catch (err) {
            console.error('Screen share failed:', err);
            return null;
        }
    }

    // Stop screen sharing
    stopScreenShare(): void {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        // Restore camera video track
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                this.peers.forEach((peer) => {
                    const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });
            }
        }

        this.mediaState.isScreenSharing = false;
        this.broadcastStateUpdate();
    }

    private broadcastStateUpdate(): void {
        this.socket?.emit('meeting:participant:update', {
            meetingId: this.meetingId,
            peerId: this.userId,
            name: this.userName,
            state: this.mediaState,
        });
    }

    // Callbacks
    onRemoteStream(callback: StreamCallback): void {
        this.onRemoteStreamCallback = callback;
    }

    onParticipantJoined(callback: ParticipantCallback): void {
        this.onParticipantJoinedCallback = callback;
    }

    onParticipantLeft(callback: (peerId: string) => void): void {
        this.onParticipantLeftCallback = callback;
    }

    onParticipantUpdate(callback: ParticipantCallback): void {
        this.onParticipantUpdateCallback = callback;
    }

    getMediaState(): MediaState {
        return { ...this.mediaState };
    }

    getPeers(): Map<string, PeerConnection> {
        return this.peers;
    }

    // Leave meeting and cleanup
    leaveMeeting(): void {
        // Notify server
        this.socket?.emit('meeting:leave', {
            meetingId: this.meetingId,
            peerId: this.userId,
        });

        // Close all peer connections
        this.peers.forEach(peer => peer.connection.close());
        this.peers.clear();

        // Stop local media
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        // Disconnect socket
        this.socket?.disconnect();
        this.socket = null;

        this.meetingId = null;
        this.userId = null;
        this.userName = null;
    }
}

// Singleton instance
export const webrtcService = new WebRTCService();
