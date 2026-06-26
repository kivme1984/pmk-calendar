from pathlib import Path

app_path = Path('app.js')
app = app_path.read_text(encoding='utf-8')

old_weekday = "<small class=\"event-weekday\">${WEEKDAY_SHORT[date.getUTCDay()]}, ${escapeHtml(date.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'UTC' }))}</small>"
new_weekday = "<small class=\"event-weekday\">${escapeHtml(date.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'UTC' }))}</small>"
if old_weekday not in app:
    raise SystemExit('Weekday markup not found')
app = app.replace(old_weekday, new_weekday, 1)

old_comment = """  qsa('[data-toggle-comment]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const block = button.closest('.event-comment');
    const expanded = block?.classList.toggle('expanded');
    button.textContent = expanded ? 'Свернуть' : 'Ещё';
  }));"""
new_comment = """  qsa('[data-toggle-comment]', root).forEach(button => {
    const block = button.closest('.event-comment');
    const paragraph = qs('p', block);
    requestAnimationFrame(() => {
      if (paragraph && paragraph.scrollHeight <= paragraph.clientHeight + 2) button.hidden = true;
    });
    button.addEventListener('click', event => {
      event.preventDefault();
      const expanded = block?.classList.toggle('expanded');
      button.textContent = expanded ? 'Свернуть' : 'Ещё';
    });
  });"""
if old_comment not in app:
    raise SystemExit('Comment toggle block not found')
app = app.replace(old_comment, new_comment, 1)
app_path.write_text(app, encoding='utf-8')

styles_path = Path('styles.css')
styles = styles_path.read_text(encoding='utf-8')
polish = """

/* PMK request card polish v1 */
.event-card { position: relative; }
.event-card:has(.card-menu[open]) { z-index: 45; }
.event-comment button[hidden] { display: none; }
"""
if '/* PMK request card polish v1 */' not in styles:
    styles += polish
styles_path.write_text(styles, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8').replace("pmk-calendar-v23", "pmk-calendar-v24", 1)
sw_path.write_text(sw, encoding='utf-8')
