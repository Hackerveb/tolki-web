import { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, Participant } from 'livekit-client';
import { RecordingState } from '@/types';

const AGENT_STATE_ATTRIBUTE = 'lk.agent.state';
const DEBOUNCE_MS = 500; // Delay before switching to 'thinking' on silence

export const useAgentMode = (room: Room | null): RecordingState => {
    const [mode, setMode] = useState<RecordingState>('listening');
    // Initialize to 'translating' so that the first silence (when connecting) 
    // triggers a transition to 'listening' (waiting for user) instead of 'thinking'.
    const lastActiveState = useRef<RecordingState>('translating');
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!room) return;

        const updateState = () => {
            const localParticipant = room.localParticipant;
            const remoteParticipants = Array.from(room.remoteParticipants.values());

            // --- STRATEGY 1: Agent Attributes (Authoritative) ---
            // Check if any remote participant has the agent state attribute
            const agentParticipant = remoteParticipants.find(p =>
                p.attributes && p.attributes.hasOwnProperty(AGENT_STATE_ATTRIBUTE)
            );

            if (agentParticipant) {
                const agentState = agentParticipant.attributes[AGENT_STATE_ATTRIBUTE];

                // Clear any pending VAD debounce
                if (debounceTimer.current) {
                    clearTimeout(debounceTimer.current);
                    debounceTimer.current = null;
                }

                // Map Agent State to UI State
                if (agentState === 'speaking') {
                    setMode('translating');
                    lastActiveState.current = 'translating';
                    return;
                } else if (agentState === 'thinking') {
                    setMode('thinking');
                    lastActiveState.current = 'thinking';
                    return;
                } else if (agentState === 'listening') {
                    setMode('listening');
                    lastActiveState.current = 'listening';
                    return;
                }
                // If state is unknown or initializing, fall through to VAD or keep current
            }

            // --- STRATEGY 2: VAD (Fallback) ---
            // Used if no agent attributes are found OR as a supplement

            const isUserSpeaking = localParticipant.isSpeaking;
            const isAgentSpeaking = remoteParticipants.some(p => p.isSpeaking);

            // 1. Agent Speaking -> Translating (Highest Priority)
            if (isAgentSpeaking) {
                if (debounceTimer.current) clearTimeout(debounceTimer.current);
                setMode('translating');
                lastActiveState.current = 'translating';
                return;
            }

            // 2. User Speaking -> Listening
            if (isUserSpeaking) {
                if (debounceTimer.current) clearTimeout(debounceTimer.current);
                setMode('listening');
                lastActiveState.current = 'listening';
                return;
            }

            // 3. Silence (Neither speaking)
            // Apply debounce to prevent flickering
            if (!debounceTimer.current) {
                debounceTimer.current = setTimeout(() => {
                    if (lastActiveState.current === 'listening') {
                        setMode('thinking');
                    } else if (lastActiveState.current === 'translating') {
                        setMode('listening');
                    }
                    debounceTimer.current = null;
                }, DEBOUNCE_MS);
            }
        };

        // Listen for events
        room.on(RoomEvent.ActiveSpeakersChanged, updateState);
        room.on(RoomEvent.ParticipantAttributesChanged, updateState);
        // Also listen for connected/disconnected to reset
        room.on(RoomEvent.ParticipantConnected, updateState);
        room.on(RoomEvent.ParticipantDisconnected, updateState);

        // Initial check
        updateState();

        return () => {
            room.off(RoomEvent.ActiveSpeakersChanged, updateState);
            room.off(RoomEvent.ParticipantAttributesChanged, updateState);
            room.off(RoomEvent.ParticipantConnected, updateState);
            room.off(RoomEvent.ParticipantDisconnected, updateState);
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [room]);

    return mode;
};
