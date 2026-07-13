import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Clock,
  DollarSign,
  CheckCircle2,
  PlayCircle,
  ExternalLink,
  RefreshCw,
  Gift,
  Star,
  Zap,
  Target,
  TrendingUp,
  Award,
  Crown
} from 'lucide-react';
import { tasksService } from '../../services/tasksService';

const freeTaskTemplates = [
  {
    id: 'profile',
    title: 'Completa tu perfil',
    description: 'Activa tu perfil para empezar a crecer en BoostMe.',
    reward: 3,
    icon: Target,
    type: 'daily'
  },
  {
    id: 'referral',
    title: 'Invita a un colega',
    description: 'Comparte tu enlace de referidos y gana Boost por cada registro válido.',
    reward: 5,
    icon: Gift,
    type: 'daily'
  },
  {
    id: 'welcome',
    title: 'Mira la guía de bienvenida',
    description: 'Entiende cómo funciona el panel y tus primeras metas.',
    reward: 4,
    icon: PlayCircle,
    type: 'daily'
  },
  {
    id: 'survey',
    title: 'Completa una encuesta breve',
    description: 'Responde una encuesta corta para desbloquear más contenido.',
    reward: 6,
    icon: TrendingUp,
    type: 'daily'
  },
  {
    id: 'goal',
    title: 'Activa tu primer objetivo',
    description: 'Marca una meta inicial y empieza a acumular Boost.',
    reward: 8,
    icon: Award,
    type: 'daily'
  },
  {
    id: 'dashboard',
    title: 'Explora tu panel',
    description: 'Revisa tu progreso para ver cómo crece tu saldo.',
    reward: 4,
    icon: Zap,
    type: 'daily'
  }
];

const getTaskTemplateMeta = (taskType, description = '') => {
  const normalizedText = `${taskType || ''} ${description || ''}`.toLowerCase();

  if (taskType === 'dashboard' || normalizedText.includes('panel') || normalizedText.includes('progreso')) {
    return freeTaskTemplates[5];
  }

  switch (taskType) {
    case 'profile':
      return freeTaskTemplates[0];
    case 'follow':
      return freeTaskTemplates[1];
    case 'social':
      return freeTaskTemplates[1];
    case 'video':
      return normalizedText.includes('bienvenida') || normalizedText.includes('guía')
        ? freeTaskTemplates[2]
        : freeTaskTemplates[5];
    case 'survey':
      return freeTaskTemplates[3];
    case 'review':
      return freeTaskTemplates[4];
    default:
      return freeTaskTemplates[2];
  }
};

// Map task_type to icons so frontend doesn't force template titles/descriptions
const iconMap = {
  profile: Target,
  referral: Gift,
  welcome: PlayCircle,
  survey: TrendingUp,
  goal: Award,
  dashboard: Zap,
  social: Gift,
  follow: Gift,
  video: PlayCircle
};

