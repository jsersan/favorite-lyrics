const API_URL = 'https://api.lyrics.ovh/v1';
    
const elements = {
  form: document.getElementById('searchForm'),
  artistInput: document.getElementById('artist'),
  titleInput: document.getElementById('title'),
  searchBtn: document.getElementById('searchBtn'),
  clearBtn: document.getElementById('clearBtn'),
  loadingMessage: document.getElementById('loadingMessage'),
  errorMessage: document.getElementById('errorMessage'),
  lyricsBox: document.getElementById('lyricsBox'),
  lyricsTitle: document.getElementById('lyricsTitle'),
  lyricsContent: document.getElementById('lyricsContent'),
  favoriteBtn: document.getElementById('favoriteBtn'),
  favoritesSection: document.getElementById('favoritesSection'),
  favoritesList: document.getElementById('favoritesList')
};

let isLoading = false;
let currentSong = null;
let favorites = [];

// Cargar favoritos al iniciar
function loadFavorites() {
  try {
    const saved = localStorage.getItem('lyrics_favorites');
    if (saved) {
      favorites = JSON.parse(saved);
      renderFavorites();
    }
  } catch (error) {
    console.log('No hay favoritos guardados todavía');
    favorites = [];
  }
}

// Guardar favoritos
function saveFavorites() {
  try {
    localStorage.setItem('lyrics_favorites', JSON.stringify(favorites));
  } catch (error) {
    console.error('Error al guardar favoritos:', error);
  }
}

// Renderizar lista de favoritos
function renderFavorites() {
  if (favorites.length === 0) {
    elements.favoritesSection.classList.add('hidden');
    return;
  }

  elements.favoritesSection.classList.remove('hidden');
  elements.favoritesList.innerHTML = '';

  favorites.forEach((fav, index) => {
    const item = document.createElement('div');
    item.className = 'favorite-item';
    item.innerHTML = `
      <div class="favorite-info" data-index="${index}">
        <h4>${fav.title}</h4>
        <p>${fav.artist}</p>
      </div>
      <div class="favorite-actions">
        <button class="btn-icon btn-delete" data-index="${index}" title="Eliminar">
          🗑️
        </button>
      </div>
    `;
    elements.favoritesList.appendChild(item);
  });

  // Event listeners para cargar canción
  document.querySelectorAll('.favorite-info').forEach(el => {
    el.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      loadFavoriteSong(favorites[index]);
    });
  });

  // Event listeners para eliminar
  document.querySelectorAll('.btn-delete').forEach(el => {
    el.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      removeFavorite(index);
    });
  });
}

// Cargar canción favorita
async function loadFavoriteSong(song) {
  elements.artistInput.value = song.artist;
  elements.titleInput.value = song.title;
  
  // Mostrar letras guardadas si existen
  if (song.lyrics) {
    displayLyrics(song.artist, song.title, song.lyrics);
    currentSong = song;
    updateFavoriteButton();
  } else {
    // Si no hay letras guardadas, buscarlas
    await searchLyrics(new Event('submit'));
  }
  
  // Scroll suave hacia las letras
  elements.lyricsBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Eliminar favorito
function removeFavorite(index) {
  favorites.splice(index, 1);
  saveFavorites();
  renderFavorites();
  updateFavoriteButton();
}

// Verificar si la canción actual está en favoritos
function isFavorite() {
  if (!currentSong) return false;
  return favorites.some(fav => 
    fav.artist.toLowerCase() === currentSong.artist.toLowerCase() &&
    fav.title.toLowerCase() === currentSong.title.toLowerCase()
  );
}

// Actualizar botón de favoritos
function updateFavoriteButton() {
  if (isFavorite()) {
    elements.favoriteBtn.classList.add('active');
    elements.favoriteBtn.textContent = '⭐';
    elements.favoriteBtn.title = 'Quitar de favoritos';
  } else {
    elements.favoriteBtn.classList.remove('active');
    elements.favoriteBtn.textContent = '☆';
    elements.favoriteBtn.title = 'Añadir a favoritos';
  }
}

// Toggle favorito
function toggleFavorite() {
  if (!currentSong) return;

  const favIndex = favorites.findIndex(fav => 
    fav.artist.toLowerCase() === currentSong.artist.toLowerCase() &&
    fav.title.toLowerCase() === currentSong.title.toLowerCase()
  );

  if (favIndex >= 0) {
    // Quitar de favoritos
    favorites.splice(favIndex, 1);
  } else {
    // Añadir a favoritos
    favorites.push({
      artist: currentSong.artist,
      title: currentSong.title,
      lyrics: currentSong.lyrics,
      addedAt: new Date().toISOString()
    });
  }

  saveFavorites();
  renderFavorites();
  updateFavoriteButton();
}

function normalizeText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"');
}

