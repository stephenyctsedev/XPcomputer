import './styles/base.css';
import { pickMode, detectEnv } from './modes.js';

const mode = pickMode(detectEnv());
document.querySelector('#app').textContent = `XPcomputer — mode: ${mode}`;
