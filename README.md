<h1 align="center">
  <br>
  <img src="public/favicon.png" alt="Backrooms Online" width="64">
  <br>
  BACKROOMS ONLINE
</h1>

<p align="center">
  <i>Você não deveria estar aqui.</i>
  <br><br>
  <a href="https://mcookinho.github.io/Backrooms-Online/">▶ Jogar agora</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square">
  <img src="https://img.shields.io/badge/engine-Three.js-blue?style=flat-square">
  <img src="https://img.shields.io/badge/build-Vite-purple?style=flat-square">
</p>

---

## Sobre

**Backrooms Online** é um jogo de exploração e horror em primeira pessoa ambientado nos **Backrooms** — um espaço infinito de corredores amarelados, salas vazias e um zumbido elétrico constante. Inspirado na creepypasta original e na estética VHS dos anos 90.

Você acorda em um nível infinito de escritórios monótonos. Sem memória. Sem saída óbvia. Apenas o zumbido das luzes fluorescentes e a sensação de que algo está errado.

## Características

- **Mundo procedural** — Um grid de 160×120 tiles (640m × 480m) com 40 zonas geradas proceduralmente: salas, corredores, salões abertos, labirintos, áreas elevadas e fossos.
- **Altura variável** — Pisos com elevação dinâmica, rampas inclinadas e paredes que se adaptam ao terreno. Nada é perfeitamente plano.
- **Lanterna** — Encontre uma lanterna para iluminar a escuridão. Pilhas extras espalhadas pelo mapa.
- **Sistema de inventário** — Colete itens: Água de Amêndoas (cura), Pilhas, Kit Médico, Isqueiro, Notas e Chaves.
- **Ameaças** — Entidades patrulham o nível. Algumas são rápidas. Outras são implacáveis.
- **HUD analógico** — Interface no estilo VHS: barras de vida e stamina, mira e prompts de interação.
- **Som ambiente imersivo** — Zumbido de luzes fluorescentes, passos no carpete, clique da lanterna — tudo com áudio real CC0.
- **Controles** — WASD para mover, Shift para correr, Espaço para pular, E para interagir, F para lanterna, I para inventário. Suporte a mobile com joystick virtual.

## Itens

| Item | Efeito |
|------|--------|
| Água de Amêndoas | Cura 25 HP |
| Kit Médico | Cura 50 HP |
| Lanterna | Ilumina áreas escuras |
| Pilhas | Recarregam a lanterna |
| Isqueiro | Ilumina temporariamente |
| Nota | Fragmentos de lore |
| Chave | Abre portas trancadas |

## Tecnologias

- **[Three.js](https://threejs.org/)** — Renderização 3D via WebGL
- **[Vite](https://vitejs.dev/)** — Build e dev server
- **[gh-pages](https://github.com/tschaub/gh-pages)** — Deploy automático
- **[Freesound.org](https://freesound.org/)** — Efeitos sonoros CC0

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em modo dev
npm run dev

# Build de produção
npm run build

# Deploy para GitHub Pages
npm run deploy
```

## Licença

MIT

---

<p align="center">
  <i>"Se você ouvir um zumbido, não o siga."</i>
</p>
