// Shared exam CSS injected once into the exam portal
export const EXAM_STYLES = `
  .exam-portal {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    font-family: 'Manrope', system-ui, -apple-system, sans-serif;
    background: #f8fafc;
    color: #1e293b;
  }

  .exam-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-logo { height: 36px; object-fit: contain; }

  .exam-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }

  .student-badge {
    font-size: 0.8rem;
    background: #f1f5f9;
    color: #475569;
    padding: 4px 10px;
    border-radius: 9999px;
    font-weight: 500;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .sync-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 6px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
  }

  .sync-badge.online  { color: #10b981; background: #ecfdf5; border-color: #a7f3d0; }
  .sync-badge.offline { color: #ef4444; background: #fef2f2; border-color: #fca5a5; }
  .sync-badge.saving  { color: #3b82f6; background: #eff6ff; border-color: #bfdbfe; }

  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: currentColor;
    display: inline-block;
  }
  .dot.pulse { animation: pulse-anim 1.5s infinite; }

  @keyframes pulse-anim {
    0%   { transform: scale(0.9); opacity: 0.6; }
    50%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.6; }
  }

  .timer-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #1e293b;
    color: #ffffff;
    border-radius: 8px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-size: 1.1rem;
    min-width: 100px;
    justify-content: center;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
  }

  .timer-card.critical {
    background: #ef4444;
    animation: shake-timer 0.5s ease infinite alternate;
  }

  @keyframes shake-timer {
    0%   { transform: translateY(0); }
    100% { transform: translateY(-2px); }
  }

  .offline-bar {
    background: #ef4444;
    color: #ffffff;
    text-align: center;
    padding: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);
  }

  .exam-content {
    display: flex;
    flex: 1;
  }

  /* ── Sidebar ── */
  .exam-sidebar {
    width: 320px;
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: sticky;
    top: 70px;
    height: calc(100vh - 70px);
    overflow-y: auto;
  }

  .sidebar-stats {
    padding: 16px;
    border-bottom: 1px solid #f1f5f9;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    background: #f8fafc;
  }

  .stat-box {
    padding: 8px 12px;
    border-radius: 6px;
    text-align: center;
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }

  .stat-box .count {
    font-size: 1.25rem;
    font-weight: 700;
    display: block;
  }

  .stat-box.answered .count  { color: #10b981; }
  .stat-box.unanswered .count { color: #64748b; }
  .stat-box label { font-size: 0.75rem; color: #64748b; font-weight: 500; }

  .grid-header {
    padding: 12px 16px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #f1f5f9;
  }

  .question-grid-container { flex: 1; overflow-y: auto; padding: 16px; }

  .question-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }

  .grid-btn {
    height: 40px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    position: relative;
  }

  .grid-btn:hover            { border-color: #6366f1; background: #e0e7ff; }
  .grid-btn.active           { border-color: #4f46e5; outline: 2px solid #4f46e5; outline-offset: 1px; z-index: 2; }
  .grid-btn.answered-saved   { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
  .grid-btn.answered-unsynced {
    background: #fef3c7; color: #92400e; border-color: #fde68a;
    animation: pulse-unsynced 2s infinite alternate;
  }

  @keyframes pulse-unsynced {
    0%   { box-shadow: 0 0 0 0px rgba(251,191,36,0.4); }
    100% { box-shadow: 0 0 0 4px rgba(251,191,36,0); }
  }

  .sidebar-actions {
    padding: 16px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .submit-exam-btn {
    width: 100%; padding: 12px;
    background: #ef4444; color: #ffffff;
    border: none; border-radius: 8px;
    font-weight: 700; font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(239,68,68,0.2);
  }
  .submit-exam-btn:hover { background: #dc2626; transform: translateY(-1px); }

  .back-exams-btn {
    width: 100%; padding: 10px;
    background: #f1f5f9; color: #475569;
    border: 1px solid #cbd5e1; border-radius: 8px;
    font-weight: 600; font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  .back-exams-btn:hover { background: #e2e8f0; }

  /* ── Main panel ── */
  .exam-main-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 30px;
  }

  .question-card {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
    padding: 24px;
    max-width: 800px;
    margin: 0 auto 30px auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    transition: transform 0.2s ease;
  }

  .question-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 12px;
  }

  .question-number {
    font-size: 0.95rem; font-weight: 700;
    color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em;
  }

  .question-type-tag {
    font-size: 0.75rem; background: #e0e7ff;
    color: #4338ca; padding: 4px 8px;
    border-radius: 4px; font-weight: 600;
  }

  .question-text {
    font-size: 1.15rem; font-weight: 600;
    line-height: 1.6; color: #0f172a;
    white-space: pre-wrap;
  }

  .question-media-container {
    max-width: 100%; display: flex;
    justify-content: center; border-radius: 8px;
    overflow: hidden; background: #f8fafc;
    border: 1px solid #f1f5f9; padding: 10px;
  }

  .question-media { max-height: 300px; object-fit: contain; border-radius: 6px; }

  .options-list { display: flex; flex-direction: column; gap: 12px; }

  .option-item {
    display: flex; align-items: flex-start;
    gap: 12px; padding: 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px; cursor: pointer;
    transition: all 0.2s ease;
    background: #ffffff; position: relative;
  }
  .option-item:hover     { border-color: #6366f1; background: #f5f3ff; }
  .option-item.selected  { border-color: #4f46e5; background: #eef2ff; box-shadow: 0 0 0 1px #4f46e5; }

  .option-marker {
    width: 26px; height: 26px;
    border-radius: 50%;
    border: 1.5px solid #cbd5e1;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.85rem;
    flex-shrink: 0; transition: all 0.2s ease;
    color: #475569; background: #f8fafc;
  }

  .option-item.selected .option-marker {
    background: #4f46e5; border-color: #4f46e5; color: #ffffff;
  }

  .option-content { flex: 1; font-size: 1rem; color: #334155; line-height: 1.4; }

  .option-media {
    max-height: 120px; object-fit: contain;
    border-radius: 4px; margin-top: 8px; display: block;
  }

  .question-footer-nav {
    display: flex; justify-content: space-between;
    align-items: center; margin-top: 16px;
    border-top: 1px solid #f1f5f9; padding-top: 16px;
  }

  .nav-btn-action {
    padding: 10px 20px; border-radius: 8px;
    font-weight: 600; font-size: 0.95rem;
    cursor: pointer; transition: all 0.2s ease;
    border: 1px solid #cbd5e1;
    background: #ffffff; color: #475569;
    display: flex; align-items: center; gap: 6px;
  }
  .nav-btn-action:hover:not(:disabled)  { background: #f1f5f9; color: #1e293b; }
  .nav-btn-action.primary               { background: #4f46e5; color: #ffffff; border-color: #4f46e5; box-shadow: 0 4px 6px -1px rgba(79,70,229,0.2); }
  .nav-btn-action.primary:hover:not(:disabled) { background: #4338ca; }
  .nav-btn-action:disabled              { opacity: 0.5; cursor: not-allowed; }
  .clear-btn                            { color: #ef4444; background: #fef2f2; border-color: #fca5a5; }
  .clear-btn:hover:not(:disabled)       { background: #fee2e2; color: #dc2626; }

  /* ── Overlays / modals ── */
  .exam-overlay-container {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15,23,42,0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 20px;
    backdrop-filter: blur(4px);
  }

  .overlay-card {
    background: #ffffff; border-radius: 12px;
    max-width: 480px; width: 100%; padding: 24px;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15);
    text-align: center; border: 1px solid #e2e8f0;
  }
  .overlay-card h2              { margin-top: 0; font-weight: 800; font-size: 1.3rem; color: #0f172a; }
  .overlay-card.warning h2      { color: #dc2626; }
  .overlay-card p               { color: #475569; line-height: 1.6; margin-bottom: 24px; }

  .modal-stats {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 12px; margin-bottom: 24px;
  }

  .modal-stat {
    padding: 10px; background: #f8fafc;
    border-radius: 6px; border: 1px solid #e2e8f0;
  }
  .modal-stat span   { display: block; font-size: 0.8rem; color: #64748b; }
  .modal-stat strong { font-size: 1.2rem; color: #0f172a; }

  .button-group { display: flex; gap: 12px; justify-content: center; }
  .button-group button { flex: 1; padding: 10px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; }

  .takeover-btn, .confirm-submit-btn { background: #4f46e5; color: #ffffff; border-color: #4f46e5; }
  .confirm-submit-btn:hover { background: #4338ca; }
  .takeover-btn:hover       { background: #4338ca; }
  .cancel-btn, .logout-btn.secondary { background: #ffffff; color: #475569; }
  .cancel-btn:hover { background: #f1f5f9; }

  /* ── Loading / error / success screens ── */
  .exam-loading-container {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    height: 100vh; background: #f8fafc;
  }

  .loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #4f46e5;
    border-radius: 50%;
    width: 40px; height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .exam-success-container, .exam-error-container {
    display: flex; align-items: center; justify-content: center;
    height: 100vh; padding: 20px; background: #f8fafc;
  }

  .success-card, .error-card {
    background: #ffffff; border-radius: 16px;
    padding: 36px 24px; max-width: 500px; width: 100%;
    text-align: center;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
    border: 1px solid #e2e8f0;
  }

  .success-icon {
    width: 60px; height: 60px;
    border-radius: 50%; background: #d1fae5; color: #10b981;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; margin: 0 auto 20px;
  }

  .exam-stats {
    text-align: left; background: #f8fafc;
    padding: 16px; border-radius: 8px;
    border: 1px solid #e2e8f0; margin: 20px 0 28px;
    display: flex; flex-direction: column; gap: 10px;
  }

  .stat-item { display: flex; justify-content: space-between; font-size: 0.95rem; }
  .stat-item span   { color: #64748b; }
  .stat-item strong { color: #0f172a; }

  .logout-btn {
    padding: 12px 12px; background: #4f46e5; color: #ffffff;
    border: none; border-radius: 8px; font-weight: 600;
    cursor: pointer; transition: background 0.2s;
  }
  .logout-btn:hover { background: #4338ca; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .exam-content        { flex-direction: column; }
    .exam-sidebar        { width: 100%; border-right: none; border-bottom: 1px solid #e2e8f0; position: static; height: auto; max-height: none; }
    .question-grid-container { padding: 12px; }
    .question-grid       { grid-template-columns: repeat(8, 1fr); }
    .exam-main-panel     { padding: 16px; }
    .question-card       { padding: 16px; }
    .question-text       { font-size: 1rem; }
    .option-item         { padding: 12px; }
  }
`;

