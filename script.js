// State Management
let songIndex = 0, isShuffle = false, isRepeat = false, currentPlaylist = [], currentView = 'home';
const audioElement = new Audio();

// Playlist Manager
const PlaylistManager = {
    getPlaylists() {
        const stored = localStorage.getItem('rhythmx_playlists');
        if (!stored) {
            const defaults = { 'Liked Songs': [], 'Recently Played': [] };
            this.savePlaylists(defaults);
            return defaults;
        }
        return JSON.parse(stored);
    },
    savePlaylists(playlists) { localStorage.setItem('rhythmx_playlists', JSON.stringify(playlists)); },
    addPlaylist(name) {
        const playlists = this.getPlaylists();
        if (playlists[name]) { alert('Playlist already exists!'); return false; }
        playlists[name] = [];
        this.savePlaylists(playlists);
        return true;
    },
    deletePlaylist(name) {
        if (name === 'Liked Songs' || name === 'Recently Played') { alert('Cannot delete default playlists!'); return false; }
        const playlists = this.getPlaylists();
        delete playlists[name];
        this.savePlaylists(playlists);
        return true;
    },
    addSongToPlaylist(playlistName, song) {
        const playlists = this.getPlaylists();
        if (!playlists[playlistName]) return false;
        if (playlists[playlistName].some(s => s.path === song.path)) { alert('Song already in playlist!'); return false; }
        playlists[playlistName].push(song);
        this.savePlaylists(playlists);
        return true;
    },
    removeSongFromPlaylist(playlistName, songPath) {
        const playlists = this.getPlaylists();
        if (!playlists[playlistName]) return false;
        playlists[playlistName] = playlists[playlistName].filter(s => s.path !== songPath);
        this.savePlaylists(playlists);
        return true;
    },
    toggleLikedSong(song) {
        const playlists = this.getPlaylists();
        const likedSongs = playlists['Liked Songs'];
        const index = likedSongs.findIndex(s => s.path === song.path);
        index > -1 ? likedSongs.splice(index, 1) : likedSongs.push(song);
        this.savePlaylists(playlists);
        return index === -1;
    },
    isLiked(songPath) { return this.getPlaylists()['Liked Songs'].some(s => s.path === songPath); },
    addToRecentlyPlayed(song) {
        const playlists = this.getPlaylists();
        let recent = playlists['Recently Played'].filter(s => s.path !== song.path);
        recent.unshift(song);
        if (recent.length > 20) recent = recent.slice(0, 20);
        playlists['Recently Played'] = recent;
        this.savePlaylists(playlists);
    }
};

// Playback State Manager
const PlaybackState = {
    save(song, currentTime) { localStorage.setItem('rhythmx_playback_state', JSON.stringify({ song, currentTime, timestamp: Date.now() })); },
    load() {
        const stored = localStorage.getItem('rhythmx_playback_state');
        if (!stored) return null;
        const state = JSON.parse(stored);
        return (Date.now() - state.timestamp < 3600000) ? state : null;
    },
    clear() { localStorage.removeItem('rhythmx_playback_state'); }
};

// Local Songs Data
const localSongs = [
    { name: "Patiala Flow", artist: "Parmish Verma", path: "songs/1.mp3", cover: "covers/1.jpg", duration: "3:40" },
    { name: "9:45", artist: "Prabh Singh, Jay Trak, Rooh Sandhu", path: "songs/2.mp3", cover: "covers/2.jpeg", duration: "3:10" },
    { name: "Softly", artist: "Karan Aujla, Ikky", path: "songs/3.mp3", cover: "covers/3.jpeg", duration: "2:34" },
    { name: "Aa", artist: "Roach Killa, Arif Lohar", path: "songs/4.mp3", cover: "covers/4.jpeg", duration: "4:15" },
    { name: "Love ya", artist: "Diljit Dosanjh", path: "songs/5.mp3", cover: "covers/5.jpeg", duration: "3:22" },
    { name: "Drippy", artist: "Sidhu Moosewala", path: "songs/6.mp3", cover: "covers/6.jpeg", duration: "3:50" },
    { name: "HASS HASS", artist: "Diljit Dosanjh, Sia", path: "songs/7.mp3", cover: "covers/7.jpeg", duration: "2:50" },
    { name: "SPAIN", artist: "Jasa Dhillon", path: "songs/8.mp3", cover: "covers/8.jpeg", duration: "3:05" },
    { name: "Kinni Kinni", artist: "Diljit Dosanjh", path: "songs/9.mp3", cover: "covers/9.jpeg", duration: "3:15" },
    { name: "One Love", artist: "Shubh", path: "songs/10.mp3", cover: "covers/10.jpeg", duration: "2:40" },
    { name: "God Damn", artist: "Badshah, Karan Aujla", path: "songs/11.mp3", cover: "covers/11.jpg", duration: "2:55" },
    { name: "California Love", artist: "Cheema Y, Gur Sidhu", path: "songs/12.mp3", cover: "covers/12.jpg", duration: "3:12" }
];

