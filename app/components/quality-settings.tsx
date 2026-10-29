"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ark-admin-quality-level";

function describeQuality(value: number) {
  if (value <= 25) return { title: "أولوية الأداء", subtitle: "أقل ضغط رسومي ممكن" };
  if (value <= 70) return { title: "متوازن", subtitle: "حل وسط بين الشكل والأداء" };
  return { title: "أولوية جودة الصورة", subtitle: "تفاصيل رسومية أعلى" };
}

export function QualitySettings() {
  const [quality, setQuality] = useState(50);
  const [savedQuality, setSavedQuality] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
          setQuality(parsed);
          setSavedQuality(parsed);
        }
      }
    } catch {
      // Local storage can be disabled by the browser; the control remains usable.
    }
    setReady(true);
  }, []);

  const description = describeQuality(quality);

  function saveQuality() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(quality));
      setSavedQuality(quality);
      setMessage("تم حفظ الاختيار على هذا المتصفح");
    } catch {
      setMessage("المتصفح منع الحفظ؛ جرّب تفعيل التخزين المحلي");
    }
  }

  return (
    <section className="quality-panel" id="quality-settings" aria-labelledby="quality-title">
      <div className="quality-panel-head">
        <div className="quality-icon" aria-hidden="true">◒</div>
        <div className="quality-heading-copy">
          <p className="eyebrow">GRAPHICS CONTROL</p>
          <h3 id="quality-title">جودة الرسومات</h3>
          <p>تحكم في مستوى الجودة المستهدف من مكان واحد.</p>
        </div>
        <span className="quality-prototype-tag">إعداد أولي</span>
      </div>

      <div className="quality-current">
        <div>
          <span className="quality-kicker">المستوى المختار</span>
          <strong>{description.title}</strong>
          <span className="quality-description">{description.subtitle}</span>
        </div>
        <div className="quality-number" aria-live="polite">
          <strong>{quality}</strong><span>%</span>
        </div>
      </div>

      <label className="quality-slider-label" htmlFor="quality-range">
        <span>مستوى الجودة</span>
        <span>اسحب لتعديل الدرجة</span>
      </label>
      <input
        id="quality-range"
        className="quality-range"
        type="range"
        min="0"
        max="100"
        step="5"
        value={quality}
        onChange={(event) => {
          setQuality(Number(event.currentTarget.value));
          setMessage("");
        }}
        style={{ "--quality-progress": `${quality}%` } as React.CSSProperties}
        aria-valuetext={`${quality} بالمئة، ${description.title}`}
      />
      <div className="quality-range-labels">
        <span>أقل جودة · أداء أعلى</span>
        <span>جودة أعلى · تفاصيل أكثر</span>
      </div>

      <div className="quality-presets" aria-label="اختيارات سريعة للجودة">
        <button type="button" className={quality === 20 ? "quality-preset selected" : "quality-preset"} onClick={() => { setQuality(20); setMessage(""); }}>منخفضة</button>
        <button type="button" className={quality === 50 ? "quality-preset selected" : "quality-preset"} onClick={() => { setQuality(50); setMessage(""); }}>متوسطة</button>
        <button type="button" className={quality === 85 ? "quality-preset selected" : "quality-preset"} onClick={() => { setQuality(85); setMessage(""); }}>مرتفعة</button>
      </div>

      <div className="quality-save-row">
        <div className="quality-save-status" aria-live="polite">
          <span className={savedQuality === quality ? "quality-status-dot is-saved" : "quality-status-dot"} />
          <span>{message || (ready && savedQuality === quality ? "آخر اختيار محفوظ في هذا المتصفح" : "فيه تعديل لم يتم حفظه")}</span>
        </div>
        <button type="button" className="primary-button quality-save-button" onClick={saveQuality}>حفظ الإعداد <span aria-hidden="true">✓</span></button>
      </div>

      <div className="quality-important-note">
        <span aria-hidden="true">i</span>
        <p>حاليًا هذا نموذج إعداد داخل لوحة الأدمن، ويحفظ الاختيار في المتصفح الحالي فقط. لن تتغير جودة ملف اللعبة تلقائيًا إلا بعد ربط الإعداد بنسخة اللعبة ومحركها.</p>
      </div>
    </section>
  );
}