function encodeParameter(param) {
  return encodeURIComponent(normalizeText(param));
}

function cleanLyrics(lyrics) {
  if (!lyrics) return '';
  
  return lyrics
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
}

function setLoading(loading) {
  isLoading = loading;
  elements.searchBtn.disabled = loading;
  elements.clearBtn.disabled = loading;
  elements.artistInput.disabled = loading;
  elements.titleInput.disabled = loading;
  elements.searchBtn.textContent = loading ? 'Buscando...' : 'Buscar';
  
  elements.loadingMessage.classList.toggle('hidden', !loading);
}

function showError(message) {
  elements.errorMessage.querySelector('p').textContent = message;
  elements.errorMessage.classList.remove('hidden');
  elements.lyricsBox.classList.add('hidden');
}

function hideError() {
  elements.errorMessage.classList.add('hidden');
}

function displayLyrics(artist, title, lyrics) {
  const cleanedLyrics = cleanLyrics(lyrics);
  const lines = cleanedLyrics.split('\n');
  
  currentSong = {
    artist: artist,
    title: title,
    lyrics: cleanedLyrics
  };
  
  elements.lyricsTitle.textContent = `${artist} - ${title}`;
  elements.lyricsContent.innerHTML = '';
  
  lines.forEach(line => {
    const p = document.createElement('p');
    p.className = 'lyrics-line';
    p.textContent = line;
    elements.lyricsContent.appendChild(p);
  });
  
  elements.lyricsBox.classList.remove('hidden');
  elements.errorMessage.classList.add('hidden');
  updateFavoriteButton();
}

async function getLyrics(artist, title) {
  const encodedArtist = encodeParameter(artist);
  const encodedTitle = encodeParameter(title);
  const url = `${API_URL}/${encodedArtist}/${encodedTitle}`;

  console.log('URL de búsqueda:', url);

  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('No se encontró la canción. Verifica el nombre del artista y la canción.');
    } else {
      throw new Error(`Error del servidor: ${response.status}`);
    }
  }
  
  return await response.json();
}

async function trySearchVariations(artist, title, variations, index = 0) {
  if (index >= variations.length) {
    setLoading(false);
    showError('No se encontró la canción. Verifica el nombre del artista y la canción.');
    return;
  }

  const currentTitle = variations[index];
  console.log(`Intento ${index + 1}/${variations.length}: "${currentTitle}"`);

  try {
    const response = await getLyrics(artist, currentTitle);
    setLoading(false);
    
    if (response && response.lyrics) {
      displayLyrics(artist, title, response.lyrics);
      console.log('✓ Búsqueda exitosa con:', currentTitle);
    } else {
      showError('No se encontraron letras para esta canción.');
    }
  } catch (error) {
    await trySearchVariations(artist, title, variations, index + 1);
  }
}

async function searchLyrics(e) {
  e.preventDefault();
  
  const artist = elements.artistInput.value.trim();
  const title = elements.titleInput.value.trim();

  if (!artist || !title) {
    showError('Por favor, ingresa el nombre del artista y la canción.');
    return;
  }

  hideError();
  elements.lyricsBox.classList.add('hidden');
  setLoading(true);

  const variations = [];
  const originalTitle = title;
  
  variations.push(originalTitle);
  
  if (!originalTitle.endsWith('!')) {
    variations.push(originalTitle + '!');
  }
  
  const withoutPunctuation = originalTitle.replace(/[!?.,;:]/g, '').trim();
  if (withoutPunctuation !== originalTitle && !variations.includes(withoutPunctuation)) {
    variations.push(withoutPunctuation);
  }
  
  if (!originalTitle.endsWith('?')) {
    variations.push(originalTitle + '?');
  }
  
  const capitalized = originalTitle.charAt(0).toUpperCase() + originalTitle.slice(1).toLowerCase();
  if (capitalized !== originalTitle && !variations.includes(capitalized)) {
    variations.push(capitalized);
  }

  console.log('Variaciones a intentar:', variations);
  
  await trySearchVariations(artist, title, variations);
}

function clearSearch() {
  elements.artistInput.value = '';
  elements.titleInput.value = '';
  elements.lyricsBox.classList.add('hidden');
  hideError();
  setLoading(false);
  currentSong = null;
}

elements.form.addEventListener('submit', searchLyrics);
elements.clearBtn.addEventListener('click', clearSearch);
elements.favoriteBtn.addEventListener('click', toggleFavorite);

// Cargar favoritos al iniciar la app
loadFavorites();