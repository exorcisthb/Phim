// Auth Page JavaScript
const SESSION_USER_KEY = 'rophim_session_user';

// Switch between login and signup
document.getElementById('showSignup')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginCard').classList.add('hidden');
  document.getElementById('signupCard').classList.remove('hidden');
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signupCard').classList.add('hidden');
  document.getElementById('loginCard').classList.remove('hidden');
});

// Login form
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user));
    sessionStorage.setItem('isLoggedIn', 'true');
    window.location.href = 'index.html';
  } catch (error) {
    alert(`❌ ${error.message || 'Không thể đăng nhập.'}`);
  }
});

// Signup form
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  
  if (password.length < 6) {
    alert('❌ Mật khẩu phải có ít nhất 6 ký tự!');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user));
    sessionStorage.setItem('isLoggedIn', 'true');
    alert('✅ Đăng ký thành công! Chào mừng ' + data.user.name);
    window.location.href = 'index.html';
  } catch (error) {
    alert(`❌ ${error.message || 'Không thể đăng ký.'}`);
  }
});

// Guest mode
document.getElementById('guestBtn')?.addEventListener('click', () => {
  sessionStorage.setItem('isGuest', 'true');
  window.location.href = 'index.html';
});
