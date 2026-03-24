/**
 * Global meeting PiP (Picture-in-Picture) state store.
 * 
 * Uses a simple pub/sub pattern outside of React for global state.
 * When a user is in a meeting and navigates away, `showPiP` becomes true
 * and the floating overlay appears.
 */
import { useSyncExternalStore, useCallback } from "react";

interface MeetingPiPState {
  /** True when user is connected to a LiveKit room */
  isInMeeting: boolean;
  /** True when user navigated away from meeting room route while still connected */
  showPiP: boolean;
  /** Current meeting ID */
  meetingId: string | null;
  /** Title of the current meeting */
  meetingTitle: string;
  /** Whether mic is muted */
  isMuted: boolean;
  /** Whether camera is on */
  isCameraOn: boolean;
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  /** Number of participants */
  participantCount: number;
  /** Whether anyone has their hand raised */
  hasHandRaised: boolean;
}

// Global state (singleton)
let state: MeetingPiPState = {
  isInMeeting: false,
  showPiP: false,
  meetingId: null,
  meetingTitle: "Meeting",
  isMuted: true,
  isCameraOn: false,
  elapsedSeconds: 0,
  participantCount: 0,
  hasHandRaised: false,
};

// Listeners
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

function getSnapshot(): MeetingPiPState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- Actions ---

export function meetingPiPJoin(meetingId: string, meetingTitle: string) {
  state = { ...state, isInMeeting: true, showPiP: false, meetingId, meetingTitle };
  notifyListeners();
}

export function meetingPiPLeave() {
  state = {
    ...state,
    isInMeeting: false,
    showPiP: false,
    meetingId: null,
    meetingTitle: "Meeting",
    isMuted: true,
    isCameraOn: false,
    elapsedSeconds: 0,
    participantCount: 0,
    hasHandRaised: false,
  };
  notifyListeners();
}

export function meetingPiPShowOverlay() {
  if (state.isInMeeting) {
    state = { ...state, showPiP: true };
    notifyListeners();
  }
}

export function meetingPiPHideOverlay() {
  state = { ...state, showPiP: false };
  notifyListeners();
}

export function meetingPiPUpdateState(partial: Partial<MeetingPiPState>) {
  state = { ...state, ...partial };
  notifyListeners();
}

// --- Hook ---

export function useMeetingPiP() {
  const currentState = useSyncExternalStore(subscribe, getSnapshot);
  return currentState;
}

export function getMeetingPiPState() {
  return state;
}
