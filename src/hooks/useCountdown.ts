"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const now = new Date();
  const target = new Date(targetDate);
  const difference = target.getTime() - now.getTime();

  if (difference <= 0) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };

  let months = (target.getUTCFullYear() - now.getUTCFullYear()) * 12 + target.getUTCMonth() - now.getUTCMonth();
  let anchor = new Date(now);
  anchor.setUTCMonth(anchor.getUTCMonth() + months);
  if (anchor > target) {
    months -= 1;
    anchor = new Date(now);
    anchor.setUTCMonth(anchor.getUTCMonth() + months);
  }

  const remaining = target.getTime() - anchor.getTime();
  return {
    months,
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000),
    isComplete: false,
  };
}

export function useCountdown(targetDate: string): TimeLeft {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isComplete: false,
  });
  useEffect(() => {
    const update = () => setTimeLeft(calculateTimeLeft(targetDate));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [targetDate]);
  return timeLeft;
}
