"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface CountdownTimerProps {
  targetDate: string;
}

type IntroPhase = "loading" | "revealing" | "done";
type ShareStatus = "idle" | "generating" | "ready" | "error";

interface StorySnapshot {
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const time = useCountdown(targetDate);
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const tickRef = useRef<HTMLAudioElement>(null);
  const ambientRef = useRef<HTMLAudioElement>(null);
  const trailerRef = useRef<HTMLIFrameElement>(null);
  const audioFadeFrame = useRef<number | null>(null);
  const previousSecond = useRef(time.seconds);
  const tickCycle = useRef(0);
  const [introFinished, setIntroFinished] = useState(false);
  const [muted, setMuted] = useState(true);
  const [trailerVisible, setTrailerVisible] = useState(false);
  const [trailerClosing, setTrailerClosing] = useState(false);
  const [introPhase, setIntroPhase] = useState<IntroPhase>("loading");
  const [signalGlitch, setSignalGlitch] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [shareImageFile, setShareImageFile] = useState<File | null>(null);
  const [shareError, setShareError] = useState("");

  function fadeSiteAudio(targetLevel: number, duration: number) {
    if (audioFadeFrame.current !== null) window.cancelAnimationFrame(audioFadeFrame.current);

    const media = [
      { element: introRef.current, baseVolume: 1 },
      { element: loopRef.current, baseVolume: 1 },
      { element: tickRef.current, baseVolume: 1 },
      { element: ambientRef.current, baseVolume: 0.13 },
    ].filter((track): track is { element: HTMLMediaElement; baseVolume: number } => track.element !== null);
    const initialVolumes = media.map(({ element }) => element.volume);
    const startedAt = performance.now();

    const updateVolume = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = progress * progress * (3 - 2 * progress);

      media.forEach(({ element, baseVolume }, index) => {
        const targetVolume = baseVolume * targetLevel;
        element.volume = initialVolumes[index] + (targetVolume - initialVolumes[index]) * easedProgress;
      });

      if (progress < 1) {
        audioFadeFrame.current = window.requestAnimationFrame(updateVolume);
      } else {
        audioFadeFrame.current = null;
      }
    };

