# Avengers: Doomsday Countdown

Uma página de contagem regressiva inspirada na campanha de *Avengers: Doomsday*.

O projeto usa um vídeo em loop como cenário, algarismos em sprite, áudio sincronizado e um player de trailer com transição em formato de cortina. O contador termina em 18 de dezembro de 2026.

## Rodando localmente

Requer Node.js 20 ou mais recente.

```bash
npm install
npm run dev
```

A página fica disponível em [localhost:3000](http://localhost:3000).

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm start
```

## Estrutura

- `src/app`: página, metadata e estilos globais
- `src/components/CountdownTimer.tsx`: contador, áudio e player do trailer
- `src/hooks/useCountdown.ts`: cálculo do tempo restante
- `public`: vídeos, fontes, sons e sprites usados pela interface

## Aviso

Este é um projeto de fã sem vínculo com Marvel Studios ou Disney. As marcas e os materiais associados a *Avengers: Doomsday* pertencem aos seus respectivos proprietários.
