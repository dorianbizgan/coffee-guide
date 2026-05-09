// Floating tray of active brew timers.
//
// Anchored bottom-LEFT (TweaksPanel ✦ owns bottom-right). Shows up to N
// chips horizontally; overflow is implicit — start two French presses and
// they line up. Tapping the body of a chip navigates to that bean's detail
// page; the small ▶/❚❚ button toggles play/pause without navigating; the
// × button dismisses the timer.
import { CircularTimer } from "./CircularTimer.jsx";

export function TimerTray({ timers, now, onToggle, onDismiss, onOpen }) {
  const list = Object.values(timers).sort((a, b) => a.createdAt - b.createdAt);
  if (list.length === 0) return null;
  return (
    <div className="timer-tray" role="region" aria-label="Active brew timers">
      {list.map((t) => (
        <CircularTimer
          key={t.id}
          timer={t}
          now={now}
          size={76}
          variant="chip"
          onOpen={() => onOpen(t)}
          onToggle={onToggle}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