// DOM Elements
const $ = id => document.getElementById(id);
const songItemContainer = $('songItemContainer'), masterPlay = $('masterPlay'), prevBtn = $('previous'), nextBtn = $('next');
const shuffleBtn = $('shuffle'), repeatBtn = $('repeat'), progressBar = $('myProgressBar');
const currentTimeEl = $('currentTime'), durationEl = $('duration'), masterSongName = $('masterSongName');
const masterArtistName = $('masterArtistName'), masterSongCover = $('masterSongCover'), gif = $('gif');
const searchInput = document.querySelector('.search-bar input');

// Helper Functions
const formatTime = time => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60), sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};
const updateSliderFill = slider => {
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = `linear-gradient(to right, #7c4dff ${value}%, rgba(255, 255, 255, 0.1) ${value}%)`;
};

// Consolidated Song Rendering
const createSongHTML = (song, idx, showShare = true) => `
    <img src="${song.cover}" alt="${song.name}">
    <div class="song-name-wrapper">
        <span class="song-name">${song.name}</span>
        <span class="artist-name">${song.artist}${song.isExternal ? ' <i class="fas fa-globe small-icon" title="Online Result"></i>' : ''}</span>
    </div>
    <div class="song-list-play">
        <div class="song-actions">
            <i class="fas fa-heart heart-icon ${PlaylistManager.isLiked(song.path) ? 'liked' : ''}" 
               onclick="event.stopPropagation(); toggleLike(${idx})" 
               title="${PlaylistManager.isLiked(song.path) ? 'Unlike' : 'Like'}"></i>
            <i class="fas fa-download action-icon" onclick="event.stopPropagation(); downloadSongByIndex(${idx})" title="Download"></i>
            ${showShare ? '<i class="fas fa-share-alt action-icon" onclick="event.stopPropagation(); shareSongByIndex(' + idx + ')" title="Share"></i>' : ''}
        </div>
        <span class="timestamp">${song.duration}</span>
        <i class="far fa-play-circle play-icon-small"></i>
    </div>
`;

const renderSongs = (container, songs, clickHandler) => {
    container.innerHTML = '';
    if (songs.length === 0) {
        container.innerHTML = '<div class="loading-placeholder">No songs found...</div>';
        return;
    }
    songs.forEach((song, idx) => {
        const songDiv = document.createElement('div');
        songDiv.classList.add('song-item');
        if (audioElement.src === song.path || (song.path && audioElement.src.includes(song.path))) {
            songDiv.classList.add('active');
        }
        songDiv.innerHTML = createSongHTML(song, idx);
        songDiv.onclick = () => clickHandler(song, idx);
        container.appendChild(songDiv);
    });
};

