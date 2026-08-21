// Auth Page JavaScript
const USER_DATA_KEY = 'rophim_user_data';

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
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  const userData = localStorage.getItem(USER_DATA_KEY);
  
  if (!userData) {
    alert('❌ Tài khoản không tồn tại. Vui lòng đăng ký!');
    return;
  }
  
  const user = JSON.parse(userData);
  
  if (user.email !== email || atob(user.password) !== password) {
    alert('❌ Email hoặc mật khẩu không đúng!');
    return;
  }
  
  // Login successful
  sessionStorage.setItem('isLoggedIn', 'true');
  window.location.href = 'index.html';
});

// Signup form
document.getElementById('signupForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  
  if (password.length < 6) {
    alert('❌ Mật khẩu phải có ít nhất 6 ký tự!');
    return;
  }
  
  const userData = {
    name: name,
    email: email,
    password: btoa(password),
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e50914&color=fff&bold=true`,
    joinDate: Date.now()
  };
  
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  sessionStorage.setItem('isLoggedIn', 'true');
  
  alert('✅ Đăng ký thành công! Chào mừng ' + name);
  window.location.href = 'index.html';
});

// Guest mode
document.getElementById('guestBtn')?.addEventListener('click', () => {
  sessionStorage.setItem('isGuest', 'true');
  window.location.href = 'index.html';
});
