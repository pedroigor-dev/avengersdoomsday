"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { useEffect, useRef, useState } from "react";

interface CountdownTimerProps {
  targetDate: string;
}

const legalLinks = [
  ["Privacy Policy", "https://privacy.thewaltdisneycompany.com/en/current-privacy-policy/"],
  ["Terms of Use", "https://disneytermsofuse.com"],
  ["Interest-based Ads", "https://privacy.thewaltdisneycompany.com/en/privacy-controls/online-tracking-and-advertising/"],
  ["Children's Online Privacy Policy", "https://disneyprivacycenter.com/kids-privacy-policy/english/"],
  ["Your US State Privacy Rights", "https://privacy.thewaltdisneycompany.com/en/current-privacy-policy/your-us-state-privacy-rights/"],
];

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const time = useCountdown(targetDate);
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const tickRef = useRef<HTMLAudioElement>(null);
  const trailerRef = useRef<HTMLIFrameElement>(null);
  const previousSecond = useRef(time.seconds);
  const [introFinished, setIntroFinished] = useState(false);
  const [muted, setMuted] = useState(true);
  const [trailerVisible, setTrailerVisible] = useState(false);
  const [trailerClosing, setTrailerClosing] = useState(false);

  useEffect(() => {
    if (previousSecond.current !== time.seconds && !muted) {
      const tick = tickRef.current;
      if (tick) {
        tick.currentTime = 0;
        void tick.play().catch(() => undefined);
      }
    }
    previousSecond.current = time.seconds;
  }, [time.seconds, muted]);

  useEffect(() => {
    function receiveYouTubeEvent(event: MessageEvent) {
      if (!event.origin.includes("youtube.com")) return;
      try {
        const message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (message?.event === "onStateChange" && message.info === 0) {
          setTrailerClosing(true);
          window.setTimeout(() => {
            setTrailerVisible(false);
            setTrailerClosing(false);
          }, 850);
        }
      } catch {
        // Other YouTube messages are not JSON events we need to handle.
      }
    }
    window.addEventListener("message", receiveYouTubeEvent);
    return () => window.removeEventListener("message", receiveYouTubeEvent);
  });

  function toggleAudio() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (!nextMuted) {
      const activeVideo = introFinished ? loopRef.current : introRef.current;
      if (activeVideo) void activeVideo.play().catch(() => undefined);
    }
  }

  function finishIntro() {
    setIntroFinished(true);
    if (loopRef.current) void loopRef.current.play().catch(() => undefined);
  }

  function openTrailer() {
    setTrailerClosing(false);
    setTrailerVisible(true);
  }

  function closeTrailer() {
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

  return (
    <div className={`doomsday is-ready ${trailerVisible ? "trailer-active" : ""}`}>
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

      <button className="audio-button" onClick={toggleAudio} aria-label={muted ? "Ativar áudio" : "Desativar áudio"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={muted ? "/audiooff.svg" : "/audio.svg"} alt="" />
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
      <nav className="legal" aria-label="Links legais">
        {legalLinks.map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>
        ))}
      </nav>
      <span className="signature">by: pedrodev</span>

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
