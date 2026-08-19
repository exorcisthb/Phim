document.addEventListener('DOMContentLoaded', () => {
  let moviesData = [];
  let currentGenre = 'all';
  let currentYear = 'all';
  let searchQuery = '';
  let activeMovie = null;
  let useCloudStream = true;

  // DOM Elements
  const movieGrid = document.getElementById('movieGrid');
  const searchInput = document.getElementById('searchInput');
  const filterTabs = document.querySelectorAll('.tab');
  const yearSelect = document.getElementById('yearSelect');
  const gridHeading = document.getElementById('gridHeading');
  
  // Hero Elements
  const heroBg = document.getElementById('heroBg');
  const heroTitle = document.getElementById('heroTitle');
  const heroRating = document.getElementById('heroRating');
  const heroYear = document.getElementById('heroYear');
  const heroGenre = document.getElementById('heroGenre');
  const heroDuration = document.getElementById('heroDuration');
  const heroDesc = document.getElementById('heroDesc');
  const heroPlayBtn = document.getElementById('heroPlayBtn');
  const heroInfoBtn = document.getElementById('heroInfoBtn');

  // Modal Elements
  const videoModal = document.getElementById('videoModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const videoPlayer = document.getElementById('videoPlayer');
  const modalTitle = document.getElementById('modalTitle');
  const modalGenre = document.getElementById('modalGenre');
  const modalYear = document.getElementById('modalYear');
  const modalDuration = document.getElementById('modalDuration');
  const modalDesc = document.getElementById('modalDesc');
  const btnSwitchHls = document.getElementById('btnSwitchHls');
  const btnSwitchLocal = document.getElementById('btnSwitchLocal');
  const currentSourceLabel = document.getElementById('currentSourceLabel');

  // Header Mode Buttons
  const modeHlsBtn = document.getElementById('modeHls');
  const modeLocalBtn = document.getElementById('modeLocal');

  let hlsInstance = null;

  // Helper: Normalize Vietnamese strings for robust matching
  function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
  }

  // 1. Load Movies Database
  fetch('movies.json')
    .then(res => res.json())
    .then(data => {
      moviesData = data;
      if (moviesData.length > 0) {
        setupHero(moviesData[0]);
      }
      renderMovies();
    })
    .catch(err => {
      console.error('Lỗi khi tải cơ sở dữ liệu phim:', err);
      movieGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation empty-icon"></i>
          <p>Không thể tải dữ liệu phim. Vui lòng kiểm tra file movies.json.</p>
        </div>
      `;
    });

  // 2. Setup Hero Featured Movie
  function setupHero(movie) {
    heroBg.src = movie.backdrop || movie.poster;
    heroTitle.textContent = movie.title;
    heroRating.innerHTML = `<i class="fa-solid fa-star" style="color: #ffb703;"></i> ${movie.rating}`;
    heroYear.textContent = movie.year;
    heroGenre.textContent = movie.genre;
    heroDuration.textContent = movie.duration;
    heroDesc.textContent = movie.description;

    heroPlayBtn.onclick = () => openPlayerModal(movie);
    heroInfoBtn.onclick = () => openPlayerModal(movie);
  }

  // 3. Render Movies Grid with Robust Filtering
  function renderMovies() {
    const normGenre = removeVietnameseTones(currentGenre);

    const filtered = moviesData.filter(movie => {
      const movieGenreNorm = removeVietnameseTones(movie.genre);
      const matchGenre = (currentGenre === 'all') || movieGenreNorm.includes(normGenre) || normGenre.includes(movieGenreNorm);
      const matchYear = (currentYear === 'all') || (movie.year.toString() === currentYear);
      
      const normTitle = removeVietnameseTones(movie.title);
      const normOrigin = removeVietnameseTones(movie.origin_title);
      const normSearch = removeVietnameseTones(searchQuery);
      
      const matchSearch = (searchQuery === '') || 
        normTitle.includes(normSearch) || 
        normOrigin.includes(normSearch) ||
        movie.year.toString().includes(searchQuery);

      return matchGenre && matchYear && matchSearch;
    });

    if (filtered.length === 0) {
      movieGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-film empty-icon"></i>
          <p>Không tìm thấy phim lẻ nào phù hợp với điều kiện chọn.</p>
        </div>
      `;
      return;
    }

    movieGrid.innerHTML = filtered.map(movie => `
      <div class="card" data-id="${movie.id}">
        <div class="card-poster-wrapper">
          <img class="card-poster" src="${movie.poster}" alt="${movie.title}" loading="lazy" onerror="this.src='https://motchillu.app/motchill.png'">
          <span class="card-quality">${movie.quality}</span>
          <span class="card-badge">
            <i class="fa-solid fa-star"></i> ${movie.rating}
          </span>
          <div class="card-play-overlay">
            <div class="play-icon">
              <i class="fa-solid fa-play"></i>
            </div>
          </div>
        </div>
        <div class="card-info">
          <h3 class="card-title">${movie.title}</h3>
          <div class="card-sub">
            <span>${movie.year} • ${movie.genre}</span>
            <span><i class="fa-solid fa-clock"></i> ${movie.duration}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Add Click Listener to Card
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.getAttribute('data-id'));
        const movie = moviesData.find(m => m.id === id);
        if (movie) openPlayerModal(movie);
      });
    });
  }

  // 4. Open Player Modal
  function openPlayerModal(movie) {
    activeMovie = movie;
    modalTitle.textContent = `${movie.title} (${movie.year})`;
    modalGenre.innerHTML = `<i class="fa-solid fa-film"></i> ${movie.genre}`;
    modalYear.innerHTML = `<i class="fa-solid fa-calendar"></i> ${movie.year}`;
    modalDuration.innerHTML = `<i class="fa-solid fa-clock"></i> ${movie.duration}`;
    modalDesc.textContent = movie.description;

    videoModal.classList.add('active');
    loadVideoSource();
  }

  // 5. Load Video Stream (Optimized HLS for Maximum Smoothness)
  function loadVideoSource() {
    if (!activeMovie) return;

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (useCloudStream) {
      currentSourceLabel.textContent = "Direct Cloud HLS Stream (.m3u8)";
      btnSwitchHls.classList.add('active');
      btnSwitchLocal.classList.remove('active');

      const streamUrl = activeMovie.m3u8_url;

      if (Hls.isSupported()) {
        // Optimized HLS.js configuration for zero-lag high speed streaming
        hlsInstance = new Hls({
          capLevelToPlayerSize: true,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          lowLatencyMode: false,
          enableWorker: true
        });

        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(videoPlayer);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
          videoPlayer.play().catch(() => {});
        });

        hlsInstance.on(Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            console.warn('HLS Fatal Error, retrying level load...', data);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hlsInstance.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hlsInstance.recoverMediaError();
                break;
              default:
                hlsInstance.destroy();
                break;
            }
          }
        });
      } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        videoPlayer.src = streamUrl;
        videoPlayer.play().catch(() => {});
      } else {
        videoPlayer.src = streamUrl;
      }
    } else {
      currentSourceLabel.textContent = "Local MP4 Video File (E:\\Phim\\Phim_Le_MP4)";
      btnSwitchHls.classList.remove('active');
      btnSwitchLocal.classList.add('active');

      videoPlayer.src = activeMovie.local_mp4;
      videoPlayer.play().catch(() => {});
    }
  }

  // 6. Close Modal
  function closeModal() {
    videoModal.classList.remove('active');
    videoPlayer.pause();
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    videoPlayer.src = '';
  }

  modalCloseBtn.addEventListener('click', closeModal);
  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) closeModal();
  });

  // Source Switching
  btnSwitchHls.addEventListener('click', () => {
    useCloudStream = true;
    loadVideoSource();
  });

  btnSwitchLocal.addEventListener('click', () => {
    useCloudStream = false;
    loadVideoSource();
  });

  modeHlsBtn.addEventListener('click', () => {
    useCloudStream = true;
    modeHlsBtn.classList.add('active');
    modeLocalBtn.classList.remove('active');
  });

  modeLocalBtn.addEventListener('click', () => {
    useCloudStream = false;
    modeLocalBtn.classList.add('active');
    modeHlsBtn.classList.remove('active');
  });

  // 7. Event Listeners for Filters
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentGenre = tab.getAttribute('data-genre');
      
      gridHeading.textContent = currentGenre === 'all' 
        ? 'Danh Sách Phim Lẻ Đề Xuất' 
        : `Phim Lẻ Thể Loại: ${currentGenre}`;
        
      renderMovies();
    });
  });

  yearSelect.addEventListener('change', (e) => {
    currentYear = e.target.value;
    renderMovies();
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderMovies();
  });
});