    audioFadeFrame.current = window.requestAnimationFrame(updateVolume);
  }

  useEffect(() => {
    let finishTimer: number | undefined;
    const revealTimer = window.setTimeout(() => {
      setIntroPhase("revealing");
      finishTimer = window.setTimeout(() => setIntroPhase("done"), 3400);
    }, 5000);

    return () => {
      window.clearTimeout(revealTimer);
      if (finishTimer) window.clearTimeout(finishTimer);
    };
  }, []);

  useEffect(() => {
    let triggerTimer: number | undefined;
    let stopTimer: number | undefined;

    const schedule = () => {
      const delay = 5000 + Math.random() * 5000;
      triggerTimer = window.setTimeout(() => {
        setSignalGlitch(true);
        stopTimer = window.setTimeout(() => {
          setSignalGlitch(false);
          schedule();
        }, 1400);
      }, delay);
    };

    schedule();
    return () => {
      if (triggerTimer) window.clearTimeout(triggerTimer);
      if (stopTimer) window.clearTimeout(stopTimer);
    };
  }, []);

  useEffect(() => {
    if (previousSecond.current !== time.seconds && !muted) {
      const tick = tickRef.current;
      if (tick && tickCycle.current % 2 === 0) {
        tick.currentTime = 0;
        void tick.play().catch(() => undefined);
      }
      tickCycle.current += 1;
    }
    previousSecond.current = time.seconds;
  }, [time.seconds, muted]);

  useEffect(() => {
    function receiveYouTubeEvent(event: MessageEvent) {
      if (!event.origin.includes("youtube.com")) return;
      try {
        const message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (message?.event === "onStateChange" && message.info === 0) {
          if (!muted) fadeSiteAudio(1, 1300);
          setTrailerClosing(true);
          window.setTimeout(() => {
            setTrailerVisible(false);
            setTrailerClosing(false);
          }, 850);
        }
      } catch {}
    }
    window.addEventListener("message", receiveYouTubeEvent);
    return () => window.removeEventListener("message", receiveYouTubeEvent);
  });

  function toggleAudio() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (!nextMuted) {
      const ambient = ambientRef.current;
      if (ambient) {
        ambient.volume = 0.13;
        if (ambient.currentTime < 50.923) ambient.currentTime = 50.923;
        void ambient.play().catch(() => undefined);
      }
      fadeSiteAudio(trailerVisible ? 0 : 1, 350);
      const activeVideo = introFinished ? loopRef.current : introRef.current;
      if (activeVideo) void activeVideo.play().catch(() => undefined);
    }
  }

  function finishIntro() {
    setIntroFinished(true);
    if (loopRef.current) void loopRef.current.play().catch(() => undefined);
  }

  function restartAmbient() {
    const ambient = ambientRef.current;
    if (!ambient) return;
    ambient.currentTime = 50.923;
    void ambient.play().catch(() => undefined);
  }

  function openTrailer() {
    if (!muted) fadeSiteAudio(0, 900);
    setTrailerClosing(false);
    setTrailerVisible(true);
  }

  function closeTrailer() {
    if (!muted) fadeSiteAudio(1, 1300);
    setTrailerClosing(true);
    window.setTimeout(() => {
      setTrailerVisible(false);
      setTrailerClosing(false);
    }, 850);
  }

  function connectYouTubePlayer() {
    trailerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: "doomsday-trailer" }),
      "https://www.youtube.com",
    );
  }

  function drawStoryFrame(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    logo: HTMLImageElement,
    snapshot: StorySnapshot,
  ) {
    const { width, height } = canvas;
    const videoWidth = video.videoWidth || 1920;
    const videoHeight = video.videoHeight || 1920;
    const sourceHeight = videoHeight / 2.1;
    const sourceWidth = sourceHeight * (width / height);

    context.drawImage(
      video,
      (videoWidth - sourceWidth) / 2,
      (videoHeight - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );

    const shade = context.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, "rgba(0,0,0,.5)");
    shade.addColorStop(.35, "rgba(0,0,0,.05)");
    shade.addColorStop(.72, "rgba(0,0,0,.12)");
    shade.addColorStop(1, "rgba(0,0,0,.78)");
    context.fillStyle = shade;
    context.fillRect(0, 0, width, height);

    const logoWidth = width * .64;
    const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
    context.drawImage(logo, (width - logoWidth) / 2, height * .12, logoWidth, logoHeight);

    context.textAlign = "center";
    context.fillStyle = "#fff";
    context.shadowColor = "rgba(0,0,0,.9)";
    context.shadowBlur = 18;
    context.font = "900 34px 'Avenir Doomsday', Arial";
    context.letterSpacing = "5px";
    context.fillText("DOOMSDAY IS COMING", width / 2, height * .58);

    const values = [snapshot.months, snapshot.days, snapshot.hours, snapshot.minutes, snapshot.seconds]
      .map((value) => String(value).padStart(2, "0"));
    context.font = "900 62px 'Avenir Doomsday', Arial";
    context.letterSpacing = "8px";
    context.fillText(values.join(":"), width / 2, height * .65);

    const labels = ["MONTHS", "DAYS", "HOURS", "MINUTES", "SECONDS"];
    context.font = "800 13px 'Avenir Doomsday', Arial";
    context.letterSpacing = "2px";
    const startX = width * .145;
    const gap = width * .1775;
    labels.forEach((label, index) => context.fillText(label, startX + gap * index, height * .685));

    context.font = "400 15px Arial";
    context.letterSpacing = "1px";
    context.fillStyle = "rgba(255,255,255,.78)";
    context.fillText("DOOMSDAY - DEVPEDRO", width / 2, height * .91);
    context.shadowBlur = 0;
  }

  async function generateStory(snapshot: StorySnapshot) {
    try {
      setShareStatus("generating");
      setShareError("");
      setShareImageFile(null);
      await document.fonts.ready;

      const preferredVideo = introFinished ? loopRef.current : introRef.current;
      const alternateVideo = introFinished ? introRef.current : loopRef.current;
      const video = [preferredVideo, alternateVideo].find(
        (candidate) => candidate && candidate.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
      ) ?? preferredVideo;
      if (!video) throw new Error("Background video unavailable");

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("Video frame unavailable")), 5000);
          const finish = () => {
            window.clearTimeout(timeout);
            video.removeEventListener("loadeddata", finish);
            video.removeEventListener("error", fail);
            resolve();
          };
          const fail = () => {
            window.clearTimeout(timeout);
            video.removeEventListener("loadeddata", finish);
            video.removeEventListener("error", fail);
            reject(new Error("Video failed to load"));
          };
          video.addEventListener("loadeddata", finish, { once: true });
          video.addEventListener("error", fail, { once: true });
          video.load();
        });
      }

      const logo = new window.Image();
      logo.src = "/logo-clean.png";
      if (!logo.complete) {
        await new Promise<void>((resolve, reject) => {
          logo.onload = () => resolve();
          logo.onerror = () => reject(new Error("Logo unavailable"));
        });
      } else if (logo.decode) {
        await logo.decode();
      }

      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 1280;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      drawStoryFrame(context, canvas, video, logo, snapshot);
      const imageBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!imageBlob) throw new Error("Image generation failed");
      const imageFile = new File([imageBlob], "doomsday-countdown.png", { type: "image/png" });
      setShareImageFile(imageFile);

      setShareStatus("ready");
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Falha ao gerar a mídia");
      setShareStatus("error");
    }
  }

  function prepareShare() {
    if (window.self !== window.top) {
      const directPage = window.open(window.location.href, "_blank", "noopener,noreferrer");
      if (!directPage) {
        setShareError("Abra avengersdoomsdaydev.vercel.app diretamente no Chrome para compartilhar.");
        setShareStatus("error");
        setShareOpen(true);
      }
      return;
    }
    const snapshot = {
      months: time.months,
      days: time.days,
      hours: time.hours,
      minutes: time.minutes,
      seconds: time.seconds,
    };
    setShareOpen(true);
    void generateStory(snapshot);
  }

  async function shareStory() {
    if (!shareImageFile) return;
    if (window.self !== window.top) {
      setShareError("A página está dentro de um preview que bloqueia compartilhamentos. Abra avengersdoomsdaydev.vercel.app diretamente no Chrome.");
      setShareStatus("error");
      return;
    }
    let selectedFile: File | null = null;
    try {
      if (navigator.canShare?.({ files: [shareImageFile] })) selectedFile = shareImageFile;
    } catch {
      selectedFile = null;
    }

    if (navigator.share) {
      try {
        if (selectedFile) {
          await navigator.share({ files: [selectedFile] });
        } else {
          await navigator.share({
            title: "DOOMSDAY IS COMING",
            text: "Minha contagem regressiva para Avengers: Doomsday",
            url: window.location.href,
          });
        }
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setShareError(error instanceof Error ? `${error.name}: ${error.message}` : "O sistema recusou o compartilhamento");
      }
    } else {
      setShareError(window.isSecureContext
        ? "Este navegador não disponibilizou o menu nativo de compartilhamento."
        : "O compartilhamento exige que o site seja aberto por HTTPS.");
    }
    setShareStatus("error");
  }

  return (
    <div className={`doomsday is-ready ${trailerVisible ? "trailer-active" : ""} ${signalGlitch && introPhase === "done" && !trailerVisible ? "signal-glitch" : ""}`}>
      <video
        ref={introRef}
        className={`doomsday__video ${introFinished ? "is-hidden" : ""}`}
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        onEnded={finishIntro}
      >
        <source src="/countdown_1920x1920.mp4" type="video/mp4" />
      </video>
      <video
        ref={loopRef}
        className={`doomsday__video ${introFinished ? "" : "is-hidden"}`}
        muted={muted}
        playsInline
        loop
        preload="auto"
      >
        <source src="/countdown_1920x1920_loop.mp4" type="video/mp4" />
      </video>

      <audio ref={tickRef} src="/sounds/tick.mp3" preload="auto" />
      <audio ref={ambientRef} src="/sounds/1234.mp3" preload="auto" muted={muted} onEnded={restartAmbient} />
      <div className="signal-overlay" aria-hidden="true" />

      <button className="audio-button" onClick={toggleAudio} aria-label={muted ? "Ativar áudio" : "Desativar áudio"}>
        <Image src={muted ? "/audiooff.svg" : "/audio.svg"} alt="" width={48} height={48} />
      </button>
      <button className="share-button" onClick={prepareShare} aria-label="Compartilhar contagem nos Stories">
        <span>SHARE</span>
      </button>

      <main className="countdown-content">
        <button className="trailer-play" onClick={openTrailer} aria-label="Assistir ao trailer">
          <span className="trailer-play__triangle" />
          <span className="trailer-play__label">WATCH TRAILER</span>
        </button>
        <h1>DOOMSDAY IS COMING</h1>
        {time.isComplete ? (
          <p className="time-arrived">IT&apos;S TIME</p>
        ) : (
          <div className="timer" aria-label={`${time.months} meses, ${time.days} dias, ${time.hours} horas, ${time.minutes} minutos e ${time.seconds} segundos`}>
            <TimeUnit value={time.months} label="MONTHS" />
            <Separator />
            <TimeUnit value={time.days} label="DAYS" />
            <Separator />
            <TimeUnit value={time.hours} label="HOURS" />
            <Separator />
            <TimeUnit value={time.minutes} label="MINUTES" />
            <Separator />
            <TimeUnit value={time.seconds} label="SECONDS" />
          </div>
        )}
      </main>

      <div className="bottom-gradient" />
      <footer className="legal">
        <span>AVENGERS: DOOMSDAY, seus personagens, nomes, imagens e marcas relacionadas são © Marvel. Este é um projeto de fã não oficial, sem vínculo, patrocínio ou aprovação da Marvel Studios ou da The Walt Disney Company.</span>
        <a href="https://www.marvel.com/movies" target="_blank" rel="noreferrer">Visite o site oficial da Marvel Studios</a>
      </footer>
      <span className="signature">by: pedrodev</span>

      {shareOpen && (
        <section className="share-dialog" role="dialog" aria-modal="true" aria-label="Compartilhar nos Stories">
          <div className="share-dialog__panel">
            <button className="share-dialog__close" onClick={() => setShareOpen(false)} aria-label="Fechar">×</button>
            <span className="share-dialog__eyebrow">INSTAGRAM STORIES</span>
            <h2>{shareStatus === "generating" ? "CRIANDO SEU STORY" : "SEU STORY ESTÁ PRONTO"}</h2>
            {shareStatus === "generating" && <div className="share-loader"><span /></div>}
            {shareStatus === "ready" && (
              <>
                <p>O horário foi congelado no instante em que você tocou em compartilhar. Escolha Instagram na próxima tela e publique nos Stories.</p>
                <button className="share-dialog__action" onClick={shareStory}>COMPARTILHAR AGORA</button>
              </>
            )}
            {shareStatus === "error" && (
              <>
                <p>Não foi possível abrir o compartilhamento neste aparelho.</p>
                {shareError && <p className="share-dialog__detail">Detalhe: {shareError}</p>}
              </>
            )}
          </div>
        </section>
      )}

      <div className={`intro-layer is-${introPhase}`} aria-hidden={introPhase === "done"}>
        <div className="intro-backdrop" />
        <div className="intro-light" />
        <Image
          className="intro-logo"
          src="/logo-clean.png"
          alt="Avengers: Doomsday"
          width={1193}
          height={670}
          priority
        />
      </div>

      {trailerVisible && (
        <section className={`trailer-overlay ${trailerClosing ? "is-closing" : ""}`} aria-label="Trailer de Avengers: Doomsday">
          <div className="curtain curtain--top" />
          <div className="curtain curtain--bottom" />
          <div className="trailer-frame">
            <iframe
              id="doomsday-trailer"
              ref={trailerRef}
              src="https://www.youtube.com/embed/TcBtFtkQFiU?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1"
              title="Avengers: Doomsday trailer"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              onLoad={connectYouTubePlayer}
            />
          </div>
          <button className="trailer-close" onClick={closeTrailer} aria-label="Fechar trailer">×</button>
        </section>
      )}
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  const digits = String(value).padStart(2, "0").slice(-2);
  return (
    <div className="time-unit">
      <div className="digit-pair">
        <Digit value={Number(digits[0])} />
        <Digit value={Number(digits[1])} />
      </div>
      <span>{label}</span>
    </div>
  );
}

function Digit({ value }: { value: number }) {
  const items = Array.from({ length: 11 }, (_, index) => index % 10);
  return (
    <div className="digit-slot" aria-hidden="true">
      <div className="digit-clip">
        <div className="digit-strip" style={{ transform: `translateY(-${value * (100 / 11)}%) translateZ(0)` }}>
          {items.map((digit, index) => {
            const column = digit % 4;
            const row = Math.floor(digit / 4);
            return <div key={index} className="digit" style={{ backgroundPosition: `${2.5 - column * 75}px ${2.5 - row * 75}px` }} />;
          })}
        </div>
      </div>
    </div>
  );
}

function Separator() {
  return <span className="separator" aria-hidden="true">:</span>;
}
