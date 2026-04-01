/* ═══════════════════════════════════════════════════════
   MYBIBLELENS — Navigation & Interaction Logic
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Elements ───
  const header = document.getElementById('site-header');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
  const sections = document.querySelectorAll('.page-section');
  const navLinks = document.querySelectorAll('.nav-link');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  const footerLinks = document.querySelectorAll('.footer-nav a');

  // ─── Hash-Based Page Routing ───
  function showSection(sectionId) {
    // Default to 'about' if no valid section
    const validSections = ['about', 'support', 'privacy', 'terms'];
    if (!validSections.includes(sectionId)) sectionId = 'about';

    // Hide all sections
    sections.forEach(function (s) { s.style.display = 'none'; });

    // Show target
    const target = document.getElementById(sectionId);
    if (target) {
      target.style.display = 'block';
      // Re-trigger animation
      target.style.animation = 'none';
      target.offsetHeight; // force reflow
      target.style.animation = '';
    }

    // Update nav active states
    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-section') === sectionId);
    });

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close mobile menu if open
    closeMobileMenu();
  }

  function handleHash() {
    var hash = window.location.hash.replace('#', '').split('?')[0];
    // If it's a sub-anchor within a legal section (e.g., #priv-3, #tos-5), show the parent section
    if (hash.startsWith('priv-')) {
      showSection('privacy');
      setTimeout(function () {
        var el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (hash.startsWith('tos-')) {
      showSection('terms');
      setTimeout(function () {
        var el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      showSection(hash || 'about');
    }
  }

  // Listen for hash changes
  window.addEventListener('hashchange', handleHash);

  // All nav links trigger hash-based routing
  function setupNavLinks(links) {
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          var section = href.replace('#', '');
          window.location.hash = section;
        }
      });
    });
  }

  setupNavLinks(navLinks);
  setupNavLinks(mobileNavLinks);
  setupNavLinks(footerLinks);

  // TOC links inside legal pages — smooth scroll within the visible section
  document.querySelectorAll('.toc-list a, .legal-content a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        // Check if it's a section link (about, support, privacy, terms)
        var validSections = ['about', 'support', 'privacy', 'terms'];
        var target = href.replace('#', '');
        if (validSections.includes(target)) {
          e.preventDefault();
          window.location.hash = target;
          return;
        }
        // Otherwise it's a sub-anchor — smooth scroll
        var el = document.getElementById(target);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // ─── Mobile Menu ───
  function closeMobileMenu() {
    mobileMenuBtn.classList.remove('open');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    mobileNavOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  mobileMenuBtn.addEventListener('click', function () {
    var isOpen = this.classList.toggle('open');
    this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    mobileNavOverlay.classList.toggle('open');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // ─── Scroll Effects ───
  var lastScrollY = 0;
  window.addEventListener('scroll', function () {
    var currentScroll = window.scrollY;
    // Header shadow
    header.classList.toggle('scrolled', currentScroll > 10);
    lastScrollY = currentScroll;
  }, { passive: true });

  // ─── Scroll Reveal ───
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObserver.observe(el);
  });

  // ─── Initialize ───
  handleHash();

})();
