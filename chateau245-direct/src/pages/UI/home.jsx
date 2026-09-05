import { FiArrowRight, FiClock, FiMapPin, FiUser } from 'react-icons/fi';
import { Brand } from './shared';

const Home = ({ onOrder, onAuth }) => { return <main className="home-page"><div className="home-overlay" /><nav className="home-nav"><Brand /><button className="icon-button light" aria-label="Sign in" onClick={onAuth}><FiUser /></button></nav><section className="hero-copy"><p className="eyebrow">Nairobi's finest dining room</p><h1>Good evening<span>at Château254</span></h1><p className="hero-text">Great food, fine wine,<br />delivered to your door.</p><button className="primary-button" onClick={onOrder}>Order now <FiArrowRight /></button><button className="outline-button" onClick={onAuth}>Sign in / sign up</button></section><div className="home-foot"><span><FiMapPin /> General Mathenge The Promenade, Nairobi</span><span><FiClock /> Open until 11:00 PM</span></div></main>; };

export default Home;
