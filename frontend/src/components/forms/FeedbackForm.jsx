import { useState } from "react";

import { submitFeedback } from "../../api";

const AGREEMENT_URL = "/agreement.pdf";

export default function FeedbackForm({ id = "feedback" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canSubmit = Boolean(agree && email.trim() && message.trim() && !loading);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !message.trim()) {
      setError("Заполните E-mail и вопрос.");
      return;
    }
    if (!agree) {
      setError("Подтвердите согласие на обработку данных.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await submitFeedback({
        name: name.trim(),
        email: email.trim(),
        message: message.trim()
      });
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
      setAgree(false);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="feedback-block" id={id}>
      <h2 className="feedback-title">Остались вопросы по товарам? Напишите нам</h2>
      {sent ? (
        <p className="feedback-success">Спасибо! Мы свяжемся с вами в ближайшее время.</p>
      ) : (
        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="feedback-col">
            <label>
              Ваше имя
              <input
                type="text"
                placeholder="Как вас зовут?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                placeholder="mail@mail.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="feedback-col feedback-col-wide">
            Ваш вопрос
            <textarea
              rows={6}
              placeholder="Опишите ваш вопрос"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </label>
          <div className="feedback-bottom">
            <label className="feedback-check">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                required
                aria-required="true"
              />
              <span>
                Нажимая кнопку, я соглашаюсь с условиями{" "}
                <a href={AGREEMENT_URL} target="_blank" rel="noopener noreferrer">
                  Пользовательского соглашения
                </a>
                {" "}и{" "}
                <span className="feedback-check-static">Политики конфиденциальности</span>
              </span>
            </label>
            <button type="submit" className="btn-send" disabled={!canSubmit}>
              {loading ? "Отправка..." : "Отправить"}
            </button>
          </div>
          {error ? <p className="error feedback-error">{error}</p> : null}
        </form>
      )}
    </section>
  );
}
