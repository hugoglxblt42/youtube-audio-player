// --- Utilitaires ---
function extractVideoId(input) {
  if (!input) return "";
  input = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const patterns = [
    /(?:v=)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return "";
}

function fmtTime(s) {
  if (!isFinite(s)) return '0:00';
  s = Math.floor(s);
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, '0');
  return m + ':' + r;
}

// --- Éléments UI ---
const el = (id) => document.getElementById(id);
const $in = el('input');
const $load = el('load');
const $play = el('play');
const $mute = el('mute');
const $seek = el('seek');
const $vol = el('vol');
const $meta = el('meta');
const $thumb = el('thumb');
const $title = el('title');
const $channel = el('channel');
const $ytlink = el('ytlink');
const $tcur = el('tcur');
const $tdur = el('tdur');

let player = null;
let loadedId = '';
let isPlaying = false;

// --- Charger l'API IFrame ---
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(tag);

window.onYouTubeIframeAPIReady = function () {
  player = new YT.Player('yt-player', {
    height: '0',
    width: '0',
    videoId: '',
    playerVars: { controls: 0, rel: 0, modestbranding: 1 },
    events: {
      onReady: (e) => { e.target.setVolume(60); },
      onStateChange: (e) => {
        const S = YT.PlayerState;
        if (e.data === S.PLAYING) { isPlaying = true; $play.textContent = '⏸'; }
        if (e.data === S.PAUSED) { isPlaying = false; $play.textContent = '▶'; }
        if (e.data === S.ENDED) { isPlaying = false; $play.textContent = '▶'; $seek.value = 0; }
      }
    }
  });
};

// --- Bouton Charger ---
$load.addEventListener('click', () => {
  const id = extractVideoId($in.value);
  if (!id) { alert('Lien/ID invalide'); return; }
  loadedId = id;
  player && player.loadVideoById(id);
  $thumb.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  $ytlink.href = `https://www.youtube.com/watch?v=${id}`;
  $meta.style.display = '';
  setTimeout(() => {
    try {
      const data = player.getVideoData();
      $title.textContent = data?.title || 'Vidéo YouTube';
      $channel.textContent = data?.author || '';
    } catch { }
  }, 400);
});

// --- Lecture / Pause ---
$play.addEventListener('click', () => {
  if (!loadedId) return;
  if (!isPlaying) player.playVideo();
  else player.pauseVideo();
});

// --- Mute ---
$mute.addEventListener('click', () => {
  if (!player) return;
  if (player.isMuted()) {
    player.unMute();
    $mute.textContent = '🔈';
  } else {
    player.mute();
    $mute.textContent = '🔇';
  }
});

// --- Volume ---
$vol.addEventListener('input', () => {
  if (player) {
    const vol = parseInt($vol.value, 10);
    player.setVolume(vol);
    if (vol === 0) $mute.textContent = '🔇';
  }
});

// --- Seekbar & rafraîchissement ---
$seek.addEventListener('input', () => {
  if (player) player.seekTo(parseInt($seek.value, 10), true);
});

setInterval(() => {
  if (!player) return;
  try {
    const cur = player.getCurrentTime();
    const dur = player.getDuration();
    if (isFinite(cur) && isFinite(dur) && dur > 0) {
      $seek.max = Math.floor(dur);
      $seek.value = Math.floor(cur);
      $tcur.textContent = fmtTime(cur);
      $tdur.textContent = fmtTime(dur);
    }
    if (loadedId && !$title.textContent) {
      const data = player.getVideoData();
      $title.textContent = data?.title || $title.textContent;
      $channel.textContent = data?.author || $channel.textContent;
    }
  } catch { }
}, 500);


// --- Dernières vidéos d'une chaîne (via RSS + rss2json) ---
async function loadLatestVideos(channelId) {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data.items) {
      console.error("Pas de vidéos trouvées");
      return;
    }

    // Récupère les 5 dernières vidéos
    const videos = data.items.slice(0, 5);

    const $results = document.getElementById('results');
    $results.innerHTML = videos.map(v => {
      const id = v.link.split("v=")[1];
      return `
        <div class="video">
          <img src="${v.thumbnail}" alt="${v.title}" style="width:120px;height:auto" />
          <div>
            <p>${v.title}</p>
            <button onclick="loadVideoFromList('${id}', &quot;${v.title}&quot;, &quot;${v.author}&quot;)">Lire</button>

          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Erreur RSS:", err);
  }
}

// --- Chargement depuis la liste ---
function loadVideoFromList(id, title, author) {
  loadedId = id;
  player && player.loadVideoById(id);
  $thumb.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  $ytlink.href = `https://www.youtube.com/watch?v=${id}`;
  $meta.style.display = '';
  $title.textContent = title || "Vidéo YouTube";
  $channel.textContent = author || "";
}


// charge les vidéos de la chaîne Romain Molina
loadLatestVideos("UCxfusAsd_n5AMFheiipyaCw");
