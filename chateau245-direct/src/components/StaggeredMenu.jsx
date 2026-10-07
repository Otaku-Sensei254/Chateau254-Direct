import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiShoppingBag, FiUser, FiTwitter, FiChevronDown, FiX, FiInstagram, } from 'react-icons/fi';
import { RiWhatsappLine } from "react-icons/ri";
import { GiHamburgerMenu, GiWineBottle } from 'react-icons/gi';
import Brand from './Brand';
import InstallButton from './InstallButton';
import { isTakeoutEnabled } from '../config/features';
import './styles/StaggeredMenu.css';

const defaultMenuItems = [
  { label: 'Wine Cellar', link: '/wines' },
  { label: 'Packages', ariaLabel: 'Packages', link: '/packages' },

  {
    label: 'Menus',
    ariaLabel: 'Menus',
    link: '#',
    isDropdown: true,
    dropdownItems: [
      { label: 'Fine Dining', link: '/menu?mode=dining' },
      { label: 'Lunch & Bar', link: '/menu?mode=lunchbox' },
      /* Take-Out is temporarily disabled - shows tooltip on hover */
      { label: 'Take-Out', link: '/menu?mode=takeout', disabled: true, tooltip: 'Take out Menu coming soon' },
      { label: 'Wine Cellar', link: '/wines' },
    ]
  },
  { label: 'Events', ariaLabel: 'Events', link: '/events' },
  { label: 'Feed', ariaLabel: 'Feed', link: '/feed' },
  { label: 'Reserve', ariaLabel: 'Reserve', link: '/booking' },
];

const defaultSocialItems = [
  { label: 'Twitter', link: 'https://twitter.com', icon: FiTwitter },
  { label: 'Instagram', link: 'https://instagram.com/chateau254', icon: FiInstagram },
  { label: 'WhatsApp', link: 'https://wa.me/', icon: RiWhatsappLine }
];