// API & Data Functions
const searchOnline = async query => {
    if (!query) return [];
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`);
        const data = await response.json();
        return data.results.map(item => ({
            name: item.trackName, artist: item.artistName, path: item.previewUrl,
            cover: item.artworkUrl100, duration: formatTime(item.trackTimeMillis / 1000), isExternal: true
        }));
    } catch (error) {
        console.error("Search failed:", error);
        return [];
    }
};

const getAlbums = () => {
    const albumMap = new Map();
    localSongs.forEach(song => {
        if (!albumMap.has(song.cover)) {
            albumMap.set(song.cover, { cover: song.cover, artist: song.artist, songs: [] });
        }
        albumMap.get(song.cover).songs.push(song);
    });
    return Array.from(albumMap.values()).map(album => ({
        ...album, name: `${album.artist.split(',')[0].trim()} - Album`
    }));
};

const renderSongList = async (filter = '') => {
    if (filter) songItemContainer.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Searching local & online...</div>';
    const localFiltered = localSongs.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()) || s.artist.toLowerCase().includes(filter.toLowerCase()));
    let searchResults = [];
    if (filter && filter.trim().length > 2) searchResults = await searchOnline(filter);
    currentPlaylist = [...localFiltered, ...searchResults];
    renderSongs(songItemContainer, currentPlaylist, (song, idx) => { songIndex = idx; playSong(song); });
};

// Player Functions
const playSong = song => {
    if (!song.path) { alert("Sorry, no preview available for this track."); return; }
    audioElement.src = song.path;
    masterSongName.innerText = song.name;
    masterArtistName.innerText = song.artist;
    masterSongCover.src = song.cover;
    audioElement.currentTime = 0;
    audioElement.play();
    PlaylistManager.addToRecentlyPlayed(song);
    updateUI(true);
};

const togglePlay = () => {
    if (!audioElement.src) { if (currentPlaylist.length > 0) playSong(currentPlaylist[0]); return; }
    if (audioElement.paused || audioElement.currentTime <= 0) { audioElement.play(); updateUI(true); }
    else { audioElement.pause(); updateUI(false); }
};

const updateUI = isPlaying => {
    const icon = masterPlay.querySelector('i');
    if (isPlaying) { icon.classList.replace('fa-play-circle', 'fa-pause-circle'); gif.style.opacity = 1; }
    else { icon.classList.replace('fa-pause-circle', 'fa-play-circle'); gif.style.opacity = 0; }
    document.querySelectorAll('.song-item').forEach((item, idx) => {
        const song = currentPlaylist[idx];
        song && audioElement.src.includes(song.path) ? item.classList.add('active') : item.classList.remove('active');
    });
};

const nextSong = () => {
    if (currentPlaylist.length === 0) return;
    songIndex = isShuffle && currentPlaylist.length > 1 ? Math.floor(Math.random() * currentPlaylist.length) : (songIndex + 1) % currentPlaylist.length;
    playSong(currentPlaylist[songIndex]);
};

const prevSong = () => {
    if (currentPlaylist.length === 0) return;
    songIndex = (songIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    playSong(currentPlaylist[songIndex]);
};

// Download & Share
const downloadSong = async song => {
    if (!song.path) return;
    try {
        const response = await fetch(song.path);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${song.name} - ${song.artist}.mp3`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error("Download failed:", error);
        alert("Failed to download song. It might be due to browser restrictions.");
    }
};

const shareSong = async song => {
    const shareData = { title: `RhythmX: ${song.name}`, text: `Check out this song: ${song.name} by ${song.artist}`, url: song.path.startsWith('http') ? song.path : window.location.href };
    if (navigator.share) {
        try { await navigator.share(shareData); }
        catch (err) { console.error("Share failed:", err); }
    } else {
        navigator.clipboard.writeText(shareData.url).then(() => alert("Link copied to clipboard!"));
    }
};

window.downloadSongByIndex = idx => downloadSong(currentPlaylist[idx]);
window.shareSongByIndex = idx => shareSong(currentPlaylist[idx]);

// View Navigation
const switchView = viewName => {
    document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
    $(`${viewName}View`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
    document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
    currentView = viewName;
    if (viewName === 'albums') renderAlbums();
    else if (viewName === 'library') renderLibrary();
};

const renderAlbums = () => {
    const albumsGrid = $('albumsGrid');
    albumsGrid.innerHTML = '';
    getAlbums().forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.classList.add('album-card');
        albumCard.innerHTML = `
            <img src="${album.cover}" alt="${album.name}" class="album-cover">
            <div class="album-name">${album.name}</div>
            <div class="album-artist">${album.artist}</div>
            <div class="album-info">${album.songs.length} song${album.songs.length > 1 ? 's' : ''}</div>
        `;
        albumCard.onclick = () => { currentPlaylist = album.songs; songIndex = 0; renderSongs(songItemContainer, album.songs, (song, idx) => { songIndex = idx; playSong(song); }); switchView('home'); };
        albumsGrid.appendChild(albumCard);
    });
};

