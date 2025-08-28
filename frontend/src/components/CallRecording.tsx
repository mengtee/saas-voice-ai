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
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);

  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true);
      
      const mockRecordings: CallRecording[] = [
        {
          id: 'rec_1',
          callId: 'call_123',
          leadName: 'John Smith',
          phoneNumber: '+1234567890',
          duration: 245,
          recordingUrl: '/api/recordings/rec_1.wav',
          startTime: '2024-08-27T10:00:00Z',
          endTime: '2024-08-27T10:04:05Z',
          outcome: 'appointment',
          agentId: 'agent_3501k2cxpkgbf69s7q5jr9vtrxey',
          transcript: [
            {
              id: 'seg_1',
              speaker: 'agent',
              text: 'Hello, this is Sarah from ABC Company. Am I speaking with John?',
              startTime: 0,
              endTime: 4.2,
              confidence: 0.95,
              sentiment: 'positive'
            },
            {
              id: 'seg_2',
              speaker: 'customer',
              text: 'Yes, this is John. What can I do for you?',
              startTime: 5.1,
              endTime: 8.3,
              confidence: 0.92,
              sentiment: 'neutral'
            },
            {
              id: 'seg_3',
              speaker: 'agent',
              text: 'I wanted to follow up on your inquiry about our new product line. Do you have a few minutes to discuss this?',
              startTime: 9.0,
              endTime: 15.8,
              confidence: 0.97,
              sentiment: 'positive'
            },
            {
              id: 'seg_4',
              speaker: 'customer',
              text: 'Actually, yes! I was very interested in learning more about that. When would be a good time to schedule a demo?',
              startTime: 16.2,
              endTime: 23.5,
              confidence: 0.94,
              sentiment: 'positive'
            }
          ]
        },
        {
          id: 'rec_2',
          callId: 'call_124',
          leadName: 'Sarah Johnson',
          phoneNumber: '+1234567891',
          duration: 180,
          recordingUrl: '/api/recordings/rec_2.wav',
          startTime: '2024-08-27T09:30:00Z',
          endTime: '2024-08-27T09:33:00Z',
          outcome: 'callback',
          agentId: 'agent_3501k2cxpkgbf69s7q5jr9vtrxey',
          transcript: [
            {
              id: 'seg_5',
              speaker: 'agent',
              text: 'Hi Sarah, this is Mike from XYZ Solutions.',
              startTime: 0,
              endTime: 3.1,
              confidence: 0.98,
              sentiment: 'positive'
            },
            {
              id: 'seg_6',
              speaker: 'customer',
              text: 'Oh hi, I\'m actually in a meeting right now. Could you call me back later?',
              startTime: 4.0,
              endTime: 8.9,
              confidence: 0.89,
              sentiment: 'neutral'
            }
          ]
        }
      ];

      const filteredRecordings = callId 
        ? mockRecordings.filter(rec => rec.callId === callId)
        : mockRecordings;

      setRecordings(filteredRecordings);
      
      if (filteredRecordings.length > 0) {
        setSelectedRecording(filteredRecordings[0]);
      }
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    fetchRecordings();
  }, [callId, fetchRecordings]);

  useEffect(() => {
    if (selectedRecording && audioRef.current) {
      const audio = audioRef.current;
      
      const updateTime = () => setCurrentTime(audio.currentTime);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [selectedRecording]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recording List */}
        <Card>
          <CardHeader>
            <CardTitle>Recordings</CardTitle>
            <CardDescription>Select a recording to play</CardDescription>
          </CardHeader>
          <CardContent>
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
                    onClick={() => setSelectedRecording(recording)}
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
          </CardContent>
        </Card>

        {/* Audio Player & Transcript */}
        <div className="lg:col-span-2 space-y-6">
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
                  {selectedRecording.recordingUrl && (
                    <audio 
                      ref={audioRef} 
                      src={selectedRecording.recordingUrl}
                      onLoadedMetadata={() => {
                        if (audioRef.current) {
                          audioRef.current.volume = volume;
                          audioRef.current.playbackRate = playbackRate;
                        }
                      }}
                    />
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(selectedRecording.duration)}</span>
                    </div>
                    <Progress 
                      value={(currentTime / selectedRecording.duration) * 100}
                      className="cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        seekTo(percent * selectedRecording.duration);
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
                        disabled={!selectedRecording.recordingUrl}
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
                        onClick={() => seekTo(Math.min(selectedRecording.duration, currentTime + 10))}
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
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(segment.confidence * 100)}% confidence
                                </Badge>
                                {segment.sentiment && (
                                  <Badge variant="outline" className={`text-xs ${
                                    segment.sentiment === 'positive' ? 'text-green-600' :
                                    segment.sentiment === 'negative' ? 'text-red-600' :
                                    'text-yellow-600'
                                  }`}>
                                    {segment.sentiment}
                                  </Badge>
                                )}
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