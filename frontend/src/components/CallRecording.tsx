'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  Download, 
  FileAudio, 
  User,
  Bot,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Search,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/services/api';

interface CallRecording {
  id: string;
  callId: string;
  leadName: string;
  phoneNumber: string;
  duration: number;
  recordingUrl?: string;
  transcript: TranscriptSegment[];
  startTime: string;
  endTime: string;
  outcome: string;
  agentId: string;
}

interface TranscriptSegment {
  id: string;
  speaker: 'agent' | 'customer';
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface CallRecordingProps {
  callId?: string;
  onClose?: () => void;
}

export function CallRecording({ callId, onClose }: CallRecordingProps) {
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<CallRecording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const fetchRecordings = useCallback(async (isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch real recordings from ElevenLabs via backend
      const response = await apiClient.getCallRecordings(50);
      
      if (!response.success || !response.data) {
        console.error('Failed to fetch recordings:', response);
        setRecordings([]);
        return;
      }

      // Transform API response to match component interface
      const transformedRecordings: CallRecording[] = response.data.map(recording => ({
        id: recording.id,
        callId: recording.callId,
        leadName: recording.leadName,
        phoneNumber: recording.phoneNumber,
        duration: recording.duration,
        recordingUrl: recording.recordingUrl,
        startTime: recording.startTime,
        endTime: recording.endTime,
        outcome: recording.outcome,
        agentId: recording.agentId,
        transcript: [] // Will be loaded when recording is selected
      }));

      // Filter by specific callId if provided
      const filteredRecordings = callId 
        ? transformedRecordings.filter(rec => rec.callId === callId)
        : transformedRecordings;

      setRecordings(filteredRecordings);
      
      if (filteredRecordings.length > 0) {
        // Load detailed transcript for first recording
        await loadRecordingDetails(filteredRecordings[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
      setRecordings([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [callId]);

  const loadRecordingDetails = async (recordingId: string) => {
    try {
      const response = await apiClient.getRecordingDetails(recordingId);
      
      if (response.success && response.data) {
        // Find the original recording from the list to preserve its display data
        const originalRecording = recordings.find(r => r.id === recordingId);
        
        if (originalRecording) {
          // Keep the original recording EXACTLY as is, only add transcript
          const detailedRecording: CallRecording = {
            ...originalRecording, // Keep EVERYTHING from original
            transcript: response.data.transcript || [] // ONLY update transcript
          };
          
          setSelectedRecording(detailedRecording);
          
          // Update the transcript in the list while preserving display data
          setRecordings(prev => 
            prev.map(rec => 
              rec.id === recordingId 
                ? { ...rec, transcript: response.data?.transcript || [] }
                : rec
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to load recording details:', error);
    }
  };

  const loadAudioUrl = async (conversationId: string) => {
    try {
      console.log('Loading audio URL for:', conversationId);
      const response = await apiClient.getRecordingAudio(conversationId);
      console.log('Audio URL response:', response);
      if (response.success && response.data?.audioUrl) {
        console.log('Setting audio URL:', response.data.audioUrl);
        setAudioUrl(response.data.audioUrl);
      } else {
        console.error('No audio URL in response:', response);
      }
    } catch (error) {
      console.error('Failed to load audio URL:', error);
    }
  };

  useEffect(() => {
    fetchRecordings();

    // Set up polling for real-time updates every 30 seconds
    const pollingInterval = setInterval(() => {
      fetchRecordings(true);
    }, 30000);

    return () => clearInterval(pollingInterval);
  }, [callId, fetchRecordings]);

  // Load audio URL when recording is selected
  useEffect(() => {
    if (selectedRecording) {
      setAudioUrl(null); // Reset audio URL first
      setCurrentTime(0); // Reset current time
      setAudioDuration(0); // Reset audio duration
      loadAudioUrl(selectedRecording.id);
    }
  }, [selectedRecording]);

  // Audio event handlers are now handled directly on the audio element

  const togglePlayback = () => {
    if (audioRef.current && selectedRecording) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const changeVolume = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
    }
  };

  const downloadRecording = (recording: CallRecording) => {
    if (recording.recordingUrl) {
      const link = document.createElement('a');
      link.href = recording.recordingUrl;
      link.download = `call-recording-${recording.leadName}-${recording.id}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSegmentAtTime = (time: number) => {
    if (!selectedRecording) return null;
    return selectedRecording.transcript.find(seg => 
      time >= seg.startTime && time <= seg.endTime
    );
  };

  const filteredTranscript = selectedRecording?.transcript.filter(seg =>
    searchTerm === '' || seg.text.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="h-5 w-5" />
                Call Recordings & Transcripts
              </CardTitle>
              <CardDescription>
                Listen to recorded calls and review conversation transcripts
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Recording List */}
        <Card className="h-[calc(100vh-12rem)] flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recordings</CardTitle>
                <CardDescription>Select a recording to play</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => fetchRecordings()}
                disabled={loading || isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full p-6">
              <div className="space-y-3">
                {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading recordings...</p>
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileAudio className="mx-auto h-8 w-8 mb-2" />
                  <p>No recordings available</p>
                </div>
              ) : (
                recordings.map((recording) => (
                  <div 
                    key={recording.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRecording?.id === recording.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (recording.transcript.length === 0) {
                        loadRecordingDetails(recording.id);
                      } else {
                        setSelectedRecording(recording);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{recording.leadName}</p>
                        <p className="text-sm text-muted-foreground">{recording.phoneNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatTime(recording.duration)}</p>
                        <Badge className={
                          recording.outcome === 'appointment' ? 'bg-green-100 text-green-800' :
                          recording.outcome === 'interested' ? 'bg-blue-100 text-blue-800' :
                          recording.outcome === 'callback' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {recording.outcome}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(recording.startTime).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Audio Player & Transcript */}
        <div className="lg:col-span-2 space-y-6 h-[calc(100vh-12rem)] overflow-y-auto">
          {selectedRecording ? (
            <>
              {/* Audio Player */}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedRecording.leadName} - Call Recording</CardTitle>
                  <CardDescription>
                    {new Date(selectedRecording.startTime).toLocaleString()} • 
                    Duration: {formatTime(selectedRecording.duration)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {audioUrl && (
                    <audio 
                      ref={audioRef} 
                      src={audioUrl}
                      onLoadedMetadata={() => {
                        if (audioRef.current) {
                          console.log('Audio loaded, duration:', audioRef.current.duration);
                          setAudioDuration(audioRef.current.duration);
                          audioRef.current.volume = volume;
                          audioRef.current.playbackRate = playbackRate;
                        }
                      }}
                      onTimeUpdate={() => {
                        if (audioRef.current) {
                          setCurrentTime(audioRef.current.currentTime);
                        }
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    />
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(audioDuration || selectedRecording.duration)}</span>
                    </div>
                    <Progress 
                      value={audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}
                      className="cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        const duration = audioDuration || selectedRecording.duration;
                        seekTo(percent * duration);
                      }}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => seekTo(Math.max(0, currentTime - 10))}
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={togglePlayback}
                        disabled={!audioUrl}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => seekTo(Math.min(audioDuration || selectedRecording.duration, currentTime + 10))}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Playback Speed */}
                      <select 
                        value={playbackRate}
                        onChange={(e) => changePlaybackRate(Number(e.target.value))}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value={0.5}>0.5x</option>
                        <option value={0.75}>0.75x</option>
                        <option value={1}>1x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2}>2x</option>
                      </select>

                      {/* Volume */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => changeVolume(volume === 0 ? 1 : 0)}
                        >
                          {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => changeVolume(Number(e.target.value))}
                          className="w-20"
                        />
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadRecording(selectedRecording)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transcript */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Conversation Transcript</CardTitle>
                      <CardDescription>
                        AI-generated transcript with speaker identification
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transcript..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {filteredTranscript.map((segment) => {
                        const isCurrentSegment = getSegmentAtTime(currentTime)?.id === segment.id;
                        
                        return (
                          <div 
                            key={segment.id}
                            className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              isCurrentSegment 
                                ? 'bg-blue-50 border-blue-200 border' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => seekTo(segment.startTime)}
                          >
                            <div className="flex-shrink-0">
                              {segment.speaker === 'agent' ? (
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Bot className="h-4 w-4 text-blue-600" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-green-600" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium capitalize">
                                  {segment.speaker === 'agent' ? 'AI Agent' : selectedRecording.leadName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(segment.startTime)}
                                </span>
                              </div>
                              <p className="text-sm">{segment.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileAudio className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Select a Recording</h3>
                  <p className="text-muted-foreground">
                    Choose a call recording from the list to play and view its transcript
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}