const renderLibrary = () => { renderPlaylists(); renderLibraryAlbums(); renderLikedSongs(); };

const renderPlaylists = () => {
    const playlistsGrid = $('playlistsGrid');
    playlistsGrid.innerHTML = '';
    Object.entries(PlaylistManager.getPlaylists()).forEach(([name, songs]) => {
        const playlistCard = document.createElement('div');
        playlistCard.classList.add('playlist-card');
        const isDefault = name === 'Liked Songs' || name === 'Recently Played';
        const icon = name === 'Liked Songs' ? 'fa-heart' : name === 'Recently Played' ? 'fa-history' : 'fa-music';
        playlistCard.innerHTML = `
            <div class="playlist-icon"><i class="fas ${icon}"></i></div>
            <div class="playlist-name">${name}</div>
            <div class="playlist-count">${songs.length} song${songs.length !== 1 ? 's' : ''}</div>
            ${!isDefault ? '<button class="playlist-delete" onclick="event.stopPropagation(); deletePlaylist(\'' + name + '\')"><i class="fas fa-trash"></i></button>' : ''}
        `;
        playlistCard.onclick = () => {
            if (songs.length === 0) { alert('This playlist is empty!'); return; }
            currentPlaylist = songs; songIndex = 0;
            renderSongs(songItemContainer, songs, (song, idx) => { songIndex = idx; playSong(song); });
            switchView('home');
        };
        playlistsGrid.appendChild(playlistCard);
    });
};

const renderLibraryAlbums = () => {
    const libraryAlbumsGrid = $('libraryAlbumsGrid');
    libraryAlbumsGrid.innerHTML = '';
    getAlbums().forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.classList.add('album-card');
        albumCard.innerHTML = `
            <img src="${album.cover}" alt="${album.name}" class="album-cover">
            <div class="album-name">${album.name}</div>
            <div class="album-artist">${album.artist}</div>
            <div class="album-info">${album.songs.length} song${album.songs.length > 1 ? 's' : ''}</div>
        `;
        albumCard.onclick = () => { currentPlaylist = album.songs; songIndex = 0; renderSongs(songItemContainer, album.songs, (song, idx) => { songIndex = idx; playSong(song); }); switchView('home'); };
        libraryAlbumsGrid.appendChild(albumCard);
    });
};

const renderLikedSongs = () => {
    const likedSongsContainer = $('likedSongsContainer');
    const likedSongs = PlaylistManager.getPlaylists()['Liked Songs'];
    if (likedSongs.length === 0) { likedSongsContainer.innerHTML = '<div class="loading-placeholder">No liked songs yet. Start liking songs!</div>'; return; }
    renderSongs(likedSongsContainer, likedSongs, (song, idx) => { currentPlaylist = likedSongs; songIndex = idx; playSong(song); });
};

window.toggleLike = idx => {
    PlaylistManager.toggleLikedSong(currentPlaylist[idx]);
    currentView === 'home' ? renderSongList(searchInput.value) : renderLikedSongs();
};
window.removeLikedSong = songPath => { PlaylistManager.removeSongFromPlaylist('Liked Songs', songPath); renderLikedSongs(); };
window.deletePlaylist = name => { if (confirm(`Are you sure you want to delete "${name}"?`)) { PlaylistManager.deletePlaylist(name); renderPlaylists(); } };

// Event Listeners
masterPlay.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', nextSong);
prevBtn.addEventListener('click', prevSong);

audioElement.addEventListener('timeupdate', () => {
    if (audioElement.duration) {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressBar.value = progress;
        updateSliderFill(progressBar);
        currentTimeEl.innerText = formatTime(audioElement.currentTime);
        durationEl.innerText = formatTime(audioElement.duration);
        if (Math.floor(audioElement.currentTime) % 5 === 0 && currentPlaylist[songIndex]) {
            PlaybackState.save(currentPlaylist[songIndex], audioElement.currentTime);
        }
    }
});

