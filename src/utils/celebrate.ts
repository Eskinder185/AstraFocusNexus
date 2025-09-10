export function celebrate(selector: string = '.container') {
  try {
    const host = (document.querySelector(selector) as HTMLElement) || document.body;
    const rect = host.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + 20; // near top of container

    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    document.body.appendChild(layer);

    const colors = ['#00e5ff', '#7c4dff', '#14f195', '#f59e0b', '#ef4444', '#22c55e'];

    const count = 20;
    for (let i = 0; i < count; i++) {
      const div = document.createElement('div');
      div.className = 'confetti-piece';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = 60 + Math.random() * 60;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 60; // upward bias
      div.style.left = `${cx}px`;
      div.style.top = `${cy}px`;
      (div.style as any)['--dx'] = `${dx}px`;
      (div.style as any)['--dy'] = `${dy}px`;
      div.style.background = colors[Math.floor(Math.random() * colors.length)];
      layer.appendChild(div);
    }

    // cleanup
    setTimeout(() => {
      layer.remove();
    }, 1000);
  } catch {}
}

