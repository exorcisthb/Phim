document.addEventListener('DOMContentLoaded', () => {
  // Dashboard is public; authentication is optional and happens in the header modal.
  
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

  // ===== WATCH HISTORY SYSTEM (localStorage) =====
  const WATCH_HISTORY_KEY = 'rophim_watch_history';
  const SESSION_USER_KEY = 'rophim_session_user';
  const MAX_HISTORY_ITEMS = 50;

  // ===== USER AUTHENTICATION SYSTEM =====
  let currentUser = null;

  checkAuth();

  // Load user data
  function loadUserData() {
    try {
      const data = sessionStorage.getItem(SESSION_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // Save user data
  function saveUserData(userData) {
    try {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(userData));
    } catch (e) {
      console.warn('Failed to save user data');
    }
  }

  async function readAuthResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return response.json();

    return {
      message: 'Máy chủ tài khoản chưa chạy. Hãy mở web bằng "npm start" (không dùng Live Server hoặc npm run dev cũ) rồi thử lại.'
    };
  }

  // Check if user is logged in
  function checkAuth() {
    currentUser = sessionStorage.getItem('isLoggedIn') === 'true' ? loadUserData() : null;
    updateUIAuth();
  }

  function getHistoryKey() {
    return currentUser ? `${WATCH_HISTORY_KEY}_${currentUser.email.toLowerCase()}` : null;
  }

  // Update UI based on auth status
  function updateUIAuth() {
    const authButtons = document.getElementById('authButtons');
    const userAvatarDropdown = document.getElementById('userAvatarDropdown');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');

    if (currentUser) {
      // Logged in
      authButtons.style.display = 'none';
      userAvatarDropdown.style.display = 'block';
      userName.textContent = currentUser.name;
      userAvatar.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=e50914&color=fff&bold=true`;
    } else {
      // Not logged in
      authButtons.style.display = 'flex';
      userAvatarDropdown.style.display = 'none';
    }
  }

  // Signup function
  async function signup(name, email, password) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await readAuthResponse(response);
      if (!response.ok) throw new Error(data.message || 'Không thể đăng ký.');

      currentUser = data.user;
      saveUserData(currentUser);
      sessionStorage.setItem('isLoggedIn', 'true');
      updateUIAuth();
      closeAuthModal();
      showToast('✅ Đăng ký thành công! Chào mừng ' + currentUser.name);
    } catch (error) {
      showToast(`❌ ${error.message}`);
    }
  }

  // Login function
  async function login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await readAuthResponse(response);
      if (!response.ok) throw new Error(data.message || 'Không thể đăng nhập.');

      currentUser = data.user;
      saveUserData(currentUser);
      sessionStorage.setItem('isLoggedIn', 'true');
      updateUIAuth();
      closeAuthModal();
      showToast('✅ Đăng nhập thành công! Chào ' + currentUser.name);
      return true;
    } catch (error) {
      showToast(`❌ ${error.message}`);
      return false;
    }
  }

  // Logout function
  function logout() {
    currentUser = null;
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem(SESSION_USER_KEY);
    updateUIAuth();
    showHomeView();
    showToast('Bạn đã đăng xuất');
  }

  // Toast notification
  function showToast(message) {
    let toast = document.getElementById('authToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'authToast';
      toast.style.cssText = `
        position: fixed; top: 80px; right: 20px;
        background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
        color: #fff; font-size: 0.95rem; font-weight: 600;
        padding: 12px 20px; border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.15);
        z-index: 10000; pointer-events: none;
        transition: all 0.3s ease;
        opacity: 0; transform: translateX(400px);
      `;
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
    
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(400px)';
    }, 3000);
  }

  // Modal controls
  function openAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    modal.classList.add('active');
    
    if (mode === 'login') {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    } else {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
    }
  }

  function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
  }

  // Avatar dropdown toggle
  document.getElementById('avatarBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userAvatarDropdown').classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    document.getElementById('userAvatarDropdown')?.classList.remove('active');
  });

  // Auth modal event listeners
  document.getElementById('openLoginBtn')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('openSignupBtn')?.addEventListener('click', () => openAuthModal('signup'));
  document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
  document.getElementById('authModalOverlay')?.addEventListener('click', closeAuthModal);
  
  document.getElementById('switchToSignup')?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('signup');
  });
  
  document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('login');
  });

  // Login form submit
  document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    login(email, password);
  });

  // Signup form submit
  document.getElementById('signupFormElement')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (password.length < 6) {
      showToast('❌ Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }
    
    signup(name, email, password);
  });

  // Logout button
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  // View history page
  document.getElementById('viewHistoryBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    showHistoryView();
  });

  // Back to home from history
  document.getElementById('backToHomeFromHistory')?.addEventListener('click', showHomeView);
  document.getElementById('browseMoviesBtn')?.addEventListener('click', showHomeView);

  // Clear all history
  document.getElementById('clearAllHistoryBtn')?.addEventListener('click', () => {
    if (confirm('Xóa toàn bộ lịch sử xem phim?')) {
      const historyKey = getHistoryKey();
      if (historyKey) localStorage.removeItem(historyKey);
      renderHistoryPage();
      showToast('🗑️ Đã xóa toàn bộ lịch sử');
    }
  });

  // Load watch history from localStorage
  function getWatchHistory() {
    const historyKey = getHistoryKey();
    if (!historyKey) return [];
    try {
      const data = localStorage.getItem(historyKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // Save watch history to localStorage
  function saveWatchHistory(history) {
    const historyKey = getHistoryKey();
    if (!historyKey) return;
    try {
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save watch history');
    }
  }

  // Update watch history when user watches a movie
  function updateWatchHistory(movie, currentTime, duration) {
    if (!currentUser || !movie || !duration || currentTime < 10) return; // Skip if less than 10s watched
    
    const progress = Math.min(100, Math.max(0, (currentTime / duration) * 100));
    
    // Skip if almost finished (>95%)
    if (progress > 95) {
      removeFromWatchHistory(movie.id);
      return;
    }

    let history = getWatchHistory();
    
    // Remove existing entry for this movie
    history = history.filter(item => item.id !== movie.id);
    
    // Add to beginning
    history.unshift({
      id: movie.id,
      title: movie.title,
      poster: movie.poster,
      year: movie.year,
      genre: movie.genre,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      progress: Math.floor(progress),
      timestamp: Date.now(),
      episodeIndex: activeEpisodeIndex || 0,
      episodeName: movie.episodes?.[activeEpisodeIndex]?.name || ''
    });
    
    // Keep only MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history = history.slice(0, MAX_HISTORY_ITEMS);
    }
    
    saveWatchHistory(history);
  }

  // Remove from watch history
  function removeFromWatchHistory(movieId) {
    let history = getWatchHistory();
    history = history.filter(item => item.id !== movieId);
    saveWatchHistory(history);
    renderWatchHistory(); // Re-render
  }

  // Resume watching from saved position
  function resumeFromHistory(movieId) {
    const history = getWatchHistory();
    const item = history.find(h => h.id === movieId);
    
    if (!item) return;
    
    const movie = moviesData.find(m => m.id === movieId);
    if (!movie) return;
    
    showWatchView(movie, item.episodeIndex || 0);
    
    // Wait for video to load, then seek to saved position
    const checkVideoReady = setInterval(() => {
      if (videoPlayer.readyState >= 2 && videoPlayer.duration > 0) {
        clearInterval(checkVideoReady);
        videoPlayer.currentTime = item.currentTime;
        showSeekToast(`⏩ Tiếp tục từ ${formatTime(item.currentTime)}`);
      }
    }, 100);
    
    setTimeout(() => clearInterval(checkVideoReady), 5000); // Stop checking after 5s
  }

  // Format seconds to MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Render watch history section on home page
  function renderWatchHistory() {
    const history = getWatchHistory();
    const historySection = document.getElementById('historySection');
    
    if (!historySection) return;
    
    if (history.length === 0) {
      historySection.style.display = 'none';
      return;
    }
    
    historySection.style.display = 'block';
    const historyGrid = document.getElementById('historyGrid');
    
    historyGrid.innerHTML = history.map(item => `
      <div class="history-card" data-id="${item.id}">
        <div class="card-poster-wrapper">
          <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='${SVG_FALLBACK}';">
          <div class="history-progress-overlay">
            <div class="history-progress-bar" style="width: ${item.progress}%"></div>
          </div>
          <div class="history-time-badge">${formatTime(item.currentTime)} / ${formatTime(item.duration)}</div>
          ${item.episodeName ? `<div class="history-episode-badge">${item.episodeName}</div>` : ''}
          <button class="history-remove-btn" data-id="${item.id}" title="Xóa khỏi lịch sử">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <div class="card-play-overlay">
            <div class="play-icon">
              <i class="fa-solid fa-play"></i>
            </div>
          </div>
        </div>
        <div class="card-info">
          <h3 class="card-title">${item.title}</h3>
          <div class="card-sub">
            <span>${item.year} • ${item.genre}</span>
            <span class="history-badge">📺 ${item.progress}% đã xem</span>
          </div>
        </div>
      </div>
    `).join('');
    
    // Add click listeners
    historyGrid.querySelectorAll('.history-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking remove button
        if (e.target.closest('.history-remove-btn')) return;
        
        const id = parseInt(card.getAttribute('data-id'));
        resumeFromHistory(id);
      });
    });
    
    // Remove buttons
    historyGrid.querySelectorAll('.history-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'));
        removeFromWatchHistory(id);
      });
    });
  }

  // Auto-save watch progress every 10 seconds
  let saveProgressInterval = null;
  
  function startAutoSaveProgress() {
    stopAutoSaveProgress();
    saveProgressInterval = setInterval(() => {
      if (activeMovie && videoPlayer && !videoPlayer.paused && videoPlayer.duration > 0) {
        updateWatchHistory(activeMovie, videoPlayer.currentTime, videoPlayer.duration);
      }
    }, 10000); // Every 10 seconds
  }
  
  function stopAutoSaveProgress() {
    if (saveProgressInterval) {
      clearInterval(saveProgressInterval);
      saveProgressInterval = null;
    }
  }

  // Pagination Variables
  const ITEMS_PER_PAGE = 24;
  let currentPage = 1;

  // DOM Elements - Views
  const homeView = document.getElementById('homeView');
  const watchView = document.getElementById('watchView');
  const historyView = document.getElementById('historyView');

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

  // Save on pause, completion, and when the page is closed. This must be
  // registered after videoPlayer is obtained from the DOM.
  videoPlayer?.addEventListener('pause', () => {
    if (activeMovie && videoPlayer.duration > 0) {
      updateWatchHistory(activeMovie, videoPlayer.currentTime, videoPlayer.duration);
    }
  });

  videoPlayer?.addEventListener('ended', () => {
    if (activeMovie) {
      removeFromWatchHistory(activeMovie.id);
      renderWatchHistory();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (activeMovie && videoPlayer?.duration > 0) {
      updateWatchHistory(activeMovie, videoPlayer.currentTime, videoPlayer.duration);
    }
  });

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

  // 1. Load Movies Database with Aggressive Cache-Busting
  const cacheVersion = '202608280207'; // Update this when movies.json changes
  fetch(`movies.json?v=${cacheVersion}&t=` + new Date().getTime(), { 
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
    .then(res => res.json())
    .then(data => {
      moviesData = data;
      if (moviesData.length > 0) {
        setupHeroCarousel(moviesData);
      }
      renderMovies();
      renderWatchHistory(); // Render watch history on load

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

  // 2. Setup 10-Movie Hero Carousel with 5-Second Auto Rotation
  let heroFeaturedList = [];
  let currentHeroIndex = 0;
  let heroAutoTimer = null;

  function setupHeroCarousel(data) {
    if (!data || data.length === 0) return;

    // Pick top 10 featured movies (priority: 2026 movies, high rating >= 4.7)
    heroFeaturedList = data.filter(m => m.year === 2026 || m.rating >= 4.7).slice(0, 10);
    if (heroFeaturedList.length < 10) {
      heroFeaturedList = data.slice(0, 10);
    }

    renderHeroDots();
    renderHeroSlide(0);
    startHeroAutoRotation();

    // Event listeners for Prev / Next navigation
    const prevBtn = document.getElementById('heroPrevBtn');
    const nextBtn = document.getElementById('heroNextBtn');

    if (prevBtn) {
      prevBtn.onclick = () => {
        currentHeroIndex = (currentHeroIndex - 1 + heroFeaturedList.length) % heroFeaturedList.length;
        renderHeroSlide(currentHeroIndex);
        startHeroAutoRotation();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        currentHeroIndex = (currentHeroIndex + 1) % heroFeaturedList.length;
        renderHeroSlide(currentHeroIndex);
        startHeroAutoRotation();
      };
    }
  }

  function renderHeroDots() {
    const dotsContainer = document.getElementById('heroDots');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = heroFeaturedList.map((_, idx) => `
      <button class="hero-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}" title="Phim nổi bật ${idx + 1}"></button>
    `).join('');

    dotsContainer.querySelectorAll('.hero-dot').forEach(dot => {
      dot.onclick = () => {
        const idx = parseInt(dot.getAttribute('data-idx'));
        currentHeroIndex = idx;
        renderHeroSlide(currentHeroIndex);
        startHeroAutoRotation();
      };
    });
  }

  function renderHeroSlide(index) {
    if (!heroFeaturedList[index]) return;
    const movie = heroFeaturedList[index];

    // Smooth fade transition
    heroSection.classList.add('hero-fading');
    setTimeout(() => {
      heroBg.src = movie.backdrop || movie.poster;
      heroTitle.textContent = movie.title;
      heroRating.innerHTML = `<i class="fa-solid fa-star" style="color: #ffb703;"></i> ${movie.rating}`;
      heroYear.textContent = movie.year;
      heroGenre.textContent = movie.genre;
      heroDuration.textContent = movie.duration;
      heroDesc.textContent = movie.description;

      const heroQuality = document.getElementById('heroQuality');
      if (heroQuality) {
        const isCam = (movie.quality || '').toLowerCase().includes('cam');
        heroQuality.textContent = isCam ? '📷 Bản CAM' : (movie.quality || '1080p FHD');
        if (isCam) heroQuality.classList.add('cam-badge');
        else heroQuality.classList.remove('cam-badge');
      }

      heroPlayBtn.onclick = () => showWatchView(movie);
      heroInfoBtn.onclick = () => showWatchView(movie);

      // Update dot active state
      const dotsContainer = document.getElementById('heroDots');
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.hero-dot').forEach((dot, idx) => {
          if (idx === index) dot.classList.add('active');
          else dot.classList.remove('active');
        });
      }

      heroSection.classList.remove('hero-fading');
    }, 200);
  }

  function startHeroAutoRotation() {
    clearInterval(heroAutoTimer);
    heroAutoTimer = setInterval(() => {
      if (homeView.classList.contains('hidden')) return; // pause if in watch view
      currentHeroIndex = (currentHeroIndex + 1) % heroFeaturedList.length;
      renderHeroSlide(currentHeroIndex);
    }, 5000);
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
    historyView.classList.add('hidden');
    homeView.classList.remove('hidden');

    // Stop auto-save watch progress
    stopAutoSaveProgress();

    videoPlayer.pause();
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    videoPlayer.src = '';
    
    // Render watch history
    renderWatchHistory();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openWatchViewDOM(movie, episodeIndex = 0) {
    activeMovie = movie;
    activeEpisodeIndex = episodeIndex;

    // Start auto-save watch progress
    startAutoSaveProgress();

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

    // Setup Season / Part Selector Dropdown
    setupSeasonSelector(movie);

    // Episode Selector for TV Series (Strictly HIDE for Phim Lẻ / Single movies)
    if (episodesPanel && episodesGrid) {
      const hasMultipleEpisodes = movie.episodes && Array.isArray(movie.episodes) && movie.episodes.length > 1;

      if (hasMultipleEpisodes) {
        episodesPanel.classList.remove('hidden');
        episodesPanel.style.display = 'block';
        if (epCountText) epCountText.textContent = `${movie.episodes.length} tập`;
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
        
        // Use the requested episode (for example when resuming from history).
        activeMovie.m3u8_url = movie.episodes[activeEpisodeIndex].link_m3u8;
      } else {
        episodesPanel.classList.add('hidden');
        episodesPanel.style.display = 'none';
        episodesGrid.innerHTML = '';
      }
    }

    // Render Related Movies Grid
    renderRelatedMovies(movie);

    // Switch View Visibility
    homeView.classList.add('hidden');
    historyView.classList.add('hidden');
    watchView.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load Stream
    loadVideoSource();
  }

  // Helper & Handler for Multi-Season / Multi-Part Selector
  function getMovieBaseTitle(title) {
    if (!title) return '';
    let base = title.replace(/\(?Phần\s*\d+\)?|\(?Season\s*\d+\)?|\(?Part\s*\d+\)?/gi, '');
    base = base.replace(/-\s*phần\s*\d+|- \s*season\s*\d+/gi, '');
    return base.trim();
  }

  function setupSeasonSelector(currentMovie) {
    const seasonHeaderGroup = document.getElementById('seasonHeaderGroup');
    const seasonMetaGroup = document.getElementById('seasonMetaGroup');
    const seasonSelect = document.getElementById('seasonSelect');
    const seasonSelectMeta = document.getElementById('seasonSelectMeta');

    if (!seasonHeaderGroup && !seasonMetaGroup) return;

    const baseTitle = getMovieBaseTitle(currentMovie.title);
    if (!baseTitle || baseTitle.length < 3) {
      if (seasonHeaderGroup) seasonHeaderGroup.classList.add('hidden');
      if (seasonMetaGroup) seasonMetaGroup.classList.add('hidden');
      return;
    }

    // Find all movies/series sharing the same base title
    const relatedSeasons = moviesData.filter(m => {
      const b = getMovieBaseTitle(m.title);
      return b.toLowerCase() === baseTitle.toLowerCase();
    });

    if (relatedSeasons.length > 1) {
      relatedSeasons.sort((a, b) => (a.year || 2026) - (b.year || 2026));

      const optionsHtml = relatedSeasons.map((m, idx) => {
        const isCurrent = m.id === currentMovie.id;
        let seasonLabel = `Phần ${idx + 1}`;
        const match = (m.title + ' ' + m.slug).match(/Phần\s*(\d+)|Season\s*(\d+)|Part\s*(\d+)/i);
        if (match) {
          const num = match[1] || match[2] || match[3];
          seasonLabel = `Phần ${num}`;
        }
        return `<option value="${m.id}" ${isCurrent ? 'selected' : ''}>${seasonLabel} (${m.year})</option>`;
      }).join('');

      if (seasonSelect) seasonSelect.innerHTML = optionsHtml;
      if (seasonSelectMeta) seasonSelectMeta.innerHTML = optionsHtml;

      // Show header dropdown for TV Series (episodes exist), or meta dropdown for single movies
      if (currentMovie.episodes && currentMovie.episodes.length > 1) {
        if (seasonHeaderGroup) seasonHeaderGroup.classList.remove('hidden');
        if (seasonMetaGroup) seasonMetaGroup.classList.add('hidden');
      } else {
        if (seasonHeaderGroup) seasonHeaderGroup.classList.add('hidden');
        if (seasonMetaGroup) seasonMetaGroup.classList.remove('hidden');
      }

      const handleChange = (e) => {
        const selectedId = parseInt(e.target.value);
        const targetMovie = moviesData.find(m => m.id === selectedId);
        if (targetMovie) {
          showWatchView(targetMovie);
        }
      };

      if (seasonSelect) seasonSelect.onchange = handleChange;
      if (seasonSelectMeta) seasonSelectMeta.onchange = handleChange;
    } else {
      if (seasonHeaderGroup) seasonHeaderGroup.classList.add('hidden');
      if (seasonMetaGroup) seasonMetaGroup.classList.add('hidden');
    }
  }

  // Switch to Home View
  function showHomeView() {
    if (window.location.hash) {
      history.pushState({ view: 'home' }, '', window.location.pathname);
    }
    openHomeViewDOM();
  }

  // Switch to Dedicated Watch View for Selected Movie
  function showWatchView(movie, episodeIndex = 0) {
    history.pushState({ view: 'watch', movieId: movie.id }, '', `#watch-${movie.id}`);
    openWatchViewDOM(movie, episodeIndex);
  }

  // Switch to History View
  function showHistoryView() {
    homeView.classList.add('hidden');
    watchView.classList.add('hidden');
    historyView.classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderHistoryPage();
  }

  // Render history page
  function renderHistoryPage() {
    const history = getWatchHistory();
    const historyPageGrid = document.getElementById('historyPageGrid');
    const emptyHistory = document.getElementById('emptyHistory');
    const totalHistoryCount = document.getElementById('totalHistoryCount');
    const totalWatchTime = document.getElementById('totalWatchTime');
    
    if (history.length === 0) {
      historyPageGrid.style.display = 'none';
      emptyHistory.style.display = 'block';
      if (totalHistoryCount) totalHistoryCount.textContent = '0';
      if (totalWatchTime) totalWatchTime.textContent = '0h';
      return;
    }
    
    historyPageGrid.style.display = 'grid';
    emptyHistory.style.display = 'none';
    
    // Calculate stats
    const totalMinutes = history.reduce((sum, item) => sum + Math.floor(item.currentTime / 60), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (totalHistoryCount) totalHistoryCount.textContent = history.length;
    if (totalWatchTime) totalWatchTime.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    historyPageGrid.innerHTML = history.map(item => {
      const movie = moviesData.find(m => m.id === item.id);
      const isSeries = movie && movie.episodes && movie.episodes.length > 1;
      const episodeInfo = isSeries && item.episodeIndex >= 0 ? (item.episodeName || `Tập ${item.episodeIndex + 1}`) : '';
      
      return `
        <div class="history-card" data-id="${item.id}">
          <div class="card-poster-wrapper">
            <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='${SVG_FALLBACK}';">
            <div class="history-progress-overlay">
              <div class="history-progress-bar" style="width: ${item.progress}%"></div>
            </div>
            <div class="history-time-badge">${formatTime(item.currentTime)} / ${formatTime(item.duration)}</div>
            ${episodeInfo ? `<div class="history-episode-badge">${episodeInfo}</div>` : ''}
            <button class="history-remove-btn" data-id="${item.id}" title="Xóa khỏi lịch sử">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="card-play-overlay">
              <div class="play-icon">
                <i class="fa-solid fa-play"></i>
              </div>
            </div>
          </div>
          <div class="card-info">
            <h3 class="card-title">${item.title}</h3>
            <div class="card-sub">
              <span>${item.year} • ${item.genre}</span>
              <span class="history-badge">📺 ${item.progress}%</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add click listeners
    historyPageGrid.querySelectorAll('.history-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.history-remove-btn')) return;
        const id = parseInt(card.getAttribute('data-id'));
        resumeFromHistory(id);
      });
    });
    
    // Remove buttons
    historyPageGrid.querySelectorAll('.history-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'));
        removeFromWatchHistory(id);
        renderHistoryPage();
      });
    });
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
          capLevelToPlayerSize: false, // Don't restrict resolution
          maxBufferLength: 90,
          maxMaxBufferLength: 180,
          maxBufferSize: 150 * 1000 * 1000,
          maxBufferHole: 0.5,
          lowLatencyMode: false,
          enableWorker: true,
          manifestLoadingTimeOut: 12000,
          manifestLoadingMaxRetry: 2,
          levelLoadingTimeOut: 10000,
        });

        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(videoPlayer);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
          if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null; }
          hideVideoError();

          const levels = hlsInstance.levels;
          if (levels && levels.length > 0) {
            // Auto-force highest available HD/4K level by default
            const maxLvlIdx = levels.length - 1;
            hlsInstance.currentLevel = maxLvlIdx;

            const topLvl = levels[maxLvlIdx];
            let maxRes = '1080p Full HD';
            if (topLvl.height >= 2160) maxRes = '4K Ultra HD (2160p)';
            else if (topLvl.height >= 1440) maxRes = '2K Quad HD (1440p)';
            else if (topLvl.height) maxRes = `${topLvl.height}p Full HD`;

            bufferStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#00f2fe;"></i> Đã bật Max HD (${maxRes})`;

            let opts = `<option value="${maxLvlIdx}">🔥 Cao nhất (${maxRes})</option>`;
            opts += '<option value="-1">Tự động (Auto Best)</option>';
            levels.forEach((lvl, idx) => {
              if (idx !== maxLvlIdx) {
                let res = lvl.height ? `${lvl.height}p` : `Chất lượng ${idx + 1}`;
                if (lvl.height >= 2160) res = '4K (2160p)';
                else if (lvl.height >= 1080) res = '1080p Full HD';
                opts += `<option value="${idx}">${res}</option>`;
              }
            });
            qualitySelect.innerHTML = opts;
          } else {
            bufferStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#00f2fe;"></i> Phát Full HD 1080p`;
            qualitySelect.innerHTML = `
              <option value="-1">🔥 Cao nhất (1080p FullHD)</option>
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


  // 7. Custom Seek Buttons: +/- 10 seconds
  const seekBackBtn = document.getElementById('seekBackBtn');
  const seekFwdBtn = document.getElementById('seekFwdBtn');

  if (seekBackBtn) {
    seekBackBtn.addEventListener('click', () => {
      videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
      showSeekToast('⏪ -10s');
      resetInactivityTimer();
    });
  }

  if (seekFwdBtn) {
    seekFwdBtn.addEventListener('click', () => {
      videoPlayer.currentTime = Math.min(videoPlayer.duration || Infinity, videoPlayer.currentTime + 10);
      showSeekToast('⏩ +10s');
      resetInactivityTimer();
    });
  }

  // Keyboard arrow keys: ← = -10s, → = +10s (only when watch view is active)
  document.addEventListener('keydown', (e) => {
    if (watchView.classList.contains('hidden')) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    
    // Arrow Left/Right: Seek -10s / +10s
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'ArrowLeft') {
        videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
        showSeekToast('⏪ -10s');
      } else {
        videoPlayer.currentTime = Math.min(videoPlayer.duration || Infinity, videoPlayer.currentTime + 10);
        showSeekToast('⏩ +10s');
      }
      resetInactivityTimer();
    }
    
    // Space: Play/Pause toggle
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      e.stopPropagation();
      if (videoPlayer.paused) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
      resetInactivityTimer();
    }
    
    // F key: Toggle fullscreen
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen();
      resetInactivityTimer();
    }
  }, true);

  // 8. Auto-Hide Video Controls After 5s Inactivity (Smooth Animation)
  let inactivityTimer = null;
  const seekControls = document.getElementById('seekControls');
  const cinemaPlayerWrapper = document.getElementById('cinemaPlayerWrapper');

  function showControls() {
    if (seekControls) {
      seekControls.classList.remove('controls-hidden');
    }
    if (cinemaPlayerWrapper) {
      cinemaPlayerWrapper.classList.remove('hide-controls');
    }
    document.body.classList.remove('user-inactive');
  }

  function hideControls() {
    if (!watchView.classList.contains('hidden')) {
      if (seekControls) {
        seekControls.classList.add('controls-hidden');
      }
      if (cinemaPlayerWrapper) {
        cinemaPlayerWrapper.classList.add('hide-controls');
      }
      document.body.classList.add('user-inactive');
    }
  }

  function resetInactivityTimer() {
    showControls();
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(hideControls, 5000); // Changed to 5 seconds
  }

  // Reset timer on mouse move, click, or touch inside watch view
  watchView.addEventListener('mousemove', resetInactivityTimer);
  watchView.addEventListener('click', resetInactivityTimer);
  watchView.addEventListener('touchstart', resetInactivityTimer);

  // Reset timer when video player controls are used
  if (videoPlayer) {
    videoPlayer.addEventListener('play', resetInactivityTimer);
    videoPlayer.addEventListener('pause', resetInactivityTimer);
    videoPlayer.addEventListener('seeked', resetInactivityTimer); // When user seeks/scrubs
    videoPlayer.addEventListener('volumechange', resetInactivityTimer);
    videoPlayer.addEventListener('fullscreenchange', resetInactivityTimer);
  }

  // Toggle Fullscreen Function
  function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
      // Enter fullscreen
      if (videoPlayer.requestFullscreen) {
        videoPlayer.requestFullscreen();
      } else if (videoPlayer.webkitRequestFullscreen) {
        videoPlayer.webkitRequestFullscreen();
      } else if (videoPlayer.mozRequestFullScreen) {
        videoPlayer.mozRequestFullScreen();
      } else if (videoPlayer.msRequestFullscreen) {
        videoPlayer.msRequestFullscreen();
      }
      showSeekToast('⛶ Toàn màn hình');
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      showSeekToast('⛶ Thoát toàn màn hình');
    }
  }

  // Toast notification for seek action
  function showSeekToast(text) {
    let toast = document.getElementById('seekToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'seekToast';
      toast.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
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
