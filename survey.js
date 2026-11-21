(() => {
  "use strict";

  const config = window.SURVEY_CONFIG || {};
  const root = document.getElementById("surveyRoot");
  const $ = (id) => document.getElementById(id);

  const fields = Array.isArray(config.fields) ? config.fields : [];
  const questions = Array.isArray(config.questions) ? config.questions : [];
  const feedbackFields = Array.isArray(config.feedbackFields) ? config.feedbackFields : [];
  const allFields = [...fields, ...questions, ...feedbackFields];

  const MAX_QUESTIONS = Number(config.maxUniversalQuestions || 30);
  const state = {};
  let currentScreen = 0;
  let submitting = false;

  allFields.forEach(field => {
    state[field.id] = field.defaultValue ?? (
      field.type === "rating"
        ? 0
        : field.type === "checkbox"
          ? []
          : ""
    );
  });

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function optionValue(option) {
    return typeof option === "object"
      ? String(option.value ?? option.label ?? "")
      : String(option);
  }

  function optionLabel(option) {
    return typeof option === "object"
      ? String(option.label ?? option.value ?? "")
      : String(option);
  }

  function normalizeAnswer(field, rawValue) {
    if (field.type === "checkbox") {
      const values = Array.isArray(rawValue) ? rawValue : [];

      return values
        .map(value => {
          const match = (field.options || [])
            .find(opt => optionValue(opt) === String(value));

          return match ? optionLabel(match) : String(value);
        })
        .filter(Boolean)
        .join(", ");
    }

    if (field.type === "radio" || field.type === "select") {
      const match = (field.options || [])
        .find(opt => optionValue(opt) === String(rawValue));

      return match
        ? optionLabel(match)
        : String(rawValue ?? "");
    }

    return String(rawValue ?? "");
  }

  function render() {
    root.innerHTML = `
      <div class="top-bar">
        <span class="school-badge">
          ${esc(config.schoolName || "Sarbey")}
        </span>
      </div>

      <div class="progress-wrapper" id="progressWrapper" hidden>
        <div class="progress-meta">
          <span id="progressText">Tanong</span>
          <span id="progressPercent">0%</span>
        </div>

        <div class="progress-track">
          <div class="progress-fill" id="progressFill"></div>
        </div>
      </div>

      <main class="survey-main">
        <div class="survey-card">

          <section class="screen active" id="screen-welcome">
            <span class="eyebrow">
              ${esc(config.welcomeEyebrow || "Sarbey")}
            </span>

            <h1>${esc(config.title || "Sarbey")}</h1>

            <p class="subtitle">
              ${esc(config.description || "")}
            </p>

            ${
              config.notice
                ? `<div class="notice">${esc(config.notice)}</div>`
                : ""
            }

            <button
              class="btn btn-primary btn-full"
              id="startBtn"
              type="button"
            >
              ${esc(config.startLabel || "Simulan ang Sarbey")}
            </button>
          </section>

          <section class="screen" id="screen-info">
            <span class="eyebrow">Impormasyon</span>

            <h2>Impormasyon ng Kalahok</h2>

            <p class="subtitle">
              Ilagay ang kinakailangang impormasyon bago magpatuloy.
            </p>

            <div id="infoFields"></div>

            <div
              class="validation-msg"
              id="error-info"
              role="alert"
            ></div>

            <div class="nav-actions">
              <button
                class="btn btn-secondary"
                id="backInfo"
                type="button"
              >
                Bumalik
              </button>

              <button
                class="btn btn-primary"
                id="nextInfo"
                type="button"
              >
                Magpatuloy
              </button>
            </div>
          </section>

          <div id="questionScreens"></div>

          <section class="screen" id="screen-feedback">
            <span class="eyebrow">Huling Hakbang</span>

            <h2>Feedback sa Sarbey</h2>

            <p class="subtitle">
              Opsyonal ang bahaging ito.
            </p>

            <div id="feedbackFields"></div>

            <div
              class="validation-msg"
              id="error-submit"
              role="alert"
            ></div>

            <div class="nav-actions">
              <button
                class="btn btn-secondary"
                id="backFeedback"
                type="button"
              >
                Bumalik
              </button>

              <button
                class="btn btn-primary"
                id="submitBtn"
                type="button"
              >
                Isumite ang Sarbey
              </button>
            </div>
          </section>

          <section class="screen" id="screen-complete">
            <span class="eyebrow">Tapos na</span>

            <h2>Salamat sa iyong pagsagot.</h2>

            <p class="subtitle">
              ${esc(
                config.completeMessage ||
                "Naisumite na ang iyong sagot."
              )}
            </p>

            <div
              class="summary-card"
              id="summary"
            ></div>

            <button
              class="btn btn-secondary btn-full"
              id="restartBtn"
              type="button"
            >
              Bagong Sagot
            </button>
          </section>

        </div>
      </main>
    `;
  }

  function fieldMarkup(field) {
    const required = field.required
      ? `<span class="badge-optional">Kinakailangan</span>`
      : `<span class="badge-optional">Opsyonal</span>`;

    let control = "";

    if (field.type === "text" || field.type === "email") {
      control = `
        <input
          id="field-${esc(field.id)}"
          type="${field.type}"
          ${field.placeholder
            ? `placeholder="${esc(field.placeholder)}"`
            : ""}
          autocomplete="off"
        >
      `;
    }

    else if (field.type === "textarea") {
      control = `
        <textarea
          id="field-${esc(field.id)}"
          placeholder="${esc(field.placeholder || "")}"
        ></textarea>
      `;
    }

    else if (field.type === "date") {
      control = `
        <input
          id="field-${esc(field.id)}"
          type="text"
          readonly
        >
      `;
    }

    else if (field.type === "radio") {
      control = `
        <div
          class="choice-grid"
          id="choices-${esc(field.id)}"
          role="radiogroup"
        ></div>
      `;
    }

    else if (field.type === "checkbox") {
      control = `
        <div
          class="choice-grid"
          id="choices-${esc(field.id)}"
          role="group"
        ></div>
      `;
    }

    else if (field.type === "select") {
      control = `
        <select id="field-${esc(field.id)}"></select>
      `;
    }

    else if (field.type === "rating") {
      const max = Number(field.max || 5);

      control = `
        <div
          class="rating"
          id="rating-${esc(field.id)}"
          role="radiogroup"
        ></div>

        <div
          class="small"
          id="readout-${esc(field.id)}"
        >
          Wala pang napipili.
        </div>
      `;
    }

    return `
      <div
        class="form-group"
        data-field-block="${esc(field.id)}"
      >

        <label
          class="form-label"
          for="${
            field.type === "radio" || field.type === "checkbox"
              ? `choices-${field.id}`
              : `field-${field.id}`
          }"
        >
          <span>${esc(field.label)}</span>
          ${required}
        </label>

        ${
          field.helper
            ? `<div class="helper">${esc(field.helper)}</div>`
            : ""
        }

        ${control}

        <div
          class="error"
          id="field-error-${esc(field.id)}"
        ></div>

      </div>
    `;
  }

  function renderInfoFields() {
    $("infoFields").innerHTML =
      fields.map(fieldMarkup).join("");

    fields.forEach(renderFieldControl);
  }

  function renderQuestions() {
    const host = $("questionScreens");

    host.innerHTML = questions.map((q, i) => `
      <section
        class="screen"
        id="screen-q-${i}"
      >

        <span class="eyebrow">
          Tanong ${i + 1} sa ${questions.length}
        </span>

        <h2>${esc(q.label)}</h2>

        ${
          q.helper
            ? `<p class="subtitle">${esc(q.helper)}</p>`
            : ""
        }

        ${fieldMarkup(q)}

        <div
          class="validation-msg"
          id="error-q-${i}"
          role="alert"
        ></div>

        <div class="nav-actions">

          <button
            class="btn btn-secondary"
            type="button"
            data-back-q="${i}"
          >
            Bumalik
          </button>

          <button
            class="btn btn-primary"
            type="button"
            data-next-q="${i}"
          >
            ${i === questions.length - 1
              ? "Magpatuloy"
              : "Susunod"}
          </button>

        </div>

      </section>
    `).join("");

    questions.forEach(renderFieldControl);
  }

  function renderFeedback() {
    $("feedbackFields").innerHTML =
      feedbackFields.map(fieldMarkup).join("");

    feedbackFields.forEach(renderFieldControl);
  }

  function renderFieldControl(field) {
    if (
      field.type === "text" ||
      field.type === "email" ||
      field.type === "textarea"
    ) {
      const el = $(`field-${field.id}`);

      if (!el) return;

      el.addEventListener("input", () => {
        state[field.id] = el.value;
        clearFieldError(field.id);
      });

      if (state[field.id]) {
        el.value = state[field.id];
      }

      return;
    }

    if (field.type === "date") {
      return;
    }

    if (field.type === "select") {
      const el = $(`field-${field.id}`);

      if (!el) return;

      el.innerHTML =
        `<option value="">Pumili ng sagot</option>` +
        (field.options || [])
          .map(opt => `
            <option value="${esc(optionValue(opt))}">
              ${esc(optionLabel(opt))}
            </option>
          `)
          .join("");

      el.addEventListener("change", () => {
        state[field.id] = el.value;
        clearFieldError(field.id);
        applyConditions();
      });

      return;
    }

    if (
      field.type === "radio" ||
      field.type === "checkbox"
    ) {
      const host = $(`choices-${field.id}`);

      if (!host) return;

      host.innerHTML = (field.options || [])
        .map(opt => {
          const value = optionValue(opt);
          const label = optionLabel(opt);

          return `
            <button
              type="button"
              class="option-card"
              data-choice="${esc(value)}"
            >
              <span
                class="${
                  field.type === "checkbox"
                    ? "checkbox-indicator"
                    : "option-indicator"
                }"
              ></span>

              <span>${esc(label)}</span>
            </button>
          `;
        })
        .join("");

      host.querySelectorAll(".option-card")
        .forEach(btn => {

          btn.addEventListener("click", () => {
            const value = btn.dataset.choice;

            if (field.type === "radio") {
              state[field.id] = value;

              host.querySelectorAll(".option-card")
                .forEach(x => {
                  const selected = x === btn;

                  x.classList.toggle(
                    "selected",
                    selected
                  );

                  x.setAttribute(
                    "aria-checked",
                    String(selected)
                  );
                });
            }

            else {
              if (!Array.isArray(state[field.id])) {
                state[field.id] = [];
              }

              const index =
                state[field.id].indexOf(value);

              if (index >= 0) {
                state[field.id].splice(index, 1);
                btn.classList.remove("selected");
              }

              else {
                state[field.id].push(value);
                btn.classList.add("selected");
              }

              btn.setAttribute(
                "aria-checked",
                String(
                  btn.classList.contains("selected")
                )
              );
            }

            clearFieldError(field.id);
            applyConditions();
          });

        });

      return;
    }

    if (field.type === "rating") {
      const host = $(`rating-${field.id}`);

      if (!host) return;

      const max = Number(field.max || 5);

      host.innerHTML = Array.from(
        { length: max },
        (_, i) => `
          <button
            type="button"
            data-rating="${i + 1}"
            aria-label="${i + 1} sa ${max}"
          >
            ${i + 1}
          </button>
        `
      ).join("");

      host.querySelectorAll("button")
        .forEach(btn => {

          btn.addEventListener("click", () => {
            state[field.id] =
              Number(btn.dataset.rating);

            host.querySelectorAll("button")
              .forEach(x =>
                x.classList.toggle(
                  "selected",
                  Number(x.dataset.rating) <=
                    state[field.id]
                )
              );

            $(`readout-${field.id}`)
              .textContent =
                `${state[field.id]} / ${max}`;

            clearFieldError(field.id);
          });

        });
    }
  }

  function setAutomaticDate() {
    fields
      .filter(f => f.type === "date")
      .forEach(f => {

        const el = $(`field-${f.id}`);

        if (!el) return;

        const date =
          new Date().toLocaleDateString(
            "fil-PH",
            {
              year: "numeric",
              month: "long",
              day: "numeric"
            }
          );

        state[f.id] = date;
        el.value = date;
      });
  }

  function bindNavigation() {
    $("startBtn").onclick =
      () => showScreen(1);

    $("backInfo").onclick =
      () => showScreen(0);

    $("nextInfo").onclick =
      () => {
        if (validateFields(fields)) {
          showScreen(2);
        }
      };

    questions.forEach((q, i) => {

      $(`screen-q-${i}`)
        .querySelector(`[data-back-q="${i}"]`)
        .onclick =
        () => showScreen(i + 1);

      $(`screen-q-${i}`)
        .querySelector(`[data-next-q="${i}"]`)
        .onclick =
        () => {

          if (!validateFields([q])) {
            return;
          }

          showScreen(i + 3);
        };
    });

    $("backFeedback").onclick =
      () => showScreen(questions.length + 1);

    $("submitBtn").onclick = submit;

    $("restartBtn").onclick = reset;
  }

  function isEmpty(field, value) {
    if (field.type === "checkbox") {
      return !Array.isArray(value) ||
        value.length === 0;
    }

    if (field.type === "rating") {
      return Number(value) === 0;
    }

    return (
      value === "" ||
      value === null ||
      value === undefined
    );
  }

  function validateFields(list) {
    let valid = true;

    list.forEach(field => {

      if (
        field.showIf &&
        !conditionMet(field.showIf)
      ) {
        return;
      }

      const value = state[field.id];

      if (
        field.required &&
        isEmpty(field, value)
      ) {
        showFieldError(
          field.id,
          "Pakisagutan ang kinakailangang tanong."
        );

        valid = false;
      }

      else {
        clearFieldError(field.id);
      }
    });

    return valid;
  }

  function conditionMet(condition) {
    return Object.entries(condition || {})
      .every(([id, expected]) => {

        const current = state[id];

        if (Array.isArray(current)) {
          return Array.isArray(expected)
            ? expected.every(v =>
                current.includes(v)
              )
            : current.includes(expected);
        }

        return current === expected;
      });
  }

  function applyConditions() {
    allFields.forEach(field => {

      if (!field.showIf) return;

      const block =
        document.querySelector(
          `[data-field-block="${CSS.escape(field.id)}"]`
        );

      if (!block) return;

      const visible =
        conditionMet(field.showIf);

      block.style.display =
        visible ? "" : "none";

      if (!visible) {
        state[field.id] =
          field.type === "checkbox"
            ? []
            : field.type === "rating"
              ? 0
              : "";
      }
    });
  }

  function showFieldError(id, message) {
    const el = $(`field-error-${id}`);

    if (el) {
      el.textContent = message;
    }

    const block =
      document.querySelector(
        `[data-field-block="${CSS.escape(id)}"]`
      );

    if (block) {
      block.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }

  function clearFieldError(id) {
    const el = $(`field-error-${id}`);

    if (el) {
      el.textContent = "";
    }
  }

  function showScreen(index) {
    const screens =
      [...document.querySelectorAll(".screen")];

    if (
      index < 0 ||
      index >= screens.length
    ) {
      return;
    }

    currentScreen = index;

    screens.forEach((screen, i) => {
      screen.classList.toggle(
        "active",
        i === index
      );
    });

    const questionStart = 2;
    const questionEnd =
      1 + questions.length;

    const progress =
      $("progressWrapper");

    if (
      index >= questionStart &&
      index <= questionEnd &&
      questions.length
    ) {
      progress.hidden = false;

      const qIndex =
        index - questionStart;

      const percent =
        Math.round(
          ((qIndex + 1) /
            questions.length) *
            100
        );

      $("progressText")
        .textContent =
        `Tanong ${qIndex + 1} sa ${questions.length}`;

      $("progressPercent")
        .textContent =
        `${percent}%`;

      $("progressFill")
        .style.width =
        `${percent}%`;
    }

    else {
      progress.hidden = true;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    applyConditions();
  }

  function collectUniversalQuestionPairs() {
    const pairs = [];

    questions.forEach(field => {

      if (
        field.showIf &&
        !conditionMet(field.showIf)
      ) {
        return;
      }

      pairs.push({
        question: field.label,
        answer: normalizeAnswer(
          field,
          state[field.id]
        )
      });
    });

    feedbackFields.forEach(field => {

      if (
        field.showIf &&
        !conditionMet(field.showIf)
      ) {
        return;
      }

      const answer =
        normalizeAnswer(
          field,
          state[field.id]
        );

      if (answer !== "") {
        pairs.push({
          question: field.label,
          answer
        });
      }
    });

    return pairs;
  }

  function getUniversalEntries() {
    const mapping =
      config.googleFormEntries || {};

    const questionEntries =
      Array.isArray(mapping.questions)
        ? mapping.questions
        : [];

    return {
      surveyId: mapping.surveyId,
      surveyTitle: mapping.surveyTitle,
      name: mapping.name,
      section: mapping.section,
      gender: mapping.gender,
      date: mapping.date,
      contact: mapping.contact,
      questions: questionEntries
    };
  }

  function appendIfConfigured(
    form,
    entry,
    value
  ) {
    if (
      !entry ||
      String(entry).includes("REPLACE") ||
      String(entry).trim() === ""
    ) {
      return;
    }

    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return;
    }

    form.append(
      entry,
      String(value)
    );
  }

  function buildUniversalFormData() {
    const form = new FormData();
    const entries =
      getUniversalEntries();

    appendIfConfigured(
      form,
      entries.surveyId,
      config.surveyId
    );

    appendIfConfigured(
      form,
      entries.surveyTitle,
      config.title
    );

    allFields
      .filter(field =>
        fields.includes(field)
      )
      .forEach(field => {

        appendIfConfigured(
          form,
          entries[field.id],
          normalizeAnswer(
            field,
            state[field.id]
          )
        );
      });

    const pairs =
      collectUniversalQuestionPairs();

    if (pairs.length > MAX_QUESTIONS) {
      throw new Error(
        `Lumampas sa maximum na ${MAX_QUESTIONS} tanong.`
      );
    }

    pairs.forEach((pair, index) => {

      const slot =
        entries.questions[index];

      if (!slot) return;

      appendIfConfigured(
        form,
        slot.question,
        pair.question
      );

      appendIfConfigured(
        form,
        slot.answer,
        pair.answer
      );
    });

    return {
      form,
      pairs
    };
  }

  async function submit() {
    if (submitting) return;

    if (!validateFields(feedbackFields)) {
      return;
    }

    const action =
      String(
        config.googleFormActionUrl || ""
      );

    if (
      !action ||
      action.includes("PASTE_") ||
      !action.includes("/formResponse")
    ) {
      showSubmitError(
        "Hindi pa nakalagay ang Google Form response URL."
      );

      return;
    }

    let built;

    try {
      built =
        buildUniversalFormData();

    } catch (error) {
      showSubmitError(
        error.message
      );

      return;
    }

    submitting = true;

    const btn =
      $("submitBtn");

    btn.disabled = true;
    btn.textContent =
      "Isinusumite...";

    try {

      const body =
        new URLSearchParams();

      built.form.forEach(
        (value, key) => {
          body.append(
            key,
            value
          );
        }
      );

      const controller =
        new AbortController();

      const timeout =
        setTimeout(() => {
          controller.abort();
        }, 15000);

      try {
        // Run the fetch request and a minimum 2-second visual loading buffer concurrently
        await Promise.all([
          fetch(action, {
            method: "POST",
            mode: "no-cors",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8"
            },

            body:
              body.toString(),

            signal:
              controller.signal
          }),
          new Promise(resolve => setTimeout(resolve, 2000))
        ]);

      } finally {
        clearTimeout(timeout);
      }

      renderSummary(
        built.pairs
      );

      showScreen(
        questions.length + 2
      );

      // Reset submission lock and submit button state immediately
      submitting = false;
      btn.disabled = false;
      btn.textContent = "Isumite ang Sarbey";

      const restartBtn =
        $("restartBtn");

      if (restartBtn) {

        let remaining = 5;

        restartBtn.disabled = true;
        restartBtn.textContent = `Maghintay ${remaining}s...`;

        const cooldown =
          setInterval(() => {

            remaining--;

            if (remaining > 0) {
              restartBtn.textContent = `Maghintay ${remaining}s...`;
            } else {
              clearInterval(cooldown);
              restartBtn.disabled = false;
              restartBtn.textContent = "Bagong Sagot";
            }

          }, 1000);
      }

    } catch (error) {

      console.error(
        "Survey submission error:",
        error
      );

      showSubmitError(
        error.name === "AbortError"
          ? "Masyadong matagal ang koneksiyon. Walang naipakitang kumpirmasyon mula sa Google Forms. Pakisuri ang koneksiyon at subukan muli."
          : "Hindi naisumite ang sagot. Pakisuri ang koneksiyon at subukan muli."
      );

      submitting =
        false;

      btn.disabled =
        false;

      btn.textContent =
        "Isumite ang Sarbey";
    }
  }

  function showSubmitError(message) {
    const el =
      $("error-submit");

    el.textContent =
      message;

    el.classList.add(
      "visible"
    );
  }

  function renderSummary(pairs) {
    const respondentRows =
      fields
        .filter(field => {

          const value =
            state[field.id];

          return !isEmpty(
            field,
            value
          );
        })
        .map(field => `

          <div class="summary-row">

            <span class="summary-key">
              ${esc(field.label)}
            </span>

            <span class="summary-val">
              ${esc(
                normalizeAnswer(
                  field,
                  state[field.id]
                )
              )}
            </span>

          </div>

        `)
        .join("");

    const questionRows =
      pairs
        .map(pair => `

          <div class="summary-row">

            <span class="summary-key">
              ${esc(pair.question)}
            </span>

            <span class="summary-val">
              ${esc(
                pair.answer || "—"
              )}
            </span>

          </div>

        `)
        .join("");

    $("summary").innerHTML =
      respondentRows +
      questionRows ||
      `<div class="small">
        Walang detalye.
      </div>`;
  }

  function reset() {

    allFields.forEach(field => {

      state[field.id] =
        field.defaultValue ??
        (
          field.type === "rating"
            ? 0
            : field.type === "checkbox"
              ? []
              : ""
        );

      const input =
        $(`field-${field.id}`);

      if (
        input &&
        "value" in input
      ) {
        input.value = "";
      }

      const host =
        $(`rating-${field.id}`);

      if (host) {

        host
          .querySelectorAll("button")
          .forEach(b =>
            b.classList.remove(
              "selected"
            )
          );

        const readout =
          $(`readout-${field.id}`);

        if (readout) {
          readout.textContent =
            "Wala pang napipili.";
        }
      }

      const choices =
        $(`choices-${field.id}`);

      if (choices) {

        choices
          .querySelectorAll(".option-card")
          .forEach(b => {

            b.classList.remove(
              "selected"
            );

            b.setAttribute(
              "aria-checked",
              "false"
            );

          });
      }

      clearFieldError(
        field.id
      );
    });

    $("error-submit")
      .classList.remove(
        "visible"
      );

    setAutomaticDate();

    showScreen(0);
  }

  render();

  renderInfoFields();

  renderQuestions();

  renderFeedback();

  setAutomaticDate();

  bindNavigation();

  applyConditions();

})();