export const StaggeredMenu = ({
  position = 'right',
  colors = ['var(--accent-nav)', 'var(--accent-nav-deep)', 'var(--gold-deep)'],
  items = defaultMenuItems,
  socialItems = defaultSocialItems,
  displaySocials = true,
  displayItemNumbering = true,
  className,
  logoUrl,
  menuButtonColor = 'var(--accent-nav)',
  openMenuButtonColor = 'var(--accent-nav-deep)',
  accentColor = 'var(--accent-nav)',
  isFixed = true,
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
  cartCount = 0,
  userName = '',
  onProfile,
  onCart,
  user
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const firstName = userName ? userName.trim().split(' ')[0] : '';
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const desktopTimeoutRef = useRef(null);
  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const openRef = useRef(false);
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const toggleBtnRef = useRef(null);

  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const busyRef = useRef(false);
  const itemEntranceTweenRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      if (!panel) return;

      let preLayers = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) {
        gsap.set(preContainer, { xPercent: 0, opacity: 1 });
      }
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [menuButtonColor, position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }
    itemEntranceTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const offscreen = position === 'left' ? -100 : 100;
    const layerStates = layers.map(el => ({ el, start: offscreen }));
    const panelStart = offscreen;

    if (itemEls.length) {
      gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    }
    if (numberEls.length) {
      gsap.set(numberEls, { '--sm-num-opacity': 0 });
    }
    if (socialTitle) {
      gsap.set(socialTitle, { opacity: 0 });
    }
    if (socialLinks.length) {
      gsap.set(socialLinks, { y: 25, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: { each: 0.1, from: 'start' }
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: 'power2.out',
            '--sm-num-opacity': 1,
            stagger: { each: 0.08, from: 'start' }
          },
          itemsStart + 0.1
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) {
        tl.to(
          socialTitle,
          {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
          },
          socialsStart
        );
      }
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => {
              gsap.set(socialLinks, { clearProps: 'opacity' });
            }
          },
          socialsStart + 0.04
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) {
          gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        }
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) {
          gsap.set(numberEls, { '--sm-num-opacity': 0 });
        }
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        busyRef.current = false;
      }
    });
  }, [position]);

  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
  }, [playOpen, playClose, onMenuOpen, onMenuClose]);

  const closeMenu = useCallback(() => {
    if (openRef.current) {
      openRef.current = false;
      setOpen(false);
      setDropdownOpen(false);
      onMenuClose?.();
      playClose();
    }
  }, [playClose, onMenuClose]);

  const handleNavigate = useCallback((link) => {
    closeMenu();
    setDesktopDropdownOpen(false);
    if (link && link !== '#') {
      navigate(link);
    }
  }, [closeMenu, navigate]);

  const handleDesktopDropdownToggle = useCallback((e) => {
    e.stopPropagation();
    if (desktopTimeoutRef.current) {
      clearTimeout(desktopTimeoutRef.current);
      desktopTimeoutRef.current = null;
    }
    setDesktopDropdownOpen(prev => !prev);
  }, []);

  React.useEffect(() => {
    if (!desktopDropdownOpen) return;

    const handleOutsideClick = (e) => {
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(e.target)) {
        setDesktopDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [desktopDropdownOpen]);

  React.useEffect(() => {
    if (!dropdownOpen) return;

    const handleOutsideClick = (e) => {
      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [dropdownOpen]);

  React.useEffect(() => {
    setDesktopDropdownOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    return () => {
      if (desktopTimeoutRef.current) {
        clearTimeout(desktopTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!closeOnClickAway || !open) return;

    const handleClickOutside = event => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [closeOnClickAway, open, closeMenu]);

  const isItemActive = (it) => {
    if (it.isDropdown) {
      return location.pathname === '/wines' || location.pathname.startsWith('/menu');
    }
    return location.pathname === it.link;
  };

  const isSubItemActive = (sub) => {
    if (sub.link === '/wines') {
      return location.pathname === '/wines';
    }
    if (sub.link.includes('mode=takeout')) {
      return location.pathname.startsWith('/menu') && location.search.includes('takeout');
    }
    if (sub.link.includes('mode=dining')) {
      return location.pathname.startsWith('/menu') && (!location.search.includes('takeout'));
    }
    return location.pathname === sub.link;
  };

  return (
    <div
      className={(className ? className + ' ' : '') + 'staggered-menu-wrapper' + (isFixed ? ' fixed-wrapper' : '')}
      style={accentColor ? { '--sm-accent': accentColor } : undefined}
      data-position={position}
      data-open={open || undefined}
    >
      {open && (
        <div
          className="sm-scrim"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {(() => {
          const raw = colors && colors.length ? colors.slice(0, 4) : ['var(--accent-nav)', 'var(--accent-nav-deep)'];
          let arr = [...raw];
          if (arr.length >= 3) {
            const mid = Math.floor(arr.length / 2);
            arr.splice(mid, 1);
          }
          return arr.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />);
        })()}
      </div>

      <header className="staggered-menu-header" aria-label="Main navigation header">
        <Brand />

        {/* Desktop inline navigation */}
        <nav className="sm-desktop-nav" aria-label="Desktop Navigation">
          <ul className="sm-desktop-list">
            {items.map((it, idx) => {
              if (it.isDropdown) {
                return (
                  <li
                    key={idx}
                    ref={desktopDropdownRef}
                    className="sm-desktop-item sm-desktop-dropdown-wrap"
                  >
                    <button
                      type="button"
                      className={`sm-desktop-link sm-desktop-dropdown-btn ${isItemActive(it) ? 'active' : ''}`}
                      onClick={handleDesktopDropdownToggle}
                      aria-expanded={desktopDropdownOpen}
                    >
                      <span>{it.label}</span>
                      <FiChevronDown className={`sm-desktop-chevron ${desktopDropdownOpen ? 'rotated' : ''}`} size={16} />
                    </button>
                    {desktopDropdownOpen && (
                      <div
                        className="sm-desktop-dropdown-menu"
                        role="menu"
                      >
                        {it.dropdownItems.map((sub, sIdx) => {
                          const isDisabled = sub.disabled === true;
                          return (
                            <div key={sIdx} className="sm-desktop-dropdown-wrap-item" style={{ position: 'relative' }}>
                              <button
                                type="button"
                                role="menuitem"
                                className={`sm-desktop-dropdown-item ${isSubItemActive(sub) ? 'active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                                onClick={isDisabled ? undefined : () => handleNavigate(sub.link)}
                                disabled={isDisabled}
                                aria-disabled={isDisabled}
                                title={isDisabled && sub.tooltip ? sub.tooltip : undefined}
                              >
                                {sub.label}
                              </button>
                              {isDisabled && sub.tooltip && (
                                <div className="sm-dropdown-tooltip">
                                  {sub.tooltip}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              }
              return (
                <li key={idx} className="sm-desktop-item">
                  <button
                    type="button"
                    className={`sm-desktop-link ${isItemActive(it) ? 'active' : ''}`}
                    onClick={() => handleNavigate(it.link)}
                  >
                    {it.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sm-header-actions">
          {userName && (
            <button className="sm-welcome" onClick={onProfile} type="button">
              <FiUser size={16} /> <span>Hi, {firstName}</span>
            </button>
          )}

          {/* Only renders once the browser reports the app is installable. */}
          <InstallButton />

          <button className="sm-cart" aria-label="Open cart" onClick={onCart} type="button">
            <FiShoppingBag size={20} />
            {cartCount > 0 && <span className="sm-cart-badge">{cartCount}</span>}
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            ref={toggleBtnRef}
            className="sm-mobile-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="staggered-menu-panel"
            onClick={toggleMenu}
            type="button"
          >
            {open ? <FiX size={22} /> : <GiHamburgerMenu size={20} />}
          </button>
        </div>
      </header>

      <aside id="staggered-menu-panel" ref={panelRef} className="staggered-menu-panel" aria-hidden={!open}>
        <div className="user-info-nav">
          {firstName && (
            <button
              type="button"
              className="user-info-profile"
              onClick={() => { closeMenu(); onProfile?.(); }}
            >
              <span className="user-info-avatar" aria-hidden="true"><FiUser size={15} /></span>
              <span className="user-info-greeting">Hi, {firstName}</span>
            </button>
          )}
          <button
            type="button"
            className="user-info-cellar"
            onClick={() => handleNavigate('/my-cellar')}
          >
            <span className="user-info-avatar user-info-avatar--cellar" aria-hidden="true"><GiWineBottle size={15} /></span>
            <span>My Cellar</span>
          </button>
        </div>
        <div className="sm-panel-inner">
          <ul className="sm-panel-list" data-numbering={displayItemNumbering || undefined}>
            {items && items.length ? (
              items.map((it, idx) => (
                <li className="sm-panel-itemWrap" key={it.label + idx}>
                  {it.isDropdown ? (
                    <div className="sm-dropdown" ref={mobileDropdownRef}>
                      <button
                        className="sm-panel-item dropdown-trigger"
                        aria-label={it.ariaLabel}
                        aria-expanded={dropdownOpen}
                        data-index={idx + 1}
                        type="button"
                        onClick={() => setDropdownOpen(prev => !prev)}
                      >
                        <span className="sm-panel-itemLabel">
                          {it.label}
                          <FiChevronDown className={`sm-dropdown-chevron ${dropdownOpen ? 'is-rotated' : ''}`} size={18} />
                        </span>
                      </button>
                      {dropdownOpen && (
                        <div className="sm-dropdown-menu" role="menu">
                          <ul className="sm-dropdown-list">
                            {it.dropdownItems.map((subItem, subIdx) => {
                              const isDisabled = subItem.disabled === true;
                              return (
                                <li key={subIdx} role="none" style={{ position: 'relative' }}>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={`sm-dropdown-item ${isSubItemActive(subItem) ? 'active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                                    onClick={isDisabled ? undefined : () => handleNavigate(subItem.link)}
                                    disabled={isDisabled}
                                    aria-disabled={isDisabled}
                                    title={isDisabled && subItem.tooltip ? subItem.tooltip : undefined}
                                  >
                                    {subItem.label}
                                  </button>
                                  {isDisabled && subItem.tooltip && (
                                    <div className="sm-dropdown-tooltip">
                                      {subItem.tooltip}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="sm-panel-item"
                      aria-label={it.ariaLabel}
                      data-index={idx + 1}
                      onClick={() => handleNavigate(it.link)}
                    >
                      <span className="sm-panel-itemLabel">{it.label}</span>
                    </button>
                  )}
                </li>
              ))
            ) : (
              <li className="sm-panel-itemWrap" aria-hidden="true">
                <span className="sm-panel-item">
                  <span className="sm-panel-itemLabel">No items</span>
                </span>
              </li>
            )}
          </ul>
          {displaySocials && socialItems && socialItems.length > 0 && (
            <div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title">Follow Us</h3>
              <ul className="sm-socials-list">
                {socialItems.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.label + i} className="sm-socials-item">
                      <a href={s.link} target="_blank" rel="noopener noreferrer" className="sm-socials-link">
                        {Icon && <Icon size={18} />}
                        <span>{s.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default StaggeredMenu;