progressBar.addEventListener('input', () => {
    if (audioElement.duration) {
        audioElement.currentTime = (progressBar.value * audioElement.duration) / 100;
        updateSliderFill(progressBar);
    }
});

audioElement.addEventListener('ended', () => { isRepeat ? (audioElement.currentTime = 0, audioElement.play()) : nextSong(); });
shuffleBtn.addEventListener('click', () => { isShuffle = !isShuffle; shuffleBtn.style.color = isShuffle ? 'var(--accent-color)' : 'white'; });
repeatBtn.addEventListener('click', () => { isRepeat = !isRepeat; repeatBtn.style.color = isRepeat ? 'var(--accent-color)' : 'white'; });

let searchTimeout;
searchInput.addEventListener('input', e => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => renderSongList(e.target.value), 600); });

document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight') audioElement.currentTime += 5;
    else if (e.code === 'ArrowLeft') audioElement.currentTime -= 5;
});

const volumeSlider = $('volumeSlider');
volumeSlider.addEventListener('input', () => { audioElement.volume = volumeSlider.value / 100; updateSliderFill(volumeSlider); });

$('downloadCurrent').addEventListener('click', () => { if (currentPlaylist[songIndex]) downloadSong(currentPlaylist[songIndex]); });
$('shareCurrent').addEventListener('click', () => { if (currentPlaylist[songIndex]) shareSong(currentPlaylist[songIndex]); });

document.querySelectorAll('.nav-item').forEach(link => link.addEventListener('click', e => { e.preventDefault(); switchView(link.getAttribute('data-view')); }));

const profileIcon = $('profileIcon'), profileDropdown = $('profileDropdown');
profileIcon.addEventListener('click', e => { e.stopPropagation(); profileDropdown.classList.toggle('active'); });
document.addEventListener('click', () => profileDropdown.classList.remove('active'));

const themeToggle = $('themeToggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('rhythmx_theme', isLight ? 'light' : 'dark');
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
});

const playlistModal = $('playlistModal'), createPlaylistBtn = $('createPlaylistBtn');
const cancelPlaylistBtn = $('cancelPlaylistBtn'), savePlaylistBtn = $('savePlaylistBtn'), playlistNameInput = $('playlistNameInput');

createPlaylistBtn.addEventListener('click', () => { playlistModal.classList.add('active'); playlistNameInput.value = ''; playlistNameInput.focus(); });
cancelPlaylistBtn.addEventListener('click', () => playlistModal.classList.remove('active'));
savePlaylistBtn.addEventListener('click', () => {
    const name = playlistNameInput.value.trim();
    if (!name) { alert('Please enter a playlist name!'); return; }
    if (PlaylistManager.addPlaylist(name)) { playlistModal.classList.remove('active'); renderPlaylists(); }
});
playlistNameInput.addEventListener('keypress', e => { if (e.key === 'Enter') savePlaylistBtn.click(); });
playlistModal.addEventListener('click', e => { if (e.target === playlistModal) playlistModal.classList.remove('active'); });

document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    $(`${tabName === 'playlists' ? 'playlistsTab' : tabName === 'albums' ? 'albumsTab' : 'likedTab'}`).classList.add('active');
}));

// Initialization
const savedTheme = localStorage.getItem('rhythmx_theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
}

PlaylistManager.getPlaylists();
renderSongList();
masterSongName.innerText = localSongs[0].name;
masterArtistName.innerText = localSongs[0].artist;
masterSongCover.src = localSongs[0].cover;
audioElement.volume = volumeSlider.value / 100;
updateSliderFill(volumeSlider);
updateSliderFill(progressBar);

// Resume playback
const savedState = PlaybackState.load();
if (savedState && savedState.song) {
    const songToResume = localSongs.find(s => s.path === savedState.song.path);
    if (songToResume) {
        audioElement.src = songToResume.path;
        audioElement.currentTime = savedState.currentTime;
        masterSongName.innerText = songToResume.name;
        masterArtistName.innerText = songToResume.artist;
        masterSongCover.src = songToResume.cover;
        currentPlaylist = localSongs;
        songIndex = localSongs.findIndex(s => s.path === songToResume.path);
        updateUI(false);
    }
}
