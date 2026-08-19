document.addEventListener('DOMContentLoaded', () => {
  let moviesData = [];
  let currentGenre = 'all';
  let currentYear = 'all';
  let searchQuery = '';
  let activeMovie = null;
  let useCloudStream = true;

  // Pagination Variables
  const ITEMS_PER_PAGE = 24;
  let currentPage = 1;

  // DOM Elements
  const movieGrid = document.getElementById('movieGrid');
  const paginationEl = document.getElementById('pagination');
  const moviesCountBadge = document.getElementById('moviesCountBadge');
  const searchInput = document.getElementById('searchInput');
  const filterTabs = document.querySelectorAll('.tab');
  const yearSelect = document.getElementById('yearSelect');
  const gridHeading = document.getElementById('gridHeading');
  const brandLogo = document.getElementById('brandLogo');
  const mainContainer = document.getElementById('mainContainer');

  // Cinema Section Elements
  const cinemaSection = document.getElementById('cinemaSection');
  const backToHomeBtn = document.getElementById('backToHomeBtn');
  const cinemaTitle = document.getElementById('cinemaTitle');
  const cinemaRating = document.getElementById('cinemaRating');
  const cinemaDuration = document.getElementById('cinemaDuration');
  const cinemaDesc = document.getElementById('cinemaDesc');
  const cinemaGenreTag = document.getElementById('cinemaGenreTag');
  const cinemaYearTag = document.getElementById('cinemaYearTag');
  const videoPlayer = document.getElementById('videoPlayer');
  const qualitySelect = document.getElementById('qualitySelect');
  const bufferStatus = document.getElementById('bufferStatus');
  const btnSwitchHls = document.getElementById('btnSwitchHls');
  const btnSwitchLocal = document.getElementById('btnSwitchLocal');
  const currentSourceLabel = document.getElementById('currentSourceLabel');

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

  // Header Mode Buttons
  const modeHlsBtn = document.getElementById('modeHls');
  const modeLocalBtn = document.getElementById('modeLocal');

  let hlsInstance = null;

  // Helper: Normalize Vietnamese strings
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

    heroPlayBtn.onclick = () => openCinemaWatchView(movie);
    heroInfoBtn.onclick = () => openCinemaWatchView(movie);
  }

  // 3. Render Movies Grid with Pagination
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

    moviesCountBadge.textContent = `Tổng cộng ${filtered.length} phim`;

    if (filtered.length === 0) {
      movieGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-film empty-icon"></i>
          <p>Không tìm thấy phim lẻ nào phù hợp với điều kiện chọn.</p>
        </div>
      `;
      paginationEl.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    movieGrid.innerHTML = paginatedItems.map(movie => `
      <div class="card" data-id="${movie.id}">
        <div class="card-poster-wrapper">
          <img class="card-poster" src="${movie.poster}" alt="${movie.title}" loading="lazy" onerror="this.src='https://phimimg.com/uploads/movies/20260707/con-thinh-no-poster.webp'">
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

    // Add Click Listener to Card -> Open Massive Cinema View
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.getAttribute('data-id'));
        const movie = moviesData.find(m => m.id === id);
        if (movie) openCinemaWatchView(movie);
      });
    });

    renderPagination(totalPages);
  }

  // 4. Render Pagination Controls
  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    let buttonsHtml = '';

    buttonsHtml += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" id="prevPageBtn"><i class="fa-solid fa-chevron-left"></i> Trước</button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        buttonsHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        buttonsHtml += `<span class="page-ellipsis">...</span>`;
      }
    }

    buttonsHtml += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" id="nextPageBtn">Sau <i class="fa-solid fa-chevron-right"></i></button>`;

    paginationEl.innerHTML = buttonsHtml;

    paginationEl.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.getAttribute('data-page'));
        renderMovies();
        scrollToGrid();
      });
    });

    const prevBtn = document.getElementById('prevPageBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderMovies();
          scrollToGrid();
        }
      });
    }

    const nextBtn = document.getElementById('nextPageBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderMovies();
          scrollToGrid();
        }
      });
    }
  }

  function scrollToGrid() {
    gridHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 5. Open Motchill/Netflix Style Cinema Watch View
  function openCinemaWatchView(movie) {
    activeMovie = movie;
    cinemaTitle.textContent = `${movie.title} (${movie.year})`;
    cinemaGenreTag.textContent = movie.genre;
    cinemaYearTag.textContent = movie.year;
    cinemaRating.innerHTML = `<i class="fa-solid fa-star" style="color: #ffb703;"></i> ${movie.rating}`;
    cinemaDuration.innerHTML = `<i class="fa-solid fa-clock"></i> ${movie.duration}`;
    cinemaDesc.textContent = movie.description;

    cinemaSection.classList.remove('hidden');
    cinemaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    loadVideoSource();
  }

  function closeCinemaWatchView() {
    cinemaSection.classList.add('hidden');
    videoPlayer.pause();
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    videoPlayer.src = '';
  }

  backToHomeBtn.addEventListener('click', closeCinemaWatchView);
  brandLogo.addEventListener('click', (e) => {
    e.preventDefault();
    closeCinemaWatchView();
    mainContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 6. Load Video Stream (Optimized HLS & Quality Selector)
  function loadVideoSource() {
    if (!activeMovie) return;

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (useCloudStream) {
      currentSourceLabel.textContent = "Cloud Stream (.m3u8)";
      btnSwitchHls.classList.add('active');
      btnSwitchLocal.classList.remove('active');

      const streamUrl = activeMovie.m3u8_url;

      if (Hls.isSupported()) {
        hlsInstance = new Hls({
          capLevelToPlayerSize: true,
          maxBufferLength: 90,        // Buffer 90 seconds ahead for zero-lag streaming
          maxMaxBufferLength: 180,
          maxBufferSize: 100 * 1000 * 1000,
          maxBufferHole: 0.5,
          lowLatencyMode: false,
          enableWorker: true
        });

        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(videoPlayer);
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
          bufferStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #00f2fe;"></i> Đã tải luồng m3u8`;
          
          // Populate Quality Selector Dropdown
          const levels = hlsInstance.levels;
          if (levels && levels.length > 0) {
            let opts = '<option value="-1">Tự động (Auto HD)</option>';
            levels.forEach((lvl, idx) => {
              const res = lvl.height ? `${lvl.height}p` : `Luồng ${idx + 1}`;
              opts += `<option value="${idx}">${res}</option>`;
            });
            qualitySelect.innerHTML = opts;
          } else {
            qualitySelect.innerHTML = `
              <option value="-1">Tự động (Auto HD)</option>
              <option value="1080">1080p FullHD</option>
              <option value="720">720p HD</option>
            `;
          }

          videoPlayer.play().catch(() => {});
        });

        hlsInstance.on(Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                bufferStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #ffb703;"></i> Đang kết nối lại CDN...`;
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
      currentSourceLabel.textContent = "File MP4 Local (E:\\Phim\\Phim_Le_MP4)";
      btnSwitchHls.classList.remove('active');
      btnSwitchLocal.classList.add('active');
      bufferStatus.innerHTML = `<i class="fa-solid fa-hard-drive" style="color: #ffb703;"></i> Nguồn MP4 Gốc`;

      videoPlayer.src = activeMovie.local_mp4;
      videoPlayer.play().catch(() => {});
    }
  }

  // Handle Quality Selector Change (1080p / 720p / Auto)
  qualitySelect.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (hlsInstance) {
      hlsInstance.currentLevel = val; // -1 for Auto, or 0, 1, 2 for specific levels
      bufferStatus.innerHTML = val === -1 
        ? `<i class="fa-solid fa-bolt" style="color: #00f2fe;"></i> Tự động điều chỉnh độ phân giải`
        : `<i class="fa-solid fa-check" style="color: #00f2fe;"></i> Đã đổi độ phân giải`;
    }
  });

  // Source Switching Buttons
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
    if (activeMovie) loadVideoSource();
  });

  modeLocalBtn.addEventListener('click', () => {
    useCloudStream = false;
    modeLocalBtn.classList.add('active');
    modeHlsBtn.classList.remove('active');
    if (activeMovie) loadVideoSource();
  });

  // Filter Tab Events
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentGenre = tab.getAttribute('data-genre');
      
      gridHeading.textContent = currentGenre === 'all' 
        ? 'Danh Sách Phim Lẻ Đề Xuất' 
        : `Phim Lẻ Thể Loại: ${currentGenre}`;
        
      currentPage = 1;
      renderMovies();
    });
  });

  yearSelect.addEventListener('change', (e) => {
    currentYear = e.target.value;
    currentPage = 1;
    renderMovies();
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    renderMovies();
  });
});
