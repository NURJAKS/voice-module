"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, BrainCircuit, Bot, User, HelpCircle, BookOpen, Puzzle, Gamepad2, XCircle, PauseCircle, PlayCircle, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateStory } from '@/ai/flows/generate-story';
import { voiceCommandHelp } from '@/ai/flows/voice-command-help';
import { useToast } from '@/hooks/use-toast';

type Status = 'idle' | 'recording' | 'recognizing' | 'speaking' | 'error' | 'paused';
type LogEntry = { type: 'user' | 'bot'; text: string };

const statusInfo: { [key in Status]: { message: string; icon: React.ReactNode } } = {
  idle: { message: 'Нажмите и говорите', icon: <Mic className="w-6 h-6" /> },
  recording: { message: 'Записываю...', icon: <MicOff className="w-6 h-6 text-destructive" /> },
  recognizing: { message: 'Распознаю...', icon: <LoaderCircle className="w-6 h-6 animate-spin" /> },
  speaking: { message: 'Говорю...', icon: <Bot className="w-6 h-6" /> },
  paused: { message: 'Пауза', icon: <PauseCircle className="w-6 h-6" /> },
  error: { message: 'Ошибка', icon: <XCircle className="w-6 h-6 text-destructive" /> },
};

export default function Home() {
  const [status, setStatus] = useState<Status>('idle');
  const [log, setLog] = useState<LogEntry[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const storyChunksRef = useRef<string[]>([]);
  const currentStoryIndexRef = useRef<number>(0);
  const { toast } = useToast();
  const logScrollAreaRef = useRef<HTMLDivElement>(null);

  const addToLog = (entry: LogEntry) => {
    setLog(prevLog => [...prevLog, entry]);
  };

  useEffect(() => {
    if (logScrollAreaRef.current) {
        const { scrollHeight, clientHeight } = logScrollAreaRef.current.querySelector('div')!;
        logScrollAreaRef.current.querySelector('div')!.scrollTop = scrollHeight - clientHeight;
    }
  }, [log]);

  const playAudioResponse = useCallback(async (text: string, isStoryContinuation = false) => {
    if (!isStoryContinuation) {
      addToLog({ type: 'bot', text });
    }
    setStatus('speaking');
    try {
      const response = await fetch('http://127.0.0.1:8081/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('TTS service failed');
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.play();

      audio.onended = () => {
        if (storyChunksRef.current.length > 0 && currentStoryIndexRef.current < storyChunksRef.current.length) {
            if (status !== 'paused') {
                playAudioResponse(storyChunksRef.current[currentStoryIndexRef.current++], true);
            }
        } else {
          setStatus('idle');
          storyChunksRef.current = [];
          currentStoryIndexRef.current = 0;
        }
      };
      audio.onerror = () => {
          setStatus('error');
          toast({ title: "Ошибка воспроизведения", description: "Не удалось воспроизвести аудиоответ.", variant: 'destructive' });
      }

    } catch (error) {
      console.error(error);
      setStatus('error');
      const errorMessage = "Не могу связаться с сервисом озвучивания. Попробуйте позже.";
      addToLog({ type: 'bot', text: errorMessage });
      toast({ title: "Ошибка TTS", description: "Проверьте, запущен ли ваш локальный сервер на порту 8081.", variant: 'destructive' });
    }
  }, [status, toast]);
  
  const processCommand = useCallback(async (command: string) => {
    addToLog({ type: 'user', text: command });
    const lowerCaseCommand = command.toLowerCase().trim();

    switch (true) {
      case lowerCaseCommand.includes('открыть игры'):
        playAudioResponse('Открываю игры: пазлы, головоломки, викторины');
        break;

      case lowerCaseCommand.includes('пазлы'):
        playAudioResponse('Загружаю пазлы...');
        break;

      case lowerCaseCommand.includes('расскажи сказку'):
        try {
            setStatus('recognizing');
            const result = await generateStory({ request: "tell a short story for a child in Russian" });
            const story = result.story;
            storyChunksRef.current = story.match(/[^.!?]+[.!?]+/g) || [story];
            currentStoryIndexRef.current = 0;
            if(storyChunksRef.current.length > 0) {
                 playAudioResponse(storyChunksRef.current[currentStoryIndexRef.current++], false);
            } else {
                 playAudioResponse("Извини, я не смогла придумать сказку.", false);
            }
        } catch (e) {
            playAudioResponse("Произошла ошибка при генерации сказки.");
        }
        break;

      case lowerCaseCommand.includes('пауза'):
        if (storyChunksRef.current.length > 0) {
            setStatus('paused');
            audioPlayerRef.current?.pause();
            playAudioResponse("Пауза.", true);
        }
        break;
        
      case lowerCaseCommand.includes('продолжи'):
        if (status === 'paused' && storyChunksRef.current.length > 0) {
            setStatus('speaking');
            audioPlayerRef.current?.play();
        }
        break;

      case lowerCaseCommand.includes('помощь'):
        try {
            setStatus('recognizing');
            const result = await voiceCommandHelp({ userInput: "help" });
            playAudioResponse(result.availableCommands);
        } catch(e) {
            playAudioResponse("Произошла ошибка при получении помощи.");
        }
        break;
      
      case lowerCaseCommand.includes('пока'):
        playAudioResponse("Пока-пока!");
        break;

      default:
        playAudioResponse('Я не поняла, повтори, пожалуйста.');
        break;
    }
  }, [playAudioResponse, status]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setStatus('recognizing');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        audioChunksRef.current = [];
        
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob);

          const response = await fetch('http://127.0.0.1:8081/stt', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) throw new Error('STT service failed');

          const result = await response.json();
          if (result.text) {
            await processCommand(result.text);
          } else {
            playAudioResponse("Я ничего не услышала. Попробуйте еще раз.");
          }
        } catch (error) {
            console.error(error);
            setStatus('error');
            const errorMessage = "Не могу распознать речь. Попробуйте позже.";
            addToLog({ type: 'bot', text: errorMessage });
            toast({ title: "Ошибка STT", description: "Проверьте, запущен ли ваш локальный сервер на порту 8081.", variant: 'destructive' });
        }
      };

      recorder.start();
      setStatus('recording');
    } catch (err) {
      console.error("Microphone access denied:", err);
      setStatus('error');
      toast({ title: "Доступ к микрофону запрещен", description: "Пожалуйста, разрешите доступ к микрофону в настройках браузера.", variant: 'destructive' });
    }
  }, [processCommand, toast, playAudioResponse]);
  
  const handleRecordClick = () => {
    if (status === 'recording') {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    const welcomeMessage = "Здравствуйте! Я ваш голосовой помощник. Нажмите на микрофон и скажите команду. Если нужна помощь, скажите 'помощь'.";
    setLog([{ type: 'bot', text: welcomeMessage }]);
    // Don't auto-play on load to respect browser policies
    // playAudioResponse(welcomeMessage);
  }, []);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8 font-body">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            VoiceVision Pilot
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Ваш голосовой помощник для навигации и развлечений
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="flex flex-col items-center justify-center p-8 text-center shadow-lg">
              <Button
                onClick={handleRecordClick}
                size="lg"
                variant={status === 'recording' ? 'destructive' : 'default'}
                className="w-48 h-48 rounded-full shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105 bg-primary hover:bg-primary/90"
                aria-label={status === 'recording' ? 'Остановить запись' : 'Начать запись'}
              >
                {status === 'recording' ? <MicOff size={64} className="text-primary-foreground" /> : <Mic size={64} className="text-primary-foreground" />}
              </Button>
              <div className="mt-6 flex items-center justify-center gap-2 text-xl font-medium text-foreground h-8">
                {statusInfo[status].icon}
                <span>{statusInfo[status].message}</span>
              </div>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot /> История команд
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72 pr-4" ref={logScrollAreaRef}>
                  <div className="space-y-4">
                    {log.map((entry, index) => (
                      <div key={index} className={`flex items-start gap-3 text-base ${entry.type === 'user' ? 'justify-end' : ''}`}>
                        {entry.type === 'bot' && <Bot className="flex-shrink-0 mt-1" />}
                        <p className={`rounded-xl px-4 py-2 max-w-[80%] shadow-md ${entry.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                          {entry.text}
                        </p>
                        {entry.type === 'user' && <User className="flex-shrink-0 mt-1" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle /> Примеры команд
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 text-muted-foreground text-base">
                  <li className="flex items-center gap-3"><Gamepad2 className="text-accent" size={20}/> <span>"открыть игры"</span></li>
                  <li className="flex items-center gap-3"><Puzzle className="text-accent" size={20}/> <span>"пазлы"</span></li>
                  <li className="flex items-center gap-3"><BookOpen className="text-accent" size={20}/> <span>"расскажи сказку"</span></li>
                  <li className="flex items-center gap-3"><PauseCircle className="text-accent" size={20}/> <span>"пауза"</span></li>
                  <li className="flex items-center gap-3"><PlayCircle className="text-accent" size={20}/> <span>"продолжи"</span></li>
                  <li className="flex items-center gap-3"><HelpCircle className="text-accent" size={20}/> <span>"помощь"</span></li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
