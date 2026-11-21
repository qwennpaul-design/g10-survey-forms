(() => {
  "use strict";

  const config = window.SURVEY_CONFIG || {};
  const root = document.getElementById("surveyRoot");
  const $ = (id) => document.getElementById(id);

  const fields = Array.isArray(config.fields) ? config.fields : [];
  const questions = Array.isArray(config.questions) ? config.questions : [];
  const feedbackFields = Array.isArray(config.feedbackFields)
    ? config.feedbackFields
    : [];

  const allFields = [...fields, ...questions, ...feedbackFields];

  let submitting = false;
  let currentScreen = 0;

  const esc = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  function optionValue(option) {
    if (option && typeof option === "object") {
      return String(
        option.value ??
          option.id ??
          option.label ??
          option.text ??
          ""
      );
    }

    return String(option ?? "");
  }

  function optionLabel(option) {
    if (option && typeof option === "object") {
      return String(
        option.label ??
          option.text ??
          option.value ??
          option.id ??
          ""
      );
    }

    return String(option ?? "");
  }

  function normalizeAnswer(value) {
    return String(value ?? "").trim();
  }

  function render() {
    if (!root) return;

    root.innerHTML = `
      <div id="surveyApp">
        <div id="surveyProgress"></div>

        <section id="surveyScreens"></section>

        <div id="surveyActions">
          <button
            type="button"
            id="backBtn"
            class="secondary-btn"
          >
            Bumalik
          </button>

          <button
            type="button"
            id="nextBtn"
            class="primary-btn"
          >
            Susunod
          </button>

          <button
            type="button"
            id="submitBtn"
            class="primary-btn"
          >
            Isumite ang Sarbey
          </button>
        </div>
      </div>
    `;

    renderInfoFields();
    renderQuestions();
    renderFeedback();

    bindNavigation();
    setAutomaticDate();

    showScreen(0);
  }

  function fieldMarkup(field, index) {
    const id = String(field.id || field.name || `field_${index}`);
    const label = String(field.label || field.title || field.name || "");
    const type = String(field.type || "text").toLowerCase();

    const required = field.required
      ? `<span class="required-mark">*</span>`
      : "";

    const help = field.help
      ? `<small class="field-help">${esc(field.help)}</small>`
      : "";

    if (type === "textarea") {
      return `
        <div class="form-field" data-field="${esc(id)}">
          <label for="${esc(id)}">
            ${esc(label)} ${required}
          </label>

          <textarea
            id="${esc(id)}"
            name="${esc(id)}"
            ${field.required ? "required" : ""}
            ${field.placeholder ? `placeholder="${esc(field.placeholder)}"` : ""}
          ></textarea>

          ${help}

          <div
            class="field-error"
            id="${esc(id)}_error"
            aria-live="polite"
          ></div>
        </div>
      `;
    }

    if (
      type === "radio" ||
      type === "checkbox" ||
      type === "select"
    ) {
      return renderFieldControl(field, index);
    }

    return `
      <div class="form-field" data-field="${esc(id)}">
        <label for="${esc(id)}">
          ${esc(label)} ${required}
        </label>

        <input
          id="${esc(id)}"
          name="${esc(id)}"
          type="${esc(type)}"
          ${field.required ? "required" : ""}
          ${field.readonly ? "readonly" : ""}
          ${field.placeholder ? `placeholder="${esc(field.placeholder)}"` : ""}
        />

        ${help}

        <div
          class="field-error"
          id="${esc(id)}_error"
          aria-live="polite"
        ></div>
      </div>
    `;
  }

  function renderInfoFields() {
    const container = $("surveyScreens");

    if (!container) return;

    const screen = document.createElement("section");
    screen.className = "survey-screen";
    screen.dataset.screen = "0";

    screen.innerHTML = `
      <div class="survey-card">
        <div class="survey-heading">
          <span class="survey-kicker">IMPORMASYON</span>
          <h2>Iyong Impormasyon</h2>
          <p>
            Pakilagyan nang tama ang mga kinakailangang impormasyon
            bago magpatuloy.
          </p>
        </div>

        <div class="fields-grid">
          ${fields.map((field, i) => fieldMarkup(field, i)).join("")}
        </div>
      </div>
    `;

    container.appendChild(screen);
  }

  function renderQuestions() {
    const container = $("surveyScreens");

    if (!container) return;

    questions.forEach((question, index) => {
      const screenNumber = index + 1;

      const screen = document.createElement("section");
      screen.className = "survey-screen";
      screen.dataset.screen = String(screenNumber);

      screen.innerHTML = `
        <div class="survey-card question-card">
          <div class="question-number">
            TANONG ${index + 1}
          </div>

          <h2>
            ${esc(
              question.label ||
                question.question ||
                question.title ||
                ""
            )}
          </h2>

          ${
            question.description
              ? `<p class="question-description">${esc(
                  question.description
                )}</p>`
              : ""
          }

          ${renderFieldControl(question, index)}

          <div
            class="field-error"
            id="${esc(
              String(
                question.id ||
                  question.name ||
                  `question_${index}`
              )
            )}_error"
            aria-live="polite"
          ></div>
        </div>
      `;

      container.appendChild(screen);
    });
  }

  function renderFeedback() {
    const container = $("surveyScreens");

    if (!container) return;

    const feedbackScreenNumber = questions.length + 1;

    const screen = document.createElement("section");
    screen.className = "survey-screen";
    screen.dataset.screen = String(feedbackScreenNumber);

    screen.innerHTML = `
      <div class="survey-card feedback-card">
        <div class="survey-heading">
          <span class="survey-kicker">PANGHULING BAHAGI</span>
          <h2>Feedback</h2>
          <p>
            Opsyonal ang feedback na ito.
          </p>
        </div>

        <div class="fields-grid">
          ${feedbackFields
            .map((field, i) => fieldMarkup(field, i))
            .join("")}
        </div>
      </div>
    `;

    container.appendChild(screen);
  }

  function renderFieldControl(field, index) {
    const id = String(
      field.id ||
        field.name ||
        `field_${index}`
    );

    const label = String(
      field.label ||
        field.question ||
        field.title ||
        field.name ||
        ""
    );

    const type = String(
      field.type || "text"
    ).toLowerCase();

    const options = Array.isArray(field.options)
      ? field.options
      : [];

    const required = field.required
      ? `<span class="required-mark">*</span>`
      : "";

    if (type === "radio") {
      return `
        <div
          class="choice-group"
          data-field="${esc(id)}"
        >
          ${
            label
              ? `<div class="choice-label">
                  ${esc(label)} ${required}
                </div>`
              : ""
          }

          <div class="choice-options">
            ${options
              .map((option, optionIndex) => {
                const value = optionValue(option);
                const optionText = optionLabel(option);

                return `
                  <label class="choice-option">
                    <input
                      type="radio"
                      name="${esc(id)}"
                      value="${esc(value)}"
                      ${field.required ? "required" : ""}
                    />

                    <span class="choice-indicator"></span>

                    <span class="choice-text">
                      ${esc(optionText)}
                    </span>
                  </label>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    if (type === "checkbox") {
      return `
        <div
          class="choice-group"
          data-field="${esc(id)}"
        >
          ${
            label
              ? `<div class="choice-label">
                  ${esc(label)} ${required}
                </div>`
              : ""
          }

          <div class="choice-options">
            ${options
              .map((option, optionIndex) => {
                const value = optionValue(option);
                const optionText = optionLabel(option);

                return `
                  <label class="choice-option">
                    <input
                      type="checkbox"
                      name="${esc(id)}"
                      value="${esc(value)}"
                    />

                    <span class="choice-indicator"></span>

                    <span class="choice-text">
                      ${esc(optionText)}
                    </span>
                  </label>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    if (type === "select") {
      return `
        <div
          class="form-field"
          data-field="${esc(id)}"
        >
          <label for="${esc(id)}">
            ${esc(label)} ${required}
          </label>

          <select
            id="${esc(id)}"
            name="${esc(id)}"
            ${field.required ? "required" : ""}
          >
            <option value="">Pumili ng sagot</option>

            ${options
              .map((option) => {
                const value = optionValue(option);
                const optionText = optionLabel(option);

                return `
                  <option value="${esc(value)}">
                    ${esc(optionText)}
                  </option>
                `;
              })
              .join("")}
          </select>

          <div
            class="field-error"
            id="${esc(id)}_error"
            aria-live="polite"
          ></div>
        </div>
      `;
    }

    return `
      <div class="form-field">
        <label for="${esc(id)}">
          ${esc(label)} ${required}
        </label>

        <input
          id="${esc(id)}"
          name="${esc(id)}"
          type="text"
          ${field.required ? "required" : ""}
        />

        <div
          class="field-error"
          id="${esc(id)}_error"
          aria-live="polite"
        ></div>
      </div>
    `;
  }

  function setAutomaticDate() {
    const dateField = fields.find((field) => {
      const id = String(
        field.id ||
          field.name ||
          ""
      ).toLowerCase();

      const label = String(
        field.label ||
          field.name ||
          ""
      ).toLowerCase();

      return (
        id === "date" ||
        id.includes("date") ||
        label.includes("petsa") ||
        label.includes("date")
      );
    });

    if (!dateField) return;

    const id = String(
      dateField.id ||
        dateField.name ||
        ""
    );

    const input = $(id);

    if (!input) return;

    if (
      String(dateField.type || "").toLowerCase() ===
      "date"
    ) {
      const now = new Date();

      const year = now.getFullYear();
      const month = String(
        now.getMonth() + 1
      ).padStart(2, "0");
      const day = String(
        now.getDate()
      ).padStart(2, "0");

      input.value =
        `${year}-${month}-${day}`;
    }
  }

  function bindNavigation() {
    const backBtn = $("backBtn");
    const nextBtn = $("nextBtn");
    const submitBtn = $("submitBtn");

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (currentScreen > 0) {
          showScreen(currentScreen - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (
          !validateCurrentScreen()
        ) {
          return;
        }

        showScreen(currentScreen + 1);
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", submit);
    }
  }

  function isEmpty(value) {
    return (
      String(value ?? "").trim() === ""
    );
  }

  function validateFields(fieldList) {
    let valid = true;

    fieldList.forEach((field) => {
      if (!field.required) return;

      const id = String(
        field.id ||
          field.name ||
          ""
      );

      const type = String(
        field.type || "text"
      ).toLowerCase();

      let value = "";

      if (
        type === "radio"
      ) {
        const checked = document.querySelector(
          `input[name="${CSS.escape(id)}"]:checked`
        );

        value = checked
          ? checked.value
          : "";
      } else if (
        type === "checkbox"
      ) {
        const checked = document.querySelectorAll(
          `input[name="${CSS.escape(id)}"]:checked`
        );

        value = Array.from(checked)
          .map((item) => item.value)
          .join(", ");
      } else {
        const input = $(id);

        value = input
          ? input.value
          : "";
      }

      if (isEmpty(value)) {
        showFieldError(
          id,
          "Kailangan mong sagutin ang field na ito."
        );

        valid = false;
      } else {
        clearFieldError(id);
      }
    });

    return valid;
  }

  function validateCurrentScreen() {
    if (currentScreen === 0) {
      return validateFields(fields);
    }

    if (
      currentScreen >= 1 &&
      currentScreen <= questions.length
    ) {
      const question =
        questions[currentScreen - 1];

      return validateFields([
        question
      ]);
    }

    return true;
  }

  function conditionMet(field) {
    if (!field.condition) {
      return true;
    }

    const condition =
      field.condition;

    const targetId =
      String(
        condition.field ||
          condition.id ||
          ""
      );

    if (!targetId) {
      return true;
    }

    const target =
      $(targetId);

    if (!target) {
      return true;
    }

    const expected =
      String(
        condition.value ??
          ""
      );

    return (
      normalizeAnswer(
        target.value
      ) ===
      normalizeAnswer(
        expected
      )
    );
  }

  function applyConditions() {
    allFields.forEach((field) => {
      const id = String(
        field.id ||
          field.name ||
          ""
      );

      if (!id) return;

      const wrapper =
        document.querySelector(
          `[data-field="${CSS.escape(id)}"]`
        );

      if (!wrapper) return;

      wrapper.style.display =
        conditionMet(field)
          ? ""
          : "none";
    });
  }

  function showFieldError(
    id,
    message
  ) {
    const error =
      $(`${id}_error`);

    if (!error) return;

    error.textContent =
      message;

    error.classList.add(
      "visible"
    );
  }

  function clearFieldError(id) {
    const error =
      $(`${id}_error`);

    if (!error) return;

    error.textContent = "";
    error.classList.remove(
      "visible"
    );
  }

  function showScreen(index) {
    const screens =
      document.querySelectorAll(
        ".survey-screen"
      );

    if (!screens.length) {
      return;
    }

    if (
      index < 0 ||
      index >= screens.length
    ) {
      return;
    }

    currentScreen =
      index;

    screens.forEach(
      (screen, i) => {
        screen.classList.toggle(
          "active",
          i === index
        );
      }
    );

    const backBtn =
      $("backBtn");

    const nextBtn =
      $("nextBtn");

    const submitBtn =
      $("submitBtn");

    const progress =
      $("surveyProgress");

    if (backBtn) {
      backBtn.style.display =
        index === 0
          ? "none"
          : "";
    }

    const isQuestionScreen =
      index >= 1 &&
      index <= questions.length;

    const isFeedbackScreen =
      index ===
      questions.length + 1;

    const isSummaryScreen =
      index ===
      questions.length + 2;

    if (nextBtn) {
      nextBtn.style.display =
        isFeedbackScreen ||
        isSummaryScreen
          ? "none"
          : "";
    }

    if (submitBtn) {
      submitBtn.style.display =
        isFeedbackScreen
          ? ""
          : "none";
    }

    if (isSummaryScreen) {
      if (backBtn) {
        backBtn.style.display =
          "none";
      }
    }

    if (progress) {
      if (isSummaryScreen) {
        progress.textContent =
          "Kumpleto na ang sarbey";
      } else {
        const total =
          questions.length + 1;

        const position =
          Math.min(
            index,
            total
          );

        progress.textContent =
          `Hakbang ${position} / ${total}`;
      }
    }

    applyConditions();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function collectUniversalQuestionPairs() {
    const pairs = [];

    questions.forEach(
      (question, index) => {
        const id = String(
          question.id ||
            question.name ||
            `question_${index}`
        );

        const label = String(
          question.label ||
            question.question ||
            question.title ||
            ""
        );

        const type =
          String(
            question.type ||
              "text"
          ).toLowerCase();

        let answer = "";

        if (
          type === "radio"
        ) {
          const selected =
            document.querySelector(
              `input[name="${CSS.escape(id)}"]:checked`
            );

          answer =
            selected
              ? selected.value
              : "";
        } else if (
          type === "checkbox"
        ) {
          const selected =
            document.querySelectorAll(
              `input[name="${CSS.escape(id)}"]:checked`
            );

          answer =
            Array.from(
              selected
            )
              .map(
                (item) =>
                  item.value
              )
              .join(", ");
        } else {
          const input =
            $(id);

          answer =
            input
              ? input.value
              : "";
        }

        pairs.push({
          question: label,
          answer:
            normalizeAnswer(
              answer
            )
        });
      }
    );

    return pairs;
  }

  function getUniversalEntries() {
    const entries = [];

    fields.forEach(
      (field) => {
        const id = String(
          field.id ||
            field.name ||
            ""
        );

        if (!id) return;

        const input =
          $(id);

        if (!input) return;

        entries.push({
          field,
          value:
            normalizeAnswer(
              input.value
            )
        });
      }
    );

    return entries;
  }

  function appendIfConfigured(
    form,
    key,
    value
  ) {
    if (
      key &&
      value !== undefined &&
      value !== null
    ) {
      form.append(
        key,
        String(value)
      );
    }
  }

  function buildUniversalFormData() {
    const action =
      String(
        config.googleFormActionUrl ||
          ""
      );

    if (
      !action ||
      action.includes("PASTE_") ||
      !action.includes(
        "/formResponse"
      )
    ) {
      throw new Error(
        "Hindi pa nakalagay ang Google Form response URL."
      );
    }

    const form =
      new FormData();

    const pairs =
      collectUniversalQuestionPairs();

    const entries =
      getUniversalEntries();

    /*
     * UNIVERSAL GOOGLE FORM FIELDS
     *
     * These are supplied by the
     * existing survey configuration.
     */
    entries.forEach(
      ({
        field,
        value
      }) => {
        appendIfConfigured(
          form,
          field.entryId ||
            field.googleEntryId ||
            field.entry ||
            "",
          value
        );
      }
    );

    /*
     * QUESTIONS
     *
     * Each question keeps its
     * configured Google Forms
     * entry ID.
     */
    questions.forEach(
      (question, index) => {
        const id = String(
          question.id ||
            question.name ||
            `question_${index}`
        );

        const type =
          String(
            question.type ||
              "text"
          ).toLowerCase();

        let answer = "";

        if (
          type === "radio"
        ) {
          const selected =
            document.querySelector(
              `input[name="${CSS.escape(id)}"]:checked`
            );

          answer =
            selected
              ? selected.value
              : "";
        } else if (
          type === "checkbox"
        ) {
          const selected =
            document.querySelectorAll(
              `input[name="${CSS.escape(id)}"]:checked`
            );

          answer =
            Array.from(
              selected
            )
              .map(
                (item) =>
                  item.value
              )
              .join(", ");
        } else {
          const input =
            $(id);

          answer =
            input
              ? input.value
              : "";
        }

        appendIfConfigured(
          form,
          question.entryId ||
            question.googleEntryId ||
            question.entry ||
            "",
          answer
        );
      }
    );

    /*
     * FEEDBACK FIELDS
     */
    feedbackFields.forEach(
      (field) => {
        const id = String(
          field.id ||
            field.name ||
            ""
        );

        if (!id) return;

        const type =
          String(
            field.type ||
              "text"
          ).toLowerCase();

        let value = "";

        if (
          type === "radio"
        ) {
          const selected =
            document.querySelector(
              `input[name="${CSS.escape(id)}"]:checked`
            );

          value =
            selected
              ? selected.value
              : "";
        } else if (
          type === "checkbox"
        ) {
          const selected =
            document.querySelectorAll(
              `input[name="${CSS.escape(id)}"]:checked`
            );

          value =
            Array.from(
              selected
            )
              .map(
                (item) =>
                  item.value
              )
              .join(", ");
        } else {
          const input =
            $(id);

          value =
            input
              ? input.value
              : "";
        }

        appendIfConfigured(
          form,
          field.entryId ||
            field.googleEntryId ||
            field.entry ||
            "",
          value
        );
      }
    );

    /*
     * IMPORTANT:
     *
     * These universal metadata
     * entries remain configured
     * by the existing SURVEY_CONFIG.
     */
    appendIfConfigured(
      form,
      config.surveyIdEntry,
      config.surveyId
    );

    appendIfConfigured(
      form,
      config.surveyTitleEntry,
      config.surveyTitle
    );

    return {
      form,
      pairs
    };
  }

  async function submit() {
    /*
     * Prevent accidental double-clicks
     * while the current submission
     * is still running.
     */
    if (submitting) {
      return;
    }

    if (
      !validateFields(
        feedbackFields
      )
    ) {
      return;
    }

    const action =
      String(
        config.googleFormActionUrl ||
          ""
      );

    if (
      !action ||
      action.includes("PASTE_") ||
      !action.includes(
        "/formResponse"
      )
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

    if (btn) {
      btn.disabled = true;
      btn.textContent =
        "Isinusumite...";
    }

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

      /*
       * IMPORTANT:
       *
       * Keep this Google Forms
       * request exactly as the
       * working version.
       */
      await fetch(
        action,
        {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded;charset=UTF-8"
          },
          body:
            body.toString()
        }
      );

      /*
       * Submission succeeded.
       * Show the summary immediately.
       */
      renderSummary(
        built.pairs
      );

      showScreen(
        questions.length + 2
      );

      /*
       * DO NOT put the cooldown
       * on the submit button.
       *
       * The 5-second cooldown
       * applies ONLY to
       * "Bagong Sagot".
       */
      const restartBtn =
        $("restartBtn");

      if (restartBtn) {
        let remaining = 5;

        restartBtn.disabled =
          true;

        restartBtn.textContent =
          `Maghintay ${remaining}s...`;

        const cooldown =
          setInterval(
            () => {
              remaining--;

              if (
                remaining > 0
              ) {
                restartBtn.textContent =
                  `Maghintay ${remaining}s...`;
              } else {
                clearInterval(
                  cooldown
                );

                restartBtn.disabled =
                  false;

                restartBtn.textContent =
                  "Bagong Sagot";

                submitting =
                  false;
              }
            },
            1000
          );
      } else {
        submitting =
          false;
      }

    } catch (error) {
      console.error(
        "Survey submission error:",
        error
      );

      showSubmitError(
        "Hindi naisumite ang sagot. Pakisuri ang koneksiyon at subukan muli."
      );

      /*
       * If the request fails,
       * allow the user to retry.
       */
      submitting =
        false;

      if (btn) {
        btn.disabled =
          false;

        btn.textContent =
          "Isumite ang Sarbey";
      }
    }
  }

  function showSubmitError(
    message
  ) {
    let error =
      $("submitError");

    if (!error) {
      error =
        document.createElement(
          "div"
        );

      error.id =
        "submitError";

      error.className =
        "submit-error";

      const actions =
        $("surveyActions");

      if (actions) {
        actions.before(
          error
        );
      } else if (root) {
        root.appendChild(
          error
        );
      }
    }

    error.textContent =
      message;

    error.style.display =
      "";
  }

  function renderSummary(
    pairs
  ) {
    const container =
      $("surveyScreens");

    if (!container) {
      return;
    }

    const summaryScreen =
      document.createElement(
        "section"
      );

    summaryScreen.className =
      "survey-screen";

    summaryScreen.dataset.screen =
      String(
        questions.length + 2
      );

    summaryScreen.innerHTML = `
      <div class="survey-card summary-card">

        <div class="success-mark">
          ✓
        </div>

        <div class="survey-heading">
          <span class="survey-kicker">
            BERIPIKADO
          </span>

          <h2>
            Matagumpay na naisumite!
          </h2>

          <p>
            Salamat sa pagsagot sa
            sarbey.
          </p>
        </div>

        <div class="summary-list">
          ${pairs
            .map(
              (pair, index) => `
                <div class="summary-item">
                  <div class="summary-question">
                    ${esc(
                      pair.question
                    )}
                  </div>

                  <div class="summary-answer">
                    ${esc(
                      pair.answer ||
                        "Walang sagot"
                    )}
                  </div>
                </div>
              `
            )
            .join("")}
        </div>

        <div class="summary-actions">
          <button
            type="button"
            id="restartBtn"
            class="primary-btn"
          >
            Bagong Sagot
          </button>
        </div>

      </div>
    `;

    container.appendChild(
      summaryScreen
    );

    const restartBtn =
      $("restartBtn");

    if (restartBtn) {
      restartBtn.addEventListener(
        "click",
        reset
      );
    }
  }

  function reset() {
    /*
     * Completely reset the
     * current survey state.
     */
    submitting =
      false;

    currentScreen =
      0;

    const rootElement =
      $("surveyApp");

    if (rootElement) {
      rootElement.remove();
    }

    render();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /*
   * INITIALIZE
   */
  render();
})();
