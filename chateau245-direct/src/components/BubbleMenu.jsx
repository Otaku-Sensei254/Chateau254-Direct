import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { FiShoppingBag, FiCalendar, FiPackage, FiCoffee, FiBookOpen, FiMapPin, FiUser } from 'react-icons/fi';
import InstallButton from './InstallButton';
import './styles/BubbleMenu.css';

const DEFAULT_ITEMS = [
  {
    label: 'Events',
    href: '/events',
    ariaLabel: 'Events',
    rotation: -8,
    icon: FiCalendar,
    hoverStyles: { bgColor: 'var(--accent-nav)', textColor: 'var(--text-on-accent)' }
  },
  {
    label: 'Packages',
    href: '/packages',
    ariaLabel: 'Packages',
    rotation: 8,
    icon: FiPackage,
    hoverStyles: { bgColor: 'var(--accent-nav-deep)', textColor: 'var(--text-on-accent)' }
  },
  {
    label: 'Menus',
    href: '#',
    ariaLabel: 'Menus',
    rotation: 8,
    icon: FiCoffee,
    isDropdown: true,
    dropdownItems: [
      { label: 'Wines', icon: FiBookOpen, href: '/wines' },
      { label: 'Breakfast', icon: FiCoffee, href: '/menu?mode=breakfast' },
      { label: 'Dine-In', icon: FiCoffee, href: '/menu?mode=dining' },
      { label: 'Take-Out', icon: FiCoffee, href: '/menu?mode=takeout' },
    ],
    hoverStyles: { bgColor: 'var(--gold-deep)', textColor: 'var(--text-on-accent)' }
  },
  {
    label: 'Reserve',
    href: '/booking',
    ariaLabel: 'Reserve',
    rotation: 8,
    icon: FiMapPin,
    hoverStyles: { bgColor: 'var(--success-muted)', textColor: 'var(--text-on-accent)' }
  },
  {
    label: 'Feed',
    href: '/feed',
    ariaLabel: 'Feed',
    rotation: -8,
    icon: FiBookOpen,
    hoverStyles: { bgColor: 'var(--success)', textColor: 'var(--text-on-accent)' }
  }
];

