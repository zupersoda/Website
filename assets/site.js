/* Zuper Soda: shared behaviour for every page except the homepage.
   Copied from index.html. Does three things:
   1. Menu bar turns dark over the closing band, and opens/closes on phones.
   2. Opens and closes the enquiry panel.
   3. Sends the enquiry form to Web3Forms (same as the homepage), so enquiries arrive by email. */
(() => {
  // 1. Menu bar
  const nav = document.getElementById('nav');
  const closeSec = document.getElementById('contact');
  const menuBtn = document.querySelector('.menu-btn');
  function onScroll(){
    if (!nav) return;
    document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
    if (closeSec) nav.classList.toggle('dark', closeSec.getBoundingClientRect().top < nav.offsetHeight);
  }
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
  onScroll();
  if (menuBtn && nav){
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.textContent = open ? 'Close' : 'Menu';
    });
    nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); menuBtn.textContent = 'Menu';
    }));
  }

  // 2. Enquiry panel
  const dlg = document.getElementById('enquire');
  if (!dlg) return;
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { if (!dlg.open) dlg.showModal(); }));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  // 3. Enquiry form
  const form = document.getElementById('enqForm'), err = document.getElementById('err'), send = document.getElementById('send');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    const fd = new FormData(form);
    if (!fd.get('name').trim()) { err.textContent = 'Please add your name.'; return document.getElementById('f-name').focus(); }
    if (!/^\S+@\S+\.\S+$/.test(fd.get('email').trim())) { err.textContent = 'Please add an email we can reply to, like name@company.com.'; return document.getElementById('f-email').focus(); }
    if (!fd.get('challenge').trim()) { err.textContent = 'Please describe your main challenge in a sentence or two.'; return document.getElementById('f-problem').focus(); }
    send.disabled = true; send.firstChild.textContent = 'Sending… ';
    try {
      if (!fd.get('bot-field')) {
        const payload = Object.fromEntries(fd.entries());
        delete payload['form-name']; delete payload['bot-field'];
        payload.access_key = '9aa308f6-0a3d-4b8e-8a22-d5e1d5ec6033';
        payload.subject = 'New Zuper Soda enquiry';
        payload.from_name = 'Zuper Soda website';
        payload.page = location.pathname;
        const res = await fetch('https://api.web3forms.com/submit', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify(payload) });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || out.success !== true) throw new Error(out.message || ('Error ' + res.status));
      }
      document.getElementById('formView').hidden = true;
      document.getElementById('doneView').hidden = false;
      const dh = document.querySelector('#doneView h3'); if (dh){ dh.tabIndex = -1; dh.focus(); }
      form.reset();
    } catch (ex) {
      err.textContent = "Your enquiry didn't send. " + (ex && ex.message ? '(' + ex.message + ') ' : '') + "Please try again.";
    } finally { send.disabled = false; send.firstChild.textContent = 'Send enquiry '; }
  });
})();
