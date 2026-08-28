import React from 'react';
import { createRoot } from 'react-dom/client';
import TicketBoard from './domains/ticket/TicketBoard';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TicketBoard />
  </React.StrictMode>,
);