const TasksList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [planInfo, setPlanInfo] = useState(null);
  const [activeVideoTask, setActiveVideoTask] = useState(null);
  const [videoWatchedSeconds, setVideoWatchedSeconds] = useState(0);
  const [videoRequiredSeconds, setVideoRequiredSeconds] = useState(0);
  const [videoError, setVideoError] = useState(null);
  const [isCompletingVideo, setIsCompletingVideo] = useState(false);
  const [isYouTubeVideo, setIsYouTubeVideo] = useState(false);
  const [activeSurveyTask, setActiveSurveyTask] = useState(null);
  const [surveyResponses, setSurveyResponses] = useState({});
  const [surveyError, setSurveyError] = useState(null);
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const videoRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubePollRef = useRef(null);

  const tabOptions = [
    { id: 'daily', label: 'Diarias', icon: Clock },
    { id: 'weekly', label: 'Semanales', icon: Target },
    { id: 'special', label: 'Especiales', icon: Star }
  ];

  const availableTabs = planInfo?.name === 'Free'
    ? tabOptions.filter((tab) => tab.id === 'daily')
    : tabOptions;

  React.useEffect(() => {
    if (planInfo?.name === 'Free' && activeTab !== 'daily') {
      setActiveTab('daily');
    }
  }, [planInfo, activeTab]);

  const isYouTubeUrl = (url) => {
    if (!url) return false;
    return /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)/.test(url);
  };

  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const simpleIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
    if (simpleIdMatch && simpleIdMatch[1]) {
      return simpleIdMatch[1];
    }
    const params = new URLSearchParams(url.split('?')[1] || '');
    return params.get('v');
  };

  const ensureYouTubeIframeApiLoaded = () => {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      if (window.__youtubeIframeApiLoading) {
        window.__youtubeIframeApiLoading.push(resolve);
        return;
      }

      window.__youtubeIframeApiLoading = [resolve];
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('No se pudo cargar la API de YouTube'));
      document.body.appendChild(script);

      window.onYouTubeIframeAPIReady = () => {
        window.__youtubeIframeApiLoading.forEach((cb) => cb());
        window.__youtubeIframeApiLoading = null;
      };
    });
  };

  const clearYoutubePoll = () => {
    if (youtubePollRef.current) {
      clearInterval(youtubePollRef.current);
      youtubePollRef.current = null;
    }
  };

  const createYouTubePlayer = (videoId) => {
    if (!youtubeContainerRef.current || !window.YT || !window.YT.Player) {
      setVideoError('No se pudo iniciar el reproductor de YouTube.');
      return;
    }

    const playerOrigin = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;

    youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
      height: '360',
      width: '100%',
      videoId,
      playerVars: {
        controls: 1,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
        origin: playerOrigin,
      },
      events: {
        onReady: (event) => event.target.playVideo(),
        onError: (event) => {
          setVideoError('No se pudo cargar el reproductor de YouTube. Intenta recargar la página.');
          console.error('YouTube player error:', event.data);
        },
        onStateChange: async (event) => {
          const playerState = event.data;
          if (playerState === window.YT.PlayerState.PLAYING) {
            clearYoutubePoll();
            youtubePollRef.current = setInterval(async () => {
              if (!youtubePlayerRef.current) return;
              const currentTime = Math.ceil(youtubePlayerRef.current.getCurrentTime());
              setVideoWatchedSeconds((prev) => Math.max(prev, currentTime));
              if (currentTime >= videoRequiredSeconds) {
                clearYoutubePoll();
                await completeVideoTask();
              }
            }, 1000);
          } else if (playerState === window.YT.PlayerState.PAUSED || playerState === window.YT.PlayerState.BUFFERING || playerState === window.YT.PlayerState.CUED) {
            clearYoutubePoll();
          } else if (playerState === window.YT.PlayerState.ENDED) {
            clearYoutubePoll();
            await completeVideoTask();
          }
        }
      }
    });
  };

  useEffect(() => {
    if (!activeVideoTask || !isYouTubeVideo) return;

    const videoId = getYouTubeVideoId(activeVideoTask.url);
    if (!videoId) {
      setVideoError('URL de YouTube inválida.');
      return;
    }

    ensureYouTubeIframeApiLoaded()
      .then(() => createYouTubePlayer(videoId))
      .catch((error) => setVideoError(error.message));

    return () => {
      clearYoutubePoll();
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [activeVideoTask, isYouTubeVideo, videoRequiredSeconds]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await tasksService.getDailyTasks();
        const backendTasks = response?.tasks || [];
        const taskTypeLabels = {
          profile: 'Completar perfil',
          referral: 'Invitar referido',
          welcome: 'Ver guía de bienvenida',
          survey: 'Completar encuesta',
          goal: 'Activar objetivo',
          dashboard: 'Explorar panel',
          social: 'Invitar a un colega',
          follow: 'Seguir cuenta',
          video: 'Ver video',
        };

        const normalizedTasks = backendTasks.map((task, index) => {
          const rawDescription = task.description || '';
          const title = task.title || taskTypeLabels[task.task_type] || (task.task_type || 'Tarea');
          const Icon = iconMap[task.task_type] || Zap;

          return {
            id: task.id || `${task.task_type || 'task'}-${index}`,
            type: 'daily',
            taskType: task.task_type || null,
            title,
            description: rawDescription,
            reward: Number(task.boost_reward || 0),
            icon: Icon,
            status: task.status === 'completed' ? 'completed' : 'available',
            progress: task.status === 'completed' ? 1 : 0,
            maxProgress: 1,
            provider: task.provider || 'BoostMe',
            payoutType: task.payoutType || 'Boost demo',
            url: task.task_type === 'profile' ? null : task.content_url || null,
            contentData: task.content_data || {},
            targetPath: task.task_type === 'profile' ? '/Profile' : null
          };
        });

        // Use only backend-provided tasks. If backend returns empty, show no tasks.
        setTasks(normalizedTasks);

        const planData = {
          name: response?.plan_info?.name || user?.plan_name || 'Free',
          dailyTasks: response?.plan_info?.daily_tasks || (user?.plan_name === 'Starter' ? 5 : user?.plan_name === 'Pro' ? 10 : user?.plan_name === 'Elite' ? 20 : 6),
          bonus: response?.plan_info?.bonus_percentage ?? (user?.plan_name === 'Starter' ? 10 : user?.plan_name === 'Pro' ? 20 : user?.plan_name === 'Elite' ? 25 : 0)
        };

        setPlanInfo(planData);
      } catch (error) {
        console.error('Error loading tasks:', error);
        // If loading fails, show empty list so UI displays the empty state.
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [user]);

  const handleTaskClick = async (task) => {
    const isProfileTask = task?.taskType === 'profile' || (typeof task?.id === 'string' && task.id.startsWith('profile'));

    if (isProfileTask) {
      window.location.assign('/Profile');
      return;
    }

    if (task?.taskType === 'referral' || task?.taskType === 'social' || (task?.id && typeof task.id === 'string' && task.id.startsWith('referral'))) {
      navigate('/referidos');
      return;
    }

    if (task?.taskType === 'survey') {
      setActiveSurveyTask(task);
      setSurveyResponses({});
      setSurveyError(null);
      return;
    }

    if (task?.url) {
      if (task?.taskType === 'video') {
        const isLocalVideo = task.url.startsWith('/') || task.url.endsWith('.mp4');
        const isYouTube = isYouTubeUrl(task.url);
        if (isLocalVideo || isYouTube) {
          const requiredSeconds = Number(task.contentData?.duration || 30);
          setActiveVideoTask(task);
          setIsYouTubeVideo(isYouTube);
          setVideoWatchedSeconds(0);
          setVideoRequiredSeconds(requiredSeconds);
          setVideoError(null);
          return;
        }

        window.open(task.url, '_blank', 'noopener,noreferrer');
        return;
      }

      window.open(task.url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      if (task?.id && typeof task.id === 'string' && task.id.startsWith('welcome')) {
        setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, status: 'completed', progress: 1 } : item));
        return;
      }

      if (task?.id && typeof task.id === 'string' && task.id.startsWith('survey')) {
        setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, status: 'completed', progress: 1 } : item));
        return;
      }

      if (task?.id && typeof task.id === 'string' && task.id.startsWith('goal')) {
        setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, status: 'completed', progress: 1 } : item));
        return;
      }

      if (task?.id && typeof task.id === 'string' && task.id.startsWith('dashboard')) {
        setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, status: 'completed', progress: 1 } : item));
        return;
      }

      const response = await tasksService.completeTask(task.id);
      if (response?.message) {
        setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, status: 'completed', progress: 1 } : item));
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleVideoTimeUpdate = async () => {
    if (!videoRef.current || !activeVideoTask || isCompletingVideo) return;
    const currentTime = Math.ceil(videoRef.current.currentTime);
    if (currentTime <= videoWatchedSeconds) return;

    setVideoWatchedSeconds(currentTime);
    if (currentTime >= videoRequiredSeconds) {
      await completeVideoTask();
    }
  };

  const handleVideoEnded = async () => {
    if (!activeVideoTask || isCompletingVideo) return;
    const endedTime = videoRef.current ? Math.ceil(videoRef.current.currentTime) : videoWatchedSeconds;
    if (videoWatchedSeconds >= videoRequiredSeconds || endedTime >= videoRequiredSeconds) {
      setVideoWatchedSeconds((prev) => Math.max(prev, endedTime));
      await completeVideoTask();
    }
  };

  const completeVideoTask = async () => {
    if (!activeVideoTask || isCompletingVideo) return;

    let watchedSeconds = videoWatchedSeconds;
    if (isYouTubeVideo && youtubePlayerRef.current) {
      watchedSeconds = Math.ceil(youtubePlayerRef.current.getCurrentTime());
    } else if (videoRef.current) {
      watchedSeconds = Math.ceil(videoRef.current.currentTime);
    }

    if (watchedSeconds < videoRequiredSeconds) {
      setVideoWatchedSeconds(watchedSeconds);
      setVideoError(`Necesitas ver el video al menos ${videoRequiredSeconds} segundos para completar la tarea.`);
      return;
    }

    setVideoError(null);
    setIsCompletingVideo(true);
    try {
      const response = await tasksService.completeTask(activeVideoTask.id, { watched_seconds: watchedSeconds });
      if (response?.message) {
        setTasks((prev) => prev.map((item) => item.id === activeVideoTask.id ? { ...item, status: 'completed', progress: 1 } : item));
        setActiveVideoTask(null);
      }
    } catch (error) {
      console.error('Error completing video task:', error);
      setVideoError(error.message || 'Error al completar la tarea de video.');
    } finally {
      setIsCompletingVideo(false);
    }
  };

  const handleSurveyResponseChange = (questionId, value) => {
    setSurveyResponses((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const submitSurveyTask = async () => {
    if (!activeSurveyTask) return;

    const questions = activeSurveyTask.contentData?.questions || [];
    const unanswered = questions.filter((question) => {
      if (question.type === 'text') {
        return !surveyResponses[question.id] || surveyResponses[question.id].trim() === '';
      }
      return !surveyResponses[question.id];
    });

    if (unanswered.length > 0) {
      setSurveyError('Por favor responde todas las preguntas antes de completar la encuesta.');
      return;
    }

    setSurveyError(null);
    setIsSubmittingSurvey(true);

    try {
      const response = await tasksService.completeTask(activeSurveyTask.id, { survey_responses: surveyResponses });
      if (response?.message) {
        setTasks((prev) => prev.map((item) => item.id === activeSurveyTask.id ? { ...item, status: 'completed', progress: 1 } : item));
        setActiveSurveyTask(null);
      }
    } catch (error) {
      console.error('Error completing survey task:', error);
      setSurveyError(error.message || 'Error al completar la encuesta.');
    } finally {
      setIsSubmittingSurvey(false);
    }
  };

  const closeVideoModal = () => {
    setActiveVideoTask(null);
    setIsYouTubeVideo(false);
    setVideoWatchedSeconds(0);
    setVideoRequiredSeconds(0);
    setVideoError(null);
    clearYoutubePoll();
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.destroy();
      youtubePlayerRef.current = null;
    }
  };

  const getTaskStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'locked':
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <PlayCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'daily':
        return <Clock className="w-5 h-5" />;
      case 'weekly':
        return <Target className="w-5 h-5" />;
      case 'special':
        return <Star className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-8">
      {planInfo && (
        <div className="w-full max-w-2xl md:max-w-4xl mx-auto">
          <div className="flex items-center justify-between p-4 md:p-6">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-800">Plan {planInfo.name}</h3>
                <p className="text-sm md:text-base text-gray-600">
                  {planInfo.dailyTasks} tareas diarias • +{planInfo.bonus}% bonus
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl md:max-w-4xl mx-auto mb-6">
        <div className="rounded-3xl bg-slate-950 text-white shadow-xl p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl md:text-3xl font-bold">Tareas Disponibles</h2>
            <div className="flex flex-wrap gap-2">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${active ? 'bg-white text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6 w-full max-w-6xl mx-auto">
        {(() => {
          const filtered = tasks.filter(task => task.type === activeTab);
          if (!filtered.length) {
            return (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center justify-center py-24 min-h-[160px]">
                <div className="text-center text-gray-600">
                  <h3 className="text-lg font-semibold">No hay tareas disponibles</h3>
                  <p className="text-sm mt-2">Por ahora no hay tareas configuradas en el panel. Vuelve más tarde.</p>
                </div>
              </div>
            );
          }

          return filtered.map((task) => {
            const Icon = task.icon || Zap;
            const completed = task.status === 'completed';
            const locked = task.status === 'locked';
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => handleTaskClick(task)}
                className={`group w-full text-left rounded-3xl border transition duration-200 overflow-hidden ${locked ? 'border-gray-200 bg-slate-100 opacity-80 cursor-not-allowed' : 'border-slate-200 bg-white hover:-translate-y-1 hover:shadow-xl'} ${completed ? 'bg-emerald-50 border-emerald-200' : ''}`}
              >
                <div className="flex flex-col gap-4 p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-3xl text-white shadow-lg ${completed ? 'bg-emerald-500' : 'bg-gradient-to-br from-slate-900 to-slate-700'}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-slate-900 md:text-xl">{task.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">{task.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                      {getTaskStatusIcon(task.status)}
                      <span>
                        {completed ? 'Completada' : locked ? 'Bloqueada' : 'Disponible'}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                      <DollarSign className="h-4 w-4" />
                      <span>+{task.reward}</span>
                    </div>
                  </div>

                  {task.provider && (
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-1">{task.provider}</span>
                      {task.payoutType && (
                        <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">{task.payoutType}</span>
                      )}
                    </div>
                  )}

                  {task.maxProgress > 1 && (
                    <div className="mt-3">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-slate-900 to-slate-700 transition-all duration-300"
                          style={{ width: `${(task.progress / task.maxProgress) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-right text-xs font-medium text-slate-500">{task.progress}/{task.maxProgress}</p>
                    </div>
                  )}
                </div>
              </button>
            );
          });
        })()}
      </div>
      {activeVideoTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-col gap-2 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{activeVideoTask.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{activeVideoTask.description}</p>
              </div>
              <button
                type="button"
                onClick={closeVideoModal}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
            <div className="px-6 py-5">
              {isYouTubeVideo ? (
                <div ref={youtubeContainerRef} className="h-[360px] w-full rounded-3xl bg-slate-900" />
              ) : (
                <video
                  ref={videoRef}
                  src={activeVideoTask.url}
                  controls
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                  className="h-72 w-full rounded-3xl bg-slate-900 object-cover"
                />
              )}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                  <span>Tiempo visto</span>
                  <span>{videoWatchedSeconds}s / {videoRequiredSeconds}s</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-900 to-slate-500 transition-all duration-300"
                    style={{ width: `${Math.min((videoWatchedSeconds / (videoRequiredSeconds || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {videoError && (
                <p className="mt-3 text-sm font-medium text-rose-600">{videoError}</p>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeVideoModal}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={completeVideoTask}
                  disabled={isCompletingVideo || videoWatchedSeconds < videoRequiredSeconds}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCompletingVideo ? 'Registrando...' : videoWatchedSeconds >= videoRequiredSeconds ? 'Completar tarea' : `Ver ${videoRequiredSeconds}s`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSurveyTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6">
          <div className="w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-col gap-2 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{activeSurveyTask.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{activeSurveyTask.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSurveyTask(null)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto space-y-6 px-6 py-5">
              <div className="rounded-3xl bg-slate-50 p-5">
                <h4 className="text-lg font-semibold text-slate-900">{activeSurveyTask.contentData?.survey_title || 'Encuesta'}</h4>
                <p className="mt-2 text-sm text-slate-600">Responde las preguntas y completa la tarea para ganar tu boost.</p>
              </div>
              {activeSurveyTask.contentData?.questions?.map((question) => (
                <div key={question.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-800">{question.question}</p>
                  {question.type === 'single_choice' && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {question.options.map((option) => (
                        <label key={option} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm cursor-pointer hover:border-slate-400">
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={surveyResponses[question.id] === option}
                            onChange={() => handleSurveyResponseChange(question.id, option)}
                            className="accent-slate-900"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {question.type === 'text' && (
                    <textarea
                      value={surveyResponses[question.id] || ''}
                      onChange={(event) => handleSurveyResponseChange(question.id, event.target.value)}
                      rows={4}
                      className="mt-4 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                      placeholder="Escribe tu respuesta aquí..."
                    />
                  )}
                </div>
              ))}
              {surveyError && (
                <p className="text-sm font-semibold text-rose-600">{surveyError}</p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setActiveSurveyTask(null)}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitSurveyTask}
                  disabled={isSubmittingSurvey}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingSurvey ? 'Enviando...' : 'Completar encuesta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksList;