export default function BubbleMenu({
  logo,
  className,
  style,
  menuAriaLabel = 'Toggle menu',
  menuBg='var(--surface-raised)',
  menuContentColor='var(--surface-inverse)',
  useFixedPosition = true,
  items,
  animationEase = 'back.out(1.5)',
  animationDuration = 0.5,
  staggerDelay = 0.12,
  cartCount = 0,
  userName = '',
  onProfile,
  onCart
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const overlayRef = useRef(null);
  const bubblesRef = useRef([]);
  const labelRefs = useRef([]);

  const menuItems = items?.length ? items : DEFAULT_ITEMS;
  const containerClassName = ['bubble-menu', useFixedPosition ? 'fixed' : 'absolute', className]
    .filter(Boolean)
    .join(' ');

  const handleToggle = () => {
    const nextState = !isMenuOpen;
    if (nextState) setShowOverlay(true);
    setIsMenuOpen(nextState);
  };

  const toggleDropdown = (label) => setOpenDropdown(openDropdown === label ? null : label);
  const handleNavClick = () => {
    setIsMenuOpen(false);
    setOpenDropdown(null);
    setShowOverlay(false);
  };

  useEffect(() => {
    const overlay = overlayRef.current;
    const bubbles = bubblesRef.current.filter(Boolean);
    const labels = labelRefs.current.filter(Boolean);

    if (!overlay || !bubbles.length) return;

    if (isMenuOpen) {
      gsap.set(overlay, { display: 'flex' });
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.set(bubbles, { scale: 0, transformOrigin: '50% 50%' });
      gsap.set(labels, { y: 24, autoAlpha: 0 });

      bubbles.forEach((bubble, i) => {
        const delay = i * staggerDelay + gsap.utils.random(-0.05, 0.05);
        const tl = gsap.timeline({ delay });

        tl.to(bubble, {
          scale: 1,
          duration: animationDuration,
          ease: animationEase
        });
        if (labels[i]) {
          tl.to(
            labels[i],
            {
              y: 0,
              autoAlpha: 1,
              duration: animationDuration,
              ease: 'power3.out'
            },
            `-=${animationDuration * 0.9}`
          );
        }
      });
    } else if (showOverlay) {
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.to(labels, {
        y: 24,
        autoAlpha: 0,
        duration: 0.2,
        ease: 'power3.in'
      });
      gsap.to(bubbles, {
        scale: 0,
        duration: 0.2,
        ease: 'power3.in',
        onComplete: () => {
          gsap.set(overlay, { display: 'none' });
          setShowOverlay(false);
        }
      });
    }
  }, [isMenuOpen, showOverlay, animationEase, animationDuration, staggerDelay]);

  useEffect(() => {
    const handleResize = () => {
      if (isMenuOpen) {
        const bubbles = bubblesRef.current.filter(Boolean);
        const isDesktop = window.innerWidth >= 900;

        bubbles.forEach((bubble, i) => {
          const item = menuItems[i];
          if (bubble && item) {
            const rotation = isDesktop ? (item.rotation ?? 0) : 0;
            gsap.set(bubble, { rotation });
          }
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen, menuItems]);

  return (
    <>
      <nav className={containerClassName} style={style} aria-label="Main navigation">
        <div className="bubble logo-bubble" aria-label="Logo" style={{ background: menuBg }}>
          <span className="logo-content">
            {typeof logo === 'string' ? (
              <img src={logo} alt="Logo" className="bubble-logo" />
            ) : (
              logo || <span style={{ fontWeight: 700, fontSize: 18, color: menuContentColor }}>C254</span>
            )}
          </span>
        </div>

        <button
          type="button"
          className={`bubble toggle-bubble menu-btn ${isMenuOpen ? 'open' : ''}`}
          onClick={handleToggle}
          aria-label={menuAriaLabel}
          aria-pressed={isMenuOpen}
          style={{ background: menuBg }}
        >
          <span className="menu-line" style={{ background: menuContentColor }} />
          <span className="menu-line short" style={{ background: menuContentColor }} />
        </button>

        <div className="bubble user-bubble" style={{ background: menuBg }}>
          <button className="welcome-link" onClick={onProfile} style={{ color: menuContentColor }}>
            <FiUser size={16} /> {userName || 'Guest'}
          </button>
          <InstallButton />
          <button className="bag-button" aria-label="Open cart" onClick={onCart} style={{ background: 'var(--accent-nav)' }}>
            <FiShoppingBag size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </nav>
      {showOverlay && (
        <div
          ref={overlayRef}
          className={`bubble-menu-items ${useFixedPosition ? 'fixed' : 'absolute'}`}
          aria-hidden={!isMenuOpen}
        >
          <ul className="pill-list" role="menu" aria-label="Menu links">
            {menuItems.map((item, idx) => (
              <li key={idx} role="none" className="pill-col">
                {item.isDropdown ? (
                  <>
                    <button
                      className={`pill-link dropdown-trigger ${openDropdown === item.label ? 'open' : ''}`}
                      onClick={() => toggleDropdown(item.label)}
                      aria-expanded={openDropdown === item.label}
                      aria-haspopup="true"
                      style={{
                        '--item-rot': `${item.rotation ?? 0}deg`,
                        '--pill-bg': menuBg,
                        '--pill-color': menuContentColor,
                        '--hover-bg': item.hoverStyles?.bgColor || 'var(--surface-sunken)',
                        '--hover-color': item.hoverStyles?.textColor || menuContentColor
                      }}
                      ref={el => {
                        if (el) bubblesRef.current[idx] = el;
                      }}
                    >
                      <item.icon size={18} />
                      <span className="pill-label" ref={el => {
                        if (el) labelRefs.current[idx] = el;
                      }}>{item.label}</span>
                    </button>
                    {openDropdown === item.label && (
                      <div className="dropdown-menu" role="menu">
                        <ul className="dropdown-list">
                          {item.dropdownItems.map((subItem, subIdx) => (
                            <li key={subIdx} role="none">
                              <a
                                role="menuitem"
                                href={subItem.href}
                                aria-label={subItem.label}
                                className="dropdown-item"
                                onClick={handleNavClick}
                              >
                                <subItem.icon size={18} />
                                <span>{subItem.label}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <a
                    role="menuitem"
                    href={item.href}
                    aria-label={item.ariaLabel || item.label}
                    className="pill-link"
                    onClick={handleNavClick}
                    style={{
                      '--item-rot': `${item.rotation ?? 0}deg`,
                      '--pill-bg': menuBg,
                      '--pill-color': menuContentColor,
                      '--hover-bg': item.hoverStyles?.bgColor || 'var(--surface-sunken)',
                      '--hover-color': item.hoverStyles?.textColor || menuContentColor
                    }}
                    ref={el => {
                      if (el) bubblesRef.current[idx] = el;
                    }}
                  >
                    <item.icon size={18} />
                    <span
                      className="pill-label"
                      ref={el => {
                        if (el) labelRefs.current[idx] = el;
                      }}
                    >
                      {item.label}
                    </span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
