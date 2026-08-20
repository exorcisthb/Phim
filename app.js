document.addEventListener('DOMContentLoaded', () => {
  let moviesData = [];
  let currentType = 'all';     // 'all', 'single', 'series'
  let currentGenre = 'all';    // 'all', 'Hành Động', etc.
  let currentCountry = 'all';  // 'all', 'Hàn Quốc', etc.
  let currentYear = 'all';     // 'all', '2026', etc.
  let searchQuery = '';
  let activeMovie = null;
  let activeEpisodeIndex = 0;
  let useCloudStream = true;

  const SVG_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'><rect width='300' height='450' fill='%23181824'/><circle cx='150' cy='200' r='40' fill='%23e50914' opacity='0.8'/><polygon points='140,185 170,200 140,215' fill='%23ffffff'/><text x='150' y='270' fill='%23888888' font-family='sans-serif' font-size='14' text-anchor='middle'>RoPhim Cinema</text></svg>";

  // Pagination Variables
  const ITEMS_PER_PAGE = 24;
  let currentPage = 1;

  // DOM Elements - Views
  const homeView = document.getElementById('homeView');
  const watchView = document.getElementById('watchView');

  // DOM Elements - Home
  const movieGrid = document.getElementById('movieGrid');
  const paginationEl = document.getElementById('pagination');
  const moviesCountBadge = document.getElementById('moviesCountBadge');
  const searchInput = document.getElementById('searchInput');
  const typeTabs = document.querySelectorAll('.type-tab');
  const genreSelect = document.getElementById('genreSelect');
  const countrySelect = document.getElementById('countrySelect');
  const yearSelect = document.getElementById('yearSelect');
  const gridHeading = document.getElementById('gridHeading');
  const brandLogo = document.getElementById('brandLogo');

  // DOM Elements - Watch View
  const backToHomeBtn = document.getElementById('backToHomeBtn');
  const watchBreadcrumbTitle = document.getElementById('watchBreadcrumbTitle');
  const cinemaTitle = document.getElementById('cinemaTitle');
  const cinemaRating = document.getElementById('cinemaRating');
  const cinemaYear = document.getElementById('cinemaYear');
  const cinemaGenre = document.getElementById('cinemaGenre');
  const cinemaCountry = document.getElementById('cinemaCountry');
  const cinemaDuration = document.getElementById('cinemaDuration');
  const cinemaQuality = document.getElementById('cinemaQuality');
  const camNoticeBox = document.getElementById('camNoticeBox');
  const cinemaDesc = document.getElementById('cinemaDesc');
  const videoPlayer = document.getElementById('videoPlayer');
  const qualitySelect = document.getElementById('qualitySelect');
  const bufferStatus = document.getElementById('bufferStatus');
  const btnSwitchHls = document.getElementById('btnSwitchHls');
  const btnSwitchLocal = document.getElementById('btnSwitchLocal');
  const currentSourceLabel = document.getElementById('currentSourceLabel');
  const relatedGrid = document.getElementById('relatedGrid');
  const videoErrorOverlay = document.getElementById('videoErrorOverlay');
  const videoErrorDesc = document.getElementById('videoErrorDesc');
  const retryStreamBtn = document.getElementById('retryStreamBtn');
  const reportBrokenBtn = document.getElementById('reportBrokenBtn');

  // Episode Selector Elements for TV Series
  const episodesPanel = document.getElementById('episodesPanel');
  const episodesGrid = document.getElementById('episodesGrid');
  const epCountText = document.getElementById('epCountText');

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

  // 1. Load Movies Database with Cache-Busting
  fetch('movies.json?t=' + new Date().getTime(), { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      moviesData = data;
      if (moviesData.length > 0) {
        setupHero(moviesData[0]);
      }
      renderMovies();

      // Check URL hash to restore view on load or refresh
      const hashMatch = window.location.hash.match(/^#watch-(\d+)$/);
      if (hashMatch) {
        const id = parseInt(hashMatch[1]);
        const movie = moviesData.find(m => m.id === id);
        if (movie) {
          openWatchViewDOM(movie);
          return;
        }
      }
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

    heroPlayBtn.onclick = () => showWatchView(movie);
    heroInfoBtn.onclick = () => showWatchView(movie);
  }

  // 3. Render Movies Grid on Home View
  function renderMovies() {
    const normGenre = removeVietnameseTones(currentGenre);
    const normCountry = removeVietnameseTones(currentCountry);

    const filtered = moviesData.filter(movie => {
      // Type Filter (all / single / series)
      const matchType = (currentType === 'all') || (movie.type === currentType);

      // Genre Filter
      const movieGenreNorm = removeVietnameseTones(movie.genre || '');
      const matchGenre = (currentGenre === 'all') || movieGenreNorm.includes(normGenre) || normGenre.includes(movieGenreNorm);

      // Country Filter
      const movieCountryNorm = removeVietnameseTones(movie.country || '');
      const matchCountry = (currentCountry === 'all') || movieCountryNorm.includes(normCountry) || normCountry.includes(movieCountryNorm);

      // Year Filter
      const matchYear = (currentYear === 'all') || (movie.year.toString() === currentYear);

      // Search Query Matching
      const normTitle = removeVietnameseTones(movie.title || '');
      const normOrigin = removeVietnameseTones(movie.origin_title || '');
      const normDesc = removeVietnameseTones(movie.description || '');
      const normQuality = removeVietnameseTones(movie.quality || '');
      const normSearch = removeVietnameseTones(searchQuery || '');

      const rawTitle = (movie.title || '').toLowerCase();
      const rawOrigin = (movie.origin_title || '').toLowerCase();
      const rawDesc = (movie.description || '').toLowerCase();
      const rawCountry = (movie.country || '').toLowerCase();
      const rawSearch = (searchQuery || '').toLowerCase();

      const matchSearch = (searchQuery === '') ||
        normTitle.includes(normSearch) ||
        normOrigin.includes(normSearch) ||
        normDesc.includes(normSearch) ||
        normQuality.includes(normSearch) ||
        rawTitle.includes(rawSearch) ||
        rawOrigin.includes(rawSearch) ||
        rawDesc.includes(rawSearch) ||
        rawCountry.includes(rawSearch) ||
        movie.year.toString().includes(searchQuery);

      return matchType && matchGenre && matchCountry && matchYear && matchSearch;
    });

    moviesCountBadge.textContent = `Tổng cộng ${filtered.length} phim`;

    // Dynamic Section Title
    let titleParts = [];
    if (currentType === 'single') titleParts.push('Phim Lẻ');
    else if (currentType === 'series') titleParts.push('Phim Bộ');
    else titleParts.push('Danh Sách Phim');

    if (currentCountry !== 'all') titleParts.push(currentCountry);
    if (currentGenre !== 'all') titleParts.push(currentGenre);

    gridHeading.textContent = titleParts.join(' • ') + ' Đề Xuất';

    if (filtered.length === 0) {
      movieGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-film empty-icon"></i>
          <p>Không tìm thấy phim nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      `;
      paginationEl.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    movieGrid.innerHTML = paginatedItems.map(movie => {
      const isCam = (movie.quality || '').toLowerCase().includes('cam') || (movie.quality || '').toLowerCase().includes('quay rạp');
      const isSeries = movie.type === 'series';
      const epCount = movie.episodes ? movie.episodes.length : 1;

      let qualityBadge = isCam ? '📷 Bản CAM' : movie.quality;
      if (isSeries) {
        qualityBadge = `📺 ${epCount > 1 ? epCount + ' Tập' : 'Phim Bộ'}`;
      }

      return `
      <div class="card" data-id="${movie.id}">
        <div class="card-poster-wrapper">
          <img class="card-poster" src="${movie.poster}" alt="${movie.title}" loading="lazy" onerror="this.onerror=null; this.src='${SVG_FALLBACK}';">
          <span class="card-quality ${isCam ? 'cam-badge' : (isSeries ? 'series-badge' : '')}">${qualityBadge}</span>
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
            <span>${movie.year} • ${movie.country || 'Mỹ'}</span>
            <span><i class="fa-solid fa-tag"></i> ${movie.genre}</span>
          </div>
        </div>
      </div>
      `;
    }).join('');

    // Add Click Listener to Card
    document.querySelectorAll('#movieGrid .card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.getAttribute('data-id'));
        const movie = moviesData.find(m => m.id === id);
        if (movie) showWatchView(movie);
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

  // 5. VIEW SWITCHING LOGIC (Single-Page App Router)

  function openHomeViewDOM() {
    watchView.classList.add('hidden');
    homeView.classList.remove('hidden');

    videoPlayer.pause();
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    videoPlayer.src = '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openWatchViewDOM(movie) {
    activeMovie = movie;
    activeEpisodeIndex = 0;

    // Populate Details
    watchBreadcrumbTitle.textContent = movie.title;
    cinemaTitle.textContent = `${movie.title} (${movie.year})`;
    cinemaRating.innerHTML = `<i class="fa-solid fa-star" style="color: #ffb703;"></i> ${movie.rating}`;
    cinemaYear.innerHTML = `<i class="fa-solid fa-calendar"></i> ${movie.year}`;
    cinemaGenre.innerHTML = `<i class="fa-solid fa-film"></i> ${movie.genre}`;
    if (cinemaCountry) {
      cinemaCountry.innerHTML = `<i class="fa-solid fa-globe"></i> ${movie.country || 'Mỹ'}`;
    }
    cinemaDuration.innerHTML = `<i class="fa-solid fa-clock"></i> ${movie.duration}`;
    cinemaDesc.textContent = movie.description;

    const isCam = (movie.quality || '').toLowerCase().includes('cam') || (movie.quality || '').toLowerCase().includes('quay rạp');
    if (cinemaQuality) {
      cinemaQuality.textContent = isCam ? '📷 Bản CAM (Chờ HD)' : movie.quality;
      if (isCam) cinemaQuality.classList.add('cam-badge');
      else cinemaQuality.classList.remove('cam-badge');
    }

    if (camNoticeBox) {
      if (isCam) camNoticeBox.classList.remove('hidden');
      else camNoticeBox.classList.add('hidden');
    }

    // Episode Selector for TV Series
    if (episodesPanel && episodesGrid) {
      if (movie.episodes && movie.episodes.length > 1) {
        episodesPanel.classList.remove('hidden');
        epCountText.textContent = `${movie.episodes.length} tập`;
        episodesGrid.innerHTML = movie.episodes.map((ep, idx) => `
          <button class="ep-btn ${idx === activeEpisodeIndex ? 'active' : ''}" data-idx="${idx}">
            <i class="fa-solid fa-play"></i> ${ep.name}
          </button>
        `).join('');

        episodesGrid.querySelectorAll('.ep-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            activeEpisodeIndex = idx;
            activeMovie.m3u8_url = activeMovie.episodes[idx].link_m3u8;
            episodesGrid.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadVideoSource();
          });
        });
        
        // Set first episode stream
        activeMovie.m3u8_url = movie.episodes[0].link_m3u8;
      } else {
        episodesPanel.classList.add('hidden');
      }
    }

    // Render Related Movies Grid
    renderRelatedMovies(movie);

    // Switch View Visibility
    homeView.classList.add('hidden');
    watchView.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load Stream
    loadVideoSource();
  }

  // Switch to Home View
  function showHomeView() {
    if (window.location.hash) {
      history.pushState({ view: 'home' }, '', window.location.pathname);
    }
    openHomeViewDOM();
  }

  // Switch to Dedicated Watch View for Selected Movie
  function showWatchView(movie) {
    history.pushState({ view: 'watch', movieId: movie.id }, '', `#watch-${movie.id}`);
    openWatchViewDOM(movie);
  }

  // Handle browser Back/Forward button
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.view === 'watch' && e.state.movieId) {
      const movie = moviesData.find(m => m.id === e.state.movieId);
      if (movie) {
        openWatchViewDOM(movie);
        return;
      }
    }
    const hashMatch = window.location.hash.match(/^#watch-(\d+)$/);
    if (hashMatch) {
      const id = parseInt(hashMatch[1]);
      const movie = moviesData.find(m => m.id === id);
      if (movie) {
        openWatchViewDOM(movie);
        return;
      }
    }
    openHomeViewDOM();
  });

  // Render Related Movies in Watch View
  function renderRelatedMovies(currentMovie) {
    const related = moviesData.filter(m => 
      m.id !== currentMovie.id && 
      (m.genre === currentMovie.genre || m.year === currentMovie.year)
    ).slice(0, 6);

    if (related.length === 0) {
      relatedGrid.innerHTML = '';
      return;
    }

    relatedGrid.innerHTML = related.map(movie => {
      const isCam = (movie.quality || '').toLowerCase().includes('cam');
      return `
      <div class="card" data-id="${movie.id}">
        <div class="card-poster-wrapper">
          <img class="card-poster" src="${movie.poster}" alt="${movie.title}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'">
          <span class="card-quality ${isCam ? 'cam-badge' : ''}">${isCam ? '📷 Bản CAM' : movie.quality}</span>
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
      `;
    }).join('');


    document.querySelectorAll('#relatedGrid .card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.getAttribute('data-id'));
        const movie = moviesData.find(m => m.id === id);
        if (movie) showWatchView(movie);
      });
    });
  }

  // Navigation Click Listeners
  backToHomeBtn.addEventListener('click', showHomeView);
  brandLogo.addEventListener('click', (e) => {
    e.preventDefault();
    showHomeView();
  });

  // 6. Load Video Stream & Quality Control
  let loadTimeout = null;

  function showVideoError(msg) {
    if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null; }
    videoErrorOverlay.classList.remove('hidden');
    videoErrorDesc.textContent = msg || 'Nguồn stream không khả dụng hoặc đã hết hạn.';
    bufferStatus.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color:#e63946;"></i> Không thể tải stream`;
  }

  function hideVideoError() {
    videoErrorOverlay.classList.add('hidden');
  }

  function loadVideoSource() {
    if (!activeMovie) return;

    // Reset state
    hideVideoError();
    if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null; }

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (useCloudStream) {
      currentSourceLabel.textContent = 'Cloud Stream (.m3u8)';
      btnSwitchHls.classList.add('active');
      btnSwitchLocal.classList.remove('active');

      const streamUrl = activeMovie.m3u8_url;

      if (!streamUrl) {
        showVideoError('Phim này chưa có nguồn stream trực tuyến. Hãy thử nguồn Local MP4 hoặc chờ bản HD.');
        return;
      }

      bufferStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:#00f2fe;"></i> Đang kết nối stream...`;

      // Timeout: if no playback starts in 15s → show error
      loadTimeout = setTimeout(() => {
        if (videoPlayer.readyState < 2) {
          showVideoError('Stream không phản hồi sau 15 giây. URL có thể đã hết hạn hoặc bị chặn.');
        }
      }, 15000);

      if (Hls.isSupported()) {
        hlsInstance = new Hls({
          capLevelToPlayerSize: true,
          maxBufferLength: 90,
          maxMaxBufferLength: 180,
          maxBufferSize: 100 * 1000 * 1000,
          maxBufferHole: 0.5,
          lowLatencyMode: false,
          enableWorker: true,
          manifestLoadingTimeOut: 12000,
          manifestLoadingMaxRetry: 1,
          levelLoadingTimeOut: 10000,
        });

        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(videoPlayer);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
          if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null; }
          hideVideoError();
          bufferStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#00f2fe;"></i> Sẵn sàng phát 1080p`;

          const levels = hlsInstance.levels;
          if (levels && levels.length > 0) {
            let opts = '<option value="-1">Tự động (Auto HD)</option>';
            levels.forEach((lvl, idx) => {
              const res = lvl.height ? `${lvl.height}p` : `Chất lượng ${idx + 1}`;
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
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // First try to recover
              bufferStatus.innerHTML = `<i class="fa-solid fa-rotate" style="color:#ffb703;"></i> Đang thử kết nối lại...`;
              hlsInstance.startLoad();
              // If still fails after 8s, show error
              setTimeout(() => {
                if (videoPlayer.readyState < 2 && !videoErrorOverlay.classList.contains('hidden') === false) {
                  showVideoError('Stream không khả dụng. URL đã hết hạn hoặc bị nhà mạng chặn.');
                }
              }, 8000);
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hlsInstance.recoverMediaError();
            } else {
              showVideoError('Lỗi phát video. Nguồn stream có thể đã hết hạn hoặc không hỗ trợ.');
            }
          }
        });

      } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        videoPlayer.src = streamUrl;
        videoPlayer.addEventListener('error', () => showVideoError('Không thể phát stream trên trình duyệt này.'), { once: true });
        videoPlayer.play().catch(() => {});
      } else {
        showVideoError('Trình duyệt không hỗ trợ HLS stream. Hãy thử Chrome hoặc Edge.');
      }
    } else {
      currentSourceLabel.textContent = 'File MP4 Local (E:\\Phim\\Phim_Le_MP4)';
      btnSwitchHls.classList.remove('active');
      btnSwitchLocal.classList.add('active');
      bufferStatus.innerHTML = `<i class="fa-solid fa-hard-drive" style="color:#ffb703;"></i> Nguồn MP4 Gốc`;
      hideVideoError();

      if (!activeMovie.local_mp4) {
        showVideoError('Không tìm thấy file MP4 local cho phim này.');
        return;
      }
      videoPlayer.src = activeMovie.local_mp4;
      videoPlayer.play().catch(() => {});
    }
  }

  // Retry button
  retryStreamBtn.addEventListener('click', () => {
    hideVideoError();
    loadVideoSource();
  });

  // Report broken link — show toast
  reportBrokenBtn.addEventListener('click', () => {
    const toast = document.getElementById('seekToast');
    if (toast) {
      toast.textContent = '❌ Đã ghi nhận link hỏng! Sẽ cập nhật nguồn mới sớm.';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  });

  // Handle Quality Selector Change
  qualitySelect.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (hlsInstance) {
      hlsInstance.currentLevel = val;
      bufferStatus.innerHTML = val === -1 
        ? `<i class="fa-solid fa-bolt" style="color: #00f2fe;"></i> Tự động điều chỉnh độ phân giải`
        : `<i class="fa-solid fa-check" style="color: #00f2fe;"></i> Đã đổi độ phân giải`;
    }
  });

  // Source Switcher Buttons
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

  // Type Filter Tabs Event Listeners
  typeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      typeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.getAttribute('data-type');
      currentPage = 1;
      showHomeView();
      renderMovies();
    });
  });

  // Genre Dropdown Select Event Listener
  if (genreSelect) {
    genreSelect.addEventListener('change', (e) => {
      currentGenre = e.target.value;
      currentPage = 1;
      showHomeView();
      renderMovies();
    });
  }

  // Country Dropdown Select Event Listener
  if (countrySelect) {
    countrySelect.addEventListener('change', (e) => {
      currentCountry = e.target.value;
      currentPage = 1;
      showHomeView();
      renderMovies();
    });
  }

  // Year Dropdown Select Event Listener
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      currentYear = e.target.value;
      currentPage = 1;
      showHomeView();
      renderMovies();
    });
  }

  // Search Input Event Listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      currentPage = 1;
      showHomeView();
      renderMovies();
    });
  }


  // 7. Custom Seek Buttons: +/- 30 seconds
  const seekBackBtn = document.getElementById('seekBackBtn');
  const seekFwdBtn = document.getElementById('seekFwdBtn');

  seekBackBtn.addEventListener('click', () => {
    videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 30);
    showSeekToast('-30s');
  });

  seekFwdBtn.addEventListener('click', () => {
    videoPlayer.currentTime = Math.min(videoPlayer.duration || Infinity, videoPlayer.currentTime + 30);
    showSeekToast('+30s');
  });

  // Keyboard arrow keys: ← = -30s, → = +30s (only when watch view is active)
  // useCapture = true: intercepts BEFORE native <video> seek handler
  document.addEventListener('keydown', (e) => {
    if (watchView.classList.contains('hidden')) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'ArrowLeft') {
        videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 30);
        showSeekToast('⏪ -30s');
      } else {
        videoPlayer.currentTime = Math.min(videoPlayer.duration || Infinity, videoPlayer.currentTime + 30);
        showSeekToast('⏩ +30s');
      }
    }
  }, true); // capture phase - runs before browser native video seek

  // Toast notification for seek action
  function showSeekToast(text) {
    let toast = document.getElementById('seekToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'seekToast';
      toast.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.75); backdrop-filter: blur(10px);
        color: #fff; font-size: 1.1rem; font-weight: 700;
        padding: 10px 24px; border-radius: 30px;
        border: 1px solid rgba(255,255,255,0.15);
        z-index: 9999; pointer-events: none;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.opacity = '1';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, 1000);
  }
});