export const SELECTION_STYLES = `
  .exam-selection-portal {
    min-height: 100vh;
    background: #f8fafc;
    font-family: 'Manrope', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
  }
  .selection-header {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    padding: 16px 24px;
    gap:12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .selection-logo-container { display: flex; align-items: center; gap: 12px; }
  .selection-logo { height: 34px; object-fit: contain; }
  .selection-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; }

  .selection-main {
    flex: 1; max-width: 900px; width: 100%;
    margin: 0 auto; padding: 40px 24px; box-sizing: border-box;
  }
  .selection-welcome { margin-bottom: 32px; }
  .selection-welcome h1 { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
  .selection-welcome p  { color: #64748b; margin: 0; font-size: 0.95rem; }

  .tests-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }

  .test-card {
    background: #ffffff; border: 1px solid #e2e8f0;
    border-radius: 16px; padding: 24px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .test-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border-color: #6366f1; }

  .test-badge {
    background: #e0e7ff; color: #4f46e5;
    padding: 4px 10px; border-radius: 9999px;
    font-size: 0.75rem; font-weight: 700;
    align-self: flex-start; margin-bottom: 16px;
    text-transform: uppercase;
  }
  .test-badge.completed {
    background: #d1fae5; color: #065f46;
  }
  .attempt-score-lbl strong {
    color: #10b981;
  }
  .test-name  { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
  .test-desc  { font-size: 0.85rem; color: #64748b; line-height: 1.5; margin: 0 0 20px; }

  .start-btn {
    background: #4f46e5; color: #ffffff;
    border: none; border-radius: 10px; padding: 10px;
    font-weight: 700; font-size: 0.9rem;
    cursor: pointer; text-align: center; transition: background 0.2s, border-color 0.2s, color 0.2s;
  }
  .start-btn:hover { background: #4338ca; }
  .start-btn.view-result-btn {
    background: #ffffff; color: #10b981;
    border: 2px solid #bbf7d0;
  }
  .start-btn.view-result-btn:hover {
    background: #f0fdf4;
    border-color: #86efac;
  }

  .empty-tests {
    text-align: center; padding: 48px;
    background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;
  }
  .empty-tests h3 { margin: 0 0 6px; color: #0f172a; }
  .empty-tests p  { color: #64748b; margin: 0; font-size: 0.9rem; }

  .logout-btn {
    padding: 12px 24px; background: #4f46e5; color: #ffffff;
    border: none; border-radius: 8px; font-weight: 600;
    cursor: pointer; transition: background 0.2s;
  }
  .logout-btn:hover { background: #4338ca; }

  /* Results Review Styles */
  .exam-success-container.review-mode {
    display: block;
    height: auto;
    min-height: 100vh;
    padding: 60px 20px;
    background: #f8fafc;
  }
  .success-card.wide-card {
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
    text-align: left;
    padding: 0;
    overflow: hidden;
    background: #ffffff;
    border-radius: 24px;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04);
    border: 1px solid #e2e8f0;
  }
  .result-banner {
    background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
    padding: 48px 40px;
    text-align: center;
    color: #ffffff;
    position: relative;
  }
  .banner-badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 16px;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .result-banner h2 {
    color: #ffffff !important;
    font-size: 2.2rem;
    font-weight: 800;
    margin: 0 0 8px 0;
    letter-spacing: -0.03em;
    line-height: 1.2;
  }
  .student-email-lbl {
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.95rem;
    margin: 0 0 32px 0;
    font-weight: 500;
  }
  .score-radial-container {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    padding: 20px 30px;
    display: inline-block;
    min-width: 260px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  .score-percentage-large {
    font-size: 3.2rem;
    font-weight: 900;
    line-height: 1.1;
    color: #ffffff;
  }
  .score-fraction-large {
    font-size: 0.9rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 6px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .result-body-content {
    padding: 40px;
  }
  
  .stats-dashboard-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 36px;
    justify-content: center;
  }
  .stat-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 10px 18px;
    border-radius: 9999px;
    font-size: 0.88rem;
    color: #475569;
    font-weight: 600;
  }
  .stat-pill.correct { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
  .stat-pill.wrong { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
  .stat-pill.unanswered { background: #f1f5f9; border-color: #e2e8f0; color: #475569; }
  .stat-pill.time { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
  
  .stat-pill .pill-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .stat-pill .pill-dot.green { background: #10b981; }
  .stat-pill .pill-dot.red { background: #ef4444; }
  .stat-pill .pill-dot.gray { background: #64748b; }
  
  .action-button-container {
    display: flex;
    justify-content: center;
    margin-bottom: 40px;
  }
  .return-btn {
    display: block;
    margin: 0;
    width: 240px;
  }

  .review-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 40px;
  }
  .review-title {
    font-size: 1.4rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 24px 0;
    letter-spacing: -0.02em;
  }
  .questions-review-list {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .question-review-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 28px;
    position: relative;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);
  }
  .question-review-card.correct {
    border-left: 5px solid #10b981;
  }
  .question-review-card.incorrect {
    border-left: 5px solid #ef4444;
  }
  .question-review-card.unanswered {
    border-left: 5px solid #64748b;
  }

  .review-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }
  .question-number {
    font-size: 0.85rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .status-badge {
    font-size: 0.72rem;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .status-badge.correct { background: #d1fae5; color: #065f46; }
  .status-badge.incorrect { background: #fee2e2; color: #991b1b; }
  .status-badge.unanswered { background: #f1f5f9; color: #475569; }

  .review-question-text {
    font-size: 1.05rem;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .review-image-container {
    margin-top: 14px;
    max-width: 100%;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }
  .review-media {
    max-width: 100%;
    max-height: 350px;
    object-fit: contain;
    display: block;
  }

  .review-options-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }
  .option-review-row {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    gap: 14px;
    position: relative;
    transition: background-color 0.2s, border-color 0.2s;
  }
  .option-review-row.correct-option {
    border-color: #10b981;
    background: #f0fdf4;
  }
  .option-review-row.wrong-option {
    border-color: #ef4444;
    background: #fef2f2;
  }
  .option-marker {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.88rem;
    font-weight: 700;
    color: #475569;
  }
  .correct-option .option-marker {
    background: #10b981;
    color: #ffffff;
  }
  .wrong-option .option-marker {
    background: #ef4444;
    color: #ffffff;
  }
  .option-content {
    flex: 1;
  }
  .option-text {
    margin: 0;
    font-size: 0.95rem;
    color: #334155;
    font-weight: 500;
  }
  .correct-option .option-text {
    color: #15803d;
    font-weight: 600;
  }
  .wrong-option .option-text {
    color: #b91c1c;
    font-weight: 600;
  }
  .review-option-image-container {
    margin-top: 6px;
    border-radius: 4px;
    overflow: hidden;
  }
  .review-media-small {
    max-height: 120px;
    object-fit: contain;
  }
  .choice-indicator {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.02em;
  }
  .choice-indicator.correct-option {
    background: #d1fae5;
    color: #15803d;
  }
  .choice-indicator.wrong-option {
    background: #fee2e2;
    color: #b91c1c;
  }

  .explanation-box {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    border-radius: 8px;
    padding: 18px;
    margin-top: 20px;
  }
  .explanation-title {
    margin: 0 0 6px 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: #1e3a8a;
  }
  .explanation-text {
    margin: 0;
    font-size: 0.9rem;
    color: #1e40af;
    line-height: 1.6;
  }
`;
